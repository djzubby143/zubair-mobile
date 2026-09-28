-- ==============================================================================
-- Migration: Hardened Database-Level Atomic Checkout Transaction
-- Enforces:
-- 1. Row-level locks (SELECT FOR UPDATE) on inventory
-- 2. Authoritative price & total calculation (rejects price tampering)
-- 3. Duplicate product line aggregation (consolidates quantities)
-- 4. Idempotency guarantees
-- 5. Strict role permissions (Revoke from public/anon/authenticated, Grant to service_role)
-- ==============================================================================

-- 1. Ensure columns exist on orders table
ALTER TABLE IF EXISTS public.orders
    ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
    ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS coupon_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency_key
    ON public.orders (idempotency_key)
    WHERE idempotency_key IS NOT NULL AND idempotency_key <> '';

-- 2. Drop existing function signatures to avoid overload ambiguities
DROP FUNCTION IF EXISTS public.process_atomic_checkout(TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, JSONB, TEXT);
DROP FUNCTION IF EXISTS public.process_atomic_checkout(TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, JSONB, TEXT, TEXT);

-- 3. Stored Procedure: process_atomic_checkout
CREATE OR REPLACE FUNCTION public.process_atomic_checkout(
    p_order_id TEXT,
    p_order_number TEXT,
    p_customer_name TEXT,
    p_customer_phone TEXT,
    p_customer_address TEXT,
    p_total_amount NUMERIC,
    p_delivery_charges NUMERIC,
    p_discount_amount NUMERIC,
    p_payment_method TEXT,
    p_idempotency_key TEXT,
    p_items JSONB,
    p_order_notes TEXT DEFAULT NULL,
    p_pricing_tier TEXT DEFAULT 'retail'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_agg_item RECORD;
    v_product_id TEXT;
    v_current_stock INT;
    v_unit_price NUMERIC(10, 2);
    v_product_name TEXT;
    v_computed_subtotal NUMERIC(10, 2) := 0;
    v_delivery NUMERIC(10, 2) := 0;
    v_discount NUMERIC(10, 2) := 0;
    v_authoritative_total NUMERIC(10, 2) := 0;
    v_order JSONB;
    v_verified_items JSONB := '[]'::jsonb;
    v_existing_order JSONB;
BEGIN
    -- Step A: Idempotency Check
    IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
        SELECT row_to_json(o)::jsonb INTO v_existing_order
        FROM public.orders o
        WHERE o.idempotency_key = p_idempotency_key;

        IF v_existing_order IS NOT NULL THEN
            RETURN jsonb_build_object(
                'success', true,
                'already_processed', true,
                'order', v_existing_order
            );
        END IF;
    END IF;

    -- Validate items array
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Checkout cart cannot be empty';
    END IF;

    -- Step B: Consolidate & Aggregate duplicate product lines in p_items
    -- Prevents duplicate product line exploits where split quantities evade stock checks
    FOR v_agg_item IN
        SELECT
            (elem->>'id')::text AS prod_id,
            COALESCE(elem->>'sku', '')::text AS prod_sku,
            SUM(GREATEST(1, COALESCE((elem->>'quantity')::int, 1))) AS aggregated_qty
        FROM jsonb_array_elements(p_items) elem
        GROUP BY (elem->>'id')::text, COALESCE(elem->>'sku', '')::text
    LOOP
        v_product_id := v_agg_item.prod_id;

        -- Acquire exclusive row-level lock (FOR UPDATE)
        SELECT
            stock_quantity,
            name,
            CASE
                WHEN LOWER(p_pricing_tier) = 'wholesale' AND wholesale_price IS NOT NULL AND wholesale_price > 0 THEN wholesale_price
                WHEN LOWER(p_pricing_tier) = 'technician' AND technician_price IS NOT NULL AND technician_price > 0 THEN technician_price
                WHEN retail_price IS NOT NULL AND retail_price > 0 THEN retail_price
                ELSE price
            END
        INTO v_current_stock, v_product_name, v_unit_price
        FROM public.products
        WHERE id::text = v_product_id OR (v_agg_item.prod_sku <> '' AND sku = v_agg_item.prod_sku)
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Product with ID % not found in database', v_product_id;
        END IF;

        IF v_current_stock < v_agg_item.aggregated_qty THEN
            RAISE EXCEPTION 'Insufficient stock for "%". Available: %, Requested: %',
                v_product_name, v_current_stock, v_agg_item.aggregated_qty;
        END IF;

        -- Add to authoritative subtotal using database price
        v_computed_subtotal := v_computed_subtotal + (v_unit_price * v_agg_item.aggregated_qty);

        -- Build verified item record
        v_verified_items := v_verified_items || jsonb_build_object(
            'id', v_product_id,
            'name', v_product_name,
            'sku', v_agg_item.prod_sku,
            'quantity', v_agg_item.aggregated_qty,
            'price', v_unit_price
        );
    END LOOP;

    -- Step C: Authoritative Total & Discount Verification
    -- Delivery charges rule: free if subtotal >= 5000, else 250
    IF v_computed_subtotal >= 5000 THEN
        v_delivery := 0;
    ELSE
        v_delivery := 250;
    END IF;

    -- Clamp discount to not exceed subtotal
    v_discount := GREATEST(0, LEAST(COALESCE(p_discount_amount, 0), v_computed_subtotal));
    v_authoritative_total := GREATEST(0, v_computed_subtotal + v_delivery - v_discount);

    -- Reject price tampering if client total differs from authoritative calculation
    IF p_total_amount IS NOT NULL AND ABS(p_total_amount - v_authoritative_total) > 1.00 THEN
        RAISE EXCEPTION 'Price tampering detected: Client total (%) does not match authoritative calculation (%)',
            p_total_amount, v_authoritative_total;
    END IF;

    -- Step D: Atomic Stock Decrement
    FOR v_agg_item IN
        SELECT
            (elem->>'id')::text AS prod_id,
            COALESCE(elem->>'sku', '')::text AS prod_sku,
            SUM(GREATEST(1, COALESCE((elem->>'quantity')::int, 1))) AS aggregated_qty
        FROM jsonb_array_elements(p_items) elem
        GROUP BY (elem->>'id')::text, COALESCE(elem->>'sku', '')::text
    LOOP
        UPDATE public.products
        SET stock_quantity = stock_quantity - v_agg_item.aggregated_qty,
            updated_at = NOW()
        WHERE id::text = v_agg_item.prod_id OR (v_agg_item.prod_sku <> '' AND sku = v_agg_item.prod_sku);
    END LOOP;

    -- Step E: Insert Order Record
    INSERT INTO public.orders (
        id,
        order_number,
        customer_name,
        customer_phone,
        customer_address,
        total_amount,
        delivery_charges,
        discount_amount,
        payment_method,
        payment_status,
        status,
        idempotency_key,
        items,
        order_notes,
        created_at
    ) VALUES (
        p_order_id,
        p_order_number,
        p_customer_name,
        p_customer_phone,
        p_customer_address,
        v_authoritative_total,
        v_delivery,
        v_discount,
        p_payment_method,
        'unpaid',
        'pending',
        p_idempotency_key,
        v_verified_items,
        p_order_notes,
        NOW()
    );

    SELECT row_to_json(o)::jsonb INTO v_order
    FROM public.orders o
    WHERE o.id = p_order_id;

    RETURN jsonb_build_object(
        'success', true,
        'order', v_order
    );
END;
$$;

-- 4. Security Permissions & Grants
-- REVOKE execution from public, anon, and authenticated roles.
-- GRANT execution ONLY to service_role (invoked by backend server).
REVOKE ALL ON FUNCTION public.process_atomic_checkout(TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, JSONB, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.process_atomic_checkout(TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, JSONB, TEXT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.process_atomic_checkout(TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, JSONB, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.process_atomic_checkout(TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, JSONB, TEXT, TEXT) TO service_role;
