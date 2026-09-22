import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { DEFAULT_CATALOG_PRODUCTS } from "@/lib/products";
import { sanitizeProductForTier, RoleOrTier } from "@/lib/pricingSecurity";
import { Product } from "@/lib/types";

import { getServerCustomProducts } from "@/lib/serverProducts";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug;
    if (!slug) {
      return NextResponse.json({ success: false, error: "Missing slug" }, { status: 400 });
    }

    // Determine tier from header
    const headerTier = req.headers.get("x-user-tier")?.toLowerCase() as RoleOrTier | undefined;
    let tier: RoleOrTier = "guest";

    if (headerTier && ["admin", "wholesale", "technician", "retail", "guest"].includes(headerTier)) {
      tier = headerTier;
    }

    // Check token if present
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

    // 1. Try server custom products first
    const customList = getServerCustomProducts();
    let matchedProduct: Product | null =
      customList.find(
        (p) => p.slug === slug || p.id === slug || (p.sku && p.sku.toLowerCase() === slug.toLowerCase())
      ) || null;

    // 2. Try local catalog
    if (!matchedProduct) {
      matchedProduct =
        DEFAULT_CATALOG_PRODUCTS.find(
          (p) => p.slug === slug || p.id === slug || (p.sku && p.sku.toLowerCase() === slug.toLowerCase())
        ) || null;
    }

    // 2. Try Supabase
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
      let dbQuery = supabase.from("products").select("*, category:categories(*)");
      if (isUuid) {
        dbQuery = dbQuery.or(`slug.eq.${slug},id.eq.${slug}`);
      } else {
        dbQuery = dbQuery.eq("slug", slug);
      }
      const { data, error } = await dbQuery.maybeSingle();

      if (!error && data) {
        matchedProduct = data as Product;
      }
    } catch {}

    if (!matchedProduct) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    }

    // Sanitize product for caller's tier
    const sanitized = sanitizeProductForTier(matchedProduct, tier);

    return NextResponse.json({
      success: true,
      tier,
      product: sanitized,
    });
  } catch (err) {
    console.error("API /api/products/[slug] error:", err);
    return NextResponse.json({ success: false, error: "Failed to fetch product" }, { status: 500 });
  }
}
