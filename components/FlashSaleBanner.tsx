"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Zap, Clock, Copy, Check, ArrowRight } from "lucide-react";

export default function FlashSaleBanner() {
  const [timeLeft, setTimeLeft] = useState({
    hours: 14,
    minutes: 32,
    seconds: 45,
  });
  const [copiedCoupon, setCopiedCoupon] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return { hours: 24, minutes: 0, seconds: 0 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCoupon(code);
    setTimeout(() => setCopiedCoupon(null), 2500);
  };

  return (
    <div className="bg-linear-to-r from-red-600 via-rose-600 to-amber-600 text-white shadow-md relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute -top-12 -left-12 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-3.5 flex flex-col md:flex-row items-center justify-between gap-3 relative z-10">
        {/* Left: Headline & Badge */}
        <div className="flex items-center gap-2.5 text-center md:text-left">
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0 animate-bounce">
            <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2 justify-center md:justify-start">
              <span className="text-[10px] uppercase font-black tracking-widest bg-amber-400 text-slate-900 px-2 py-0.5 rounded-full shadow-2xs">
                Limited Time Flash Offer
              </span>
              <span className="text-xs font-bold text-white/90 hidden sm:inline">
                Verified Technician & Wholesale Rates
              </span>
            </div>
            <p className="text-xs sm:text-sm font-black tracking-tight mt-0.5">
              Special Discount on Bulk LCDs & Charging Flex Shipments
            </p>
          </div>
        </div>

        {/* Right: Countdown & Promo Code */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {/* Countdown Blocks */}
          <div className="flex items-center gap-1 font-mono text-xs font-black">
            <Clock className="w-3.5 h-3.5 text-amber-200 mr-1" />
            <div className="bg-black/30 backdrop-blur-xs px-2 py-1 rounded-md border border-white/10 min-w-7 text-center">
              {String(timeLeft.hours).padStart(2, "0")}h
            </div>
            <span className="text-amber-200 font-bold">:</span>
            <div className="bg-black/30 backdrop-blur-xs px-2 py-1 rounded-md border border-white/10 min-w-7 text-center">
              {String(timeLeft.minutes).padStart(2, "0")}m
            </div>
            <span className="text-amber-200 font-bold">:</span>
            <div className="bg-black/30 backdrop-blur-xs px-2 py-1 rounded-md border border-white/10 min-w-7 text-center text-amber-300">
              {String(timeLeft.seconds).padStart(2, "0")}s
            </div>
          </div>

          {/* Coupon Code Pill */}
          <button
            type="button"
            onClick={() => handleCopy("WELCOME500")}
            className="flex items-center gap-1.5 px-3 py-1 bg-white text-slate-900 rounded-lg text-xs font-black hover:bg-amber-100 transition-colors shadow-2xs border border-amber-300"
            title="Click to copy coupon code"
          >
            <span>Use: WELCOME500</span>
            {copiedCoupon === "WELCOME500" ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-slate-500" />
            )}
          </button>

          {/* Phone Compatibility Link */}
          <Link
            href="/compatibility"
            className="hidden lg:inline-flex items-center gap-1 text-xs font-bold text-white underline underline-offset-2 hover:text-amber-200"
          >
            <span>Check Phone Model Compatibility</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
