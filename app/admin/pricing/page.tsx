"use client";

import React, { useState, useEffect } from "react";
import {
  Tag,
  TrendingUp,
  Percent,
  DollarSign,
  History,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { Product, PriceHistoryEntry } from "@/lib/types";
import {
  calculateNewPrice,
  getBulkPricePreview,
  applyBulkPriceUpdate,
  getPriceHistory,
} from "@/lib/pricingManager";

export default function SmartPricingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter & Form State
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [targetTier, setTargetTier] = useState<"retail_price" | "wholesale_price" | "technician_price" | "all">("all");
  const [updateType, setUpdateType] = useState<"percentage" | "fixed">("percentage");
  const [direction, setDirection] = useState<"increase" | "decrease">("increase");
  const [amountValue, setAmountValue] = useState<string>("5");
  const [reason, setReason] = useState<string>("Supplier cost update");

  // History State
  const [historyList, setHistoryList] = useState<PriceHistoryEntry[]>([]);
  const [historyTab, setHistoryTab] = useState(false);

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/products");
      if (!res.ok) throw new Error("Failed to load products");
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.products || data.customProducts || [];
      setProducts(list);

      const history = await getPriceHistory(undefined, 30);
      setHistoryList(history);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const productList = Array.isArray(products) ? products : [];

  // Compute available brands & categories
  const brands = Array.from(
    new Set(
      productList
        .map((p) => {
          const match = p?.name?.match(/^(Samsung|iPhone|Apple|Vivo|Oppo|Infinix|Xiaomi|Tecno|Realme|Redmi|Huawei|Google|OnePlus)/i);
          return match ? match[0] : null;
        })
        .filter(Boolean) as string[]
    )
  ).sort();

  const categories = Array.from(
    new Set(
      productList
        .map((p) => (typeof p?.category === "object" && p?.category ? p.category.name : (p?.category as any)))
        .filter(Boolean) as string[]
    )
  ).sort();

  // Preview computation
  const previewProducts = getBulkPricePreview(
    productList,
    selectedBrand === "all" ? undefined : selectedBrand,
    selectedCategory === "all" ? undefined : selectedCategory,
    targetTier,
    updateType,
    direction,
    parseFloat(amountValue) || 0
  );

  const handleApplyUpdate = async () => {
    const val = parseFloat(amountValue);
    if (isNaN(val) || val <= 0) {
      setErrorMsg("Please enter a valid positive number for adjustment value.");
      return;
    }

    if (previewProducts.length === 0) {
      setErrorMsg("No matching products found for the selected criteria.");
      return;
    }

    const confirmText = `Are you sure you want to ${direction} prices of ${previewProducts.length} product(s) by ${
      updateType === "percentage" ? `${val}%` : `Rs. ${val}`
    }?`;
    if (!window.confirm(confirmText)) return;

    setActionLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const result = await applyBulkPriceUpdate(
        productList,
        {
          brand: selectedBrand === "all" ? undefined : selectedBrand,
          category: selectedCategory === "all" ? undefined : selectedCategory,
          targetTier,
          updateType,
          direction,
          value: val,
          reason,
        },
        "Super Admin"
      );

      // Persist changes to server via batch pricing endpoint
      const batchRes = await fetch("/api/admin/pricing/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates: result.updatedProducts.map((p) => ({
            id: p.id,
            sku: p.sku,
            retail_price: p.retail_price,
            wholesale_price: p.wholesale_price,
            technician_price: p.technician_price,
          })),
          reason,
          changed_by: "Super Admin",
        }),
      });

      if (!batchRes.ok) {
        throw new Error("Failed to persist price updates to server");
      }

      setSuccessMsg(
        `Successfully updated ${result.count} product prices (${result.logs.length} price change logs recorded).`
      );
      await fetchData();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Bulk update encountered an error.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-primary to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-2 bg-red-600/30 border border-red-500/40 rounded-xl">
              <Tag className="w-5 h-5 text-red-400" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">Smart Price Management</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-300">
            Bulk adjust prices across Brands, Categories, and Customer Tiers with instantaneous mathematical preview.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setHistoryTab(!historyTab)}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              historyTab
                ? "bg-white text-slate-900 shadow-md"
                : "bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700"
            }`}
          >
            <History className="w-4 h-4" />
            {historyTab ? "Back to Bulk Editor" : "View Price Audit History"}
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 disabled:opacity-50"
            title="Reload data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Alert Messages */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-3 text-sm font-semibold">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-3 text-sm font-semibold">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {historyTab ? (
        /* Price History Table */
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Price Change Audit Trail</h2>
              <p className="text-xs text-slate-500">
                Complete forensic record of all price adjustments, old vs new rates, and administrative actors.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
              {historyList.length} logs recorded
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Date / Time</th>
                  <th className="py-3 px-4">Product ID / Name</th>
                  <th className="py-3 px-4">Pricing Tier</th>
                  <th className="py-3 px-4">Old Price</th>
                  <th className="py-3 px-4">New Price</th>
                  <th className="py-3 px-4">Difference</th>
                  <th className="py-3 px-4">Changed By</th>
                  <th className="py-3 px-4">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {historyList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No price history entries recorded yet. Bulk changes will automatically appear here.
                    </td>
                  </tr>
                ) : (
                  historyList.map((entry) => {
                    const diff = entry.new_price - entry.old_price;
                    const diffPercent = entry.old_price > 0 ? ((diff / entry.old_price) * 100).toFixed(1) : "0";
                    return (
                      <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                          {new Date(entry.created_at).toLocaleString("en-PK")}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 max-w-[200px] truncate">
                          {entry.product_id}
                        </td>
                        <td className="py-3 px-4">
                          <span className="capitalize px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-semibold text-[11px]">
                            {(entry.tier || entry.tier_affected || "retail_price").replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500">Rs. {entry.old_price.toLocaleString()}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          Rs. {entry.new_price.toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`font-bold ${
                              diff >= 0 ? "text-emerald-600" : "text-rose-600"
                            }`}
                          >
                            {diff >= 0 ? `+Rs. ${diff.toLocaleString()} (+${diffPercent}%)` : `-Rs. ${Math.abs(diff).toLocaleString()} (${diffPercent}%)`}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-medium">{entry.changed_by}</td>
                        <td className="py-3 px-4 text-slate-500 italic">{entry.reason || "-"}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Bulk Price Form & Preview */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Form Card */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Filter className="w-4 h-4 text-secondary" />
                1. Target Selection
              </h2>

              {/* Brand Filter */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Mobile Brand</label>
                <select
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                  className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-secondary outline-none"
                >
                  <option value="all">All Mobile Brands</option>
                  {brands.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Part Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-secondary outline-none"
                >
                  <option value="all">All Categories (LCD, Battery, Flex...)</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Price Tier */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Pricing Tier</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: "all", label: "All Tiers" },
                    { id: "retail_price", label: "Retail Only" },
                    { id: "technician_price", label: "Technician" },
                    { id: "wholesale_price", label: "Wholesale" },
                  ].map((tier) => (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => setTargetTier(tier.id as any)}
                      className={`text-xs py-2 px-2.5 rounded-xl font-bold border transition-all text-center ${
                        targetTier === tier.id
                          ? "bg-secondary text-white border-secondary shadow-sm"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {tier.label}
                    </button>
                  ))}
                </div>
              </div>

              <hr className="border-slate-100 my-2" />

              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 pt-1">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                2. Price Formula
              </h2>

              {/* Action Direction */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Adjustment Direction</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDirection("increase")}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                      direction === "increase"
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    + Increase
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirection("decrease")}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                      direction === "decrease"
                        ? "bg-rose-600 text-white border-rose-600"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    - Decrease
                  </button>
                </div>
              </div>

              {/* Update Type (Percentage vs Fixed) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Adjustment Method</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setUpdateType("percentage")}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1.5 ${
                      updateType === "percentage"
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <Percent className="w-3.5 h-3.5" />
                    Percentage (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setUpdateType("fixed")}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1.5 ${
                      updateType === "fixed"
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    Fixed (Rs.)
                  </button>
                </div>
              </div>

              {/* Amount input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Value ({updateType === "percentage" ? "Percentage %" : "Rupees Rs."})
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={amountValue}
                    onChange={(e) => setAmountValue(e.target.value)}
                    className="w-full text-sm font-bold p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-secondary outline-none pr-10"
                    placeholder="e.g. 5"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-extrabold text-slate-400">
                    {updateType === "percentage" ? "%" : "PKR"}
                  </span>
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Audit Reason</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Chinese Yuan exchange rate increase"
                  className="w-full text-xs font-medium p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-secondary outline-none"
                />
              </div>

              {/* Submit CTA */}
              <button
                type="button"
                onClick={handleApplyUpdate}
                disabled={actionLoading || previewProducts.length === 0}
                className="w-full py-3 px-4 bg-secondary hover:bg-secondary-dark text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {actionLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Updating {previewProducts.length} Products...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Apply {direction === "increase" ? "+" : "-"}
                    {amountValue}
                    {updateType === "percentage" ? "%" : " Rs"} to {previewProducts.length} Products
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Live Calculation Preview ({previewProducts.length} items impacted)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Review adjusted rates across all tiers before commiting to the database.
                  </p>
                </div>
                <span className="text-xs font-bold text-secondary bg-red-50 px-2.5 py-1 rounded-lg border border-red-200">
                  Target: {targetTier.replace("_", " ").toUpperCase()}
                </span>
              </div>

              {previewProducts.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <p className="font-bold text-sm">No products match current brand & category filters.</p>
                  <p className="text-xs mt-1">Adjust the filters on the left to see calculated previews.</p>
                </div>
              ) : (
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Product Name</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Retail Price</th>
                        <th className="py-3 px-4">Technician Price</th>
                        <th className="py-3 px-4">Wholesale Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {previewProducts.slice(0, 15).map(({ original, updated }) => (
                        <tr key={original.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-4 font-bold text-slate-900 max-w-[220px] truncate">
                            {original.name}
                          </td>
                          <td className="py-2.5 px-4 text-slate-500">
                            {typeof original.category === "object" && original.category ? original.category.name : (original.category as any) || "General"}
                          </td>
                          {/* Retail */}
                          <td className="py-2.5 px-4">
                            {original.retail_price !== updated.retail_price ? (
                              <div className="flex items-center gap-1">
                                <span className="line-through text-slate-400">Rs. {original.retail_price}</span>
                                <ArrowRight className="w-3 h-3 text-secondary" />
                                <span className="font-bold text-secondary">Rs. {updated.retail_price}</span>
                              </div>
                            ) : (
                              <span className="text-slate-600">Rs. {original.retail_price}</span>
                            )}
                          </td>
                          {/* Technician */}
                          <td className="py-2.5 px-4">
                            {original.technician_price !== updated.technician_price ? (
                              <div className="flex items-center gap-1">
                                <span className="line-through text-slate-400">Rs. {original.technician_price}</span>
                                <ArrowRight className="w-3 h-3 text-secondary" />
                                <span className="font-bold text-secondary">Rs. {updated.technician_price}</span>
                              </div>
                            ) : (
                              <span className="text-slate-600">Rs. {original.technician_price}</span>
                            )}
                          </td>
                          {/* Wholesale */}
                          <td className="py-2.5 px-4">
                            {original.wholesale_price !== updated.wholesale_price ? (
                              <div className="flex items-center gap-1">
                                <span className="line-through text-slate-400">Rs. {original.wholesale_price}</span>
                                <ArrowRight className="w-3 h-3 text-secondary" />
                                <span className="font-bold text-secondary">Rs. {updated.wholesale_price}</span>
                              </div>
                            ) : (
                              <span className="text-slate-600">Rs. {original.wholesale_price}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {previewProducts.length > 15 && (
                    <div className="p-3 text-center text-xs font-bold text-slate-500 bg-slate-50 border-t border-slate-200">
                      Showing first 15 of {previewProducts.length} affected products...
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
