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

    // Listen to Supabase auth state change
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      checkAuth();
    });

    return () => {
      window.removeEventListener("storage", handleStorage);
      subscription.unsubscribe();
    };
  }, []);

  return { isLoggedIn, user, loading };
}
