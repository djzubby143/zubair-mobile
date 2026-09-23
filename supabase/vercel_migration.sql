-- ==============================================================================
-- ZUBAIR MOBILE - PRODUCTION SUPABASE MIGRATION SCRIPT FOR VERCEL DEPLOYMENT
-- Execute this script in the Supabase Dashboard -> SQL Editor -> Run
-- ==============================================================================

-- 1. ADD MISSING COLUMNS TO PRODUCTS TABLE
ALTER TABLE IF EXISTS public.products
  ADD COLUMN IF NOT EXISTS wholesale_price NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS technician_price NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS retail_price NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS min_order_quantity INTEGER DEFAULT 1;

-- Backfill price defaults if existing products have null
UPDATE public.products
SET
  wholesale_price = COALESCE(wholesale_price, price, 0),
  retail_price = COALESCE(retail_price, ROUND(COALESCE(wholesale_price, price, 0) * 1.25, 2)),
  technician_price = COALESCE(technician_price, ROUND(COALESCE(wholesale_price, price, 0) * 1.12, 2))
WHERE wholesale_price IS NULL OR retail_price IS NULL OR technician_price IS NULL;

-- 2. ADD MISSING COLUMNS TO CUSTOMERS TABLE
ALTER TABLE IF EXISTS public.customers
  ADD COLUMN IF NOT EXISTS pricing_tier VARCHAR(50) DEFAULT 'wholesale';

-- 3. CREATE ORDERS TABLE IF NOT EXISTS
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  customer_id TEXT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT,
  shop_name TEXT,
  order_notes TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_items INTEGER DEFAULT 0,
  total_amount NUMERIC(12, 2) DEFAULT 0,
  paid_amount NUMERIC(12, 2) DEFAULT 0,
  payment_status TEXT DEFAULT 'unpaid',
  payment_notes TEXT,
  total_cost NUMERIC(12, 2) DEFAULT 0,
  total_profit NUMERIC(12, 2) DEFAULT 0,
  status TEXT DEFAULT 'pending',
  cargo_name TEXT,
  tracking_number TEXT,
  dispatch_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CREATE PRODUCT-IMAGES STORAGE BUCKET
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE
SET public = true;

-- 5. STORAGE BUCKET RLS POLICIES
DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Public Insert Access" ON storage.objects;
CREATE POLICY "Public Insert Access"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Public Update Access" ON storage.objects;
CREATE POLICY "Public Update Access"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Public Delete Access" ON storage.objects;
CREATE POLICY "Public Delete Access"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'product-images');

-- 6. DATABASE TABLES RLS (ROW-LEVEL SECURITY) POLICIES
-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- PRODUCTS POLICIES
DROP POLICY IF EXISTS "Allow anon and auth read products" ON public.products;
CREATE POLICY "Allow anon and auth read products"
ON public.products FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Allow anon and auth write products" ON public.products;
CREATE POLICY "Allow anon and auth write products"
ON public.products FOR INSERT
TO public
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon and auth update products" ON public.products;
CREATE POLICY "Allow anon and auth update products"
ON public.products FOR UPDATE
TO public
USING (true);

DROP POLICY IF EXISTS "Allow anon and auth delete products" ON public.products;
CREATE POLICY "Allow anon and auth delete products"
ON public.products FOR DELETE
TO public
USING (true);

-- CATEGORIES POLICIES
DROP POLICY IF EXISTS "Allow anon and auth read categories" ON public.categories;
CREATE POLICY "Allow anon and auth read categories"
ON public.categories FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Allow anon and auth write categories" ON public.categories;
CREATE POLICY "Allow anon and auth write categories"
ON public.categories FOR ALL
TO public
USING (true);

-- CUSTOMERS POLICIES
DROP POLICY IF EXISTS "Allow anon and auth read customers" ON public.customers;
CREATE POLICY "Allow anon and auth read customers"
ON public.customers FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Allow anon and auth write customers" ON public.customers;
CREATE POLICY "Allow anon and auth write customers"
ON public.customers FOR ALL
TO public
USING (true);

-- ORDERS POLICIES
DROP POLICY IF EXISTS "Allow anon and auth read orders" ON public.orders;
CREATE POLICY "Allow anon and auth read orders"
ON public.orders FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Allow anon and auth write orders" ON public.orders;
CREATE POLICY "Allow anon and auth write orders"
ON public.orders FOR ALL
TO public
USING (true);

-- 7. INVENTORY MODULE: SUPPLIERS TABLE
CREATE TABLE IF NOT EXISTS public.suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  city TEXT DEFAULT 'Lahore',
  address TEXT,
  payment_terms TEXT DEFAULT 'Cash',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. INVENTORY MODULE: PURCHASES TABLE
CREATE TABLE IF NOT EXISTS public.purchases (
  id TEXT PRIMARY KEY,
  purchase_number TEXT UNIQUE NOT NULL,
  supplier_id TEXT,
  supplier_name TEXT NOT NULL,
  purchase_date TIMESTAMPTZ DEFAULT NOW(),
  reference_invoice_no TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_items INTEGER DEFAULT 0,
  total_amount NUMERIC(12, 2) DEFAULT 0,
  paid_amount NUMERIC(12, 2) DEFAULT 0,
  payment_status TEXT DEFAULT 'paid',
  payment_method TEXT DEFAULT 'Cash',
  status TEXT DEFAULT 'received',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. INVENTORY RLS POLICIES
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read suppliers" ON public.suppliers;
CREATE POLICY "Allow read suppliers"
ON public.suppliers FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Allow write suppliers" ON public.suppliers;
CREATE POLICY "Allow write suppliers"
ON public.suppliers FOR ALL
TO public
USING (true);

DROP POLICY IF EXISTS "Allow read purchases" ON public.purchases;
CREATE POLICY "Allow read purchases"
ON public.purchases FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Allow write purchases" ON public.purchases;
CREATE POLICY "Allow write purchases"
ON public.purchases FOR ALL
TO public
USING (true);

-- 10. SEED DEFAULT SUPPLIERS
INSERT INTO public.suppliers (id, name, contact_person, phone, city, address, payment_terms, notes)
VALUES
  ('sup-1', 'Hall Road Mobile Parts Importers', 'Haji Abdul Rehman', '0300-8456123', 'Lahore', 'Shop # 18, Bilal Centre, Hall Road, Lahore', '15 Days Credit', 'Direct container importer of LCD units and OCA glasses.'),
  ('sup-2', 'China Direct Tech Shenzhen', 'Mr. Lin / Ali Raza', '0321-4567890', 'Karachi', 'Saddar Electronic Market, Karachi', 'Cash on Bilty / Cargo', 'Original IC charging flexes and side keys supplier.'),
  ('sup-3', 'Hafeez Center Wholesale Hub', 'Mian Tariq', '0333-7890123', 'Lahore', 'Basement Shop 4, Hafeez Center, Gulberg, Lahore', 'Cash', 'Local urgent supplies for batteries and tools.')
ON CONFLICT (id) DO NOTHING;

-- 11. REFRESH SCHEMA CACHE
NOTIFY pgrst, 'reload schema';

