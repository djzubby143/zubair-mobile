"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  PhoneCall,
  Truck,
  ShieldCheck,
  ArrowRight,
  Flame,
  Tag,
  ChevronLeft,
  ChevronRight,
  Layers,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export interface HeroBannerConfig {
  isActive: boolean;
  badge: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  images?: string[];
  buttonText: string;
  buttonLink: string;
  tagline?: string;
  imageFit?: "contain" | "cover";
  layoutStyle?: "split" | "full_width";
}

export const DEFAULT_HERO_BANNER: HeroBannerConfig = {
  isActive: true,
  badge: "🔥 DHAMAKA WHOLESALE OFFER",
  title: "Special Wholesale Discount on LCD Units & OCA Glass",
  subtitle:
    "Gujranwala's No. 1 Mobile Spare Parts & Repair Hub. Same-day Daewoo & TCS Cargo dispatch across Pakistan for technicians & shopkeepers.",
  imageUrl:
    "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=1200&auto=format&fit=crop&q=80",
  images: [
    "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=1200&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1200&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&auto=format&fit=crop&q=80",
    "/logo.jpg",
  ],
  buttonText: "Claim Offer on WhatsApp",
  buttonLink:
    "https://wa.me/923458032600?text=Assalam-o-Alaikum%20Zubair%20Mobile!%20Mujhe%20special%20wholesale%20offer%20k%20mutabiq%20order%20karna%20hai.",
  tagline: "Shop No. B16, Chand Plaza, Garjakhi Darwaza, Gujranwala",
  imageFit: "contain",
  layoutStyle: "split",
};

export default function HeroBanner() {
  const [config, setConfig] = useState<HeroBannerConfig>(DEFAULT_HERO_BANNER);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    async function loadBannerSettings() {
      try {
        // 1. Try Supabase cloud site_settings
        const { data, error } = await supabase
          .from("site_settings")
          .select("value")
          .eq("key", "hero_banner")
          .single();

        if (!error && data && data.value) {
          setConfig(data.value as HeroBannerConfig);
          if (typeof window !== "undefined") {
            localStorage.setItem("zubair_hero_banner", JSON.stringify(data.value));
          }
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn("Supabase banner fetch notice:", err);
      }

      // 2. Fallback to localStorage
      if (typeof window !== "undefined") {
        const local = localStorage.getItem("zubair_hero_banner");
        if (local) {
          try {
            setConfig(JSON.parse(local));
          } catch {}
        }
      }
      setLoading(false);
    }

    loadBannerSettings();

    // Event listener for live updates from admin panel in other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "zubair_hero_banner" && e.newValue) {
        try {
          setConfig(JSON.parse(e.newValue));
        } catch {}
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // List of images for the slider
  const bannerImages = React.useMemo(() => {
    const list: string[] = [];
    if (config.images && Array.isArray(config.images)) {
      for (const img of config.images) {
        if (img && img.trim() && !list.includes(img.trim())) {
          list.push(img.trim());
        }
      }
    }
    if (config.imageUrl && config.imageUrl.trim() && !list.includes(config.imageUrl.trim())) {
      list.unshift(config.imageUrl.trim());
    }
    return list.length > 0 ? list : [DEFAULT_HERO_BANNER.imageUrl];
  }, [config.images, config.imageUrl]);

  // Auto-slide every 10 seconds (10000ms) as requested
  useEffect(() => {
    if (bannerImages.length <= 1) return;
    const timer = setInterval(() => {
      setActiveImageIndex((prev) => (prev + 1) % bannerImages.length);
    }, 10000);
    return () => clearInterval(timer);
  }, [bannerImages.length]);

  const handlePrevImage = () => {
    setActiveImageIndex((prev) => (prev === 0 ? bannerImages.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setActiveImageIndex((prev) => (prev + 1) % bannerImages.length);
  };

  if (!config.isActive) {
    return null;
  }

  const isContain = (config.imageFit ?? "contain") === "contain";

  // Mode 1: Full-Width Billboard Banner (Slider spans full screen width)
  if (config.layoutStyle === "full_width") {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-slate-950 text-white border-2 border-[#dc2626]/40 shadow-xl mb-4 group aspect-[16/8] sm:aspect-[21/8] md:max-h-[360px] min-h-[190px] flex items-center justify-center">
        {/* Slide Images */}
        {bannerImages.map((imgUrl, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 flex items-center justify-center transition-opacity duration-700 ease-in-out overflow-hidden ${
              idx === activeImageIndex ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
            }`}
          >
            {/* Ambient Blurred Background to fill empty margins smoothly */}
            <img
              src={imgUrl}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40 scale-125 pointer-events-none"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/logo.jpg";
              }}
            />

            {/* Foreground Sharp Image - Fit to Screen */}
            <img
              src={imgUrl}
              alt={`${config.title} slide ${idx + 1}`}
              className={`relative z-10 transition-transform duration-500 ${
                isContain
                  ? "max-w-full max-h-full w-auto h-auto object-contain p-2 drop-shadow-xl"
                  : "w-full h-full object-cover"
              }`}
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/logo.jpg";
              }}
            />
          </div>
        ))}

        {/* Optional Headline / CTA Bar Overlay at Bottom */}
        {config.title && (
          <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-4 sm:p-6 flex flex-col sm:flex-row sm:items-end justify-between gap-3 pointer-events-none">
            <div className="space-y-1 max-w-xl">
              {config.badge && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#dc2626] text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
                  <Flame className="w-3 h-3 fill-current" />
                  {config.badge}
                </span>
              )}
              <h2 className="text-base sm:text-xl font-black text-white drop-shadow-md leading-tight line-clamp-1">
                {config.title}
              </h2>
              {config.subtitle && (
                <p className="text-xs text-slate-200 drop-shadow line-clamp-1 hidden sm:block">
                  {config.subtitle}
                </p>
              )}
            </div>

            {config.buttonText && (
              <a
                href={config.buttonLink}
                target="_blank"
                rel="noopener noreferrer"
                className="pointer-events-auto inline-flex items-center gap-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-black px-4 py-2 rounded-xl shadow-md uppercase tracking-wider shrink-0 transition-transform hover:scale-105"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>{config.buttonText}</span>
              </a>
            )}
          </div>
        )}

        {/* Top Indicator Badge */}
        <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5 bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/20 shadow-md">
          <span className="w-1.5 h-1.5 rounded-full bg-[#dc2626] animate-ping" />
          <span>{activeImageIndex + 1} / {bannerImages.length}</span>
          <span className="text-slate-300 font-mono text-[9px]">• 10s auto</span>
        </div>

        {/* Navigation Arrows */}
        {bannerImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrevImage}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-black/60 hover:bg-[#dc2626] text-white flex items-center justify-center transition-colors shadow-lg cursor-pointer opacity-80 hover:opacity-100"
              aria-label="Previous Slide"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleNextImage}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-black/60 hover:bg-[#dc2626] text-white flex items-center justify-center transition-colors shadow-lg cursor-pointer opacity-80 hover:opacity-100"
              aria-label="Next Slide"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Bottom Dots */}
        {bannerImages.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5">
            {bannerImages.map((_, dotIdx) => (
              <button
                key={dotIdx}
                type="button"
                onClick={() => setActiveImageIndex(dotIdx)}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  dotIdx === activeImageIndex
                    ? "w-6 bg-[#dc2626]"
                    : "w-1.5 bg-white/60 hover:bg-white"
                }`}
                aria-label={`Slide ${dotIdx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Mode 2: Split Layout (Text on Left, Fit-to-screen Multi-Image Slider on Right)
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#111827] via-[#1f2937] to-[#111827] text-white border-2 border-[#dc2626]/40 shadow-lg mb-4">
      {/* Background Decorative Pattern / Gradient Glow */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-[#dc2626]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 -mb-16 w-60 h-60 bg-red-600/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 p-5 sm:p-7">
        {/* Left Content Column */}
        <div className="flex-1 space-y-3 max-w-2xl text-left">
          {/* Badge Pill */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#dc2626] text-white text-[11px] font-black tracking-wide uppercase shadow-sm">
            <Flame className="w-3.5 h-3.5 fill-current" />
            <span>{config.badge}</span>
          </div>

          {/* Heading */}
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white leading-tight">
            {config.title}
          </h2>

          {/* Subtitle */}
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {config.subtitle}
          </p>

          {/* Trust Highlights */}
          <div className="pt-1 flex flex-wrap items-center gap-4 text-[11px] text-slate-300">
            <span className="flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-[#25D366]" />
              Same-day Cargo Dispatch
            </span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#dc2626]" />
              100% Tested Touch & LCDs
            </span>
            <span className="hidden sm:inline text-slate-400">
              {config.tagline}
            </span>
          </div>

          {/* Action CTA Button */}
          <div className="pt-2">
            <a
              href={config.buttonLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs sm:text-sm font-black px-5 py-2.5 rounded-xl shadow-md transition-all uppercase tracking-wider hover:scale-102"
            >
              <PhoneCall className="w-4 h-4" />
              <span>{config.buttonText}</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </a>
          </div>
        </div>

        {/* Right Column: Featured Banner Multi-Image Slider (Fit-to-Screen) */}
        {bannerImages.length > 0 && (
          <div className="w-full md:w-80 lg:w-[400px] h-48 sm:h-56 rounded-2xl overflow-hidden border-2 border-slate-700/80 shadow-2xl shrink-0 relative bg-slate-950 group flex items-center justify-center">
            {/* Slide Images */}
            {bannerImages.map((imgUrl, idx) => (
              <div
                key={idx}
                className={`absolute inset-0 flex items-center justify-center transition-opacity duration-700 ease-in-out overflow-hidden ${
                  idx === activeImageIndex ? "opacity-100 z-10 scale-100" : "opacity-0 z-0 scale-105 pointer-events-none"
                }`}
              >
                {/* Ambient Blurred Background so portrait/square images don't leave empty holes */}
                <img
                  src={imgUrl}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full object-cover blur-xl opacity-40 scale-125 pointer-events-none"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/logo.jpg";
                  }}
                />

                {/* Foreground Sharp Image - Fit to Screen */}
                <img
                  src={imgUrl}
                  alt={`${config.title} slide ${idx + 1}`}
                  className={`relative z-10 transition-transform duration-500 ${
                    isContain
                      ? "max-w-full max-h-full w-auto h-auto object-contain p-2 drop-shadow-md"
                      : "w-full h-full object-cover"
                  }`}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/logo.jpg";
                  }}
                />
              </div>
            ))}

            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 z-20 pointer-events-none" />

            {/* Top Indicator Badge */}
            <div className="absolute top-2.5 right-3 z-30 flex items-center gap-1.5 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/20">
              <span className="w-1.5 h-1.5 rounded-full bg-[#dc2626] animate-ping" />
              <span>{activeImageIndex + 1} / {bannerImages.length}</span>
              <span className="text-slate-300 font-mono text-[9px]">• 10s auto</span>
            </div>

            {/* Manual Arrows (shown on hover or mobile) */}
            {bannerImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-30 w-7 h-7 rounded-full bg-black/60 hover:bg-[#dc2626] text-white flex items-center justify-center transition-colors shadow-md cursor-pointer opacity-80 hover:opacity-100"
                  aria-label="Previous Slide"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-30 w-7 h-7 rounded-full bg-black/60 hover:bg-[#dc2626] text-white flex items-center justify-center transition-colors shadow-md cursor-pointer opacity-80 hover:opacity-100"
                  aria-label="Next Slide"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}

            {/* Bottom Dots & Caption */}
            <div className="absolute bottom-2.5 left-3 right-3 z-30 flex items-center justify-between">
              <span className="text-white text-[11px] font-bold truncate drop-shadow-sm">
                Zubair Mobile • Gujranwala
              </span>

              {/* Slider Dots */}
              {bannerImages.length > 1 && (
                <div className="flex items-center gap-1.5">
                  {bannerImages.map((_, dotIdx) => (
                    <button
                      key={dotIdx}
                      type="button"
                      onClick={() => setActiveImageIndex(dotIdx)}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                        dotIdx === activeImageIndex
                          ? "w-5 bg-[#dc2626]"
                          : "w-1.5 bg-white/50 hover:bg-white"
                      }`}
                      aria-label={`Slide ${dotIdx + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
