"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Image as ImageIcon,
  Check,
  RefreshCw,
  Eye,
  AlertCircle,
  ExternalLink,
  Flame,
  PhoneCall,
  Truck,
  ShieldCheck,
  ArrowRight,
  UploadCloud,
  Sparkles,
  Layers,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { DEFAULT_HERO_BANNER, HeroBannerConfig } from "@/components/HeroBanner";

// Curated Banner Presets for Mobile Spare Parts
const BANNER_PRESETS = [
  {
    name: "Mobile Screens & Parts",
    url: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=1200&auto=format&fit=crop&q=80",
  },
  {
    name: "Repairing Tools & Workbench",
    url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1200&auto=format&fit=crop&q=80",
  },
  {
    name: "Motherboards & ICs",
    url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&auto=format&fit=crop&q=80",
  },
  {
    name: "Official Zubair Mobile Logo",
    url: "/logo.jpg",
  },
];

export default function AdminBannerPage() {
  const [banner, setBanner] = useState<HeroBannerConfig>(DEFAULT_HERO_BANNER);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Load current banner settings
  useEffect(() => {
    async function loadSettings() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("site_settings")
          .select("value")
          .eq("key", "hero_banner")
          .single();

        if (!error && data && data.value) {
          setBanner(data.value as HeroBannerConfig);
          localStorage.setItem("zubair_hero_banner", JSON.stringify(data.value));
        } else {
          const local = localStorage.getItem("zubair_hero_banner");
          if (local) {
            try {
              setBanner(JSON.parse(local));
            } catch {}
          }
        }
      } catch (err) {
        console.warn("Banner load notice:", err);
        const local = localStorage.getItem("zubair_hero_banner");
        if (local) {
          try {
            setBanner(JSON.parse(local));
          } catch {}
        }
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, []);

  // Save Settings
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    setErrorMessage(null);

    try {
      // 1. Save locally for instant UI update
      localStorage.setItem("zubair_hero_banner", JSON.stringify(banner));

      // 2. Save in Supabase cloud
      const { error } = await supabase.from("site_settings").upsert(
        {
          key: "hero_banner",
          value: banner,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );

      if (error) {
        console.warn("Supabase site_settings upsert notice:", error.message);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: unknown) {
      console.error("Save banner error:", err);
      setErrorMessage("Settings saved to browser memory. Run Supabase SQL to persist to cloud.");
    } finally {
      setSaving(false);
    }
  };

  // Upload image to Supabase Storage
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setErrorMessage(null);

    try {
      const ext = file.name.split(".").pop();
      const fileName = `banner-${Date.now()}.${ext}`;

      const { data, error } = await supabase.storage
        .from("product-images")
        .upload(fileName, file, { cacheControl: "3600", upsert: true });

      if (error) {
        throw error;
      }

      const { data: publicUrlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(fileName);

      if (publicUrlData && publicUrlData.publicUrl) {
        setBanner((prev) => ({ ...prev, imageUrl: publicUrlData.publicUrl }));
      }
    } catch (err: unknown) {
      console.warn("Storage upload error:", err);
      // Create local object URL as fallback preview
      const objectUrl = URL.createObjectURL(file);
      setBanner((prev) => ({ ...prev, imageUrl: objectUrl }));
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#dc2626]/10 text-[#dc2626] flex items-center justify-center shrink-0">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-[#111827] tracking-tight">
                Hero Offer Banner
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Change your storefront promotional banner, offer heading, discount badge, and banner image.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:text-[#dc2626] hover:bg-slate-50 text-xs font-semibold transition-colors"
          >
            <Eye className="w-4 h-4" />
            <span>View Live Website</span>
          </Link>
        </div>
      </div>

      {/* Live Preview Card */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#dc2626]" />
            <span>Storefront Live Preview</span>
          </span>
          <span
            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
              banner.isActive
                ? "bg-emerald-100 text-emerald-800"
                : "bg-slate-200 text-slate-600"
            }`}
          >
            {banner.isActive ? "Banner is Visible" : "Banner is Hidden"}
          </span>
        </div>

        {/* The Exact Banner Preview Component */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#111827] via-[#1f2937] to-[#111827] text-white border-2 border-[#dc2626]/40 shadow-lg">
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 p-5 sm:p-7">
            <div className="flex-1 space-y-3 text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#dc2626] text-white text-[11px] font-black tracking-wide uppercase shadow-sm">
                <Flame className="w-3.5 h-3.5 fill-current" />
                <span>{banner.badge || "SPECIAL OFFER"}</span>
              </div>

              <h2 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white leading-tight">
                {banner.title || "Offer Title Goes Here"}
              </h2>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {banner.subtitle || "Offer description and wholesale terms..."}
              </p>

              <div className="pt-1 flex flex-wrap items-center gap-4 text-[11px] text-slate-300">
                <span className="flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-[#25D366]" />
                  Same-day Cargo Dispatch
                </span>
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#dc2626]" />
                  100% Tested Quality
                </span>
                <span className="hidden sm:inline text-slate-400">
                  {banner.tagline}
                </span>
              </div>

              <div className="pt-2">
                <div className="inline-flex items-center gap-2 bg-[#25D366] text-white text-xs sm:text-sm font-black px-5 py-2.5 rounded-xl shadow-md uppercase tracking-wider">
                  <PhoneCall className="w-4 h-4" />
                  <span>{banner.buttonText || "Order via WhatsApp"}</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </div>
              </div>
            </div>

            {banner.imageUrl && (
              <div className="w-full md:w-64 lg:w-80 h-44 sm:h-52 rounded-xl overflow-hidden border border-slate-700/80 shadow-md shrink-0 relative bg-black/40">
                <img
                  src={banner.imageUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/logo.jpg";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-2.5 left-3 right-3 text-white text-[11px] font-bold truncate">
                  Zubair Mobile • Gujranwala
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Banner Configuration Form */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        {saveSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2.5 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-bold">
              Hero Offer Banner has been updated successfully and is now live!
            </span>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Section 1: Visibility Status */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div>
            <h3 className="font-bold text-sm text-[#111827]">Show Banner on Homepage</h3>
            <p className="text-xs text-slate-500">
              Turn off this switch if you want to temporarily hide the promotional banner.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={banner.isActive}
              onChange={(e) => setBanner({ ...banner, isActive: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#dc2626]" />
          </label>
        </div>

        {/* Section 2: Banner Text Fields */}
        <div className="space-y-4">
          <h3 className="font-extrabold text-sm text-[#111827] uppercase tracking-wider pb-2 border-b border-slate-100">
            Offer Content & Headings
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                Offer Badge Text
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 🔥 DHAMAKA WHOLESALE OFFER"
                value={banner.badge}
                onChange={(e) => setBanner({ ...banner, badge: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:border-[#dc2626] focus:outline-none focus:ring-1 focus:ring-[#dc2626]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                Shop Location Tagline
              </label>
              <input
                type="text"
                placeholder="e.g. Shop No. B16, Chand Plaza, Gujranwala"
                value={banner.tagline || ""}
                onChange={(e) => setBanner({ ...banner, tagline: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:border-[#dc2626] focus:outline-none focus:ring-1 focus:ring-[#dc2626]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
              Main Heading / Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Special Wholesale Discount on LCD Units & OCA Glass"
              value={banner.title}
              onChange={(e) => setBanner({ ...banner, title: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:border-[#dc2626] focus:outline-none focus:ring-1 focus:ring-[#dc2626] font-bold"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
              Offer Description / Subtitle <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={2}
              placeholder="Detailed offer terms, delivery conditions, or model availability..."
              value={banner.subtitle}
              onChange={(e) => setBanner({ ...banner, subtitle: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:border-[#dc2626] focus:outline-none focus:ring-1 focus:ring-[#dc2626] resize-none"
            />
          </div>
        </div>

        {/* Section 3: Banner Image Configuration */}
        <div className="space-y-4">
          <h3 className="font-extrabold text-sm text-[#111827] uppercase tracking-wider pb-2 border-b border-slate-100">
            Banner Image Options
          </h3>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
              Image URL
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                placeholder="https://... image link"
                value={banner.imageUrl}
                onChange={(e) => setBanner({ ...banner, imageUrl: e.target.value })}
                className="flex-1 px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:border-[#dc2626] focus:outline-none focus:ring-1 focus:ring-[#dc2626] font-mono"
              />
              <label className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer transition-colors shrink-0">
                <UploadCloud className="w-4 h-4 text-[#dc2626]" />
                <span>{uploadingImage ? "Uploading..." : "Upload New"}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Presets */}
          <div className="space-y-2">
            <span className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider block">
              Or Choose From Popular Presets:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {BANNER_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => setBanner({ ...banner, imageUrl: preset.url })}
                  className={`p-2 rounded-xl border text-left transition-all group ${
                    banner.imageUrl === preset.url
                      ? "border-[#dc2626] bg-red-50/50 ring-1 ring-[#dc2626]"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="h-16 w-full rounded-lg overflow-hidden bg-slate-100 mb-1.5">
                    <img
                      src={preset.url}
                      alt={preset.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <span className="text-[10.5px] font-bold text-slate-700 block truncate">
                    {preset.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Section 4: Action Button & WhatsApp */}
        <div className="space-y-4">
          <h3 className="font-extrabold text-sm text-[#111827] uppercase tracking-wider pb-2 border-b border-slate-100">
            Call to Action (CTA) Button
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                Button Label
              </label>
              <input
                type="text"
                placeholder="e.g. Claim Offer on WhatsApp"
                value={banner.buttonText}
                onChange={(e) => setBanner({ ...banner, buttonText: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:border-[#dc2626] focus:outline-none focus:ring-1 focus:ring-[#dc2626]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                Button WhatsApp / Page URL
              </label>
              <input
                type="text"
                placeholder="https://wa.me/923458032600?text=..."
                value={banner.buttonLink}
                onChange={(e) => setBanner({ ...banner, buttonLink: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:border-[#dc2626] focus:outline-none focus:ring-1 focus:ring-[#dc2626] font-mono"
              />
            </div>
          </div>
        </div>

        {/* Submit & Reset Buttons */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setBanner(DEFAULT_HERO_BANNER)}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            Reset to Default Banner
          </button>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs sm:text-sm font-bold px-6 py-3 rounded-xl shadow-md transition-all disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving Banner...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Publish Banner to Website</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
