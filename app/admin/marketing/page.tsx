"use client";

import React, { useState, useEffect } from "react";
import {
  Percent,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Tag,
  Star,
  Zap,
  Calendar,
  Eye,
  ShieldCheck,
  Check,
  X,
} from "lucide-react";
import { Coupon, ProductReview } from "@/lib/types";
import { getActiveCoupons, createCoupon, getProductReviews } from "@/lib/marketing";

export default function MarketingAdminPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"coupons" | "flashsale" | "reviews">("coupons");

  // New Coupon Form
  const [newCode, setNewCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState<number>(10);
  const [minPurchase, setMinPurchase] = useState<number>(1000);
  const [maxDiscount, setMaxDiscount] = useState<number>(500);
  const [usageLimit, setUsageLimit] = useState<number>(100);
  const [validUntil, setValidUntil] = useState<string>("2026-12-31");
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);

  // Flash Sale Settings
  const [flashSaleActive, setFlashSaleActive] = useState(true);
  const [flashSaleTitle, setFlashSaleTitle] = useState("MEGA RAMADAN SPARE PARTS SALE");
  const [flashSaleDiscount, setFlashSaleDiscount] = useState("UP TO 35% OFF");
  const [flashSaleCountdownHours, setFlashSaleCountdownHours] = useState(48);
  const [flashSaleMsg, setFlashSaleMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const coups = await getActiveCoupons();
        setCoupons(coups);
        const revs = await getProductReviews();
        setReviews(revs);
      } catch (err) {
        console.error("Error loading marketing data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim()) return;

    const created = await createCoupon({
      code: newCode.trim().toUpperCase(),
      discount_type: discountType,
      discount_value: discountValue,
      min_purchase: minPurchase,
      max_discount: discountType === "percentage" ? maxDiscount : undefined,
      valid_from: new Date().toISOString(),
      valid_until: new Date(validUntil).toISOString(),
      usage_limit: usageLimit,
      is_active: true,
    });

    setCoupons((prev) => [created, ...prev]);
    setCouponSuccess(`Coupon code ${created.code} successfully launched!`);
    setNewCode("");
    setTimeout(() => setCouponSuccess(null), 3000);
  };

  const handleSaveFlashSale = (e: React.FormEvent) => {
    e.preventDefault();
    setFlashSaleMsg("Flash sale configurations updated live on storefront banner!");
    setTimeout(() => setFlashSaleMsg(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-primary to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-2 bg-red-600/30 border border-red-500/40 rounded-xl">
              <Percent className="w-5 h-5 text-red-400" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">Marketing & Growth Engine</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-300">
            Drive conversions with promotional coupon codes, live flash sale countdowns, and social proof reviews.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700">
          <button
            onClick={() => setActiveTab("coupons")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "coupons" ? "bg-secondary text-white shadow-sm" : "text-slate-300 hover:text-white"
            }`}
          >
            Coupon Vouchers
          </button>
          <button
            onClick={() => setActiveTab("flashsale")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "flashsale" ? "bg-secondary text-white shadow-sm" : "text-slate-300 hover:text-white"
            }`}
          >
            Flash Sale
          </button>
          <button
            onClick={() => setActiveTab("reviews")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "reviews" ? "bg-secondary text-white shadow-sm" : "text-slate-300 hover:text-white"
            }`}
          >
            Reviews & Ratings
          </button>
        </div>
      </div>

      {/* Coupons Tab */}
      {activeTab === "coupons" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Create Coupon Form */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <Tag className="w-4 h-4 text-secondary" />
                Issue New Promo Voucher
              </h2>

              {couponSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  {couponSuccess}
                </div>
              )}

              <form onSubmit={handleCreateCoupon} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Coupon Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EID2026, TECH500"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full text-xs font-bold uppercase tracking-wider p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-secondary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Discount Type</label>
                    <select
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value as any)}
                      className="w-full text-xs font-semibold p-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed PKR (Rs.)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Discount Value</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                      className="w-full text-xs font-bold p-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Min Order (Rs.)</label>
                    <input
                      type="number"
                      value={minPurchase}
                      onChange={(e) => setMinPurchase(parseFloat(e.target.value) || 0)}
                      className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Max Cap (Rs.)</label>
                    <input
                      type="number"
                      value={maxDiscount}
                      onChange={(e) => setMaxDiscount(parseFloat(e.target.value) || 0)}
                      className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Expiry Date</label>
                    <input
                      type="date"
                      value={validUntil}
                      onChange={(e) => setValidUntil(e.target.value)}
                      className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Usage Limit</label>
                    <input
                      type="number"
                      value={usageLimit}
                      onChange={(e) => setUsageLimit(parseInt(e.target.value) || 100)}
                      className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-2.5 bg-secondary hover:bg-secondary-dark text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  Create & Activate Coupon
                </button>
              </form>
            </div>
          </div>

          {/* Active Coupons List */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900">Active Coupons ({coupons.length})</h3>
                <span className="text-xs text-slate-500 font-medium">Valid across Cart & Checkout</span>
              </div>

              <div className="divide-y divide-slate-100">
                {coupons.map((c) => (
                  <div key={c.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-black px-2.5 py-0.5 rounded-lg bg-red-50 text-secondary border border-red-200">
                          {c.code}
                        </span>
                        <span className="text-xs font-bold text-emerald-600">
                          {c.discount_type === "percentage" ? `${c.discount_value}% OFF` : `Rs. ${c.discount_value} OFF`}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Min Order: Rs. {(c.min_purchase ?? c.min_order_amount ?? 0).toLocaleString()} • Valid till:{" "}
                        {new Date(c.valid_until || c.expiry_date || Date.now()).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold px-2 py-1 rounded bg-slate-100 text-slate-700">
                        {c.usage_count || 0} / {c.usage_limit ?? c.max_uses ?? 100} used
                      </span>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" title="Active" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Flash Sale Tab */}
      {activeTab === "flashsale" && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 max-w-2xl mx-auto space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
            <div className="p-2.5 rounded-xl bg-amber-500 text-white">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">Storefront Flash Sale Countdown Banner</h2>
              <p className="text-xs text-slate-500">
                Display high-urgency promotional banner with live countdown timer at the top of the homepage.
              </p>
            </div>
          </div>

          {flashSaleMsg && (
            <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              {flashSaleMsg}
            </div>
          )}

          <form onSubmit={handleSaveFlashSale} className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <p className="text-xs font-bold text-slate-900">Enable Flash Sale Banner</p>
                <p className="text-[11px] text-slate-500">Turn banner on/off across all storefront pages</p>
              </div>
              <input
                type="checkbox"
                checked={flashSaleActive}
                onChange={(e) => setFlashSaleActive(e.target.checked)}
                className="w-5 h-5 accent-red-600 rounded cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Banner Title / Hook</label>
              <input
                type="text"
                value={flashSaleTitle}
                onChange={(e) => setFlashSaleTitle(e.target.value)}
                className="w-full text-xs font-bold p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Discount Tagline</label>
                <input
                  type="text"
                  value={flashSaleDiscount}
                  onChange={(e) => setFlashSaleDiscount(e.target.value)}
                  className="w-full text-xs font-bold p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-secondary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Countdown Duration (Hours)</label>
                <input
                  type="number"
                  value={flashSaleCountdownHours}
                  onChange={(e) => setFlashSaleCountdownHours(parseInt(e.target.value) || 24)}
                  className="w-full text-xs font-bold p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-secondary hover:bg-secondary-dark text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              Publish Flash Sale Changes
            </button>
          </form>
        </div>
      )}

      {/* Reviews Tab */}
      {activeTab === "reviews" && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900">Customer Reviews & Ratings ({reviews.length})</h3>
            <span className="text-xs text-slate-500 font-medium">Auto-moderated verified purchases</span>
          </div>

          <div className="divide-y divide-slate-100">
            {reviews.map((r) => (
              <div key={r.id} className="p-4 flex items-start justify-between hover:bg-slate-50">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">{r.user_name}</span>
                    {r.verified_purchase && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Verified Technician
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-amber-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-slate-700">{r.comment}</p>
                  <p className="text-[10px] text-slate-400">
                    Product SKU: {r.product_id} • {new Date(r.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                    title="Approve"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                    title="Remove"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
