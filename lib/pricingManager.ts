import { supabase } from "@/lib/supabase";
import { Product, PriceHistoryEntry } from "@/lib/types";
import { getCustomProducts, saveCustomProducts } from "@/lib/customProducts";
import { DEFAULT_CATALOG_PRODUCTS } from "@/lib/products";

export const STORAGE_KEY_PRICE_HISTORY = "zubair_mobile_price_history";

export const DEFAULT_PRICE_HISTORY: PriceHistoryEntry[] = [
  {
    id: "ph-1",
    product_id: "p-1",
    product_name: "VIVO Y20 SUNLONG BLACK UNIT",
    sku: "ZB-LCD-V20S",
    tier_affected: "wholesale_price",
    old_price: 1800,
    new_price: 1850,
    change_type: "fixed",
    change_value: 50,
    changed_by: "Admin Zubair",
    reason: "Supplier raw material price hike (Lahore Container)",
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: "ph-2",
    product_id: "p-5",
    product_name: "SAMSUNG A12-A13 5G BLACK UNIT",
    sku: "ZB-LCD-SA12",
    tier_affected: "all",
    old_price: 2150,
    new_price: 2250,
    change_type: "percentage",
    change_value: 4.65,
    changed_by: "Admin Zubair",
    reason: "Bulk 5% currency rate adjustment across Samsung LCDs",
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
];

/**
 * Retrieve full price adjustment history from Supabase or localStorage fallback
 */
export async function getPriceHistory(productId?: string, limit?: number): Promise<PriceHistoryEntry[]> {
  try {
    let query = supabase
      .from("price_history")
      .select("*")
      .order("created_at", { ascending: false });

    if (productId) query = query.eq("product_id", productId);
    if (limit) query = query.limit(limit);

    const { data, error } = await query;

    if (!error && data && data.length > 0) {
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY_PRICE_HISTORY, JSON.stringify(data));
      }
      return data as PriceHistoryEntry[];
    }
  } catch (err) {
    console.warn("Supabase price_history read error, falling back to local:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PRICE_HISTORY);
      if (stored) {
        let parsed = JSON.parse(stored);
        if (productId) parsed = parsed.filter((e: any) => e.product_id === productId);
        if (limit) parsed = parsed.slice(0, limit);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
  }

  let list = DEFAULT_PRICE_HISTORY;
  if (productId) list = list.filter((e) => e.product_id === productId);
  if (limit) list = list.slice(0, limit);
  return list;
}

/**
 * Log a price change audit entry
 */
export async function logPriceChange(entry: Omit<PriceHistoryEntry, "id" | "created_at">): Promise<PriceHistoryEntry> {
  const newEntry: PriceHistoryEntry = {
    id: `ph-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    ...entry,
    created_at: new Date().toISOString(),
  };

  // Sync with Supabase
  try {
    await supabase.from("price_history").insert([newEntry]);
  } catch (err) {
    console.warn("Supabase price_history insert warning:", err);
  }

  // Sync with localStorage
  if (typeof window !== "undefined") {
    try {
      const existing = await getPriceHistory();
      const updated = [newEntry, ...existing];
      localStorage.setItem(STORAGE_KEY_PRICE_HISTORY, JSON.stringify(updated));
      window.dispatchEvent(new Event("zubair_price_history_updated"));
    } catch {}
  }

  return newEntry;
}

export interface BulkPriceOptions {
  category?: string; // e.g. "LCD Unit" or "All"
  brand?: string; // e.g. "Samsung", "Vivo", "Apple", "All"
  selectedProductIds?: string[]; // Specific target products
  tier: "retail_price" | "wholesale_price" | "technician_price" | "all";
  type: "percentage" | "fixed";
  direction: "increase" | "decrease";
  value: number; // e.g. 5 for 5% or 100 for 100 Rs
  changed_by: string;
  reason: string;
}

/**
 * Preview bulk price adjustment on a product without persisting
 */
export function calculateNewPrice(
  currentPrice: number,
  type: "percentage" | "fixed",
  direction: "increase" | "decrease",
  value: number
): number {
  if (!currentPrice || currentPrice <= 0) return currentPrice;
  let delta = 0;
  if (type === "percentage") {
    delta = Math.round((currentPrice * value) / 100);
  } else {
    delta = value;
  }

  const result = direction === "increase" ? currentPrice + delta : Math.max(1, currentPrice - delta);
  return Math.round(result);
}

/**
 * Compute preview of products before applying bulk price update
 */
export function getBulkPricePreview(
  allProducts: Product[],
  brand?: string,
  category?: string,
  targetTier: "retail_price" | "wholesale_price" | "technician_price" | "all" = "all",
  updateType: "percentage" | "fixed" = "percentage",
  direction: "increase" | "decrease" = "increase",
  value: number = 0
): { original: Product; updated: Product }[] {
  if (!value || value <= 0) return [];

  const matched = allProducts.filter((p) => {
    if (brand && brand !== "all" && brand !== "All") {
      const pBrand = p.brand || "";
      const matchesBrand =
        pBrand.toLowerCase().includes(brand.toLowerCase()) ||
        p.name.toLowerCase().includes(brand.toLowerCase());
      if (!matchesBrand) return false;
    }
    if (category && category !== "all" && category !== "All") {
      const catName =
        typeof p.category === "object" && p.category
          ? p.category.name
          : (p.category as any) || p.part_type || "";
      if (!catName.toLowerCase().includes(category.toLowerCase())) return false;
    }
    return true;
  });

  const previewList: { original: Product; updated: Product }[] = [];

  for (const original of matched) {
    const updated = { ...original };
    const tiersToUpdate: ("retail_price" | "wholesale_price" | "technician_price")[] =
      targetTier === "all"
        ? ["retail_price", "wholesale_price", "technician_price"]
        : [targetTier];

    let hasChange = false;
    for (const tier of tiersToUpdate) {
      const currentPrice = (updated[tier] as number) || updated.price || 0;
      if (currentPrice > 0) {
        const newPrice = calculateNewPrice(currentPrice, updateType, direction, value);
        if (newPrice !== currentPrice) {
          updated[tier] = newPrice;
          if (tier === "retail_price") updated.price = newPrice;
          hasChange = true;
        }
      }
    }

    if (hasChange) {
      previewList.push({ original, updated });
    }
  }

  return previewList;
}

/**
 * Execute smart bulk price update across matched products
 */
export async function applyBulkPriceUpdate(
  allProducts: Product[],
  options: BulkPriceOptions | any,
  adminUser?: string
): Promise<{
  updatedCount: number;
  affectedProducts: Product[];
  count: number;
  updatedProducts: Product[];
  logs: any[];
}> {
  const affected: Product[] = [];
  const historyEntries: Omit<PriceHistoryEntry, "id" | "created_at">[] = [];

  const effectiveTier = options.targetTier || options.tier || "all";
  const effectiveType = options.updateType || options.type || "percentage";
  const effectiveDirection = options.direction || "increase";
  const effectiveValue = options.value || 0;
  const effectiveAdmin = adminUser || options.changed_by || "Admin";

  const updatedProducts = allProducts.map((p) => {
    // Check filter match
    if (options.selectedProductIds && options.selectedProductIds.length > 0) {
      if (!options.selectedProductIds.includes(p.id)) return p;
    } else {
      if (options.brand && options.brand !== "All" && options.brand !== "all") {
        const pBrand = p.brand || "";
        const matchesBrand =
          pBrand.toLowerCase().includes(options.brand.toLowerCase()) ||
          p.name.toLowerCase().includes(options.brand.toLowerCase());
        if (!matchesBrand) return p;
      }
      if (options.category && options.category !== "All" && options.category !== "all") {
        const catName =
          typeof p.category === "object" && p.category
            ? p.category.name
            : (p.category as any) || p.part_type || "";
        if (!catName.toLowerCase().includes(options.category.toLowerCase())) return p;
      }
    }

    const modified = { ...p };
    let hasChanged = false;

    // Apply to selected tier(s)
    const tiersToUpdate: ("retail_price" | "wholesale_price" | "technician_price")[] =
      effectiveTier === "all"
        ? ["retail_price", "wholesale_price", "technician_price"]
        : [effectiveTier];

    for (const t of tiersToUpdate) {
      const oldVal = (modified[t] as number) || modified.price || 0;
      if (oldVal > 0) {
        const newVal = calculateNewPrice(oldVal, effectiveType, effectiveDirection, effectiveValue);
        if (newVal !== oldVal) {
          modified[t] = newVal;
          if (t === "retail_price" || effectiveTier === "retail_price") {
            modified.price = newVal;
          }
          hasChanged = true;

          historyEntries.push({
            product_id: p.id,
            product_name: p.name,
            sku: p.sku,
            tier_affected: t,
            tier: t,
            old_price: oldVal,
            new_price: newVal,
            change_type: effectiveType,
            change_value: effectiveDirection === "increase" ? effectiveValue : -effectiveValue,
            changed_by: effectiveAdmin,
            reason: options.reason || `Bulk ${effectiveType} ${effectiveDirection}`,
          });
        }
      }
    }

    if (hasChanged) {
      affected.push(modified);
      return modified;
    }
    return p;
  });

  if (affected.length > 0) {
    // Save to customProducts
    saveCustomProducts(updatedProducts);

    // Record price history
    for (const entry of historyEntries) {
      await logPriceChange(entry);
    }

    // Attempt to sync each updated product with Supabase
    for (const prod of affected) {
      try {
        await supabase
          .from("products")
          .update({
            price: prod.price,
            retail_price: prod.retail_price,
            wholesale_price: prod.wholesale_price,
            technician_price: prod.technician_price,
            updated_at: new Date().toISOString(),
          })
          .eq("id", prod.id);
      } catch (err) {
        console.warn(`Supabase price update error for ${prod.name}:`, err);
      }
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("zubair_products_updated"));
    }
  }

  return {
    updatedCount: affected.length,
    affectedProducts: affected,
    count: affected.length,
    updatedProducts: affected,
    logs: historyEntries,
  };
}
