"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingCart,
  User,
  PhoneCall,
  Menu,
  X,
  MapPin,
  LogOut,
  Layers,
  ChevronDown,
  ChevronRight,
  Search,
  Sparkles,
  Tag,
  ArrowRight,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import AdvancedSearchBar from "@/components/AdvancedSearchBar";
import { getLiveCategories, LiveCategory, DEFAULT_CATEGORIES } from "@/lib/categories";
import { supabase } from "@/lib/supabase";

export default function Header() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [customerUser, setCustomerUser] = useState<{ full_name: string; shop_name: string } | null>(null);
  const { cartCount, isLoaded } = useCart();

  // Categories Hover Mega-Menu State
  const [categoriesDropdownOpen, setCategoriesDropdownOpen] = useState(false);
  const [categories, setCategories] = useState<LiveCategory[]>(DEFAULT_CATEGORIES);
  const [categoryFilterQuery, setCategoryFilterQuery] = useState("");
  const [headerHoverCategory, setHeaderHoverCategory] = useState<LiveCategory | null>(null);
  const dropdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  const loadCategories = async () => {
    try {
      const data = await getLiveCategories();
      if (data && data.length > 0) {
        setCategories(data);
      }
    } catch (err) {
      console.warn("Could not load categories in header:", err);
    }
  };

  useEffect(() => {
    // 1. Initial Load
    loadCategories();

    // 2. Load customer session
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("zubair_customer_user");
      if (stored) {
        try {
          setCustomerUser(JSON.parse(stored));
        } catch {}
      }
    }

    // 3. Realtime event listeners for instant category updates
    const handleStorageUpdate = (e: StorageEvent) => {
      if (!e.key || e.key === "zubair_mobile_categories" || e.key === "zubair_mobile_subcategories_map") {
        loadCategories();
      }
    };

    const handleCustomUpdate = () => {
      loadCategories();
    };

    const handleFocus = () => {
      loadCategories();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorageUpdate);
      window.addEventListener("zubair_category_updated", handleCustomUpdate);
      window.addEventListener("focus", handleFocus);
    }

    // 4. Supabase Realtime Subscription for Categories
    const channel = supabase
      .channel("header-categories-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "categories" },
        () => {
          loadCategories();
        }
      )
      .subscribe();

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", handleStorageUpdate);
        window.removeEventListener("zubair_category_updated", handleCustomUpdate);
        window.removeEventListener("focus", handleFocus);
      }
      supabase.removeChannel(channel);
    };
  }, []);

  const handleMouseEnter = () => {
    if (dropdownTimerRef.current) {
      clearTimeout(dropdownTimerRef.current);
    }
    setCategoriesDropdownOpen(true);
  };

  const handleMouseLeave = () => {
    dropdownTimerRef.current = setTimeout(() => {
      setCategoriesDropdownOpen(false);
      setHeaderHoverCategory(null);
      setCategoryFilterQuery("");
    }, 200);
  };

  const handleCustomerLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("zubair_customer_user");
      setCustomerUser(null);
      window.location.reload();
    }
  };

  const selectCategory = (catName: string) => {
    setCategoriesDropdownOpen(false);
    setHeaderHoverCategory(null);
    setCategoryFilterQuery("");
    setMobileMenuOpen(false);
    if (catName === "All") {
      router.push("/");
    } else {
      router.push(`/?category=${encodeURIComponent(catName)}`);
    }
  };

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(categoryFilterQuery.toLowerCase().trim())
  );

  return (
    <header className="sticky top-0 z-40 w-full bg-white shadow-xs border-b border-slate-200">
      {/* Top micro banner (Jet Black from Logo with Red & Emerald Accents) */}
      <div className="bg-[#111827] text-white text-xs py-1 px-4 hidden sm:block border-b border-red-600/40">
        <div className="max-w-[1700px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-slate-300">
            <MapPin className="w-3.5 h-3.5 text-[#dc2626]" />
            <span>Shop No. B16, Chand Plaza, Garjakhi Darwaza, Gujranwala</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-300 font-medium">
              Wholesale Mobile Spare Parts & Expert Repair Services
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <a
              href="https://wa.me/923458032600"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[#25D366] hover:text-white transition-colors font-semibold"
            >
              <PhoneCall className="w-3 h-3 text-[#25D366]" />
              <span>WhatsApp: 03458032600</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Top Bar (Matches Screenshot with User's Official Logo) */}
      <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-3 sm:gap-4">
        {/* Left: Official Logo + Categories Dropdown + Search Bar */}
        <div className="flex items-center gap-3 sm:gap-5 flex-1 max-w-3xl">
          {/* Official Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3 shrink-0 group">
            <div className="relative h-11 w-11 sm:h-14 sm:w-14 shrink-0 rounded-lg overflow-hidden border border-slate-200 shadow-xs bg-white p-0.5 group-hover:scale-105 transition-transform">
              <img
                src="/logo.jpg"
                alt="Zubair Mobile Repair Services"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex flex-col justify-center">
              <span className="font-black text-base sm:text-xl tracking-tight text-[#111827] leading-none">
                ZUBAIR <span className="text-[#dc2626]">MOBILE</span>
              </span>
              <span className="bg-[#dc2626] text-white text-[8px] sm:text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded mt-1 w-fit">
                REPAIR SERVICES & PARTS
              </span>
            </div>
          </Link>

          {/* Categories Hover Dropdown Menu Button ("jab cursor category par ly kar jao") */}
          <div
            className="relative hidden md:block"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <button
              type="button"
              onClick={() => setCategoriesDropdownOpen(!categoriesDropdownOpen)}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-[#dc2626] text-[#111827] hover:text-white rounded-lg font-bold text-xs transition-colors shadow-2xs border border-slate-200 hover:border-[#dc2626] cursor-pointer"
              title="Hover to view all categories and sub-categories"
            >
              <Layers className="w-4 h-4 text-[#dc2626] hover:text-white group-hover:text-white transition-colors" />
              <span>Categories</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  categoriesDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Hover Floating Mega-Menu with Side Sub-Categories Flyout */}
            {categoriesDropdownOpen && (
              <div
                className="absolute top-full left-0 mt-1.5 flex z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                {/* Primary Categories List Panel */}
                <div className="w-80 max-h-[520px] bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
                  {/* Header & Quick Filter */}
                  <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#111827] uppercase tracking-wider flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-[#dc2626]" />
                        All Categories ({categories.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => selectCategory("All")}
                        className="text-[11px] text-[#dc2626] hover:underline font-bold"
                      >
                        View All
                      </button>
                    </div>

                    {/* Filter input */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search category (e.g. LCD, Sidekey)..."
                        value={categoryFilterQuery}
                        onChange={(e) => setCategoryFilterQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-white text-xs rounded-md border border-slate-200 focus:outline-none focus:border-[#dc2626] text-slate-800 placeholder-slate-400"
                      />
                    </div>
                  </div>

                  {/* Categories List */}
                  <div className="overflow-y-auto max-h-[400px] p-1.5 divide-y divide-slate-50">
                    {filteredCategories.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400">
                        No category matches &quot;{categoryFilterQuery}&quot;
                      </div>
                    ) : (
                      filteredCategories.map((cat) => {
                        const hasSub = cat.subcategories && cat.subcategories.length > 0;
                        const isHovered =
                          headerHoverCategory?.name.toLowerCase() ===
                          cat.name.toLowerCase();

                        return (
                          <div
                            key={cat.id || cat.name}
                            onMouseEnter={() => setHeaderHoverCategory(cat)}
                          >
                            <button
                              type="button"
                              onClick={() => selectCategory(cat.name)}
                              className={`w-full flex items-center justify-between px-3 py-2 text-left rounded-lg text-xs font-medium transition-all group/item ${
                                isHovered
                                  ? "bg-red-50 text-[#dc2626] font-bold"
                                  : "text-slate-700 hover:text-[#dc2626] hover:bg-red-50/80"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span
                                  className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors ${
                                    isHovered
                                      ? "bg-[#dc2626] text-white"
                                      : "bg-slate-100 text-slate-600 group-hover/item:bg-[#dc2626] group-hover/item:text-white"
                                  }`}
                                >
                                  {cat.name.charAt(0).toUpperCase()}
                                </span>
                                <div className="truncate">
                                  <p className="font-semibold truncate text-[#111827] group-hover/item:text-[#dc2626]">
                                    {cat.name}
                                  </p>
                                  {cat.description && (
                                    <p className="text-[10px] text-slate-400 truncate max-w-[180px]">
                                      {cat.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                              {hasSub ? (
                                <ChevronRight
                                  className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                                    isHovered
                                      ? "text-[#dc2626] translate-x-1"
                                      : "text-slate-300 group-hover/item:text-[#dc2626]"
                                  }`}
                                />
                              ) : null}
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Sub-Category Flyout Side Menu for Header */}
                {headerHoverCategory &&
                  headerHoverCategory.subcategories &&
                  headerHoverCategory.subcategories.length > 0 && (
                    <div className="ml-1.5 w-60 bg-white rounded-xl shadow-2xl border border-slate-200 p-2.5 max-h-[520px] overflow-y-auto animate-in fade-in slide-in-from-left-2 duration-150">
                      <div className="pb-2 mb-2 border-b border-slate-100 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                            Sub-Categories
                          </span>
                          <h4 className="text-xs font-black text-[#111827] uppercase truncate max-w-[140px]">
                            {headerHoverCategory.name}
                          </h4>
                        </div>
                        <span className="text-[10px] bg-red-50 text-[#dc2626] font-bold px-2 py-0.5 rounded-full border border-red-100">
                          {headerHoverCategory.subcategories.length} Types
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => selectCategory(headerHoverCategory.name)}
                        className="w-full text-left px-2.5 py-1.5 mb-1.5 rounded-lg text-[11px] font-bold text-[#dc2626] bg-red-50/60 hover:bg-red-50 transition-colors flex items-center justify-between group/all"
                      >
                        <span>View All {headerHoverCategory.name}</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover/all:translate-x-1 transition-transform" />
                      </button>

                      <div className="space-y-1">
                        {headerHoverCategory.subcategories.map((sub, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => selectCategory(sub)}
                            className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-red-50 hover:text-[#dc2626] transition-all flex items-center justify-between group/sub"
                          >
                            <span className="truncate">{sub}</span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover/sub:text-[#dc2626] group-hover/sub:translate-x-0.5 transition-all shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            )}
          </div>

          {/* Advanced Search Bar with Instant Dropdown, Images & Details */}
          <AdvancedSearchBar className="flex-1 max-w-lg hidden sm:block" />
        </div>

        {/* Right: Cart Button + Login Button */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* WhatsApp Direct CTA */}
          <a
            href="https://wa.me/923458032600"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:inline-flex items-center gap-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-2xs transition-colors"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>03458032600</span>
          </a>

          {/* Cart Icon Button */}
          <Link
            href="/cart"
            className="relative p-2 rounded-lg border border-red-200 hover:border-[#dc2626] text-[#dc2626] hover:bg-red-50 transition-colors flex items-center justify-center bg-white shadow-2xs"
            aria-label="Shopping Cart"
          >
            <ShoppingCart className="w-5 h-5" />
            <span className="absolute -top-1.5 -right-1.5 bg-[#dc2626] text-white text-[10px] font-bold h-4.5 w-4.5 rounded-full flex items-center justify-center shadow-xs">
              {isLoaded ? cartCount : 0}
            </span>
          </Link>

          {/* Customer / Admin Login Status */}
          {customerUser ? (
            <div className="flex items-center gap-2">
              <Link
                href="/profile"
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-slate-200 hover:border-red-300 bg-slate-50/80 hover:bg-red-50/50 transition-colors group"
                title="View My Profile & Order Tracking"
              >
                <div className="w-6 h-6 rounded-full bg-red-100 text-[#dc2626] flex items-center justify-center font-bold text-xs shrink-0">
                  <User className="w-3.5 h-3.5" />
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-[11px] font-bold text-[#111827] leading-tight group-hover:text-[#dc2626] transition-colors flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <span className="truncate max-w-[120px]">{customerUser.shop_name || customerUser.full_name}</span>
                  </span>
                  <span className="text-[9.5px] text-slate-500 font-medium">Orders & Tracking</span>
                </div>
              </Link>
              <button
                type="button"
                onClick={handleCustomerLogout}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-red-300 text-slate-500 hover:text-[#dc2626] text-xs font-semibold bg-white shadow-2xs transition-colors"
                title="Log Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-red-200 hover:border-[#dc2626] text-[#dc2626] hover:bg-red-50 text-xs font-semibold transition-colors bg-white shadow-2xs"
            >
              <User className="w-4 h-4 text-[#dc2626]" />
              <span>Login</span>
            </Link>
          )}

          {/* Mobile menu trigger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="sm:hidden p-1.5 rounded-lg text-slate-600 hover:text-[#dc2626] hover:bg-slate-100"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Search Bar with Advanced Search Dropdown */}
      <div className="sm:hidden px-4 pb-3">
        <AdvancedSearchBar isMobile={true} />
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="sm:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-2xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative ml-auto w-full max-w-xs bg-white h-full shadow-2xl flex flex-col z-10 p-5 space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <img src="/logo.jpg" alt="Logo" className="w-8 h-8 object-contain" />
                <span className="font-bold text-base text-[#111827]">
                  ZUBAIR <span className="text-[#dc2626]">MOBILE</span>
                </span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-1 text-sm">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-slate-700 font-semibold hover:text-[#dc2626]"
              >
                Home / Catalog
              </Link>
              <Link
                href="/cart"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between py-2 text-slate-700 font-semibold hover:text-[#dc2626]"
              >
                <span>My Cart</span>
                <span className="bg-[#dc2626] text-white text-xs px-2 py-0.5 rounded-full">
                  {cartCount}
                </span>
              </Link>
              {customerUser ? (
                <Link
                  href="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between py-2 text-[#dc2626] font-bold"
                >
                  <span>My Profile & Tracking</span>
                  <span className="bg-red-50 text-[#dc2626] text-[10px] px-2 py-0.5 rounded-full border border-red-200">
                    Live
                  </span>
                </Link>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2 text-slate-700 font-semibold hover:text-[#dc2626]"
                >
                  Customer / Admin Login
                </Link>
              )}
            </div>

            {/* Mobile Categories Accordion with Subcategories */}
            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Categories & Types ({categories.length})
              </p>
              <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
                <button
                  type="button"
                  onClick={() => selectCategory("All")}
                  className="w-full text-left px-2.5 py-1.5 rounded text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  All Categories
                </button>
                {categories.map((cat) => (
                  <div key={cat.id || cat.name} className="space-y-0.5">
                    <button
                      type="button"
                      onClick={() => selectCategory(cat.name)}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs font-semibold text-slate-700 hover:bg-red-50 hover:text-[#dc2626]"
                    >
                      <span>{cat.name}</span>
                      {cat.subcategories && cat.subcategories.length > 0 && (
                        <span className="text-[10px] text-slate-400 font-normal">
                          {cat.subcategories.length} types
                        </span>
                      )}
                    </button>
                    {cat.subcategories && cat.subcategories.length > 0 && (
                      <div className="pl-4 space-y-0.5">
                        {cat.subcategories.map((sub, sIdx) => (
                          <button
                            key={sIdx}
                            type="button"
                            onClick={() => selectCategory(sub)}
                            className="w-full text-left px-2 py-1 text-[11px] text-slate-500 hover:text-[#dc2626] hover:bg-red-50/50 rounded flex items-center gap-1.5"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                            <span>{sub}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <a
                href="https://wa.me/923458032600"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#25D366] text-white rounded-lg text-xs font-bold shadow-xs"
              >
                <PhoneCall className="w-4 h-4" />
                <span>WhatsApp: 03458032600</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
