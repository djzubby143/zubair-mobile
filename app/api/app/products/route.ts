import { NextRequest, NextResponse } from "next/server";
import { getStoredCustomerUser } from "@/lib/auth";
import { resolveUserTier, sanitizeProductListForTier } from "@/lib/pricingSecurity";
import { DEFAULT_CATALOG_PRODUCTS } from "@/lib/products";
import { getCustomProducts, getDeletedProductKeys, isProductDeleted } from "@/lib/customProducts";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tierParam = searchParams.get("tier");
    const tier = (tierParam === "wholesale" || tierParam === "technician" || tierParam === "retail")
      ? tierParam
      : "retail";

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

    // 2. Strict role-based pricing filter
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
