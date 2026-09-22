"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, ShoppingCart, User, Download, Smartphone } from "lucide-react";
import { useCart } from "@/context/CartContext";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { cartCount, openCart } = useCart();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showInstallTip, setShowInstallTip] = useState(false);

  useEffect(() => {
    const checkLogin = () => {
      try {
        const stored = localStorage.getItem("zubair_customer_user");
        setIsLoggedIn(Boolean(stored));
      } catch {
        setIsLoggedIn(false);
      }
    };
    checkLogin();
    window.addEventListener("storage", checkLogin);
    return () => window.removeEventListener("storage", checkLogin);
  }, []);

  // Trigger PWA install or instructions
  const handleInstallClick = () => {
    // Check if event is available on window
    const event = (window as unknown as { __deferredPrompt?: { prompt: () => Promise<void> } }).__deferredPrompt;
    if (event) {
      event.prompt();
    } else {
      setShowInstallTip(true);
    }
  };

  return (
    <>
      <nav
        aria-label="Mobile Navigation Bar"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 py-1.5 px-2 flex items-center justify-around shadow-[0_-4px_16px_rgba(0,0,0,0.06)]"
      >
        {/* 1. Home */}
        <Link
          href="/"
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg text-xs font-semibold transition-colors ${
            pathname === "/" ? "text-[#dc2626]" : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">ہوم</span>
        </Link>

        {/* 2. Categories / Search */}
        <Link
          href="/#categories"
          className="flex flex-col items-center justify-center py-1 px-3 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <Search className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">سامان</span>
        </Link>

        {/* 3. Cart Drawer Trigger */}
        <button
          type="button"
          onClick={openCart}
          className="relative flex flex-col items-center justify-center py-1 px-3 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <div className="relative">
            <ShoppingCart className="w-5 h-5 mb-0.5" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 bg-[#dc2626] text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-white">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </div>
          <span className="text-[10px]">کارٹ</span>
        </button>

        {/* 4. Khata / Profile */}
        <Link
          href={isLoggedIn ? "/profile" : "/login"}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg text-xs font-semibold transition-colors ${
            pathname === "/profile" || pathname === "/login"
              ? "text-[#dc2626]"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <User className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">{isLoggedIn ? "کھاتہ" : "لاگ ان"}</span>
        </Link>

        {/* 5. Install App Button */}
        <button
          type="button"
          onClick={handleInstallClick}
          className="flex flex-col items-center justify-center py-1 px-3 rounded-lg text-xs font-semibold text-[#dc2626] hover:bg-red-50 transition-colors cursor-pointer"
        >
          <Download className="w-5 h-5 mb-0.5 animate-bounce" />
          <span className="text-[10px] font-bold">ایپ انسٹال</span>
        </button>
      </nav>

      {/* Manual Install Instruction Popup */}
      {showInstallTip && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="install-app-dialog-title"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-xs w-full p-5 space-y-3 text-center shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#dc2626] mx-auto flex items-center justify-center">
              <Smartphone className="w-6 h-6" />
            </div>
            <h3 id="install-app-dialog-title" className="text-sm font-bold text-[#111827]">
              موبائل پر انسٹال کریں
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              براؤزر مینو (اوپر دائیں 3 نقطوں) پر کلک کر کے{" "}
              <strong className="text-slate-900">&quot;Install App&quot;</strong> یا{" "}
              <strong className="text-slate-900">&quot;Add to Home Screen&quot;</strong> دبائیں۔
            </p>
            <button
              type="button"
              onClick={() => setShowInstallTip(false)}
              className="w-full py-2 bg-[#dc2626] hover:bg-[#b91c1c] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              ٹھیک ہے (OK)
            </button>
          </div>
        </div>
      )}
    </>
  );
}
