"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ChevronRight, ChevronLeft, Layers, X, Sparkles, Filter } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import HeroBanner from "@/components/HeroBanner";
import { Product } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { DEFAULT_CATALOG_PRODUCTS } from "@/lib/products";
import { getLiveCategories, LiveCategory, DEFAULT_CATEGORIES } from "@/lib/categories";

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const categoryFromUrl = searchParams.get("category");

  const [products, setProducts] = useState<Product[]>(DEFAULT_CATALOG_PRODUCTS);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [categories, setCategories] = useState<LiveCategory[]>(DEFAULT_CATEGORIES);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);

  // Sync selectedCategory with URL param if present
  useEffect(() => {
    if (categoryFromUrl) {
      setSelectedCategory(categoryFromUrl);
    } else {
      setSelectedCategory("All");
    }
  }, [categoryFromUrl]);

  // Load products and live categories
  const loadAllData = async () => {
    try {
      // 1. Fetch Categories
      const liveCats = await getLiveCategories();
      if (liveCats && liveCats.length > 0) {
        setCategories(liveCats);
      }

      // 2. Fetch Products
      const { data: prodData, error: prodErr } = await supabase
        .from("products")
        .select("*, category:categories(*)")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (!prodErr && prodData && prodData.length > 0) {
        const merged = [...prodData];
        for (const def of DEFAULT_CATALOG_PRODUCTS) {
          if (!merged.some((m) => m.name.toLowerCase() === def.name.toLowerCase())) {
            merged.push(def);
          }
        }
        setProducts(merged);
      } else {
        setProducts(DEFAULT_CATALOG_PRODUCTS);
      }
    } catch (err) {
      console.warn("Notice loading catalog data:", err);
      setProducts(DEFAULT_CATALOG_PRODUCTS);
    }
  };

  useEffect(() => {
    loadAllData();

    // Event listeners for instant updates when a category is added in Admin
    const handleStorageUpdate = (e: StorageEvent) => {
      if (!e.key || e.key === "zubair_mobile_categories") {
        loadAllData();
      }
    };

    const handleCustomUpdate = () => {
      loadAllData();
    };

    const handleFocus = () => {
      loadAllData();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorageUpdate);
      window.addEventListener("zubair_category_updated", handleCustomUpdate);
      window.addEventListener("focus", handleFocus);
    }

    // Supabase Realtime channel for live sync
    const catChannel = supabase
      .channel("home-categories-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "categories" },
        () => {
          loadAllData();
        }
      )
      .subscribe();

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", handleStorageUpdate);
        window.removeEventListener("zubair_category_updated", handleCustomUpdate);
        window.removeEventListener("focus", handleFocus);
      }
      supabase.removeChannel(catChannel);
    };
  }, []);

  // Filter products based on selectedCategory
  const filteredProducts = useMemo(() => {
    if (!selectedCategory || selectedCategory === "All") return products;

    const query = selectedCategory.toLowerCase().trim();

    return products.filter((p) => {
      const catName = (p.category?.name || "").toLowerCase();
      const prodName = p.name.toLowerCase();
      const desc = (p.short_description || "").toLowerCase();

      // Direct category match
      if (catName.includes(query)) return true;

      // Smart keywords matching
      if (query === "sidekey" || query === "side key") {
        return prodName.includes("side") || prodName.includes("key") || desc.includes("key");
      }
      if (query.includes("lcd") || query.includes("unit")) {
        return prodName.includes("unit") || prodName.includes("lcd");
      }
      if (query.includes("flex") || query.includes("charging flex")) {
        return prodName.includes("flex") || prodName.includes("charging");
      }
      if (query.includes("oca") || query.includes("glass")) {
        return prodName.includes("oca") || prodName.includes("glass");
      }

      return prodName.includes(query);
    });
  }, [products, selectedCategory]);

  const handleSelectCategory = (catName: string) => {
    setSelectedCategory(catName);
    setCurrentPage(1);
    if (catName === "All") {
      router.push("/", { scroll: false });
    } else {
      router.push(`/?category=${encodeURIComponent(catName)}`, { scroll: false });
    }
  };

  // Top circular categories dynamically built from live categories list
  const circularCategories = useMemo(() => {
    return categories.map((cat) => ({
      name: cat.name,
      initial: cat.name.charAt(0).toUpperCase(),
      label: cat.name.length > 11 ? cat.name.slice(0, 9) + "..." : cat.name,
    }));
  }, [categories]);

  return (
    <div className="max-w-[1700px] mx-auto px-2 sm:px-4 py-4">
      {/* Active category filter bar */}
      {selectedCategory !== "All" && (
        <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <Filter className="w-4 h-4 text-[#dc2626]" />
            <span className="text-slate-600">Showing products for category:</span>
            <span className="font-bold text-[#dc2626] uppercase bg-white px-2 py-0.5 rounded border border-red-200 shadow-2xs">
              {selectedCategory}
            </span>
            <span className="text-slate-400">({filteredProducts.length} items found)</span>
          </div>
          <button
            type="button"
            onClick={() => handleSelectCategory("All")}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-[#dc2626] font-semibold bg-white px-2 py-1 rounded border border-slate-200 hover:border-red-300 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            <span>Clear Filter</span>
          </button>
        </div>
      )}

      {/* 2-Column Storefront Layout: Left Sidebar + Right Catalog (Screenshot Style) */}
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* Left Sidebar: Categories with Hover Effects and Real-time List */}
        <aside
          className="w-full lg:w-60 shrink-0 bg-white rounded-lg border border-slate-200/80 p-3 shadow-2xs transition-shadow hover:shadow-md"
          onMouseEnter={() => setSidebarHovered(true)}
          onMouseLeave={() => setSidebarHovered(false)}
        >
          {/* Header */}
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#dc2626]" />
              CATEGORIES ({categories.length})
            </span>
            {sidebarHovered && (
              <span className="text-[9px] text-[#dc2626] font-bold animate-pulse">Live</span>
            )}
          </div>

          {/* Active "All" Pill (Matches Logo Red) */}
          <button
            type="button"
            onClick={() => handleSelectCategory("All")}
            className={`w-full text-left px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              selectedCategory === "All"
                ? "bg-[#dc2626] text-white shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            All Products
          </button>

          {/* Vertical Category List with Smooth Hover Highlights */}
          <div className="mt-2 space-y-0.5 max-h-[720px] overflow-y-auto pr-0.5 scrollbar-thin">
            {categories.map((cat) => {
              const isSelected = selectedCategory.toLowerCase() === cat.name.toLowerCase();
              return (
                <button
                  key={cat.id || cat.name}
                  type="button"
                  onClick={() => handleSelectCategory(cat.name)}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-[11px] font-medium transition-all text-left group ${
                    isSelected
                      ? "bg-red-50 text-[#dc2626] font-bold shadow-2xs translate-x-1"
                      : "text-slate-600 hover:text-[#dc2626] hover:bg-red-50/60 hover:translate-x-0.5"
                  }`}
                  title={cat.description || cat.name}
                >
                  <span className="truncate uppercase">{cat.name}</span>
                  <ChevronRight
                    className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                      isSelected
                        ? "text-[#dc2626] translate-x-0.5"
                        : "text-slate-300 group-hover:text-[#dc2626] group-hover:translate-x-0.5"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </aside>

        {/* Right Area: Hero Banner + Circular Categories + 6-Col Grid + Pagination */}
        <main className="flex-1 min-w-0 space-y-4">
          {/* Admin-Configurable Hero Promotional Offer Banner */}
          <HeroBanner />

          {/* Top Horizontal Row of Circular Categories (Logo Red Theme) */}
          <div className="bg-white rounded-lg border border-slate-200/80 p-3 shadow-2xs overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-3 sm:gap-4 min-w-max pb-1">
              {circularCategories.map((item, idx) => {
                const isSelected = selectedCategory.toLowerCase() === item.name.toLowerCase();
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectCategory(item.name)}
                    className="flex flex-col items-center gap-1.5 group shrink-0"
                    title={item.name}
                  >
                    {/* Circle button (Brand Red) */}
                    <div
                      className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-sm shadow-xs transition-all group-hover:scale-105 ${
                        isSelected
                          ? "bg-[#111827] text-white ring-2 ring-[#dc2626] ring-offset-2 scale-105"
                          : "bg-[#dc2626] hover:bg-[#b91c1c] text-white"
                      }`}
                    >
                      {item.initial}
                    </div>
                    {/* Label below */}
                    <span
                      className={`text-[9.5px] font-semibold uppercase tracking-tight text-center max-w-[65px] truncate transition-colors ${
                        isSelected
                          ? "text-[#dc2626] font-bold"
                          : "text-slate-500 group-hover:text-[#dc2626]"
                      }`}
                    >
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Product Cards Grid: 6 Columns on Desktop (Screenshot Style) */}
          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
              <Layers className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-700 text-sm">No products found in this category</p>
              <p className="text-xs text-slate-400">
                Contact Zubair Mobile on WhatsApp (0345-8032600) to order spare parts for this category.
              </p>
              <button
                type="button"
                onClick={() => handleSelectCategory("All")}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#dc2626] text-white text-xs font-bold hover:bg-[#b91c1c] transition-colors"
              >
                <span>View All Products</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {/* Bottom Pagination: 1 2 3 4 5 6 7 8 9 > */}
          <div className="flex items-center justify-center gap-1 py-8">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="w-7 h-7 rounded flex items-center justify-center text-slate-400 hover:text-slate-700 disabled:opacity-30 text-xs"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`w-7 h-7 rounded text-xs font-semibold flex items-center justify-center transition-colors ${
                  currentPage === pageNum
                    ? "bg-[#dc2626] text-white shadow-2xs font-bold"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {pageNum}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((p) => Math.min(9, p + 1))}
              className="w-7 h-7 rounded flex items-center justify-center text-slate-400 hover:text-slate-700 text-xs"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-[1700px] mx-auto px-4 py-12 flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-[#dc2626] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
