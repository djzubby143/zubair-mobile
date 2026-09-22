-- ==============================================================================
-- Zubair Mobile - Supabase Database RLS & Schema Fix
-- Run this script in your Supabase Project -> SQL Editor
-- ==============================================================================

-- 1. Ensure all 4 price columns and min_order_quantity exist in products table
ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS wholesale_price NUMERIC(10, 2) CHECK (wholesale_price >= 0),
    ADD COLUMN IF NOT EXISTS technician_price NUMERIC(10, 2) CHECK (technician_price >= 0),
    ADD COLUMN IF NOT EXISTS retail_price NUMERIC(10, 2) CHECK (retail_price >= 0),
    ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(10, 2) CHECK (purchase_price >= 0),
    ADD COLUMN IF NOT EXISTS min_order_quantity INTEGER NOT NULL DEFAULT 1 CHECK (min_order_quantity >= 1);

-- 2. Backfill existing price into wholesale_price if null
UPDATE public.products
SET wholesale_price = price
WHERE wholesale_price IS NULL AND price IS NOT NULL;

-- 3. Fix Row-Level Security (RLS) on Products Table
-- Option A: Allow public / anon full CRUD so the admin panel can insert/update directly
DROP POLICY IF EXISTS "Allow anon full CRUD for products" ON public.products;
DROP POLICY IF EXISTS "Allow authenticated admin full CRUD for products" ON public.products;
DROP POLICY IF EXISTS "Allow public read access for active products" ON public.products;

-- Allow public read of active products (or all for admin)
CREATE POLICY "Allow public read access for products"
    ON public.products
    FOR SELECT
    USING (true);

-- Allow anon and authenticated full insert/update/delete
CREATE POLICY "Allow anon and authenticated full CRUD for products"
    ON public.products
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 4. Fix Row-Level Security (RLS) on Categories Table
DROP POLICY IF EXISTS "Allow public read access for categories" ON public.categories;
DROP POLICY IF EXISTS "Allow authenticated admin full CRUD for categories" ON public.categories;

CREATE POLICY "Allow public read access for categories"
    ON public.categories
    FOR SELECT
    USING (true);

CREATE POLICY "Allow anon and authenticated full CRUD for categories"
    ON public.categories
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 5. Notify PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
