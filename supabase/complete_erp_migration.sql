-- ====================================================================
-- ZUBAIR MOBILE: COMPLETE E-COMMERCE + ERP SUPABASE MIGRATION
-- Run this in Supabase SQL Editor to support the entire ERP Platform
-- ====================================================================

-- 1. EXTEND PRODUCTS TABLE FOR MOBILE SPARE PARTS
ALTER TABLE IF EXISTS public.products
  ADD COLUMN IF NOT EXISTS wholesale_price NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS technician_price NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS retail_price NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS min_order_quantity INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS min_stock_level INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS brand TEXT,
  ADD COLUMN IF NOT EXISTS model TEXT,
  ADD COLUMN IF NOT EXISTS compatible_models TEXT,
  ADD COLUMN IF NOT EXISTS part_type TEXT,
  ADD COLUMN IF NOT EXISTS quality_grade TEXT DEFAULT 'Original',
  ADD COLUMN IF NOT EXISTS warranty TEXT DEFAULT 'No Warranty',
  ADD COLUMN IF NOT EXISTS barcode TEXT,
  ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;

-- 2. EXTEND / CREATE CUSTOMERS TABLE FOR ADVANCED CUSTOMER & KHATA SYSTEM
CREATE TABLE IF NOT EXISTS public.customers (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  full_name TEXT NOT NULL,
  shop_name TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  city TEXT DEFAULT 'Gujranwala',
  address TEXT,
  role TEXT DEFAULT 'customer',
  pricing_tier TEXT DEFAULT 'retail',
  customer_type TEXT DEFAULT 'retail',
  status TEXT DEFAULT 'active',
  approval_status TEXT DEFAULT 'active',
  credit_limit NUMERIC(12, 2) DEFAULT 0,
  balance NUMERIC(12, 2) DEFAULT 0,
  last_login TIMESTAMPTZ,
  total_orders INTEGER DEFAULT 0,
  total_purchase_amount NUMERIC(12, 2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all customer columns exist if table was already created
ALTER TABLE IF EXISTS public.customers
  ADD COLUMN IF NOT EXISTS pricing_tier TEXT DEFAULT 'retail',
  ADD COLUMN IF NOT EXISTS customer_type TEXT DEFAULT 'retail',
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance NUMERIC(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS total_orders INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_purchase_amount NUMERIC(12, 2) DEFAULT 0;

-- 3. CREATE / EXTEND ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  customer_id TEXT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  shop_name TEXT,
  order_notes TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_items INTEGER DEFAULT 1,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  delivery_charges NUMERIC(10, 2) DEFAULT 0,
  paid_amount NUMERIC(12, 2) DEFAULT 0,
  payment_status TEXT DEFAULT 'unpaid',
  payment_notes TEXT,
  total_cost NUMERIC(12, 2) DEFAULT 0,
  total_profit NUMERIC(12, 2) DEFAULT 0,
  status TEXT DEFAULT 'pending', -- pending, confirmed, packed, dispatched, delivered, cancelled
  cargo_name TEXT,
  tracking_number TEXT,
  dispatch_date TIMESTAMPTZ,
  delivery_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.orders
  ADD COLUMN IF NOT EXISTS delivery_charges NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cargo_name TEXT,
  ADD COLUMN IF NOT EXISTS tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS dispatch_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivery_notes TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 4. CREATE ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id TEXT,
  product_name TEXT NOT NULL,
  sku TEXT,
  price NUMERIC(10, 2) NOT NULL,
  purchase_price NUMERIC(10, 2) DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  subtotal NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CREATE SUPPLIERS TABLE
CREATE TABLE IF NOT EXISTS public.suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  city TEXT DEFAULT 'Lahore',
  address TEXT,
  payment_terms TEXT DEFAULT 'Cash',
  balance NUMERIC(12, 2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. CREATE PURCHASES TABLE
CREATE TABLE IF NOT EXISTS public.purchases (
  id TEXT PRIMARY KEY,
  purchase_number TEXT UNIQUE NOT NULL,
  supplier_id TEXT REFERENCES public.suppliers(id) ON DELETE SET NULL,
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

-- 7. CREATE STOCK MOVEMENTS AUDIT LOG TABLE
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  sku TEXT,
  movement_type TEXT NOT NULL, -- purchase, sale, adjustment, damage, return
  quantity INTEGER NOT NULL,
  previous_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  reason TEXT,
  reference_id TEXT,
  created_by TEXT DEFAULT 'Admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. CREATE EXPENSES TABLE
CREATE TABLE IF NOT EXISTS public.expenses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL, -- Cargo & Freight, Packaging & Supplies, Shop Rent & Bills, Salaries, Refreshments, Repairs & Maintenance, Other
  amount NUMERIC(12, 2) NOT NULL,
  date TIMESTAMPTZ DEFAULT NOW(),
  payment_method TEXT DEFAULT 'Cash',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. CREATE PAYMENTS & LEDGER TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.payments (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL, -- customer, supplier
  entity_id TEXT NOT NULL,
  entity_name TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  payment_method TEXT DEFAULT 'Cash',
  reference_no TEXT,
  payment_date TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. ENABLE ROW LEVEL SECURITY (RLS) & PUBLIC READ ACCESS POLICIES
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Allow anon & service roles full access to run queries
DO $$
BEGIN
  DROP POLICY IF EXISTS "Public access on customers" ON public.customers;
  CREATE POLICY "Public access on customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public access on orders" ON public.orders;
  CREATE POLICY "Public access on orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public access on order_items" ON public.order_items;
  CREATE POLICY "Public access on order_items" ON public.order_items FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public access on suppliers" ON public.suppliers;
  CREATE POLICY "Public access on suppliers" ON public.suppliers FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public access on purchases" ON public.purchases;
  CREATE POLICY "Public access on purchases" ON public.purchases FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public access on stock_movements" ON public.stock_movements;
  CREATE POLICY "Public access on stock_movements" ON public.stock_movements FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public access on expenses" ON public.expenses;
  CREATE POLICY "Public access on expenses" ON public.expenses FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public access on payments" ON public.payments;
  CREATE POLICY "Public access on payments" ON public.payments FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 11. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_pricing_tier ON public.customers(pricing_tier);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON public.orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_stock_movements_prod ON public.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON public.purchases(supplier_id);
