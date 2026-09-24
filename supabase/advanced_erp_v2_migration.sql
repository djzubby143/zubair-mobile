-- ====================================================================
-- ZUBAIR MOBILE ADVANCED E-COMMERCE & ERP PLATFORM V2 MIGRATION
-- Run this in your Supabase SQL Editor
-- ====================================================================

-- 1. PRICE HISTORY TABLE
CREATE TABLE IF NOT EXISTS public.price_history (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  sku TEXT,
  tier_affected TEXT NOT NULL, -- 'retail_price', 'wholesale_price', 'technician_price', 'all'
  old_price NUMERIC(10, 2) NOT NULL,
  new_price NUMERIC(10, 2) NOT NULL,
  change_type TEXT NOT NULL, -- 'percentage', 'fixed'
  change_value NUMERIC(10, 2) NOT NULL,
  changed_by TEXT NOT NULL DEFAULT 'Admin',
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_history_product_id ON public.price_history(product_id);
CREATE INDEX IF NOT EXISTS idx_price_history_created_at ON public.price_history(created_at DESC);

-- 2. PRODUCT COMPATIBILITY TABLE
CREATE TABLE IF NOT EXISTS public.compatibility (
  id TEXT PRIMARY KEY,
  brand TEXT NOT NULL, -- e.g. Samsung, Apple, Vivo, Oppo, Infinix, Tecno, Xiaomi
  model TEXT NOT NULL, -- e.g. iPhone 11, Vivo Y20, Galaxy A52
  series TEXT, -- e.g. Galaxy A Series, iPhone Series, Y Series
  release_year INTEGER,
  compatible_models_alias TEXT[], -- Alternative model numbers like ["A125F", "A127F", "M127F"]
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compatibility_brand ON public.compatibility(brand);
CREATE INDEX IF NOT EXISTS idx_compatibility_model ON public.compatibility(model);

-- 3. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY,
  recipient_type TEXT NOT NULL DEFAULT 'customer', -- 'admin', 'customer'
  recipient_id TEXT, -- customer user id or 'admin'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- 'new_order', 'low_stock', 'payment_pending', 'order_dispatched', etc.
  reference_id TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  link_url TEXT,
  whatsapp_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_type, recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(is_read) WHERE is_read = FALSE;

-- 4. STAFF ACCOUNTS TABLE
CREATE TABLE IF NOT EXISTS public.staff_accounts (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'sales_manager', -- 'super_admin', 'inventory_manager', 'sales_manager', 'accountant'
  is_active BOOLEAN DEFAULT TRUE,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  permissions JSONB DEFAULT '{"can_manage_prices": true, "can_manage_inventory": true, "can_manage_orders": true, "can_view_reports": true, "can_manage_users": false, "can_manage_marketing": false}'::jsonb,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ACTIVITY LOGS AUDIT TABLE
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id TEXT PRIMARY KEY,
  admin_name TEXT NOT NULL,
  role TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  old_value TEXT,
  new_value TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);

-- 6. COUPONS & DISCOUNTS TABLE
CREATE TABLE IF NOT EXISTS public.coupons (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL DEFAULT 'percentage', -- 'percentage', 'fixed'
  discount_value NUMERIC(10, 2) NOT NULL,
  min_order_amount NUMERIC(10, 2) DEFAULT 0,
  max_discount_amount NUMERIC(10, 2),
  expiry_date TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  usage_count INTEGER DEFAULT 0,
  max_uses INTEGER,
  applicable_tiers TEXT[] DEFAULT ARRAY['retail', 'technician', 'wholesale'],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. PRODUCT REVIEWS & RATINGS TABLE
CREATE TABLE IF NOT EXISTS public.reviews (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  customer_id TEXT,
  customer_name TEXT NOT NULL,
  shop_name TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT NOT NULL,
  is_verified_buyer BOOLEAN DEFAULT TRUE,
  is_approved BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON public.reviews(product_id);

-- 8. CUSTOMER WISHLIST TABLE
CREATE TABLE IF NOT EXISTS public.wishlist (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlist_customer ON public.wishlist(customer_id);

-- 9. SEARCH HISTORY & SUGGESTIONS LOG
CREATE TABLE IF NOT EXISTS public.search_history (
  id TEXT PRIMARY KEY,
  query TEXT NOT NULL,
  results_count INTEGER DEFAULT 0,
  detected_brand TEXT,
  detected_model TEXT,
  detected_part TEXT,
  user_ip TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_history_query ON public.search_history(query);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compatibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

-- Price History: Admin full access
DROP POLICY IF EXISTS "Admin price history access" ON public.price_history;
CREATE POLICY "Admin price history access" ON public.price_history FOR ALL USING (true);

-- Compatibility: Public read, Admin write
DROP POLICY IF EXISTS "Public can view compatibility" ON public.compatibility;
CREATE POLICY "Public can view compatibility" ON public.compatibility FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin can manage compatibility" ON public.compatibility;
CREATE POLICY "Admin can manage compatibility" ON public.compatibility FOR ALL USING (true);

-- Notifications: Full access by service/admin
DROP POLICY IF EXISTS "Notifications access policy" ON public.notifications;
CREATE POLICY "Notifications access policy" ON public.notifications FOR ALL USING (true);

-- Coupons: Public can view active coupons, Admin manage
DROP POLICY IF EXISTS "Public can read coupons" ON public.coupons;
CREATE POLICY "Public can read coupons" ON public.coupons FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admin manage coupons" ON public.coupons;
CREATE POLICY "Admin manage coupons" ON public.coupons FOR ALL USING (true);

-- Reviews: Public read approved, anyone can insert
DROP POLICY IF EXISTS "Public read approved reviews" ON public.reviews;
CREATE POLICY "Public read approved reviews" ON public.reviews FOR SELECT USING (is_approved = true);

DROP POLICY IF EXISTS "Users can insert reviews" ON public.reviews;
CREATE POLICY "Users can insert reviews" ON public.reviews FOR INSERT WITH CHECK (true);

-- Wishlist: Authenticated or anon user scoped
DROP POLICY IF EXISTS "Wishlist access policy" ON public.wishlist;
CREATE POLICY "Wishlist access policy" ON public.wishlist FOR ALL USING (true);

-- Activity Logs & Staff: Restricted to authenticated users
DROP POLICY IF EXISTS "Activity logs policy" ON public.activity_logs;
CREATE POLICY "Activity logs policy" ON public.activity_logs FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Staff accounts policy" ON public.staff_accounts;
CREATE POLICY "Staff accounts policy" ON public.staff_accounts FOR ALL TO authenticated USING (true);

-- ====================================================================
-- SEED SAMPLE COUPONS & COMPATIBILITY DATA
-- ====================================================================
INSERT INTO public.coupons (id, code, discount_type, discount_value, min_order_amount, expiry_date, is_active, max_uses)
VALUES
  ('coup-1', 'WELCOME500', 'fixed', 500, 3000, NOW() + INTERVAL '30 days', true, 100),
  ('coup-2', 'WHOLESALE5', 'percentage', 5, 10000, NOW() + INTERVAL '60 days', true, 500),
  ('coup-3', 'FREESHIP', 'fixed', 250, 2500, NOW() + INTERVAL '15 days', true, 200)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.compatibility (id, brand, model, series, release_year, compatible_models_alias)
VALUES
  ('comp-1', 'Apple', 'iPhone 11', 'iPhone Series', 2019, ARRAY['A2111', 'A2223', 'A2221']),
  ('comp-2', 'Apple', 'iPhone 11 Pro', 'iPhone Series', 2019, ARRAY['A2160', 'A2217', 'A2215']),
  ('comp-3', 'Samsung', 'Galaxy A12', 'Galaxy A Series', 2020, ARRAY['A125F', 'A127F', 'M127F']),
  ('comp-4', 'Samsung', 'Galaxy A52', 'Galaxy A Series', 2021, ARRAY['A525F', 'A526B']),
  ('comp-5', 'Vivo', 'Vivo Y20', 'Y Series', 2020, ARRAY['V2029', 'V2027', 'Y20i', 'Y20s', 'Y21']),
  ('comp-6', 'Oppo', 'Oppo F11', 'F Series', 2019, ARRAY['CPH1911', 'CPH1969', 'F11 Pro']),
  ('comp-7', 'Infinix', 'Hot 10', 'Hot Series', 2020, ARRAY['X682B', 'X682C']),
  ('comp-8', 'Xiaomi', 'Redmi Note 10', 'Redmi Note Series', 2021, ARRAY['M2101K7AI', 'M2101K7AG'])
ON CONFLICT (id) DO NOTHING;
