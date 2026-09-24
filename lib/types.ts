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
  cost_price?: number | null; // Alias for purchase_price
  min_order_quantity?: number; // Minimum Order Quantity (MOQ)
  stock_quantity: number;
  stock?: number; // Alias for stock_quantity
  min_stock_level?: number; // Low stock alert threshold (default: 5)
  low_stock_alert?: number; // Alias for min_stock_level
  sales_count?: number; // Total units sold
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
  name?: string; // Convenience alias for full_name
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

export type Customer = CustomerUser;
export type { Order, OrderItem } from "./orders";

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

// ----------------------------------------------------
// 1. SMART PRICE MANAGEMENT
// ----------------------------------------------------
export interface PriceHistoryEntry {
  id: string;
  product_id: string;
  product_name?: string;
  sku?: string;
  tier_affected?: "retail_price" | "wholesale_price" | "technician_price" | "all";
  tier?: "retail_price" | "wholesale_price" | "technician_price" | "all"; // Alias
  old_price: number;
  new_price: number;
  change_type: "percentage" | "fixed";
  change_value: number; // e.g. +5% or +100 Rs
  changed_by: string; // Admin username
  reason?: string;
  created_at: string;
}

// ----------------------------------------------------
// 2. PRODUCT COMPATIBILITY ENGINE
// ----------------------------------------------------
export interface CompatibilityDevice {
  id: string;
  brand: string; // Samsung, Apple, Vivo, Oppo, Infinix, Tecno, Xiaomi, Realme
  model: string; // e.g. iPhone 11, Vivo Y20, Galaxy A52
  model_name?: string; // Alias for model
  model_code?: string; // Hardware code
  series?: string; // e.g. Galaxy A Series, iPhone Series, Y Series
  release_year?: number;
  compatible_models_alias?: string[]; // e.g. ["A125F", "A127F", "M127F"]
  aliases?: string[]; // Alias for compatible_models_alias
  image_url?: string;
}

export type SparePartCategory =
  | "LCD Unit"
  | "Battery"
  | "Charging Flex"
  | "Camera"
  | "OCA Glass"
  | "IC Parts"
  | "Side Key"
  | "Housing / Body"
  | "Speaker / Ringer";

// ----------------------------------------------------
// 3. AI PRODUCT SEARCH SYSTEM
// ----------------------------------------------------
export interface ParsedSearchIntent {
  rawQuery: string;
  brand?: string;
  model?: string;
  category?: string;
  partType?: string;
  qualityGrade?: string;
  tokens: string[];
}

export interface SearchSuggestion {
  text: string;
  type: "product" | "brand" | "model" | "part_type" | "trending";
  count?: number;
  badge?: string;
}

// ----------------------------------------------------
// 4. NOTIFICATION SYSTEM
// ----------------------------------------------------
export type NotificationType =
  | "new_order"
  | "order_status"
  | "low_stock"
  | "payment_pending"
  | "customer_registration"
  | "account_approved"
  | "order_confirmed"
  | "order_packed"
  | "order_dispatched"
  | "order_delivered";

export interface AppNotification {
  id: string;
  recipient_type: "admin" | "customer";
  recipient_id?: string; // customer user id or "admin"
  title: string;
  message: string;
  type: NotificationType;
  reference_id?: string; // order_id, product_id, or user_id
  data?: any;
  is_read: boolean;
  link_url?: string;
  whatsapp_text?: string;
  created_at: string;
}

// ----------------------------------------------------
// 5. SECURITY & STAFF MANAGEMENT
// ----------------------------------------------------
export type AdminStaffRole = "super_admin" | "inventory_manager" | "sales_manager" | "accountant" | "order_manager";

export interface StaffAccount {
  id: string;
  username: string;
  full_name: string;
  name?: string; // alias
  email: string;
  phone?: string;
  role: AdminStaffRole;
  is_active: boolean;
  two_factor_enabled: boolean;
  permissions: {
    can_manage_prices: boolean;
    can_manage_inventory: boolean;
    can_manage_orders: boolean;
    can_view_reports: boolean;
    can_manage_users: boolean;
    can_manage_marketing: boolean;
  };
  last_login?: string;
  created_at: string;
}

export interface ActivityLogEntry {
  id: string;
  admin_name: string;
  user_email?: string;
  user_id?: string;
  role: string;
  action: string; // e.g. "Changed product price", "Dispatched order #1002"
  target_type: "product" | "order" | "customer" | "pricing" | "inventory" | "settings";
  entity_type?: string;
  target_id?: string;
  old_value?: string;
  new_value?: string;
  details?: any;
  ip_address?: string;
  created_at: string;
}

export interface LoginHistoryEntry {
  id: string;
  username: string;
  user_email?: string;
  role: string;
  ip_address: string;
  user_agent: string;
  status: "success" | "failed";
  timestamp: string;
  created_at?: string;
}

// ----------------------------------------------------
// 6. MARKETING FEATURES (COUPONS, REVIEWS, WISHLIST)
// ----------------------------------------------------
export interface Coupon {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number; // e.g. 10 (%) or 500 (PKR)
  min_order_amount?: number;
  min_purchase?: number; // Alias for min_order_amount
  max_discount_amount?: number;
  max_discount?: number; // Alias for max_discount_amount
  expiry_date?: string;
  valid_from?: string;
  valid_until?: string; // Alias for expiry_date
  is_active: boolean;
  usage_count: number;
  max_uses?: number;
  usage_limit?: number; // Alias for max_uses
  applicable_tiers?: ("retail" | "technician" | "wholesale")[];
}

export interface ProductReview {
  id: string;
  product_id: string;
  customer_id?: string;
  customer_name?: string;
  user_name?: string; // Alias for customer_name
  user_email?: string;
  shop_name?: string;
  rating: number; // 1 to 5
  review_text?: string;
  comment?: string; // Alias for review_text
  is_verified_buyer?: boolean;
  verified_purchase?: boolean; // Alias for is_verified_buyer
  is_approved: boolean;
  created_at: string;
}

export interface WishlistItem {
  id: string;
  customer_id: string;
  product_id: string;
  product_name: string;
  product_slug: string;
  image_url?: string | null;
  price: number;
  created_at: string;
}

