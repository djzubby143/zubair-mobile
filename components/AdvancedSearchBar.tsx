"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  Camera,
  ShoppingCart,
  Check,
  PhoneCall,
  ArrowRight,
  Package,
  Layers,
  Sparkles,
  Lock,
} from "lucide-react";
import { Product } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import {
  DEFAULT_CATALOG_PRODUCTS,
  advancedSearchProducts,
} from "@/lib/products";
import { useCart } from "@/context/CartContext";
import { useAuth, getEffectiveProductPrice } from "@/lib/auth";
import { getCustomProducts, getDeletedProductKeys, isProductDeleted } from "@/lib/customProducts";

interface AdvancedSearchBarProps {
  className?: string;
  isMobile?: boolean;
  onSelectProduct?: (product: Product) => void;
}

export default function AdvancedSearchBar({
  className = "",
  isMobile = false,
  onSelectProduct,
}: AdvancedSearchBarProps) {
  const router = useRouter();
  const { addToCart } = useCart();
  const { isLoggedIn, user } = useAuth();

  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>(DEFAULT_CATALOG_PRODUCTS);
  const [results, setResults] = useState<Product[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [addedIds, setAddedIds] = useState<{ [id: string]: boolean }>({});

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load products from API / Supabase with fallback to DEFAULT_CATALOG_PRODUCTS
  useEffect(() => {
    async function loadCatalog() {
      let baseList: Product[] = [];
      try {
        const res = await fetch("/api/products", { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.products) && json.products.length > 0) {
            baseList = json.products;
          }
        }
      } catch (err) {
        console.warn("API search catalog fallback:", err);
      }

      if (baseList.length === 0) {
        try {
          const { data, error } = await supabase
            .from("products")
            .select("*, category:categories(*)")
            .eq("is_active", true);

          if (!error && data && data.length > 0) {
            baseList = data as Product[];
          } else {
            baseList = [...DEFAULT_CATALOG_PRODUCTS];
          }
        } catch {
          baseList = [...DEFAULT_CATALOG_PRODUCTS];
        }
      }

      // Merge local custom products (Admin added products)
      const localCustoms = getCustomProducts();
      const deletedKeys = getDeletedProductKeys();
      const mergedMap = new Map<string, Product>();

      // Custom products first
      for (const item of localCustoms) {
        if (item.is_active !== false && !isProductDeleted(item, deletedKeys)) {
          const key = (item.sku || item.slug || item.id || item.name).toLowerCase();
          mergedMap.set(key, item);
        }
      }

      // Then base products
      for (const item of baseList) {
        if (!isProductDeleted(item, deletedKeys)) {
          const key = (item.sku || item.slug || item.id || item.name).toLowerCase();
          if (!mergedMap.has(key)) {
            mergedMap.set(key, item);
          }
        }
      }

      setProducts(Array.from(mergedMap.values()));
    }

    loadCatalog();

    const handleUpdate = () => {
      loadCatalog();
    };

    window.addEventListener("storage", handleUpdate);
    window.addEventListener("zubair_products_updated", handleUpdate);

    return () => {
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("zubair_products_updated", handleUpdate);
    };
  }, []);

  // Run smart search when query changes
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      setSelectedIndex(-1);
      return;
    }

    const matches = advancedSearchProducts(query, products);
    setResults(matches);
    setIsOpen(true);
    setSelectedIndex(-1);
  }, [query, products]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard navigation (Arrow keys, Enter, Escape)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      return;
    }

    if (!isOpen || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        handleProductClick(results[selectedIndex]);
      }
    }
  };

  const handleProductClick = (product: Product) => {
    setIsOpen(false);
    if (onSelectProduct) {
      onSelectProduct(product);
    } else {
      router.push(`/product/${product.slug}`);
    }
  };

  const handleQuickAddToCart = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    const priceInfo = getEffectiveProductPrice(product, user);
    addToCart(
      {
        ...product,
        price: priceInfo.price,
        pricing_tier: priceInfo.activeTier,
      },
      product.min_order_quantity && product.min_order_quantity > 0 ? product.min_order_quantity : 1
    );
    setAddedIds((prev) => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedIds((prev) => ({ ...prev, [product.id]: false }));
    }, 1800);
  };

  // WhatsApp Inquiry URL for unlisted or custom search requests
  const whatsappInquiryUrl = `https://wa.me/923458032600?text=${encodeURIComponent(
    `Assalam-o-Alaikum Zubair Mobile! Mujhe yeh spare part chahiye jo website par search kiya tha: "${query}"`
  )}`;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Search Input Box */}
      <div className="relative w-full">
        <input
          ref={inputRef}
          type="text"
          placeholder={
            isMobile
              ? "Search e.g. Samsung charging flex, Vivo unit..."
              : "Search mobile parts (e.g. Samsung ki charging flex, Vivo LCD, OCA Glass)..."
          }
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (query.trim() && results.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className={`w-full pl-9 pr-9 py-2 rounded-full border border-slate-300 focus:border-[#dc2626] bg-white focus:outline-none focus:ring-2 focus:ring-[#dc2626]/20 text-slate-800 placeholder:text-slate-400 shadow-2xs transition-all ${
            isMobile ? "text-xs" : "text-xs sm:text-sm"
          }`}
        />
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />

        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors"
            title="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Floating Smart Search Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1.5 bg-white rounded-2xl border-2 border-[#dc2626]/30 shadow-2xl overflow-hidden max-h-[85vh] sm:max-h-[520px] flex flex-col animate-in fade-in zoom-in-98 duration-100">
          {/* Header Bar */}
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#dc2626]" />
              <span>
                Found <strong>{results.length}</strong> matching parts for &quot;{query}&quot;
              </span>
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-[11px] text-slate-400 hover:text-slate-700 font-semibold"
            >
              ESC to close
            </button>
          </div>

          {/* Results List or Empty State */}
          <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
            {results.length === 0 ? (
              <div className="p-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Search className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs sm:text-sm font-bold text-slate-800">
                    Koi item nahi mila for &quot;{query}&quot;
                  </p>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                    Agar yeh part stock mein online listed nahi hai to Zubair Mobile Gujranwala se seedha WhatsApp par mangwayein:
                  </p>
                </div>
                <a
                  href={whatsappInquiryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold transition-all shadow-2xs"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>WhatsApp par Talab Karein (03458032600)</span>
                </a>
              </div>
            ) : (
              results.map((product, index) => {
                const isSelected = selectedIndex === index;
                const isAdded = addedIds[product.id] || false;
                const categoryName = product.category?.name || "SPARE PART";

                return (
                  <div
                    key={product.id}
                    onClick={() => handleProductClick(product)}
                    className={`p-3 flex items-center gap-3.5 transition-colors cursor-pointer group ${
                      isSelected
                        ? "bg-red-50/80"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    {/* Col 1: Product Image Box (Matches Screenshot Layout) */}
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-2xs group-hover:border-[#dc2626]/50 transition-colors">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-contain p-1"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-300 group-hover:text-[#dc2626]/70 transition-colors">
                          <Camera className="w-5 h-5 stroke-[1.5]" />
                          <span className="text-[7.5px] font-bold uppercase tracking-tight mt-0.5 text-center leading-none">
                            NO IMAGE
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Col 2: Product Details & Badges */}
                    <div className="flex-1 min-w-0 space-y-1">
                      {/* Category & SKU Pill */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider bg-red-50 text-[#dc2626]">
                          {categoryName}
                        </span>
                        {product.sku && (
                          <span className="font-mono text-[10px] text-slate-400">
                            SKU: {product.sku}
                          </span>
                        )}
                        <span className="text-[10px] font-semibold text-emerald-600">
                          {product.stock_quantity > 0
                            ? `In Stock (${product.stock_quantity})`
                            : "Available"}
                        </span>
                      </div>

                      {/* Product Name */}
                      <h4 className="text-xs sm:text-sm font-bold text-[#111827] group-hover:text-[#dc2626] line-clamp-1 transition-colors">
                        {product.name}
                      </h4>

                      {/* Description snippet if any */}
                      {product.short_description && (
                        <p className="text-[11px] text-slate-400 line-clamp-1">
                          {product.short_description}
                        </p>
                      )}

                      {/* Role-authorized Price Tag */}
                      {(() => {
                        const priceInfo = getEffectiveProductPrice(product, user);
                        return (
                          <div className="pt-0.5 space-y-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`text-xs sm:text-sm font-black ${
                                  priceInfo.activeTier === "wholesale"
                                    ? "text-[#16a34a]"
                                    : priceInfo.activeTier === "technician"
                                    ? "text-amber-700"
                                    : "text-blue-600"
                                }`}
                              >
                                Rs {priceInfo.price.toLocaleString("en-PK")}
                              </span>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                  priceInfo.activeTier === "wholesale"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : priceInfo.activeTier === "technician"
                                    ? "bg-amber-50 text-amber-800 border border-amber-200"
                                    : "bg-blue-50 text-blue-700 border border-blue-200"
                                }`}
                              >
                                {priceInfo.tierLabelUrdu}
                              </span>
                            </div>
                            {priceInfo.isGuest && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsOpen(false);
                                  router.push("/login");
                                }}
                                className="inline-flex items-center gap-1 text-[9px] text-[#dc2626] hover:underline font-semibold"
                              >
                                <Lock className="w-2.5 h-2.5" />
                                <span>ہول سیل و ٹیکنیشن ریٹ کیلئے لاگ ان</span>
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Col 3: Quick Action Buttons */}
                    <div className="flex flex-col sm:flex-row items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleQuickAddToCart(e, product)}
                        className={`inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs ${
                          isAdded
                            ? "bg-emerald-600 text-white"
                            : "bg-[#dc2626] hover:bg-[#b91c1c] text-white"
                        }`}
                        title="Add to Cart"
                      >
                        {isAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Added</span>
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Add</span>
                          </>
                        )}
                      </button>

                      <div className="hidden sm:block text-slate-300 group-hover:text-[#dc2626] transition-colors p-1">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Footer Bar */}
          {results.length > 0 && (
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500">
              <span>
                Direct Wholesale Supply from <strong>Chand Plaza, Gujranwala</strong>
              </span>
              <a
                href={whatsappInquiryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[#25D366] hover:underline font-bold"
              >
                <PhoneCall className="w-3 h-3" />
                <span>Ask on WhatsApp (03458032600)</span>
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
