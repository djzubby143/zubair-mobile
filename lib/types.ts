export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  subcategories?: string[];
  created_at?: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  category_id?: string | null;
  category?: Category | null;
  price: number;
  stock_quantity: number;
  short_description?: string | null;
  description?: string | null;
  image_url?: string | null;
  featured?: boolean;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image_url?: string | null;
  quantity: number;
  stock_quantity: number;
  sku?: string;
}
