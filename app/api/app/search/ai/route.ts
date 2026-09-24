import { NextRequest, NextResponse } from "next/server";
import { aiSearchProducts, getSmartSearchSuggestions } from "@/lib/aiSearch";
import { DEFAULT_CATALOG_PRODUCTS } from "@/lib/products";
import { getCustomProducts } from "@/lib/customProducts";
import { resolveServerTier, sanitizeProductListForTier } from "@/lib/pricingSecurity";
import { supabase } from "@/lib/supabase";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    const rl = checkRateLimit(`ai-search-${ip}`, { limit: 80, windowMs: 60000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many search requests. Please slow down." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";

    // Securely resolve pricing tier from verified credentials
    const tier = await resolveServerTier(req);

    if (!query.trim()) {
      const suggestions = getSmartSearchSuggestions("");
      return NextResponse.json({
        success: true,
        intent: null,
        suggestions,
        products: [],
      });
    }

    // 1. Fetch products
    let products: any[] = [];
    const { data } = await supabase.from("products").select("*, category:categories(*)");
    if (data && data.length > 0) {
      products = data;
    } else {
      products = [...getCustomProducts(), ...DEFAULT_CATALOG_PRODUCTS];
    }

    // 2. Sanitize for tier strictly preventing price leakage
    const sanitizedCatalog = sanitizeProductListForTier(products, tier);

    // 3. AI NLP Search
    const searchResult = aiSearchProducts(query, sanitizedCatalog);

    return NextResponse.json({
      success: true,
      query,
      tier,
      intent: searchResult.intent,
      total_matches: searchResult.total_matches,
      suggestions: searchResult.suggestions,
      products: searchResult.products,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
