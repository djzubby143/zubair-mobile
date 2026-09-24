"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { CartItem, Product, Coupon } from "@/lib/types";
import { validateCoupon } from "@/lib/marketing";

interface CartContextType {
  items: CartItem[];
  cartCount: number;
  cartSubtotal: number;
  deliveryCharges: number;
  discountAmount: number;
  appliedCoupon: Coupon | null;
  couponError: string | null;
  cartTotal: number;
  orderNotes: string;
  setOrderNotes: (notes: string) => void;
  applyCoupon: (code: string) => boolean;
  removeCoupon: () => void;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addToCart: (product: Product | CartItem, quantity?: number) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  saveCart: () => void;
  isLoaded: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const STORAGE_KEY = "zubair_cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);
  const toggleCart = () => setIsCartOpen((prev) => !prev);

  // Load cart from localStorage on mount (client-side only to avoid SSR mismatch)
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(STORAGE_KEY);
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        if (Array.isArray(parsed)) {
          setItems(parsed);
        }
      }
    } catch (error) {
      console.error("Failed to load cart from localStorage:", error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Sync cart to localStorage whenever items change after initial load
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error("Failed to save cart to localStorage:", error);
    }
  }, [items, isLoaded]);

  // Keep cart items strictly priced according to the active user's role/tier
  useEffect(() => {
    if (!isLoaded) return;

    const syncCartTierPrices = () => {
      try {
        const stored = localStorage.getItem("zubair_customer_user");
        let activeTier: "retail" | "technician" | "wholesale" = "retail";
        if (stored) {
          const parsed = JSON.parse(stored);
          const raw = (parsed.pricing_tier || parsed.role || "").toLowerCase().trim();
          if (raw === "wholesale") activeTier = "wholesale";
          else if (raw === "technician") activeTier = "technician";
          else activeTier = "retail";
        }

        setItems((prevItems) => {
          let changed = false;
          const updated = prevItems.map((item) => {
            let targetPrice = item.price;
            if (activeTier === "wholesale" && item.wholesale_price && item.wholesale_price > 0) {
              targetPrice = item.wholesale_price;
            } else if (activeTier === "technician" && item.technician_price && item.technician_price > 0) {
              targetPrice = item.technician_price;
            } else if (activeTier === "retail" && item.retail_price && item.retail_price > 0) {
              targetPrice = item.retail_price;
            }

            if (item.price !== targetPrice || item.pricing_tier !== activeTier) {
              changed = true;
              return {
                ...item,
                price: targetPrice,
                pricing_tier: activeTier,
              };
            }
            return item;
          });
          return changed ? updated : prevItems;
        });
      } catch {}
    };

    syncCartTierPrices();

    window.addEventListener("storage", syncCartTierPrices);
    return () => window.removeEventListener("storage", syncCartTierPrices);
  }, [isLoaded]);

  const addToCart = (product: Product | CartItem, quantity?: number) => {
    const moq =
      "min_order_quantity" in product &&
      product.min_order_quantity &&
      product.min_order_quantity > 0
        ? product.min_order_quantity
        : 1;

    // If quantity is provided, use it; otherwise default to minimum order quantity
    const addQty = quantity !== undefined && quantity > 0 ? quantity : moq;

    setItems((prevItems) => {
      const existingIndex = prevItems.findIndex((item) => item.id === product.id);

      if (existingIndex > -1) {
        const existingItem = prevItems[existingIndex];
        const newQuantity = existingItem.quantity + addQty;
        const maxStock = existingItem.stock_quantity ?? 999;
        const finalQuantity = Math.min(newQuantity, maxStock > 0 ? maxStock : newQuantity);

        const updated = [...prevItems];
        updated[existingIndex] = {
          ...existingItem,
          price: Number(product.price) || existingItem.price,
          wholesale_price: "wholesale_price" in product ? (product.wholesale_price ?? existingItem.wholesale_price) : existingItem.wholesale_price,
          retail_price: "retail_price" in product ? (product.retail_price ?? existingItem.retail_price) : existingItem.retail_price,
          technician_price: "technician_price" in product ? (product.technician_price ?? existingItem.technician_price) : existingItem.technician_price,
          pricing_tier: "pricing_tier" in product ? (product.pricing_tier as "wholesale" | "technician" | "retail") : existingItem.pricing_tier,
          min_order_quantity: existingItem.min_order_quantity || moq,
          quantity: finalQuantity,
        };
        return updated;
      } else {
        const initialQuantity = Math.max(addQty, moq);
        const newItem: CartItem = {
          id: product.id,
          name: product.name,
          price: Number(product.price) || 0,
          wholesale_price: "wholesale_price" in product ? (product.wholesale_price ?? null) : null,
          retail_price: "retail_price" in product ? (product.retail_price ?? null) : null,
          technician_price: "technician_price" in product ? (product.technician_price ?? null) : null,
          pricing_tier: "pricing_tier" in product ? (product.pricing_tier as "wholesale" | "technician" | "retail") : undefined,
          image_url: product.image_url ?? null,
          quantity: initialQuantity,
          min_order_quantity: moq,
          stock_quantity: "stock_quantity" in product ? product.stock_quantity : 99,
          sku: "sku" in product ? product.sku : undefined,
        };
        return [...prevItems, newItem];
      }
    });

    // Automatically slide open the right-side cart drawer!
    setIsCartOpen(true);
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }

    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id === id) {
          const minAllowed = item.min_order_quantity && item.min_order_quantity > 0 ? item.min_order_quantity : 1;
          const enforcedQuantity = Math.max(quantity, minAllowed);
          const maxStock = item.stock_quantity ?? 999;
          const finalQuantity = Math.min(enforcedQuantity, maxStock > 0 ? maxStock : enforcedQuantity);
          return { ...item, quantity: finalQuantity };
        }
        return item;
      })
    );
  };

  const removeFromCart = (id: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setItems([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error("Failed to clear localStorage cart:", error);
    }
  };

  const [orderNotes, setOrderNotes] = useState("");

  const saveCart = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  };

  // Derived values
  const cartCount = useMemo(() => {
    return items.reduce((total, item) => total + (item.quantity || 0), 0);
  }, [items]);

  const cartSubtotal = useMemo(() => {
    return items.reduce((total, item) => total + (item.price || 0) * (item.quantity || 0), 0);
  }, [items]);

  // Delivery Charges: flat Rs. 250 for courier/cargo, Free for orders Rs. 5000+
  const deliveryCharges = useMemo(() => {
    if (cartSubtotal === 0) return 0;
    if (cartSubtotal >= 5000) return 0;
    return 250;
  }, [cartSubtotal]);

  const applyCoupon = (code: string): boolean => {
    setCouponError(null);
    let activeTier: "retail" | "technician" | "wholesale" = "retail";
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("zubair_customer_user");
        if (stored) {
          const parsed = JSON.parse(stored);
          const raw = (parsed.pricing_tier || parsed.role || "").toLowerCase().trim();
          if (raw === "wholesale") activeTier = "wholesale";
          else if (raw === "technician") activeTier = "technician";
        }
      } catch {}
    }

    const res = validateCoupon(code, cartSubtotal, activeTier);
    if (!res.isValid) {
      setCouponError(res.error || "Invalid coupon code.");
      return false;
    }

    setAppliedCoupon(res.coupon || null);
    return true;
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponError(null);
  };

  const discountAmount = useMemo(() => {
    if (!appliedCoupon || cartSubtotal === 0) return 0;
    if (appliedCoupon.min_order_amount && cartSubtotal < appliedCoupon.min_order_amount) {
      return 0;
    }
    if (appliedCoupon.discount_type === "percentage") {
      const disc = Math.round((cartSubtotal * appliedCoupon.discount_value) / 100);
      return appliedCoupon.max_discount_amount ? Math.min(disc, appliedCoupon.max_discount_amount) : disc;
    }
    return Math.min(cartSubtotal, appliedCoupon.discount_value);
  }, [appliedCoupon, cartSubtotal]);

  const cartTotal = useMemo(() => {
    return Math.max(0, cartSubtotal + deliveryCharges - discountAmount);
  }, [cartSubtotal, deliveryCharges, discountAmount]);

  return (
    <CartContext.Provider
      value={{
        items,
        cartCount,
        cartSubtotal,
        deliveryCharges,
        discountAmount,
        appliedCoupon,
        couponError,
        applyCoupon,
        removeCoupon,
        cartTotal,
        orderNotes,
        setOrderNotes,
        isCartOpen,
        openCart,
        closeCart,
        toggleCart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        saveCart,
        isLoaded,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
