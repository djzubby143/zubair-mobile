"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShoppingCart,
  User,
  PhoneCall,
  Menu,
  X,
  MapPin,
  Building2,
  LogOut,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import AdvancedSearchBar from "@/components/AdvancedSearchBar";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [customerUser, setCustomerUser] = useState<{ full_name: string; shop_name: string } | null>(null);
  const { cartCount, isLoaded } = useCart();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("zubair_customer_user");
      if (stored) {
        try {
          setCustomerUser(JSON.parse(stored));
        } catch {}
      }
    }
  }, []);

  const handleCustomerLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("zubair_customer_user");
      setCustomerUser(null);
      window.location.reload();
    }
  };

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
      <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-4">
        {/* Left: Official Logo + Search Bar */}
        <div className="flex items-center gap-5 flex-1 max-w-2xl">
          {/* Official Brand Logo */}
          <Link href="/" className="flex items-center gap-3 shrink-0 group">
            <div className="relative h-12 w-12 sm:h-14 sm:w-14 shrink-0 rounded-lg overflow-hidden border border-slate-200 shadow-xs bg-white p-0.5 group-hover:scale-105 transition-transform">
              <img
                src="/logo.jpg"
                alt="Zubair Mobile Repair Services"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex flex-col justify-center">
              <span className="font-black text-lg sm:text-xl tracking-tight text-[#111827] leading-none">
                ZUBAIR <span className="text-[#dc2626]">MOBILE</span>
              </span>
              <span className="bg-[#dc2626] text-white text-[8px] sm:text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded mt-1 w-fit">
                REPAIR SERVICES & PARTS
              </span>
            </div>
          </Link>

          {/* Advanced Search Bar with Instant Dropdown, Images & Details */}
          <AdvancedSearchBar className="flex-1 max-w-lg hidden sm:block" />
        </div>

        {/* Right: Cart Button + Login Button */}
        <div className="flex items-center gap-3">
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
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-[11px] font-bold text-[#111827] leading-tight flex items-center gap-1 justify-end">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {customerUser.shop_name}
                </span>
                <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                  {customerUser.full_name}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCustomerLogout}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-200 hover:border-red-300 text-slate-500 hover:text-[#dc2626] text-xs font-semibold bg-white shadow-2xs transition-colors"
                title="Log Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md border border-red-200 hover:border-[#dc2626] text-[#dc2626] hover:bg-red-50 text-xs font-semibold transition-colors bg-white shadow-2xs"
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
          <div className="relative ml-auto w-full max-w-xs bg-white h-full shadow-2xl flex flex-col z-10 p-5 space-y-4">
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
            <div className="space-y-2 text-sm">
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
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-slate-700 font-semibold hover:text-[#dc2626]"
              >
                Admin Login
              </Link>
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
