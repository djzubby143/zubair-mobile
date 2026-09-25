import { Product } from "./types";
import { AuthUser, PricingTier } from "./auth";

export type RoleOrTier = "guest" | "retail" | "technician" | "wholesale" | "admin";

/**
 * Determine caller's tier from user object or headers
 */
export function resolveUserTier(user?: AuthUser | null): RoleOrTier {
  if (!user) return "guest";
  if (user.role === "admin") return "admin";
  const tier = (user.pricing_tier || user.role || "").toLowerCase().trim();
  if (tier === "wholesale") return "wholesale";
  if (tier === "technician") return "technician";
  if (tier === "retail" || tier === "customer" || tier === "user") return "retail";
  // Default logged-in customer account MUST default to retail, NEVER wholesale
  return user.id || user.username ? "retail" : "guest";
}

/**
 * Sanitize a single product according to the caller's role/pricing tier.
 * Completely deletes unauthorized price properties so they never reach the network or state.
 */
export function sanitizeProductForTier(product: Product, tier: RoleOrTier): Product {
  const baseWholesale =
    product.wholesale_price !== undefined && product.wholesale_price !== null && !isNaN(Number(product.wholesale_price))
      ? Number(product.wholesale_price)
      : Number(product.price) || 0;

  // Strict retail price: use explicit retail_price if available and valid; ensure it never falls back to wholesale
  let baseRetail =
    product.retail_price !== undefined && product.retail_price !== null && !isNaN(Number(product.retail_price)) && Number(product.retail_price) > 0
      ? Number(product.retail_price)
      : Math.round(baseWholesale * 1.25);

  // Guarantee that retail_price is strictly greater than wholesale price so wholesale is never leaked
  if (baseWholesale > 0 && baseRetail <= baseWholesale) {
    baseRetail = Math.round(baseWholesale * 1.25);
  }

  let baseTechnician =
    product.technician_price !== undefined && product.technician_price !== null && !isNaN(Number(product.technician_price)) && Number(product.technician_price) > 0
      ? Number(product.technician_price)
      : Math.round(baseWholesale * 1.12);

  if (baseWholesale > 0 && baseTechnician <= baseWholesale) {
    baseTechnician = Math.round(baseWholesale * 1.12);
  }

  const basePurchase =
    product.purchase_price !== undefined && product.purchase_price !== null && !isNaN(Number(product.purchase_price))
      ? Number(product.purchase_price)
      : null;

  // Clone product so we don't mutate the original
  const clean: Product = { ...product };

  if (tier === "admin") {
    // Admin gets all 4 prices intact
    clean.price = baseWholesale;
    clean.wholesale_price = baseWholesale;
    clean.technician_price = baseTechnician;
    clean.retail_price = baseRetail;
    clean.purchase_price = basePurchase;
    return clean;
  }

  if (tier === "technician") {
    // Technician: show technician_price only, hide wholesale_price and purchase_price
    clean.price = baseTechnician;
    clean.technician_price = baseTechnician;
    delete clean.wholesale_price;
    delete clean.purchase_price;
    delete clean.retail_price;
    return clean;
  }

  if (tier === "wholesale") {
    // Wholesale: show wholesale_price only, hide technician_price and purchase_price
    clean.price = baseWholesale;
    clean.wholesale_price = baseWholesale;
    delete clean.technician_price;
    delete clean.purchase_price;
    delete clean.retail_price;
    return clean;
  }

  // Guest & Retail: Show ONLY retail_price.
  // REMOVE ANY FALLBACK that displays price, wholesale_price, or purchase_price!
  clean.price = baseRetail;
  clean.retail_price = baseRetail;
  delete clean.wholesale_price;
  delete clean.technician_price;
  delete clean.purchase_price;
  return clean;
}

/**
 * Sanitize an array of products for a given tier
 */
export function sanitizeProductListForTier(products: Product[], tier: RoleOrTier): Product[] {
  return products.map((p) => sanitizeProductForTier(p, tier));
}

/**
 * Securely resolve pricing tier from incoming NextRequest headers/tokens.
 * CRITICAL: Prevents unauthorized callers from passing ?tier=wholesale or ?tier=technician
 * to leak restricted B2B wholesale prices.
 */
export async function resolveServerTier(req: any): Promise<RoleOrTier> {
  try {
    const adminKey = req.headers.get("x-admin-key") || "";
    const expectedAdminKey = process.env.ADMIN_API_KEY || "zm-secure-admin-v2-production-key-2026";
    const requestedTier = (req.nextUrl?.searchParams?.get("tier") || "").toLowerCase().trim();

    if (adminKey && adminKey === expectedAdminKey) {
      if (requestedTier === "wholesale" || requestedTier === "technician" || requestedTier === "retail") {
        return requestedTier as RoleOrTier;
      }
      return "admin";
    }

    const authHeader = req.headers.get("authorization") || "";

    // If no auth token provided, caller is an unauthenticated guest: STRICTLY RETAIL
    if (!authHeader.startsWith("Bearer ")) {
      return "retail";
    }

    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return "retail";

    // Dynamic import to avoid circular dependencies
    const { supabase } = await import("@/lib/supabase");
    const { data: authData, error: authError } = await supabase.auth.getUser(token);

    if (authError || !authData?.user) {
      return "retail";
    }

    const user = authData.user;

    // Check if admin
    const isAdmin =
      user.email === "admin@zubairmobile.com" ||
      user.email === "zubair@zubairmobile.pk" ||
      user.user_metadata?.role === "admin";

    if (isAdmin) {
      if (requestedTier === "admin" || requestedTier === "wholesale" || requestedTier === "technician") {
        return requestedTier as RoleOrTier;
      }
      return "admin";
    }

    // Lookup customer record in Supabase or server store
    const { data: customer } = await supabase
      .from("customers")
      .select("pricing_tier, role")
      .eq("id", user.id)
      .maybeSingle();

    const allowedTier = (customer?.pricing_tier || customer?.role || "retail").toLowerCase();

    if (allowedTier === "wholesale") {
      return requestedTier === "retail" ? "retail" : "wholesale";
    }
    if (allowedTier === "technician") {
      return requestedTier === "retail" ? "retail" : "technician";
    }

    return "retail";
  } catch (err) {
    console.warn("Notice in resolveServerTier:", err);
    return "retail";
  }
}
