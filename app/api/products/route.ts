import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { DEFAULT_CATALOG_PRODUCTS } from "@/lib/products";
import { sanitizeProductListForTier, resolveServerTier, RoleOrTier } from "@/lib/pricingSecurity";
import { Product } from "@/lib/types";

import { getServerCustomProducts, getServerDeletedKeys } from "@/lib/serverProducts";
import { isProductDeleted } from "@/lib/customProducts";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryParam = searchParams.get("category");
    const queryParam = searchParams.get("q");

    // Securely resolve pricing tier from caller's verified credentials
    const tier = await resolveServerTier(req);

    const deletedKeys = getServerDeletedKeys();
    const serverCustomProducts = getServerCustomProducts();

    // 1. Fetch live products from Supabase
    let query = supabase
      .from("products")
      .select("*, category:categories(*)")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    const { data: dbData, error } = await query;

    // 2. Merge: Custom Products > Supabase DB Products > Default Catalog
    const mergedMap = new Map<string, Product>();

    // Put server custom products first (newest custom products take precedence)
    for (const item of serverCustomProducts) {
      if (item.is_active !== false) {
        const key = (item.sku || item.slug || item.id || item.name).toLowerCase();
        if (!isProductDeleted(item, deletedKeys)) {
          mergedMap.set(key, item);
        }
      }
    }

    if (!error && dbData && dbData.length > 0) {
      for (const item of dbData) {
        const key = (item.sku || item.slug || item.id || item.name).toLowerCase();
        if (!isProductDeleted(item as Product, deletedKeys) && !mergedMap.has(key)) {
          mergedMap.set(key, item as Product);
        }
      }
    }

    const existingItems = Array.from(mergedMap.values());
    for (const def of DEFAULT_CATALOG_PRODUCTS) {
      const key = (def.sku || def.slug || def.id || def.name).toLowerCase();
      const nameKey = def.name.toLowerCase();
      const isDeleted = isProductDeleted(def, deletedKeys);
      const exists = existingItems.some((val) => val.name.toLowerCase() === nameKey);
      if (!isDeleted && !exists && !mergedMap.has(key)) {
        mergedMap.set(key, def);
      }
    }

    let allProducts = Array.from(mergedMap.values());

    // 3. Optional Category Filter
    if (categoryParam && categoryParam !== "All" && categoryParam !== "all") {
      const cLow = categoryParam.toLowerCase().trim();
      allProducts = allProducts.filter((p) => {
        const catName = (p.category?.name || "").toLowerCase();
        const catSlug = (p.category?.slug || "").toLowerCase();
        return (
          catName === cLow ||
          catSlug === cLow ||
          catName.includes(cLow) ||
          catSlug.includes(cLow) ||
          (cLow.includes("side") && (catName.includes("side") || catSlug.includes("side") || p.name.toLowerCase().includes("side")))
        );
      });
    }

    // 4. Optional Search Filter
    if (queryParam && queryParam.trim()) {
      const q = queryParam.toLowerCase().trim();
      allProducts = allProducts.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.category?.name && p.category.name.toLowerCase().includes(q))
      );
    }

    // 5. SECURITY SANITIZATION
    // Redact unauthorized prices completely before sending JSON response
    const sanitizedProducts = sanitizeProductListForTier(allProducts, tier);

    return NextResponse.json({
      success: true,
      tier,
      total: sanitizedProducts.length,
      products: sanitizedProducts,
      deletedKeys: Array.from(deletedKeys),
    });
  } catch (err: unknown) {
    console.error("API /api/products error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
