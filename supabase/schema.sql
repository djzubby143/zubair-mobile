-- ==============================================================================
-- Zubair Mobile - Supabase Database Schema & Storage Configuration
-- Mobile Spare Parts E-Commerce Platform
-- ==============================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. Categories Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for fast lookup by slug
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories (slug);

-- ==============================================================================
-- 3. Products Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    sku TEXT NOT NULL UNIQUE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    short_description TEXT,
    description TEXT,
    image_url TEXT,
    featured BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for querying products
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products (slug);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products (sku);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products (is_active);
CREATE INDEX IF NOT EXISTS idx_products_featured ON public.products (featured);

-- Auto-update updated_at timestamp trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_products_updated_at ON public.products;
CREATE TRIGGER set_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 4. Row Level Security (RLS) Policies
-- ==============================================================================

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Categories RLS:
-- Anyone (authenticated or anon) can read categories
CREATE POLICY "Allow public read access for categories"
    ON public.categories
    FOR SELECT
    USING (true);

-- Authenticated admins can insert, update, delete categories
CREATE POLICY "Allow authenticated admin full CRUD for categories"
    ON public.categories
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Products RLS:
-- Public can read active products (or admins can read all)
CREATE POLICY "Allow public read access for active products"
    ON public.products
    FOR SELECT
    USING (is_active = true);

-- Authenticated admins have full CRUD access to all products
CREATE POLICY "Allow authenticated admin full CRUD for products"
    ON public.products
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ==============================================================================
-- 5. Supabase Storage Configuration ('product-images' bucket)
-- ==============================================================================

-- Create bucket if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'product-images',
    'product-images',
    true,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- Storage RLS: Public can view images
CREATE POLICY "Public Read Access for Product Images"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'product-images');

-- Storage RLS: Authenticated users can upload product images
CREATE POLICY "Authenticated users can upload product images"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'product-images');

-- Storage RLS: Authenticated users can update/delete product images
CREATE POLICY "Authenticated users can update product images"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can delete product images"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'product-images');

-- ==============================================================================
-- 6. Initial Seed Data (Optional for immediate testing)
-- ==============================================================================
INSERT INTO public.categories (name, slug, description)
VALUES
    ('LCD & Touch Units', 'lcd-units', 'Complete LCD touch screen assemblies and black units'),
    ('Charging Flex & Boards', 'charging-flex', 'Sub-boards, charging ribbons, and mic modules'),
    ('OCA Glass & Touch', 'oca-glass', 'Front glass, OCA lenses, and touch digitizers'),
    ('Batteries & Housings', 'batteries-housings', 'Original replacement batteries and phone frames'),
    ('Repair Tools & Supplies', 'repair-tools', 'Heatguns, soldering stations, board grippers, jumper wires')
ON CONFLICT (name) DO NOTHING;
 
-- ==============================================================================
-- 7. Customers & Technicians Table (Manual Admin Registration)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL UNIQUE,       -- Manual User ID or Email
    password TEXT NOT NULL,              -- Admin assigned password
    full_name TEXT NOT NULL,             -- User's full name
    shop_name TEXT NOT NULL,             -- Mobile shop name
    phone TEXT NOT NULL,                 -- Mobile / WhatsApp number
    city TEXT NOT NULL,                  -- City (Gujranwala, Lahore, etc.)
    address TEXT NOT NULL,               -- Full shop address
    role TEXT NOT NULL DEFAULT 'customer', -- 'customer', 'technician', 'wholesaler'
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'inactive'
    notes TEXT,                          -- Optional internal notes
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_customers_username ON public.customers (username);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers (phone);
CREATE INDEX IF NOT EXISTS idx_customers_city ON public.customers (city);
CREATE INDEX IF NOT EXISTS idx_customers_status ON public.customers (status);

-- Auto-update updated_at timestamp trigger for customers
DROP TRIGGER IF EXISTS set_customers_updated_at ON public.customers;
CREATE TRIGGER set_customers_updated_at
    BEFORE UPDATE ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Allow authenticated admins full CRUD
CREATE POLICY "Allow authenticated admin full CRUD for customers"
    ON public.customers
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Allow public/anon read access for customer login authentication
CREATE POLICY "Allow public read access for active customers"
    ON public.customers
    FOR SELECT
    TO anon
    USING (status = 'active');

-- ==============================================================================
-- 8. Site Settings Table (Hero Banner, Offers, Store Configuration)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.site_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read for site_settings"
    ON public.site_settings
    FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Allow authenticated admin full CRUD for site_settings"
    ON public.site_settings
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

