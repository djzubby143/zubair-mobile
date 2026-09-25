-- ==============================================================================
-- Migration: Database-Level Atomic Checkout Transaction & Concurrency Lock
-- Ensures orders are created and stock is deducted in an atomic transaction
-- ==============================================================================

-- 1. Ensure idempotency and discount columns exist on orders table
ALTER TABLE IF EXISTS public.orders
    ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
    ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS coupon_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency_key
    ON public.orders (idempotency_key)
    WHERE idempotency_key IS NOT NULL AND idempotency_key <> '';

-- 2. Stored Procedure: process_atomic_checkout
-- Executes stock lock (SELECT FOR UPDATE), stock validation, stock decrement,
-- and order insertion within an atomic database transaction.
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
    p_order_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    item JSONB;
    v_product_id TEXT;
    v_sku TEXT;
    v_qty INT;
    v_current_stock INT;
    v_order JSONB;
    v_product_name TEXT;
BEGIN
    -- Step A: Idempotency Check
    IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
        SELECT row_to_json(o)::jsonb INTO v_order
        FROM public.orders o
        WHERE o.idempotency_key = p_idempotency_key;

        IF v_order IS NOT NULL THEN
            RETURN jsonb_build_object(
                'success', true,
                'already_processed', true,
                'order', v_order
            );
        END IF;
    END IF;

    -- Step B: Acquire Row-Level Exclusive Locks (SELECT FOR UPDATE) & Validate Stock
    FOR item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := item->>'id';
        v_sku := item->>'sku';
        v_qty := GREATEST(1, COALESCE((item->>'quantity')::INT, 1));

        SELECT stock_quantity, name INTO v_current_stock, v_product_name
        FROM public.products
        WHERE id::text = v_product_id OR (v_sku IS NOT NULL AND sku = v_sku)
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Product with ID % not found', v_product_id;
        END IF;

        IF v_current_stock < v_qty THEN
            RAISE EXCEPTION 'Insufficient stock for "%". Available: %, Requested: %',
                v_product_name, v_current_stock, v_qty;
        END IF;
    END LOOP;

    -- Step C: Atomic Stock Decrement
    FOR item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := item->>'id';
        v_sku := item->>'sku';
        v_qty := GREATEST(1, COALESCE((item->>'quantity')::INT, 1));

        UPDATE public.products
        SET stock_quantity = stock_quantity - v_qty,
            updated_at = NOW()
        WHERE id::text = v_product_id OR (v_sku IS NOT NULL AND sku = v_sku);
    END LOOP;

    -- Step D: Insert Order Record
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
        p_total_amount,
        p_delivery_charges,
        p_discount_amount,
        p_payment_method,
        'unpaid',
        'pending',
        p_idempotency_key,
        p_items,
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
