import { NextRequest, NextResponse } from "next/server";
import { resolveServerTier, sanitizeProductListForTier } from "@/lib/pricingSecurity";
import { DEFAULT_CATALOG_PRODUCTS } from "@/lib/products";
import { getCustomProducts, getDeletedProductKeys, isProductDeleted } from "@/lib/customProducts";
import { supabase } from "@/lib/supabase";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    const rl = checkRateLimit(`prods-${ip}`, { limit: 100, windowMs: 60000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please slow down." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    // Securely resolve pricing tier from caller's verified credentials
    const tier = await resolveServerTier(req);

    const deleted = getDeletedProductKeys();
    const productMap = new Map<string, any>();

    // 1. Base catalog products
    for (const p of DEFAULT_CATALOG_PRODUCTS) {
      if (!isProductDeleted(p, deleted)) {
        const key = (p.sku || p.slug || p.id).toLowerCase();
        productMap.set(key, p);
      }
    }

    // 2. Local/server custom products
    for (const p of getCustomProducts()) {
      if (!isProductDeleted(p, deleted)) {
        const key = (p.sku || p.slug || p.id).toLowerCase();
        productMap.set(key, p);
      }
    }

    // 3. Remote Supabase products
    try {
      const { data, error } = await supabase.from("products").select("*, category:categories(*)");
      if (!error && data && data.length > 0) {
        for (const p of data) {
          if (!isProductDeleted(p, deleted)) {
            const key = (p.sku || p.slug || p.id).toLowerCase();
            productMap.set(key, p);
          }
        }
      }
    } catch {}

    const products = Array.from(productMap.values());

    // 2. Strict role-based pricing filter - unauthorized prices are stripped completely
    const sanitized = sanitizeProductListForTier(products, tier);

    return NextResponse.json({
      success: true,
      tier,
      count: sanitized.length,
      products: sanitized,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
