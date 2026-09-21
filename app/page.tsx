"use client";

import React, { useState, useEffect, useMemo, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Layers,
  X,
  Sparkles,
  Filter,
  Tag,
} from "lucide-react";
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
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnterSidebar = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setSidebarHovered(true);
  };

  const handleMouseLeaveSidebar = () => {
    hoverTimerRef.current = setTimeout(() => {
      setSidebarHovered(false);
    }, 150);
  };

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
    setSidebarHovered(false);
    if (catName === "All") {
      router.push("/", { scroll: false });
    } else {
      router.push(`/?category=${encodeURIComponent(catName)}`, { scroll: false });
    }
  };

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

      {/* 2-Column Storefront Layout: Left Sidebar Dropdown + Right Catalog */}
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* Left Side: Categories Bar with Hover Dropdown (Default: Hidden / Collapsed) */}
        <div
          className="relative w-full lg:w-64 shrink-0 z-30"
          onMouseEnter={handleMouseEnterSidebar}
          onMouseLeave={handleMouseLeaveSidebar}
        >
          {/* Main Category Bar Trigger Button (Always visible, clean & branded) */}
          <div
            onClick={() => setSidebarHovered(!sidebarHovered)}
            className={`w-full bg-white rounded-lg border p-3 shadow-2xs cursor-pointer transition-all flex items-center justify-between select-none ${
              sidebarHovered
                ? "border-[#dc2626] ring-2 ring-[#dc2626]/20 bg-red-50/30"
                : "border-slate-200/80 hover:border-[#dc2626]"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#dc2626] text-white flex items-center justify-center shadow-xs shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-black text-[#111827] uppercase tracking-wide block leading-tight">
                  CATEGORIES
                </span>
                <span className="text-[10.5px] text-slate-500 font-semibold block truncate">
                  {selectedCategory !== "All"
                    ? `Active: ${selectedCategory}`
                    : `Hover to view (${categories.length})`}
                </span>
              </div>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
                sidebarHovered ? "rotate-180 text-[#dc2626]" : ""
              }`}
            />
          </div>

          {/* Categories Dropdown: Hidden normally, drops down when cursor hovers over it */}
          {sidebarHovered && (
            <div
              className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl border border-slate-200 shadow-2xl p-2 z-50 max-h-[620px] overflow-y-auto divide-y divide-slate-100 animate-in fade-in slide-in-from-top-2 duration-150"
              onMouseEnter={handleMouseEnterSidebar}
              onMouseLeave={handleMouseLeaveSidebar}
            >
              {/* "All Products" option */}
              <div className="pb-1.5">
                <button
                  type="button"
                  onClick={() => handleSelectCategory("All")}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-between ${
                    selectedCategory === "All"
                      ? "bg-[#dc2626] text-white shadow-2xs"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className="uppercase">ALL PRODUCTS</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                      selectedCategory === "All"
                        ? "bg-red-700 text-white"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {products.length}
                  </span>
                </button>
              </div>

              {/* Live Categories List */}
              <div className="pt-1.5 space-y-0.5">
                {categories.map((cat) => {
                  const isSelected =
                    selectedCategory.toLowerCase() === cat.name.toLowerCase();
                  return (
                    <button
                      key={cat.id || cat.name}
                      type="button"
                      onClick={() => handleSelectCategory(cat.name)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[11.5px] font-semibold transition-all text-left group ${
                        isSelected
                          ? "bg-red-50 text-[#dc2626] font-bold shadow-2xs"
                          : "text-slate-700 hover:text-[#dc2626] hover:bg-red-50/70"
                      }`}
                      title={cat.description || cat.name}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span className="w-5 h-5 rounded bg-slate-100 group-hover:bg-[#dc2626] group-hover:text-white text-slate-600 flex items-center justify-center text-[9px] font-bold shrink-0 transition-colors">
                          {cat.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="truncate uppercase">{cat.name}</span>
                      </div>
                      <ChevronRight
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isSelected
                            ? "text-[#dc2626]"
                            : "text-slate-300 group-hover:text-[#dc2626]"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Area: Hero Banner + 6-Col Grid + Pagination */}
        <main className="flex-1 min-w-0 space-y-4">
          {/* Admin-Configurable Hero Promotional Offer Banner */}
          <HeroBanner />

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
