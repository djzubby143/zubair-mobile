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

    // 1. Fetch from Supabase
    let products: any[] = [];
    const { data, error } = await supabase.from("products").select("*, category:categories(*)");
    if (!error && data && data.length > 0) {
      products = data;
    } else {
      const deleted = getDeletedProductKeys();
      const custom = getCustomProducts().filter((p) => !isProductDeleted(p, deleted));
      const catalog = DEFAULT_CATALOG_PRODUCTS.filter((p) => !isProductDeleted(p, deleted));
      products = [...custom, ...catalog];
    }

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
