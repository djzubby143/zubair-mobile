import { NextRequest, NextResponse } from "next/server";
import { resolveServerTier, sanitizeProductForTier } from "@/lib/pricingSecurity";
import { DEFAULT_CATALOG_PRODUCTS } from "@/lib/products";
import { getCustomProducts } from "@/lib/customProducts";
import { supabase } from "@/lib/supabase";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const ip = getClientIp(req.headers);
    const rl = checkRateLimit(`prod-slug-${ip}`, { limit: 120, windowMs: 60000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please slow down." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    const { slug } = await params;
    const cleanSlug = decodeURIComponent(slug).trim();

    // Securely resolve pricing tier from verified credentials
    const tier = await resolveServerTier(req);

    // 1. Search in custom / catalog products
    const customMatch = getCustomProducts().find(
      (p) =>
        p.slug === cleanSlug ||
        p.id === cleanSlug ||
        (p.sku && p.sku.toLowerCase() === cleanSlug.toLowerCase())
    );
    const catalogMatch = DEFAULT_CATALOG_PRODUCTS.find(
      (p) =>
        p.slug === cleanSlug ||
        p.id === cleanSlug ||
        (p.sku && p.sku.toLowerCase() === cleanSlug.toLowerCase())
    );

    let found = customMatch || catalogMatch;

    if (!found) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanSlug);
      let query = supabase.from("products").select("*, category:categories(*)");
      if (isUuid) {
        query = query.or(`slug.eq.${cleanSlug},id.eq.${cleanSlug}`);
      } else {
        query = query.eq("slug", cleanSlug);
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
