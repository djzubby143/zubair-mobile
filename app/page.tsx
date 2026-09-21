"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import HeroBanner from "@/components/HeroBanner";
import { Product, Category } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { DEFAULT_CATALOG_PRODUCTS } from "@/lib/products";

// Sidebar categories matching Screenshot
const SIDEBAR_CATEGORIES = [
  { name: "BACK COVER", hasArrow: false },
  { name: "BOARD GRIPPER", hasArrow: false },
  { name: "CABLE", hasArrow: false },
  { name: "CAR CHARGER", hasArrow: false },
  { name: "CHARGER", hasArrow: false },
  { name: "CHARGING BASE", hasArrow: true },
  { name: "CHARGING FLEX", hasArrow: true },
  { name: "DOT UNITS", hasArrow: false },
  { name: "HEATGUN", hasArrow: false },
  { name: "HOUSING", hasArrow: false },
  { name: "IRON STAND", hasArrow: false },
  { name: "JUMPER WIRE", hasArrow: false },
  { name: "LCD", hasArrow: false },
  { name: "LCD UNIT", hasArrow: true },
];

// Top Circular Categories matching Screenshot
const TOP_CIRCULAR_CATEGORIES = [
  { initial: "S", label: "SEPARATOR" },
  { initial: "S", label: "SPEAKER" },
  { initial: "T", label: "TIP" },
  { initial: "T", label: "TOUCH" },
  { initial: "W", label: "WIRE" },
  { initial: "A", label: "AIR..." },
  { initial: "B", label: "BACK COVER" },
  { initial: "B", label: "BOARD GRIPP..." },
  { initial: "C", label: "CABLE" },
  { initial: "C", label: "CAR CHARGER" },
  { initial: "C", label: "CHARGER" },
  { initial: "C", label: "CHARGING BA..." },
  { initial: "C", label: "CHARGING FL..." },
  { initial: "D", label: "DOT UNITS" },
  { initial: "H", label: "HEATGUN" },
];

// Products matching the exact titles & cards from the Screenshot
const SCREENSHOT_PRODUCTS: Product[] = [
  {
    id: "p-1",
    name: "VIVO Y20 SUNLONG BLACK UNIT",
    slug: "vivo-y20-sunlong-black-unit",
    sku: "ZB-LCD-V20S",
    price: 0,
    stock_quantity: 45,
    short_description: "No description available",
    image_url: null,
    is_active: true,
  },
  {
    id: "p-2",
    name: "VIVO Y20(ZNF) Y21-Y33S-Y17S-Y22 BLACK UNIT",
    slug: "vivo-y20-znf-y21-y33s-y17s-y22-black-unit",
    sku: "ZB-LCD-V20ZNF",
    price: 0,
    stock_quantity: 30,
    short_description: "No description available",
    image_url: null,
    is_active: true,
  },
  {
    id: "p-3",
    name: "VIVO Y20 ALL (ZOXOI) BLACK UNIT",
    slug: "vivo-y20-all-zoxoi-black-unit",
    sku: "ZB-LCD-ZOX20",
    price: 0,
    stock_quantity: 25,
    short_description: "No description available",
    image_url: null,
    is_active: true,
  },
  {
    id: "p-4",
    name: "VIVO Y20 (MARKHOR) Y21 BLACK UNIT",
    slug: "vivo-y20-markhor-y21-black-unit",
    sku: "ZB-LCD-MKR20",
    price: 0,
    stock_quantity: 18,
    short_description: "No description available",
    image_url: null,
    is_active: true,
  },
  {
    id: "p-5",
    name: "SAMSUNG A12-A13 5G BLACK UNIT",
    slug: "samsung-a12-a13-5g-black-unit",
    sku: "ZB-LCD-SA12",
    price: 0,
    stock_quantity: 35,
    short_description: "No description available",
    image_url: null,
    is_active: true,
  },
  {
    id: "p-6",
    name: "VIVO Y20 BLACK OCA GLASS",
    slug: "vivo-y20-black-oca-glass",
    sku: "ZB-OCA-VY20",
    price: 0,
    stock_quantity: 120,
    short_description: "No description available",
    image_url: null,
    is_active: true,
  },
  {
    id: "p-7",
    name: "OPPO A5S-A12 (ZNF) BLACK UNIT",
    slug: "oppo-a5s-a12-znf-black-unit",
    sku: "ZB-LCD-OPA5S",
    price: 0,
    stock_quantity: 40,
    short_description: "No description available",
    image_url: null,
    is_active: true,
  },
  {
    id: "p-8",
    name: "SANSUNG A02S BLACK OCA GLASS",
    slug: "samsung-a02s-black-oca-glass",
    sku: "ZB-OCA-SA02S",
    price: 0,
    stock_quantity: 80,
    short_description: "No description available",
    image_url: null,
    is_active: true,
  },
  {
    id: "p-9",
    name: "VIVO Y20 IC CHARGING FLEX",
    slug: "vivo-y20-ic-charging-flex",
    sku: "ZB-FLX-VY20",
    price: 0,
    stock_quantity: 65,
    short_description: "No description available",
    image_url: null,
    is_active: true,
  },
  {
    id: "p-10",
    name: "VIVO Y-21 IC CHAARGING FLEX",
    slug: "vivo-y-21-ic-charging-flex",
    sku: "ZB-FLX-VY21",
    price: 0,
    stock_quantity: 50,
    short_description: "No description available",
    image_url: null,
    is_active: true,
  },
  {
    id: "p-11",
    name: "VIVO Y91 (ZNF) Y93-Y95-Y90 BLACK UNIT",
    slug: "vivo-y91-znf-y93-y95-y90-black-unit",
    sku: "ZB-LCD-VY91",
    price: 0,
    stock_quantity: 30,
    short_description: "No description available",
    image_url: null,
    is_active: true,
  },
  {
    id: "p-12",
    name: "VIVO Y-91-Y93-Y95 SUNLONG BLACK UNIT",
    slug: "vivo-y91-sunlong-black-unit",
    sku: "ZB-LCD-VY91S",
    price: 0,
    stock_quantity: 28,
    short_description: "No description available",
    image_url: null,
    is_active: true,
  },
  {
    id: "p-13",
    name: "VIVO Y-91 (OT) BLACK UNIT",
    slug: "vivo-y-91-ot-black-unit",
    sku: "ZB-LCD-VY91OT",
    price: 0,
    stock_quantity: 22,
    short_description: "No description available",
    image_url: null,
    is_active: true,
  },
  {
    id: "p-14",
    name: "VIVO Y-20 (OT) BLACK UNIT",
    slug: "vivo-y-20-ot-black-unit",
    sku: "ZB-LCD-VY20OT",
    price: 0,
    stock_quantity: 19,
    short_description: "No description available",
    image_url: null,
    is_active: true,
  },
  {
    id: "p-15",
    name: "VIVO Y-20 ALL (MY CORE) BLACK UNIT",
    slug: "vivo-y-20-all-my-core-black-unit",
    sku: "ZB-LCD-VY20MC",
    price: 0,
    stock_quantity: 24,
    short_description: "No description available",
    image_url: null,
    is_active: true,
  },
  {
    id: "p-16",
    name: "VIVO Y-12 SUNLONG BLACK UNIT",
    slug: "vivo-y-12-sunlong-black-unit",
    sku: "ZB-LCD-VY12S",
    price: 0,
    stock_quantity: 27,
    short_description: "No description available",
    image_url: null,
    is_active: true,
  },
  {
    id: "p-17",
    name: "VIVO Y81-Y83 SUNLONG BLACK UNIT",
    slug: "vivo-y81-y83-sunlong-black-unit",
    sku: "ZB-LCD-VY81S",
    price: 0,
    stock_quantity: 16,
    short_description: "No description available",
    image_url: null,
    is_active: true,
  },
  {
    id: "p-18",
    name: "VIVO Y9-Y85 SUNLONG BLACK UNIT",
    slug: "vivo-y9-y85-sunlong-black-unit",
    sku: "ZB-LCD-VV9S",
    price: 0,
    stock_quantity: 15,
    short_description: "No description available",
    image_url: null,
    is_active: true,
  },
  {
    id: "p-19",
    name: "SAMSUNG A02S SUNLONG BLACK UNIT",
    slug: "samsung-a02s-sunlong-black-unit",
    sku: "ZB-LCD-SA02S",
    price: 0,
    stock_quantity: 32,
    short_description: "No description available",
    image_url: null,
    is_active: true,
  },
  {
    id: "p-20",
    name: "REDMI 12-13 SUNLONG UNIT",
    slug: "redmi-12-13-sunlong-unit",
    sku: "ZB-LCD-RD12",
    price: 0,
    stock_quantity: 30,
    short_description: "No description available",
    image_url: null,
    is_active: true,
  },
];

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>(DEFAULT_CATALOG_PRODUCTS);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sidebarCategories, setSidebarCategories] = useState<{ name: string; hasArrow?: boolean }[]>(SIDEBAR_CATEGORIES);
  const [circularCategories, setCircularCategories] = useState(TOP_CIRCULAR_CATEGORIES);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // 1. Load Products
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

        // 2. Load Categories from Supabase & localStorage (e.g. Sidekey)
        const { data: catData } = await supabase
          .from("categories")
          .select("*")
          .order("name", { ascending: true });

        let localCats: { name: string }[] = [];
        if (typeof window !== "undefined") {
          const stored = localStorage.getItem("zubair_mobile_categories");
          if (stored) {
            try {
              localCats = JSON.parse(stored);
            } catch {}
          }
        }

        const allAvailable = [...(catData || []), ...localCats];
        if (allAvailable.length > 0) {
          const existingSet = new Set(SIDEBAR_CATEGORIES.map((c) => c.name.toUpperCase()));
          const newSidebarItems: { name: string; hasArrow: boolean }[] = [];
          const newCircularItems: { initial: string; label: string }[] = [];

          for (const item of allAvailable) {
            const upper = item.name.toUpperCase().trim();
            if (!existingSet.has(upper)) {
              existingSet.add(upper);
              newSidebarItems.push({ name: upper, hasArrow: true });
              newCircularItems.push({
                initial: upper.charAt(0) || "C",
                label: upper.length > 10 ? upper.slice(0, 8) + "..." : upper,
              });
            }
          }

          if (newSidebarItems.length > 0) {
            setSidebarCategories([...newSidebarItems, ...SIDEBAR_CATEGORIES]);
            setCircularCategories([...newCircularItems, ...TOP_CIRCULAR_CATEGORIES]);
          }
        }
      } catch (err) {
        console.warn("Load data notice:", err);
        setProducts(DEFAULT_CATALOG_PRODUCTS);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const filteredProducts = useMemo(() => {
    if (selectedCategory === "All") return products;

    return products.filter((p) => {
      const catName = p.category?.name || "";
      const searchCat = selectedCategory.toLowerCase();
      return (
        p.name.toLowerCase().includes(searchCat) ||
        catName.toLowerCase().includes(searchCat)
      );
    });
  }, [products, selectedCategory]);

  return (
    <div className="max-w-[1700px] mx-auto px-2 sm:px-4 py-4">
      {/* 2-Column Storefront Layout: Left Sidebar + Right Catalog (Screenshot Style) */}
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* Left Sidebar: Categories (Screenshot Style) */}
        <aside className="w-full lg:w-56 shrink-0 bg-white rounded-lg border border-slate-200/80 p-3 shadow-2xs">
          {/* Header */}
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2">
            CATEGORIES
          </div>

          {/* Active "All" Pill (Matches Logo Red) */}
          <button
            type="button"
            onClick={() => setSelectedCategory("All")}
            className={`w-full text-left px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
              selectedCategory === "All"
                ? "bg-[#dc2626] text-white shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            All
          </button>

          {/* Vertical Category List */}
          <div className="mt-2 space-y-0.5">
            {sidebarCategories.map((cat) => {
              const isSelected = selectedCategory === cat.name;
              return (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors text-left ${
                    isSelected
                      ? "bg-red-50 text-[#dc2626] font-bold"
                      : "text-slate-500 hover:text-[#dc2626] hover:bg-slate-50"
                  }`}
                >
                  <span className="truncate">{cat.name}</span>
                  {cat.hasArrow && (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                  )}
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
              {circularCategories.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedCategory(item.label.replace("...", ""))}
                  className="flex flex-col items-center gap-1.5 group shrink-0"
                >
                  {/* Circle button (Brand Red) */}
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#dc2626] hover:bg-[#b91c1c] text-white flex items-center justify-center font-bold text-sm shadow-xs transition-transform group-hover:scale-105">
                    {item.initial}
                  </div>
                  {/* Label below */}
                  <span className="text-[9.5px] font-semibold text-slate-500 uppercase tracking-tight text-center max-w-[65px] truncate group-hover:text-[#dc2626]">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Product Cards Grid: 6 Columns on Desktop (Screenshot Style) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

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
