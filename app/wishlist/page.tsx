"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Heart,
  ShoppingCart,
  Trash2,
  ArrowRight,
  Package,
  Check,
} from "lucide-react";
import { Product } from "@/lib/types";
import { getWishlist, removeFromWishlist } from "@/lib/marketing";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/lib/auth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function WishlistPage() {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [addedMap, setAddedMap] = useState<{ [id: string]: boolean }>({});

  const loadWishlistItems = async () => {
    setLoading(true);
    try {
      const wishlistItems = getWishlist(user?.id || "guest");
      const wishlistIds = wishlistItems.map((it) => it.product_id);
      if (wishlistIds.length === 0) {
        setItems([]);
        return;
      }

      const res = await fetch("/api/products");
      if (res.ok) {
        const prods: Product[] = await res.json();
        const matched = prods.filter((p) => wishlistIds.includes(p.id));
        setItems(matched);
      }
    } catch (err) {
      console.error("Error loading wishlist items:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWishlistItems();
  }, [user]);

  const handleRemove = (productId: string) => {
    removeFromWishlist(productId, user?.id || "guest");
    setItems((prev) => prev.filter((p) => p.id !== productId));
  };

  const handleAddToCart = (product: Product) => {
    addToCart(product, 1);
    setAddedMap((prev) => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedMap((prev) => ({ ...prev, [product.id]: false }));
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Title Banner */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-secondary flex items-center justify-center">
              <Heart className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">My Saved Wishlist</h1>
              <p className="text-xs text-slate-500">
                Keep track of spare parts and tools you plan to purchase later.
              </p>
            </div>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-700 rounded-lg">
            {items.length} Saved {items.length === 1 ? "Item" : "Items"}
          </span>
        </div>

        {/* Wishlist Items List */}
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="w-8 h-8 border-4 border-secondary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-semibold">Loading saved wishlist...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-xs max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-50 text-secondary flex items-center justify-center mx-auto">
              <Heart className="w-8 h-8 text-secondary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Your wishlist is currently empty</h2>
              <p className="text-xs text-slate-500 mt-1">
                Explore our catalog of mobile LCDs, batteries, and tools to save items for quick ordering.
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-secondary text-white rounded-xl text-xs font-bold hover:bg-secondary-dark transition-all"
            >
              <span>Browse Catalog</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {items.map((prod) => {
              const isAdded = addedMap[prod.id];
              const priceToShow =
                user?.pricing_tier === "wholesale" && prod.wholesale_price
                  ? prod.wholesale_price
                  : user?.pricing_tier === "technician" && prod.technician_price
                  ? prod.technician_price
                  : prod.retail_price || prod.price || 0;

              return (
                <div
                  key={prod.id}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="p-4 space-y-3">
                    <div className="relative aspect-square rounded-xl bg-slate-50 flex items-center justify-center overflow-hidden">
                      <img
                        src={prod.image_url || "/placeholder.png"}
                        alt={prod.name}
                        className="w-full h-full object-contain p-2"
                      />
                      <button
                        onClick={() => handleRemove(prod.id)}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/90 text-rose-500 hover:bg-rose-50 border border-slate-200 shadow-xs transition-colors"
                        title="Remove from wishlist"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {typeof prod.category === "object" && prod.category ? prod.category.name : typeof prod.category === "string" ? prod.category : "General"}
                      </span>
                      <h3 className="text-xs font-bold text-slate-900 line-clamp-2 mt-0.5">{prod.name}</h3>
                    </div>
                  </div>

                  <div className="p-4 pt-0 space-y-3">
                    <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                      <div>
                        <p className="text-sm font-black text-slate-900">Rs. {priceToShow.toLocaleString()}</p>
                        <span className="text-[10px] font-medium text-emerald-600">
                          {(prod.stock || prod.stock_quantity || 0) > 0 ? "In Stock" : "Out of Stock"}
                        </span>
                      </div>
                      <button
                        onClick={() => handleAddToCart(prod)}
                        disabled={(prod.stock || prod.stock_quantity || 0) <= 0}
                        className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          isAdded
                            ? "bg-emerald-600 text-white"
                            : "bg-secondary hover:bg-secondary-dark text-white disabled:opacity-40"
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Added</span>
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="w-3.5 h-3.5" />
                            <span>Add to Cart</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
