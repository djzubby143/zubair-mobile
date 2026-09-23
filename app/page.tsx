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
  ArrowRight,
} from "lucide-react";
import ProductCard from "@/components/ProductCard";
import HeroBanner from "@/components/HeroBanner";
import { Product } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { DEFAULT_CATALOG_PRODUCTS } from "@/lib/products";
import { getLiveCategories, LiveCategory, DEFAULT_CATEGORIES } from "@/lib/categories";
import { useAuth, getStoredCustomerUser } from "@/lib/auth";
import { resolveUserTier, sanitizeProductListForTier } from "@/lib/pricingSecurity";
import { getCustomProducts, getDeletedProductKeys, isProductDeleted } from "@/lib/customProducts";

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const categoryFromUrl = searchParams.get("category") || searchParams.get("q") || searchParams.get("search");
  const { user } = useAuth();

  const [products, setProducts] = useState<Product[]>(() => {
    const tier = resolveUserTier(getStoredCustomerUser());
    const deleted = getDeletedProductKeys();
    return sanitizeProductListForTier(
      DEFAULT_CATALOG_PRODUCTS.filter((p) => !isProductDeleted(p, deleted)),
      tier
    );
  });
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedBrand, setSelectedBrand] = useState<string>("All");
  const [selectedGrade, setSelectedGrade] = useState<string>("All");
  const [onlyInStock, setOnlyInStock] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>("default");
  const [categories, setCategories] = useState<LiveCategory[]>(DEFAULT_CATEGORIES);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [activeHoverCategory, setActiveHoverCategory] = useState<LiveCategory | null>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnterSidebar = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setSidebarHovered(true);
  };

  const handleMouseLeaveSidebar = () => {
    hoverTimerRef.current = setTimeout(() => {
      setSidebarHovered(false);
      setActiveHoverCategory(null);
    }, 200);
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
    const activeUser = user || getStoredCustomerUser();
    const tier = resolveUserTier(activeUser);
    try {
      // 1. Fetch Categories
      const liveCats = await getLiveCategories();
      if (liveCats && liveCats.length > 0) {
        setCategories(liveCats);
      }

      // 2. Fetch Products via secure /api/products endpoint
      let loadedProducts: Product[] = [];
      let apiDeletedKeys: string[] = [];
      try {
        const res = await fetch("/api/products", {
          cache: "no-store",
          headers: {
            "x-user-tier": tier,
          },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.products)) {
            loadedProducts = json.products;
          }
          if (Array.isArray(json.deletedKeys)) {
            apiDeletedKeys = json.deletedKeys;
          }
        }
      } catch (apiErr) {
        console.warn("API /api/products fallback to Supabase direct:", apiErr);
      }

      // Merge server deletedKeys with local deletedKeys and synchronize localStorage
      const deletedKeys = getDeletedProductKeys();
      for (const k of apiDeletedKeys) {
        if (k) deletedKeys.add(String(k).toLowerCase().trim());
      }
      if (typeof window !== "undefined" && apiDeletedKeys.length > 0) {
        try {
          localStorage.setItem("zubair_admin_deleted_products", JSON.stringify(Array.from(deletedKeys)));
        } catch {}
      }

      // Fallback: Fetch directly from Supabase & sanitize with tier
      if (loadedProducts.length === 0) {
        const { data: prodData, error: prodErr } = await supabase
          .from("products")
          .select("*, category:categories(*)")
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (!prodErr && prodData && prodData.length > 0) {
          loadedProducts = prodData as Product[];
        } else {
          loadedProducts = [...DEFAULT_CATALOG_PRODUCTS];
        }
      }

      // 3. Merge LocalStorage Custom Products (Admin created products)
      const localCustoms = getCustomProducts();

      const mergedMap = new Map<string, Product>();

      // Put custom products FIRST at the top of the storefront catalog
      for (const item of localCustoms) {
        if (item.is_active !== false && !isProductDeleted(item, deletedKeys)) {
          const key = (item.sku || item.slug || item.id || item.name).toLowerCase();
          mergedMap.set(key, item);
        }
      }

      // Then append loaded products
      for (const item of loadedProducts) {
        if (!isProductDeleted(item, deletedKeys)) {
          const key = (item.sku || item.slug || item.id || item.name).toLowerCase();
          if (!mergedMap.has(key)) {
            mergedMap.set(key, item);
          }
        }
      }

      // Ensure all products have category object mapped if category_id exists
      const catList = liveCats && liveCats.length > 0 ? liveCats : categories;
      const allMerged = Array.from(mergedMap.values()).map((p) => {
        if (!p.category && p.category_id) {
          const matchCat = catList.find((c) => c.id === p.category_id);
          if (matchCat) {
            return {
              ...p,
              category: { id: matchCat.id, name: matchCat.name, slug: matchCat.slug },
            };
          }
        }
        return p;
      });

      setProducts(sanitizeProductListForTier(allMerged, tier));
    } catch (err) {
      console.warn("Notice loading catalog data:", err);
      const fallbackDeleted = getDeletedProductKeys();
      setProducts(sanitizeProductListForTier(DEFAULT_CATALOG_PRODUCTS.filter((p) => !isProductDeleted(p, fallbackDeleted)), tier));
    }
  };

  useEffect(() => {
    loadAllData();
  }, [user]);

  useEffect(() => {
    // Event listeners for instant updates when a category or product is added in Admin
    const handleStorageUpdate = (e: StorageEvent) => {
      if (
        !e.key ||
        e.key === "zubair_mobile_categories" ||
        e.key === "zubair_mobile_subcategories_map" ||
        e.key === "zubair_admin_custom_products" ||
        e.key === "zubair_admin_deleted_products"
      ) {
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
      window.addEventListener("zubair_products_updated", handleCustomUpdate);
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

  // Dynamic available brands and grades from catalog
  const availableBrands = useMemo(() => {
    const brandSet = new Set<string>();
    for (const p of products) {
      if (p.brand && p.brand.trim()) {
        brandSet.add(p.brand.trim());
      } else {
        // Fallback detection from product name
        const n = p.name.toUpperCase();
        if (n.includes("SAMSUNG")) brandSet.add("Samsung");
        else if (n.includes("VIVO")) brandSet.add("Vivo");
        else if (n.includes("OPPO")) brandSet.add("Oppo");
        else if (n.includes("INFINIX")) brandSet.add("Infinix");
        else if (n.includes("TECNO")) brandSet.add("Tecno");
        else if (n.includes("XIAOMI") || n.includes("REDMI")) brandSet.add("Xiaomi");
        else if (n.includes("REALME")) brandSet.add("Realme");
        else if (n.includes("IPHONE") || n.includes("APPLE")) brandSet.add("Apple");
      }
    }
    return Array.from(brandSet).sort();
  }, [products]);

  // Filter products based on selectedCategory, brand, quality grade, stock, and sorting
  const filteredProducts = useMemo(() => {
    let result = products;

    // 1. Category Filter
    if (selectedCategory && selectedCategory !== "All") {
      const query = selectedCategory.toLowerCase().trim();
      result = result.filter((p) => {
        const catName = (p.category?.name || "").toLowerCase();
        const catSlug = (p.category?.slug || "").toLowerCase();
        const prodName = p.name.toLowerCase();
        const desc = (p.short_description || "").toLowerCase();

        const matchedCat = categories.find((c) => c.id === p.category_id);
        const matchedCatName = (matchedCat?.name || "").toLowerCase();
        const matchedCatSlug = (matchedCat?.slug || "").toLowerCase();

        if (
          catName === query ||
          catSlug === query ||
          catName.includes(query) ||
          catSlug.includes(query) ||
          matchedCatName === query ||
          matchedCatSlug === query ||
          matchedCatName.includes(query) ||
          matchedCatSlug.includes(query) ||
          (query.includes("side") && (catName.includes("side") || catSlug.includes("side") || matchedCatName.includes("side") || prodName.includes("side")))
        ) {
          return true;
        }

        if (query.includes("incell")) return prodName.includes("incell") || desc.includes("incell") || prodName.includes("unit") || prodName.includes("lcd");
        if (query.includes("tft")) return prodName.includes("tft") || desc.includes("tft") || prodName.includes("unit") || prodName.includes("lcd");
        if (query.includes("oled")) return prodName.includes("oled") || desc.includes("oled") || prodName.includes("unit") || prodName.includes("lcd");
        if (query.includes("unit") || query.includes("lcd")) return prodName.includes("unit") || prodName.includes("lcd");
        if (query.includes("power key") || query.includes("volume key") || query.includes("sidekey") || query.includes("side key")) return prodName.includes("key") || prodName.includes("side") || desc.includes("key");
        if (query.includes("charging base") || query.includes("base") || query.includes("type-c") || query.includes("micro usb")) return prodName.includes("base") || prodName.includes("charging") || desc.includes("base");
        if (query.includes("flex") || query.includes("sub board")) return prodName.includes("flex") || prodName.includes("charging") || prodName.includes("board");
        if (query.includes("oca") || query.includes("glass")) return prodName.includes("oca") || prodName.includes("glass");
        if (query.includes("battery") || query.includes("housing")) return prodName.includes("battery") || prodName.includes("housing") || desc.includes("battery");
        if (query.includes("cable") || query.includes("charger")) return prodName.includes("cable") || prodName.includes("charger");
        if (query.includes("tool") || query.includes("heatgun") || query.includes("wire")) return prodName.includes("tool") || prodName.includes("heatgun") || prodName.includes("wire") || prodName.includes("stand");

        return prodName.includes(query) || desc.includes(query);
      });
    }

    // 2. Brand Filter
    if (selectedBrand && selectedBrand !== "All") {
      const bQuery = selectedBrand.toLowerCase();
      result = result.filter((p) => {
        if (p.brand && p.brand.toLowerCase() === bQuery) return true;
        return p.name.toLowerCase().includes(bQuery);
      });
    }

    // 3. Quality Grade Filter
    if (selectedGrade && selectedGrade !== "All") {
      result = result.filter((p) => (p.quality_grade || "").toLowerCase() === selectedGrade.toLowerCase());
    }

    // 4. In Stock Only Filter
    if (onlyInStock) {
      result = result.filter((p) => (p.stock_quantity ?? 0) > 0);
    }

    // 5. Sorting
    if (sortBy === "price_asc") {
      result = [...result].sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === "price_desc") {
      result = [...result].sort((a, b) => (b.price || 0) - (a.price || 0));
    }

    return result;
  }, [products, selectedCategory, selectedBrand, selectedGrade, onlyInStock, sortBy, categories]);

  const handleSelectCategory = (catName: string) => {
    setSelectedCategory(catName);
    setCurrentPage(1);
    setSidebarHovered(false);
    setActiveHoverCategory(null);
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
            <span className="text-slate-600">Showing products for:</span>
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

      {/* 2-Column Storefront Layout: Left Sidebar Dropdown with Subcategories Flyout + Right Catalog */}
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* Left Side: Categories Bar with Hover Dropdown & Sub-Category Flyout */}
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

          {/* Categories Dropdown Wrapper: Hidden normally, drops down when cursor hovers */}
          {sidebarHovered && (
            <div
              className="absolute top-full left-0 mt-1.5 flex z-50 animate-in fade-in slide-in-from-top-2 duration-150"
              onMouseEnter={handleMouseEnterSidebar}
              onMouseLeave={handleMouseLeaveSidebar}
            >
              {/* Primary Categories List Pane */}
              <div className="w-64 bg-white rounded-xl border border-slate-200 shadow-2xl p-2 max-h-[620px] overflow-y-auto divide-y divide-slate-100">
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
                    const isHovered =
                      activeHoverCategory?.name.toLowerCase() === cat.name.toLowerCase();
                    const hasSub = cat.subcategories && cat.subcategories.length > 0;

                    return (
                      <div
                        key={cat.id || cat.name}
                        onMouseEnter={() => setActiveHoverCategory(cat)}
                        className="relative"
                      >
                        <button
                          type="button"
                          onClick={() => handleSelectCategory(cat.name)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[11.5px] font-semibold transition-all text-left group ${
                            isSelected || isHovered
                              ? "bg-red-50 text-[#dc2626] font-bold shadow-2xs"
                              : "text-slate-700 hover:text-[#dc2626] hover:bg-red-50/70"
                          }`}
                          title={cat.description || cat.name}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <span
                              className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold shrink-0 transition-colors ${
                                isSelected || isHovered
                                  ? "bg-[#dc2626] text-white"
                                  : "bg-slate-100 text-slate-600 group-hover:bg-[#dc2626] group-hover:text-white"
                              }`}
                            >
                              {cat.name.charAt(0).toUpperCase()}
                            </span>
                            <span className="truncate uppercase">{cat.name}</span>
                          </div>
                          {hasSub ? (
                            <ChevronRight
                              className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                                isHovered
                                  ? "text-[#dc2626] translate-x-1"
                                  : "text-slate-300 group-hover:text-[#dc2626]"
                              }`}
                            />
                          ) : null}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sub-Category Flyout Side Menu ("jab cursor LCD Panel par karein us k aagy aa jaye") */}
              {activeHoverCategory &&
                activeHoverCategory.subcategories &&
                activeHoverCategory.subcategories.length > 0 && (
                  <div className="ml-1.5 w-60 bg-white rounded-xl border border-slate-200 shadow-2xl p-2.5 max-h-[620px] overflow-y-auto animate-in fade-in slide-in-from-left-2 duration-150">
                    {/* Header */}
                    <div className="pb-2 mb-2 border-b border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                          Sub-Categories
                        </span>
                        <h4 className="text-xs font-black text-[#111827] uppercase truncate max-w-[140px]">
                          {activeHoverCategory.name}
                        </h4>
                      </div>
                      <span className="text-[10px] bg-red-50 text-[#dc2626] font-bold px-2 py-0.5 rounded-full border border-red-100">
                        {activeHoverCategory.subcategories.length} Types
                      </span>
                    </div>

                    {/* View All in Parent Button */}
                    <button
                      type="button"
                      onClick={() => handleSelectCategory(activeHoverCategory.name)}
                      className="w-full text-left px-2.5 py-1.5 mb-1.5 rounded-lg text-[11px] font-bold text-[#dc2626] bg-red-50/60 hover:bg-red-50 transition-colors flex items-center justify-between group/all"
                    >
                      <span>View All {activeHoverCategory.name}</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover/all:translate-x-1 transition-transform" />
                    </button>

                    {/* Sub-Categories List */}
                    <div className="space-y-1">
                      {activeHoverCategory.subcategories.map((sub, idx) => {
                        const isSubSelected =
                          selectedCategory.toLowerCase() === sub.toLowerCase();

                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSelectCategory(sub)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-between group/sub ${
                              isSubSelected
                                ? "bg-[#dc2626] text-white shadow-xs font-bold"
                                : "text-slate-700 hover:bg-red-50 hover:text-[#dc2626]"
                            }`}
                          >
                            <span className="truncate">{sub}</span>
                            <ChevronRight
                              className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                                isSubSelected
                                  ? "text-white"
                                  : "text-slate-300 group-hover/sub:text-[#dc2626] group-hover/sub:translate-x-0.5"
                              }`}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
            </div>
          )}
        </div>

        {/* Right Area: Hero Banner + 6-Col Grid + Pagination */}
        <main className="flex-1 min-w-0 space-y-4">
          {/* Admin-Configurable Hero Promotional Offer Banner */}
          <HeroBanner />

          {/* Multi-Faceted Spare Parts Filters Bar */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-3 shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <Filter className="w-3.5 h-3.5 text-[#dc2626]" />
                <span>FILTER SPARE PARTS</span>
                <span className="text-slate-400 font-normal">({filteredProducts.length} items available)</span>
              </div>
              <div className="flex items-center gap-3">
                {/* In-Stock Toggle */}
                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={onlyInStock}
                    onChange={(e) => setOnlyInStock(e.target.checked)}
                    className="rounded border-slate-300 text-[#dc2626] focus:ring-[#dc2626] w-3.5 h-3.5 cursor-pointer"
                  />
                  <span>In-Stock Only</span>
                </label>

                {/* Sort By Dropdown */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 font-medium focus:outline-hidden focus:border-[#dc2626]"
                >
                  <option value="default">Default Sort</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                </select>

                {(selectedBrand !== "All" || selectedGrade !== "All" || onlyInStock || sortBy !== "default") && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBrand("All");
                      setSelectedGrade("All");
                      setOnlyInStock(false);
                      setSortBy("default");
                    }}
                    className="text-[11px] text-[#dc2626] hover:underline font-semibold"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            </div>

            {/* Filter Pills: Brand & Quality Grade */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              {/* Brand Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none flex-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Brand:</span>
                <button
                  type="button"
                  onClick={() => setSelectedBrand("All")}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
                    selectedBrand === "All"
                      ? "bg-[#111827] text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  All Brands
                </button>
                {availableBrands.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setSelectedBrand(selectedBrand === b ? "All" : b)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
                      selectedBrand === b
                        ? "bg-[#dc2626] text-white shadow-2xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>

              {/* Quality Grade Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none shrink-0">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Grade:</span>
                {["All", "Original", "OEM", "High Copy", "Copy"].map((grade) => (
                  <button
                    key={grade}
                    type="button"
                    onClick={() => setSelectedGrade(selectedGrade === grade ? "All" : grade)}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold whitespace-nowrap transition-colors ${
                      selectedGrade === grade
                        ? "bg-purple-700 text-white font-bold"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {grade}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Product Cards Grid: 6 Columns on Desktop (Screenshot Style) */}
          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
              <Layers className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-700 text-sm">No products found for &ldquo;{selectedCategory}&rdquo;</p>
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
