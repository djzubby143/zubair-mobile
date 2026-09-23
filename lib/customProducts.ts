import { Product } from "./types";
import { supabase } from "./supabase";
import { DEFAULT_CATEGORIES } from "./categories";

export const STORAGE_KEY_CUSTOM_PRODUCTS = "zubair_admin_custom_products";
export const STORAGE_KEY_DELETED_PRODUCTS = "zubair_admin_deleted_products";

/**
 * Retrieve custom products created/edited via Admin panel stored locally.
 */
export function getCustomProducts(): Product[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_PRODUCTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn("Failed to parse custom products:", err);
    return [];
  }
}

/**
 * Retrieve set of deleted product IDs, SKUs, and slugs.
 */
export function getDeletedProductKeys(): Set<string> {
  const set = new Set<string>();
  if (typeof window === "undefined") return set;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DELETED_PRODUCTS);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        for (const k of arr) {
          if (k) set.add(String(k).toLowerCase());
        }
      }
    }
  } catch {}
  return set;
}

/**
 * Broadcast custom product change across tabs and windows
 */
export function broadcastProductChange(action: "added" | "updated" | "deleted", product?: Product) {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(
      new CustomEvent("zubair_products_updated", {
        detail: { action, product },
      })
    );
  } catch (err) {
    console.warn("Failed to broadcast product change:", err);
  }
}

/**
 * Save (create or update) a product:
 * 1. Syncs with backend API (/api/admin/products) which persists on server.
 * 2. Attempts direct Supabase insert/update.
 * 3. Persists to localStorage ("zubair_admin_custom_products").
 * 4. Broadcasts update event.
 */
export async function saveProduct(
  productData: Partial<Product> & { name: string; sku: string; price: number }
): Promise<{ success: boolean; product: Product; error?: string }> {
  // Generate ID if not present
  const id = productData.id || `custom-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const slug =
    productData.slug ||
    productData.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const fullProduct: Product = {
    ...productData,
    id,
    slug,
    name: productData.name.trim(),
    sku: productData.sku.trim().toUpperCase(),
    price: Number(productData.price) || 0,
    wholesale_price:
      productData.wholesale_price !== undefined && productData.wholesale_price !== null
        ? Number(productData.wholesale_price)
        : Number(productData.price) || 0,
    technician_price:
      productData.technician_price !== undefined && productData.technician_price !== null
        ? Number(productData.technician_price)
        : null,
    retail_price:
      productData.retail_price !== undefined && productData.retail_price !== null
        ? Number(productData.retail_price)
        : null,
    purchase_price:
      productData.purchase_price !== undefined && productData.purchase_price !== null
        ? Number(productData.purchase_price)
        : null,
    stock_quantity: Number(productData.stock_quantity) || 0,
    min_order_quantity: Number(productData.min_order_quantity) || 1,
    is_active: productData.is_active !== undefined ? productData.is_active : true,
    featured: productData.featured !== undefined ? productData.featured : false,
    created_at: productData.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (!fullProduct.category && fullProduct.category_id) {
    const match = DEFAULT_CATEGORIES.find((c) => c.id === fullProduct.category_id);
    if (match) {
      fullProduct.category = { id: match.id, name: match.name, slug: match.slug };
    }
  }

  // 1. Try persisting to Server via /api/admin/products
  try {
    const apiRes = await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fullProduct),
    });
    if (apiRes.ok) {
      const json = await apiRes.json();
      if (json.success && json.product) {
        // Updated from server
      }
    }
  } catch (apiErr) {
    console.warn("API /api/admin/products sync warning:", apiErr);
  }

  // 2. Try Supabase direct insert/update
  try {
    // Check if ID is UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
    // First try full record
    const sbRecord: Record<string, unknown> = {
      name: fullProduct.name,
      slug: fullProduct.slug,
      sku: fullProduct.sku,
      category_id: fullProduct.category_id || null,
      price: fullProduct.price,
      wholesale_price: fullProduct.wholesale_price,
      technician_price: fullProduct.technician_price,
      retail_price: fullProduct.retail_price,
      purchase_price: fullProduct.purchase_price,
      min_order_quantity: fullProduct.min_order_quantity,
      stock_quantity: fullProduct.stock_quantity,
      short_description: fullProduct.short_description || null,
      description: fullProduct.description || null,
      image_url: fullProduct.image_url || null,
      is_active: fullProduct.is_active,
      featured: fullProduct.featured,
    };
    if (isUuid) sbRecord.id = id;

    let res = await supabase.from("products").upsert([sbRecord], { onConflict: "slug" });
    if (res.error) {
      // If remote table is missing custom price columns, retry with basic columns
      const basicRecord: Record<string, unknown> = {
        name: fullProduct.name,
        slug: fullProduct.slug,
        sku: fullProduct.sku,
        category_id: fullProduct.category_id || null,
        price: fullProduct.price,
        stock_quantity: fullProduct.stock_quantity,
        short_description: fullProduct.short_description || null,
        description: fullProduct.description || null,
        image_url: fullProduct.image_url || null,
        is_active: fullProduct.is_active,
        featured: fullProduct.featured,
      };
      if (isUuid) basicRecord.id = id;
      await supabase.from("products").upsert([basicRecord], { onConflict: "slug" });
    }
  } catch (sbErr) {
    console.warn("Supabase upsert notice:", sbErr);
  }

  // 3. Persist locally to localStorage
  if (typeof window !== "undefined") {
    try {
      const existing = getCustomProducts();
      const idx = existing.findIndex(
        (p) =>
          (p.id && p.id === fullProduct.id) ||
          (p.sku && p.sku.toLowerCase() === fullProduct.sku.toLowerCase()) ||
          (p.slug && p.slug.toLowerCase() === fullProduct.slug.toLowerCase())
      );

      let updatedList: Product[];
      if (idx !== -1) {
        updatedList = [...existing];
        updatedList[idx] = { ...updatedList[idx], ...fullProduct };
      } else {
        // Prepend new product so it appears at top of admin list
        updatedList = [fullProduct, ...existing];
      }

      localStorage.setItem(STORAGE_KEY_CUSTOM_PRODUCTS, JSON.stringify(updatedList));

      // If this product was in deletedSet, un-delete it
      const deletedRaw = localStorage.getItem(STORAGE_KEY_DELETED_PRODUCTS);
      if (deletedRaw) {
        const deletedArr: string[] = JSON.parse(deletedRaw);
        const filtered = deletedArr.filter(
          (k) =>
            k.toLowerCase() !== fullProduct.id.toLowerCase() &&
            k.toLowerCase() !== fullProduct.sku.toLowerCase() &&
            k.toLowerCase() !== fullProduct.slug.toLowerCase()
        );
        localStorage.setItem(STORAGE_KEY_DELETED_PRODUCTS, JSON.stringify(filtered));
      }
    } catch (lsErr) {
      console.warn("localStorage custom product save warning:", lsErr);
    }
  }

  // 4. Broadcast event
  broadcastProductChange("added", fullProduct);

  return { success: true, product: fullProduct };
}

/**
 * Check if a product is in the deleted keys set by any of its identifiers
 */
export function isProductDeleted(
  item: { id?: string; sku?: string; slug?: string; name?: string } | null | undefined,
  deletedKeys: Set<string>
): boolean {
  if (!item || !deletedKeys || deletedKeys.size === 0) return false;
  const id = (item.id || "").toLowerCase().trim();
  const sku = (item.sku || "").toLowerCase().trim();
  const slug = (item.slug || "").toLowerCase().trim();
  const name = (item.name || "").toLowerCase().trim();

  if (id && deletedKeys.has(id)) return true;
  if (sku && deletedKeys.has(sku)) return true;
  if (slug && deletedKeys.has(slug)) return true;
  if (name && deletedKeys.has(name)) return true;

  // Also check normalized name without spaces or punctuation
  const cleanName = name.replace(/[^a-z0-9]/g, "");
  if (cleanName && deletedKeys.has(cleanName)) return true;

  const cleanSku = sku.replace(/[^a-z0-9]/g, "");
  if (cleanSku && deletedKeys.has(cleanSku)) return true;

  const cleanSlug = slug.replace(/[^a-z0-9]/g, "");
  if (cleanSlug && deletedKeys.has(cleanSlug)) return true;

  return false;
}

/**
 * Delete a product:
 * 1. Calls API to remove from server and gathers all matching keys.
 * 2. Attempts Supabase delete by id, slug, sku, and name.
 * 3. Removes from custom products localStorage.
 * 4. Adds all identifiers to deleted set so default catalog doesn't revive it.
 * 5. Broadcasts event.
 */
export async function deleteProduct(
  id: string,
  sku?: string,
  slug?: string,
  name?: string
): Promise<{ success: boolean; deletedKeys?: string[]; error?: string }> {
  const normId = (id || "").toLowerCase().trim();
  const normSku = (sku || "").toLowerCase().trim();
  const normSlug = (slug || "").toLowerCase().trim();
  const normName = (name || "").toLowerCase().trim();
  const cleanName = normName ? normName.replace(/[^a-z0-9]/g, "") : "";
  const cleanSku = normSku ? normSku.replace(/[^a-z0-9]/g, "") : "";
  const cleanSlug = normSlug ? normSlug.replace(/[^a-z0-9]/g, "") : "";

  const keysToAdd = [normId, normSku, normSlug, normName, cleanName, cleanSku, cleanSlug].filter(Boolean);

  // 1. Call API
  try {
    const res = await fetch("/api/admin/products", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, sku, slug, name }),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.deletedKeys)) {
        for (const k of data.deletedKeys) {
          const s = String(k).toLowerCase().trim();
          if (s && !keysToAdd.includes(s)) keysToAdd.push(s);
        }
      }
    }
  } catch {}

  // 2. Try Supabase
  try {
    const isUuid = id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUuid) {
      await supabase.from("products").delete().eq("id", id);
    }
    if (slug) {
      await supabase.from("products").delete().eq("slug", slug);
    }
    if (sku) {
      await supabase.from("products").delete().eq("sku", sku);
    }
    if (name) {
      await supabase.from("products").delete().eq("name", name);
    }
  } catch {}

  // 3. LocalStorage
  if (typeof window !== "undefined") {
    try {
      const existing = getCustomProducts();
      const keysSet = new Set(keysToAdd);
      const filtered = existing.filter((p) => !isProductDeleted(p, keysSet));
      localStorage.setItem(STORAGE_KEY_CUSTOM_PRODUCTS, JSON.stringify(filtered));

      // Add all identifiers to deleted set
      const deletedRaw = localStorage.getItem(STORAGE_KEY_DELETED_PRODUCTS) || "[]";
      let deletedArr: string[] = [];
      try {
        deletedArr = JSON.parse(deletedRaw);
        if (!Array.isArray(deletedArr)) deletedArr = [];
      } catch {
        deletedArr = [];
      }

      for (const k of keysToAdd) {
        if (!deletedArr.includes(k)) deletedArr.push(k);
      }
      localStorage.setItem(STORAGE_KEY_DELETED_PRODUCTS, JSON.stringify(deletedArr));
    } catch (err) {
      console.warn("Notice updating deleted products in localStorage:", err);
    }
  }

  // 4. Broadcast
  broadcastProductChange("deleted");

  return { success: true, deletedKeys: keysToAdd };
}
