import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { DEFAULT_CATALOG_PRODUCTS } from "@/lib/products";
import { sanitizeProductListForTier, RoleOrTier } from "@/lib/pricingSecurity";
import { Product } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryParam = searchParams.get("category");
    const queryParam = searchParams.get("q");

    // Extract user tier from headers
    const headerTier = req.headers.get("x-user-tier")?.toLowerCase() as RoleOrTier | undefined;
    let tier: RoleOrTier = "guest";

    if (headerTier && ["admin", "wholesale", "technician", "retail", "guest"].includes(headerTier)) {
      tier = headerTier;
    }

    // Check if Supabase session token exists in Authorization header
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      try {
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) {
          tier = "admin";
        }
      } catch {}
    }

    // 1. Fetch live products from Supabase
    let query = supabase
      .from("products")
      .select("*, category:categories(*)")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    const { data: dbData, error } = await query;

    // 2. Merge with DEFAULT_CATALOG_PRODUCTS
    const mergedMap = new Map<string, Product>();

    if (!error && dbData && dbData.length > 0) {
      for (const item of dbData) {
        const key = (item.sku || item.slug || item.id || item.name).toLowerCase();
        mergedMap.set(key, item as Product);
      }
    }

    const existingItems = Array.from(mergedMap.values());
    for (const def of DEFAULT_CATALOG_PRODUCTS) {
      const key = (def.sku || def.slug || def.id || def.name).toLowerCase();
      const nameKey = def.name.toLowerCase();
      const exists = existingItems.some((val) => val.name.toLowerCase() === nameKey);
      if (!exists && !mergedMap.has(key)) {
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
    });
  } catch (err: unknown) {
    console.error("API /api/products error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
