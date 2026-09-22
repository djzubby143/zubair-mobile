"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { CartItem, Product } from "@/lib/types";

interface CartContextType {
  items: CartItem[];
  cartCount: number;
  cartSubtotal: number;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addToCart: (product: Product | CartItem, quantity?: number) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  isLoaded: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const STORAGE_KEY = "zubair_cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

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
          retail_price: "retail_price" in product ? (product.retail_price ?? null) : null,
          purchase_price: "purchase_price" in product ? (product.purchase_price ?? null) : null,
          pricing_tier: "pricing_tier" in product ? (product.pricing_tier as "wholesale" | "retail") : undefined,
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

  // Derived values
  const cartCount = useMemo(() => {
    return items.reduce((total, item) => total + (item.quantity || 0), 0);
  }, [items]);

  const cartSubtotal = useMemo(() => {
    return items.reduce((total, item) => total + (item.price || 0) * (item.quantity || 0), 0);
  }, [items]);

  return (
    <CartContext.Provider
      value={{
        items,
        cartCount,
        cartSubtotal,
        isCartOpen,
        openCart,
        closeCart,
        toggleCart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
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
