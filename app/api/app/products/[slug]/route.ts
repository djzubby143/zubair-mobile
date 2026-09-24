import { NextRequest, NextResponse } from "next/server";
import { sanitizeProductForTier } from "@/lib/pricingSecurity";
import { DEFAULT_CATALOG_PRODUCTS } from "@/lib/products";
import { getCustomProducts } from "@/lib/customProducts";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(req.url);
    const tierParam = searchParams.get("tier");
    const tier = (tierParam === "wholesale" || tierParam === "technician" || tierParam === "retail")
      ? tierParam
      : "retail";

    // 1. Search in custom / catalog products
    const customMatch = getCustomProducts().find(
      (p) => p.slug === slug || p.id === slug || (p.sku && p.sku.toLowerCase() === slug.toLowerCase())
    );
    const catalogMatch = DEFAULT_CATALOG_PRODUCTS.find(
      (p) => p.slug === slug || p.id === slug || (p.sku && p.sku.toLowerCase() === slug.toLowerCase())
    );

    let found = customMatch || catalogMatch;

    if (!found) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
      let query = supabase.from("products").select("*, category:categories(*)");
      if (isUuid) {
        query = query.or(`slug.eq.${slug},id.eq.${slug}`);
      } else {
        query = query.eq("slug", slug);
      }
      const { data } = await query.maybeSingle();
      if (data) found = data as any;
    }

    if (!found) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    }

    const sanitized = sanitizeProductForTier(found, tier);

    return NextResponse.json({
      success: true,
      tier,
      product: sanitized,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
