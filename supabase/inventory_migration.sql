-- ==============================================================================
-- ZUBAIR MOBILE - INVENTORY MANAGEMENT SYSTEM DATABASE MIGRATION
-- Run this in Supabase Dashboard -> SQL Editor -> Run
-- ==============================================================================

-- 1. CREATE SUPPLIERS TABLE
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

-- 2. CREATE PURCHASES TABLE
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

-- 3. ENSURE PRODUCTS HAS STOCK AND COST COLUMNS
ALTER TABLE IF EXISTS public.products
  ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS wholesale_price NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS technician_price NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS retail_price NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_order_quantity INTEGER DEFAULT 1;

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
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

-- 5. INITIAL DEFAULT SUPPLIERS SEED
INSERT INTO public.suppliers (id, name, contact_person, phone, city, address, payment_terms, notes)
VALUES
  ('sup-1', 'Hall Road Mobile Parts Importers', 'Haji Abdul Rehman', '0300-8456123', 'Lahore', 'Shop # 18, Bilal Centre, Hall Road, Lahore', '15 Days Credit', 'Direct container importer of LCD units and OCA glasses.'),
  ('sup-2', 'China Direct Tech Shenzhen', 'Mr. Lin / Ali Raza', '0321-4567890', 'Karachi', 'Saddar Electronic Market, Karachi', 'Cash on Bilty / Cargo', 'Original IC charging flexes and side keys supplier.'),
  ('sup-3', 'Hafeez Center Wholesale Hub', 'Mian Tariq', '0333-7890123', 'Lahore', 'Basement Shop 4, Hafeez Center, Gulberg, Lahore', 'Cash', 'Local urgent supplies for batteries and tools.')
ON CONFLICT (id) DO NOTHING;

-- 6. REFRESH SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
