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

/**
 * Calculates effective price based on 3-tier system:
 * 1. Retail: Publicly visible to all visitors without login.
 * 2. Technician: Requires login (verified mobile technician rate).
 * 3. Wholesale: Requires login (bulk dealer & shopkeeper trade rate).
 */
export function getEffectiveProductPrice(
  product: {
    price: number;
    technician_price?: number | null;
    retail_price?: number | null;
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
  wholesalePrice: number;
  technicianPrice: number;
  retailPrice: number;
} {
  const wholesalePrice = Number(product.price) || 0;
  const technicianPrice =
    product.technician_price && Number(product.technician_price) > 0
      ? Number(product.technician_price)
      : Math.round(wholesalePrice * 1.12);
  const retailPrice =
    product.retail_price && Number(product.retail_price) > 0
      ? Number(product.retail_price)
      : Math.round(wholesalePrice * 1.25);

  const isGuest = !user || (!user.id && !user.username);

  // If visitor is not logged in: they see the Public Retail Price
  if (isGuest) {
    return {
      price: retailPrice,
      activeTier: "retail",
      tierName: "Retail",
      tierLabelUrdu: "پرچون ریٹ",
      isRetail: true,
      isTechnician: false,
      isWholesale: false,
      isGuest: true,
      canSeeTechnicianRate: false,
      canSeeWholesaleRate: false,
      wholesalePrice,
      technicianPrice,
      retailPrice,
    };
  }

  // Logged-in user: determine their tier
  const tier: PricingTier =
    user.pricing_tier === "technician"
      ? "technician"
      : user.pricing_tier === "retail"
      ? "retail"
      : "wholesale"; // Default logged-in trade customer is wholesale

  if (tier === "technician") {
    return {
      price: technicianPrice,
      activeTier: "technician",
      tierName: "Technician",
      tierLabelUrdu: "ٹیکنیشن ریٹ",
      isRetail: false,
      isTechnician: true,
      isWholesale: false,
      isGuest: false,
      canSeeTechnicianRate: true,
      canSeeWholesaleRate: false,
      wholesalePrice,
      technicianPrice,
      retailPrice,
    };
  }

  if (tier === "retail") {
    return {
      price: retailPrice,
      activeTier: "retail",
      tierName: "Retail",
      tierLabelUrdu: "پرچون ریٹ",
      isRetail: true,
      isTechnician: false,
      isWholesale: false,
      isGuest: false,
      canSeeTechnicianRate: false,
      canSeeWholesaleRate: false,
      wholesalePrice,
      technicianPrice,
      retailPrice,
    };
  }

  // Wholesale Tier (default for verified shopkeepers & admin)
  return {
    price: wholesalePrice,
    activeTier: "wholesale",
    tierName: "Wholesale",
    tierLabelUrdu: "ہول سیل ریٹ",
    isRetail: false,
    isTechnician: false,
    isWholesale: true,
    isGuest: false,
    canSeeTechnicianRate: true,
    canSeeWholesaleRate: true,
    wholesalePrice,
    technicianPrice,
    retailPrice,
  };
}

export function useAuth() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      if (typeof window === "undefined") return;

      // 1. Check Customer login in localStorage
      const storedCustomer = localStorage.getItem("zubair_customer_user");
      if (storedCustomer) {
        try {
          const parsed = JSON.parse(storedCustomer);
          if (parsed && (parsed.id || parsed.username || parsed.full_name)) {
            setIsLoggedIn(true);
            setUser(parsed);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.warn("Parse error for customer user:", e);
        }
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

    const updatedUser: AuthUser = {
      ...current,
      ...updatedData,
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
          list[idx] = { ...list[idx], ...updatedData };
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
          await supabase.from("customers").update(updatedData).eq("id", current.id);
        } else if (current.username) {
          await supabase.from("customers").update(updatedData).eq("username", current.username);
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
