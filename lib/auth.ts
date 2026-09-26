"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export interface AuthUser {
  id?: string;
  full_name?: string;
  shop_name?: string;
  username?: string;
  phone?: string;
  address?: string;
  city?: string;
  email?: string;
  role?: string;
  avatar_url?: string | null;
  pricing_tier?: "retail" | "technician" | "wholesale"; // "retail", "technician", or "wholesale"
}

export type PricingTier = "retail" | "technician" | "wholesale";

export function getStoredCustomerUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem("zubair_customer_user");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && (parsed.id || parsed.username || parsed.full_name)) {
        const rawTier = (parsed.pricing_tier || parsed.role || "").toLowerCase().trim();
        let tier: PricingTier = "retail";
        if (rawTier === "wholesale") tier = "wholesale";
        else if (rawTier === "technician") tier = "technician";
        else tier = "retail";

        return {
          ...parsed,
          pricing_tier: tier,
        };
      }
    }
  } catch {}
  return null;
}

/**
 * Calculates effective price based on strict 3-tier user system:
 * 1. Guest & Retail: Show ONLY retail_price.
 * 2. Technician: Show ONLY technician_price.
 * 3. Wholesale: Show ONLY wholesale_price.
 * 4. Admin: Show all prices.
 */
export function getEffectiveProductPrice(
  product: {
    price: number;
    wholesale_price?: number | null;
    technician_price?: number | null;
    retail_price?: number | null;
    purchase_price?: number | null;
  },
  user?: AuthUser | null
): {
  price: number;
  activeTier: PricingTier;
  tierName: string;
  tierLabelUrdu: string;
  isRetail: boolean;
  isTechnician: boolean;
  isWholesale: boolean;
  isGuest: boolean;
  canSeeTechnicianRate: boolean;
  canSeeWholesaleRate: boolean;
  retailPrice?: number;
  wholesalePrice?: number;
  technicianPrice?: number;
  purchasePrice?: number;
} {
  const isAdmin = user?.role === "admin";
  const isGuest = !user || (!user.id && !user.username && !isAdmin);

  const rawWholesale =
    product.wholesale_price !== undefined && product.wholesale_price !== null && !isNaN(Number(product.wholesale_price))
      ? Number(product.wholesale_price)
      : Number(product.price) || 0;

  // Strict retail calculation: never fall back to wholesale
  let rawRetail =
    product.retail_price !== undefined && product.retail_price !== null && !isNaN(Number(product.retail_price)) && Number(product.retail_price) > 0
      ? Number(product.retail_price)
      : Math.round(rawWholesale * 1.25);

  if (rawWholesale > 0 && rawRetail <= rawWholesale) {
    rawRetail = Math.round(rawWholesale * 1.25);
  }

  let rawTechnician =
    product.technician_price !== undefined && product.technician_price !== null && !isNaN(Number(product.technician_price)) && Number(product.technician_price) > 0
      ? Number(product.technician_price)
      : Math.round(rawWholesale * 1.12);

  if (rawWholesale > 0 && rawTechnician <= rawWholesale) {
    rawTechnician = Math.round(rawWholesale * 1.12);
  }

  // Admin gets full visibility of all rates
  if (isAdmin) {
    return {
      price: rawWholesale,
      activeTier: "wholesale",
      tierName: "Admin / Wholesale",
      tierLabelUrdu: "ایڈمن ویو (تمام ریٹ)",
      isRetail: false,
      isTechnician: false,
      isWholesale: true,
      isGuest: false,
      canSeeTechnicianRate: true,
      canSeeWholesaleRate: true,
      wholesalePrice: rawWholesale,
      technicianPrice: rawTechnician,
      retailPrice: rawRetail,
      purchasePrice: product.purchase_price ?? undefined,
    };
  }

  // 1. Guest: Show ONLY retail_price. Never fall back to wholesale or purchase.
  if (isGuest) {
    return {
      price: rawRetail,
      activeTier: "retail",
      tierName: "Retail",
      tierLabelUrdu: "پرچون ریٹ",
      isRetail: true,
      isTechnician: false,
      isWholesale: false,
      isGuest: true,
      canSeeTechnicianRate: false,
      canSeeWholesaleRate: false,
      retailPrice: rawRetail,
    };
  }

  // Determine user tier for logged-in user: defaults strictly to retail
  const userTierRaw = (user.pricing_tier || user.role || "").toLowerCase().trim();
  const tier: PricingTier =
    userTierRaw === "wholesale"
      ? "wholesale"
      : userTierRaw === "technician"
      ? "technician"
      : "retail";

  // 2. Retail Customer: Show ONLY retail_price.
  if (tier === "retail") {
    return {
      price: rawRetail,
      activeTier: "retail",
      tierName: "Retail",
      tierLabelUrdu: "پرچون ریٹ",
      isRetail: true,
      isTechnician: false,
      isWholesale: false,
      isGuest: false,
      canSeeTechnicianRate: false,
      canSeeWholesaleRate: false,
      retailPrice: rawRetail,
    };
  }

  // 3. Technician Customer: Show ONLY technician_price.
  if (tier === "technician") {
    return {
      price: rawTechnician,
      activeTier: "technician",
      tierName: "Technician",
      tierLabelUrdu: "ٹیکنیشن ریٹ",
      isRetail: false,
      isTechnician: true,
      isWholesale: false,
      isGuest: false,
      canSeeTechnicianRate: true,
      canSeeWholesaleRate: false,
      technicianPrice: rawTechnician,
    };
  }

  // 4. Wholesale Customer: Show ONLY wholesale_price.
  return {
    price: rawWholesale,
    activeTier: "wholesale",
    tierName: "Wholesale",
    tierLabelUrdu: "ہول سیل ریٹ",
    isRetail: false,
    isTechnician: false,
    isWholesale: true,
    isGuest: false,
    canSeeTechnicianRate: false,
    canSeeWholesaleRate: true,
    wholesalePrice: rawWholesale,
  };
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(getStoredCustomerUser);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => !!getStoredCustomerUser());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      if (typeof window === "undefined") return;

      // 1. Check Customer login in localStorage
      const cust = getStoredCustomerUser();
      if (cust) {
        setIsLoggedIn(true);
        setUser(cust);
        setLoading(false);
        return;
      }

      // 2. Check Supabase session (Admin)
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session && session.user) {
          setIsLoggedIn(true);
          setUser({
            id: session.user.id,
            email: session.user.email,
            full_name: session.user.email,
            role: "admin",
          });
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn("Auth check notice:", err);
      }

      setIsLoggedIn(false);
      setUser(null);
      setLoading(false);
    }

    checkAuth();

    // Listen to storage event (in case of login/logout across tabs)
    const handleStorage = (e: StorageEvent) => {
      if (!e.key || e.key === "zubair_customer_user") {
        checkAuth();
      }
    };
    window.addEventListener("storage", handleStorage);

    // Listen to customer profile updates in same tab
    const handleCustomerUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<AuthUser>;
      if (customEvent.detail) {
        setUser(customEvent.detail);
        setIsLoggedIn(true);
      } else {
        checkAuth();
      }
    };
    window.addEventListener("zubair_customer_updated", handleCustomerUpdate);

    // Listen to Supabase auth state change
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      checkAuth();
    });

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("zubair_customer_updated", handleCustomerUpdate);
      subscription.unsubscribe();
    };
  }, []);

  return { isLoggedIn, user, loading };
}

/**
 * Update current logged-in customer profile (address, phone, name, city, shop_name)
 */
export async function updateCustomerProfile(updatedData: {
  full_name?: string;
  shop_name?: string;
  phone?: string;
  address?: string;
  city?: string;
  avatar_url?: string | null;
  pricing_tier?: "retail" | "technician" | "wholesale";
}): Promise<AuthUser | null> {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem("zubair_customer_user");
    const current: AuthUser = stored ? JSON.parse(stored) : {};

    // Security: customers cannot self-escalate tier or role via profile update
    const { pricing_tier: _ignoredTier, role: _ignoredRole, ...safeProfileData } = updatedData as any;

    const updatedUser: AuthUser = {
      ...current,
      ...safeProfileData,
      // Maintain strictly verified existing pricing tier and role
      pricing_tier: current.pricing_tier || "retail",
      role: current.role || "customer",
    };

    localStorage.setItem("zubair_customer_user", JSON.stringify(updatedUser));

    // Update in cached customers directory
    const localCustomers = localStorage.getItem("zubair_mobile_customers");
    if (localCustomers) {
      try {
        const list = JSON.parse(localCustomers);
        const idx = list.findIndex(
          (c: { id?: string; username?: string; phone?: string }) =>
            (current.id && c.id === current.id) ||
            (current.username && c.username?.toLowerCase() === current.username?.toLowerCase()) ||
            (current.phone && c.phone === current.phone)
        );
        if (idx !== -1) {
          list[idx] = { ...list[idx], ...safeProfileData };
          localStorage.setItem("zubair_mobile_customers", JSON.stringify(list));
        }
      } catch (err) {
        console.warn("Could not update local customer list:", err);
      }
    }

    // Update in Supabase customers table if row exists
    if (current.id || current.username) {
      try {
        if (current.id) {
          await supabase.from("customers").update(safeProfileData).eq("id", current.id);
        } else if (current.username) {
          await supabase.from("customers").update(safeProfileData).eq("username", current.username);
        }
      } catch (err) {
        console.warn("Supabase customer update notice:", err);
      }
    }

    // Trigger update events
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new CustomEvent("zubair_customer_updated", { detail: updatedUser }));

    return updatedUser;
  } catch (err) {
    console.error("Failed to update customer profile:", err);
    throw err;
  }
}
