import { Product } from "./types";
import { AuthUser, PricingTier } from "./auth";

export type RoleOrTier = "guest" | "retail" | "technician" | "wholesale" | "admin";

/**
 * Determine caller's tier from user object or headers
 */
export function resolveUserTier(user?: AuthUser | null): RoleOrTier {
  if (!user) return "guest";
  if (user.role === "admin") return "admin";
  if (user.pricing_tier === "technician") return "technician";
  if (user.pricing_tier === "wholesale") return "wholesale";
  if (user.pricing_tier === "retail") return "retail";
  // Default logged-in customer account
  return user.id || user.username ? "wholesale" : "guest";
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

  const baseTechnician =
    product.technician_price !== undefined && product.technician_price !== null && !isNaN(Number(product.technician_price))
      ? Number(product.technician_price)
      : Math.round(baseWholesale * 1.12);

  const baseRetail =
    product.retail_price !== undefined && product.retail_price !== null && !isNaN(Number(product.retail_price))
      ? Number(product.retail_price)
      : Math.round(baseWholesale * 1.25);

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
    // Technician: show technician_price, hide wholesale_price and purchase_price
    clean.price = baseTechnician;
    clean.technician_price = baseTechnician;
    delete clean.wholesale_price;
    delete clean.purchase_price;
    // Keep retail_price as reference if set, but active price is technician
    clean.retail_price = baseRetail;
    return clean;
  }

  if (tier === "wholesale") {
    // Wholesale: show wholesale_price, hide technician_price and purchase_price
    clean.price = baseWholesale;
    clean.wholesale_price = baseWholesale;
    delete clean.technician_price;
    delete clean.purchase_price;
    clean.retail_price = baseRetail;
    return clean;
  }

  // Guest / Retail (not logged in or retail tier)
  // Show ONLY retail_price. Do NOT expose wholesale_price, technician_price, purchase_price anywhere!
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
