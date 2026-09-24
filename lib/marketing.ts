import { supabase } from "@/lib/supabase";
import { Coupon, ProductReview, WishlistItem, Product } from "@/lib/types";

export const STORAGE_KEY_COUPONS = "zubair_mobile_coupons";
export const STORAGE_KEY_REVIEWS = "zubair_mobile_reviews";
export const STORAGE_KEY_WISHLIST = "zubair_mobile_wishlist";
export const STORAGE_KEY_RECENTLY_VIEWED = "zubair_recently_viewed_products";

export const DEFAULT_COUPONS: Coupon[] = [
  {
    id: "coup-1",
    code: "WELCOME500",
    discount_type: "fixed",
    discount_value: 500,
    min_order_amount: 3000,
    expiry_date: new Date(Date.now() + 30 * 86400000).toISOString(),
    is_active: true,
    usage_count: 12,
    max_uses: 100,
    applicable_tiers: ["retail", "technician", "wholesale"],
  },
  {
    id: "coup-2",
    code: "WHOLESALE5",
    discount_type: "percentage",
    discount_value: 5,
    min_order_amount: 10000,
    max_discount_amount: 2500,
    expiry_date: new Date(Date.now() + 60 * 86400000).toISOString(),
    is_active: true,
    usage_count: 48,
    max_uses: 500,
    applicable_tiers: ["wholesale", "technician"],
  },
  {
    id: "coup-3",
    code: "FREESHIP",
    discount_type: "fixed",
    discount_value: 250,
    min_order_amount: 2500,
    expiry_date: new Date(Date.now() + 15 * 86400000).toISOString(),
    is_active: true,
    usage_count: 31,
    max_uses: 200,
    applicable_tiers: ["retail", "technician", "wholesale"],
  },
];

export const DEFAULT_REVIEWS: ProductReview[] = [
  {
    id: "rev-1",
    product_id: "p-1",
    customer_name: "Ali Raza",
    shop_name: "Ali Telecom Gujranwala",
    rating: 5,
    review_text: "Sunlong fitting 100% perfect hai, touch responsiveness bohat smooth hai. Zubair Mobile se hamesha behtareen maal milta hai.",
    is_verified_buyer: true,
    is_approved: true,
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: "rev-2",
    product_id: "p-1",
    customer_name: "Kamran Technician",
    shop_name: "Master Lab Lahore",
    rating: 5,
    review_text: "Original brightness and clear colors. Wholesale packaging was solid with bubble wrap.",
    is_verified_buyer: true,
    is_approved: true,
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
  {
    id: "rev-3",
    product_id: "p-5",
    customer_name: "Usman Ghani",
    shop_name: "Ghani Telecom",
    rating: 5,
    review_text: "Samsung A12 unit framed smoothly. No touch lag. Recommended for all technicians.",
    is_verified_buyer: true,
    is_approved: true,
    created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
];

/**
 * Coupon Management
 */
export async function getCoupons(): Promise<Coupon[]> {
  try {
    const { data, error } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
    if (!error && data && data.length > 0) {
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY_COUPONS, JSON.stringify(data));
      }
      return data as Coupon[];
    }
  } catch {}

  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_COUPONS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
  }
  return DEFAULT_COUPONS;
}

export async function saveCoupon(coupon: Omit<Coupon, "id"> & { id?: string }): Promise<Coupon> {
  const coupons = await getCoupons();
  const id = coupon.id || `coup-${Date.now()}`;
  const record: Coupon = { ...coupon, id };

  try {
    await supabase.from("coupons").upsert([record]);
  } catch {}

  if (typeof window !== "undefined") {
    try {
      const existing = coupons.filter((c) => c.id !== id);
      const updated = [record, ...existing];
      localStorage.setItem(STORAGE_KEY_COUPONS, JSON.stringify(updated));
      window.dispatchEvent(new Event("zubair_coupons_updated"));
    } catch {}
  }
  return record;
}

export const getActiveCoupons = getCoupons;

export async function createCoupon(
  couponData: Partial<Coupon> & { code: string; discount_value: number; discount_type: "percentage" | "fixed" }
): Promise<Coupon> {
  return saveCoupon({
    id: `coup-${Date.now()}`,
    code: couponData.code.toUpperCase(),
    discount_type: couponData.discount_type,
    discount_value: couponData.discount_value,
    min_order_amount: couponData.min_purchase ?? couponData.min_order_amount ?? 1000,
    min_purchase: couponData.min_purchase ?? couponData.min_order_amount ?? 1000,
    max_discount_amount: couponData.max_discount ?? couponData.max_discount_amount,
    max_discount: couponData.max_discount ?? couponData.max_discount_amount,
    expiry_date: couponData.valid_until || couponData.expiry_date || new Date(Date.now() + 30 * 86400000).toISOString(),
    valid_until: couponData.valid_until || couponData.expiry_date || new Date(Date.now() + 30 * 86400000).toISOString(),
    is_active: couponData.is_active ?? true,
    usage_count: couponData.usage_count || 0,
    max_uses: couponData.usage_limit ?? couponData.max_uses ?? 100,
    usage_limit: couponData.usage_limit ?? couponData.max_uses ?? 100,
    applicable_tiers: couponData.applicable_tiers || ["retail", "technician", "wholesale"],
  } as Coupon);
}

export function validateCoupon(
  code: string,
  subtotal: number,
  tier: "retail" | "technician" | "wholesale" = "retail"
): { isValid: boolean; discountAmount: number; coupon?: Coupon; error?: string } {
  const cleanCode = code.trim().toUpperCase();
  let couponList = DEFAULT_COUPONS;

  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_COUPONS);
      if (stored) couponList = JSON.parse(stored);
    } catch {}
  }

  const found = couponList.find((c) => c.code.toUpperCase() === cleanCode);
  if (!found) {
    return { isValid: false, discountAmount: 0, error: `Coupon code "${cleanCode}" is invalid.` };
  }

  if (!found.is_active) {
    return { isValid: false, discountAmount: 0, error: `Coupon "${cleanCode}" is currently inactive.` };
  }

  const expiry = found.expiry_date || found.valid_until;
  if (expiry && new Date(expiry).getTime() < Date.now()) {
    return { isValid: false, discountAmount: 0, error: `Coupon "${cleanCode}" has expired.` };
  }

  if (found.min_order_amount && subtotal < found.min_order_amount) {
    return {
      isValid: false,
      discountAmount: 0,
      error: `Minimum order amount of Rs. ${found.min_order_amount.toLocaleString()} required for this coupon.`,
    };
  }

  if (found.applicable_tiers && !found.applicable_tiers.includes(tier)) {
    return {
      isValid: false,
      discountAmount: 0,
      error: `This coupon is not valid for your current customer tier (${tier}).`,
    };
  }

  let discount = 0;
  if (found.discount_type === "percentage") {
    discount = Math.round((subtotal * found.discount_value) / 100);
    if (found.max_discount_amount && discount > found.max_discount_amount) {
      discount = found.max_discount_amount;
    }
  } else {
    discount = Math.min(subtotal, found.discount_value);
  }

  return { isValid: true, discountAmount: discount, coupon: found };
}

/**
 * Reviews & Ratings
 */
export async function getProductReviews(productId?: string): Promise<ProductReview[]> {
  try {
    let q = supabase.from("reviews").select("*").eq("is_approved", true).order("created_at", { ascending: false });
    if (productId) q = q.eq("product_id", productId);
    const { data, error } = await q;
    if (!error && data && data.length > 0) {
      return data as ProductReview[];
    }
  } catch {}

  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_REVIEWS);
      if (stored) {
        const parsed: ProductReview[] = JSON.parse(stored);
        if (productId) return parsed.filter((r) => r.product_id === productId);
        return parsed;
      }
    } catch {}
  }

  if (productId) return DEFAULT_REVIEWS.filter((r) => r.product_id === productId);
  return DEFAULT_REVIEWS;
}

export async function addProductReview(review: Omit<ProductReview, "id" | "created_at">): Promise<ProductReview> {
  const newReview: ProductReview = {
    id: `rev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    ...review,
    created_at: new Date().toISOString(),
  };

  try {
    await supabase.from("reviews").insert([newReview]);
  } catch {}

  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_REVIEWS);
      const list = stored ? JSON.parse(stored) : DEFAULT_REVIEWS;
      const updated = [newReview, ...list];
      localStorage.setItem(STORAGE_KEY_REVIEWS, JSON.stringify(updated));
      window.dispatchEvent(new Event("zubair_reviews_updated"));
    } catch {}
  }
  return newReview;
}

/**
 * Wishlist
 */
export function getWishlist(customerId: string = "guest"): WishlistItem[] {
  if (typeof window === "undefined") return [];
  try {
    const key = customerId ? `${STORAGE_KEY_WISHLIST}_${customerId}` : STORAGE_KEY_WISHLIST;
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
}

export function removeFromWishlist(productId: string, customerId: string = "guest"): void {
  if (typeof window === "undefined") return;
  try {
    const key = customerId ? `${STORAGE_KEY_WISHLIST}_${customerId}` : STORAGE_KEY_WISHLIST;
    const list = getWishlist(customerId);
    const updated = list.filter((item) => item.product_id !== productId);
    localStorage.setItem(key, JSON.stringify(updated));
    window.dispatchEvent(new Event("zubair_wishlist_updated"));
  } catch {}
}

export function toggleWishlistItem(customerId: string = "guest", product: Product): boolean {
  if (typeof window === "undefined" || !product) return false;
  try {
    const key = customerId ? `${STORAGE_KEY_WISHLIST}_${customerId}` : STORAGE_KEY_WISHLIST;
    const list = getWishlist(customerId);
    const exists = list.some((item) => item.product_id === product.id);

    let updated: WishlistItem[];
    if (exists) {
      updated = list.filter((item) => item.product_id !== product.id);
    } else {
      updated = [
        {
          id: `wish-${Date.now()}`,
          customer_id: customerId,
          product_id: product.id,
          product_name: product.name,
          product_slug: product.slug,
          image_url: product.image_url,
          price: product.price,
          created_at: new Date().toISOString(),
        },
        ...list,
      ];
    }
    localStorage.setItem(key, JSON.stringify(updated));
    window.dispatchEvent(new Event("zubair_wishlist_updated"));
    return !exists;
  } catch {
    return false;
  }
}

export function isInWishlist(customerId: string = "guest", productId: string): boolean {
  if (typeof window === "undefined") return false;
  const list = getWishlist(customerId);
  return list.some((item) => item.product_id === productId);
}

/**
 * Recently Viewed Products
 */
export function getRecentlyViewed(): Product[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY_RECENTLY_VIEWED);
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
}

export function addRecentlyViewed(product: Product): void {
  if (typeof window === "undefined" || !product || !product.id) return;
  try {
    const list = getRecentlyViewed().filter((p) => p.id !== product.id);
    const updated = [product, ...list].slice(0, 10);
    localStorage.setItem(STORAGE_KEY_RECENTLY_VIEWED, JSON.stringify(updated));
  } catch {}
}
