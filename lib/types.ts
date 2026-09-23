export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  subcategories?: string[];
  created_at?: string;
}

export type QualityGrade = "Original" | "OEM" | "High Copy" | "Copy";
export type WarrantyPeriod = "7 Days" | "15 Days" | "30 Days" | "No Warranty";

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
  min_stock_level?: number; // Low stock alert threshold (default: 5)
  short_description?: string | null;
  description?: string | null;
  image_url?: string | null;
  images?: string[]; // Multiple Product Images
  featured?: boolean;
  is_active?: boolean;

  // Mobile Spare Part Details
  brand?: string; // e.g. Samsung, Vivo, Oppo, Infinix, Tecno, Xiaomi, Realme, Apple
  model?: string; // e.g. A12, Y20, F11, Spark 6
  compatible_models?: string; // e.g. "A125F, A127F, M127F"
  part_type?: string; // e.g. Charging Flex, LCD Unit, OCA Glass, Battery, Camera, Housing, Side Key, IC
  quality_grade?: QualityGrade; // Original, OEM, High Copy, Copy
  warranty?: WarrantyPeriod; // 7 Days, 15 Days, 30 Days, No Warranty
  barcode?: string; // Barcode / EAN

  created_at?: string;
  updated_at?: string;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  wholesale_price?: number | null;
  technician_price?: number | null;
  retail_price?: number | null;
  purchase_price?: number | null;
  pricing_tier?: "retail" | "technician" | "wholesale";
  image_url?: string | null;
  quantity: number;
  min_order_quantity?: number;
  stock_quantity: number;
  sku?: string;
  quality_grade?: QualityGrade;
  warranty?: WarrantyPeriod;
  brand?: string;
  model?: string;
}

export type CustomerType = "retail" | "technician" | "wholesale";
export type CustomerApprovalStatus = "pending" | "approved" | "rejected" | "active" | "inactive";

export interface CustomerUser {
  id: string;
  username: string;
  password?: string;
  full_name: string;
  shop_name?: string;
  phone: string;
  email?: string;
  city: string;
  address: string;
  role: string;
  status: "active" | "inactive";
  pricing_tier?: "retail" | "technician" | "wholesale";
  customer_type?: CustomerType;
  approval_status?: CustomerApprovalStatus;
  credit_limit?: number; // Khata limit in PKR
  balance?: number; // Outstanding balance owed by customer
  last_login?: string;
  total_orders?: number;
  total_purchase_amount?: number;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type StockMovementType = "purchase" | "sale" | "adjustment" | "damage" | "return";

export interface StockMovement {
  id: string;
  product_id: string;
  product_name: string;
  sku?: string;
  movement_type: StockMovementType;
  quantity: number; // positive for addition, negative for deduction
  previous_stock: number;
  new_stock: number;
  reason?: string;
  reference_id?: string; // Order # or Purchase #
  created_by?: string;
  created_at: string;
}

export interface Expense {
  id: string;
  title: string;
  category: "Cargo & Freight" | "Packaging & Supplies" | "Shop Rent & Bills" | "Salaries" | "Refreshments" | "Repairs & Maintenance" | "Other";
  amount: number;
  date: string;
  payment_method: "Cash" | "Bank Transfer" | "JazzCash / EasyPaisa";
  notes?: string;
  created_at: string;
}

export interface PaymentRecord {
  id: string;
  entity_type: "customer" | "supplier";
  entity_id: string;
  entity_name: string;
  amount: number;
  payment_method: "Cash" | "Bank Transfer" | "JazzCash / EasyPaisa" | "Cargo COD";
  reference_no?: string;
  payment_date: string;
  notes?: string;
  created_at: string;
}
