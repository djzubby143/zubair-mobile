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
  price: number; // Wholesale / Base Trade Price
  wholesale_price?: number | null; // Explicit Wholesale Selling Price
  technician_price?: number | null; // Special Technician / Repairman Price
  retail_price?: number | null; // Retail Selling Price (Publicly visible)
  purchase_price?: number | null; // Cost / Purchase Price (Admin-only)
  min_order_quantity?: number; // Minimum Order Quantity (MOQ)
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
  technician_price?: number | null;
  retail_price?: number | null;
  purchase_price?: number | null;
  pricing_tier?: "retail" | "technician" | "wholesale";
  image_url?: string | null;
  quantity: number;
  min_order_quantity?: number;
  stock_quantity: number;
  sku?: string;
}

export interface CustomerUser {
  id: string;
  username: string;
  password: string;
  full_name: string;
  shop_name: string;
  phone: string;
  city: string;
  address: string;
  role: string;
  status: "active" | "inactive";
  pricing_tier?: "retail" | "technician" | "wholesale";
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}


