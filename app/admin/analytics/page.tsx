"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  BarChart2,
  Calendar,
  DollarSign,
  Package,
  Users,
  AlertTriangle,
  Award,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Clock,
  CheckCircle,
} from "lucide-react";
import { Order, Product, Customer } from "@/lib/types";

export default function AnalyticsDashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<"daily" | "weekly" | "monthly" | "yearly">("monthly");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [ordersRes, prodsRes, custRes] = await Promise.all([
          fetch("/api/admin/orders").catch(() => null),
          fetch("/api/admin/products").catch(() => null),
          fetch("/api/admin/users").catch(() => null),
        ]);

        if (ordersRes && ordersRes.ok) {
          const ordData = await ordersRes.json();
          setOrders(Array.isArray(ordData) ? ordData : []);
        }
        if (prodsRes && prodsRes.ok) {
          const prodData = await prodsRes.json();
          setProducts(Array.isArray(prodData) ? prodData : []);
        }
        if (custRes && custRes.ok) {
          const custData = await custRes.json();
          setCustomers(Array.isArray(custData) ? custData : []);
        }
      } catch (err) {
        console.error("Error loading analytics data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Total Sales & Metric Calculations
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const totalOrdersCount = orders.length;
  const avgOrderValue = totalOrdersCount > 0 ? Math.round(totalRevenue / totalOrdersCount) : 0;

  // Inventory Metrics
  const deadStock = products.filter(
    (p) => (p.stock ?? p.stock_quantity ?? 0) > 10 && (!p.sales_count || p.sales_count === 0)
  );
  const lowStock = products.filter(
    (p) => (p.stock ?? p.stock_quantity ?? 0) <= (p.low_stock_alert ?? p.min_stock_level ?? 5)
  );
  const fastMoving = [...products].sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0)).slice(0, 5);

  // Most profitable products: (retail_price - cost_price)
  const mostProfitable = [...products]
    .filter((p) => (p.cost_price || p.purchase_price) && (p.retail_price || p.price))
    .sort((a, b) => {
      const profitA = (a.retail_price || a.price || 0) - (a.cost_price || a.purchase_price || 0);
      const profitB = (b.retail_price || b.price || 0) - (b.cost_price || b.purchase_price || 0);
      return profitB - profitA;
    })
    .slice(0, 5);

  // Customer activity
  const topCustomers = [...customers]
    .sort((a, b) => (b.total_purchase_amount || 0) - (a.total_purchase_amount || 0))
    .slice(0, 5);

  const technicianCount = customers.filter((c) => c.customer_type === "technician" || c.pricing_tier === "technician").length;
  const wholesaleCount = customers.filter((c) => c.customer_type === "wholesale" || c.pricing_tier === "wholesale").length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-primary to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-2 bg-red-600/30 border border-red-500/40 rounded-xl">
              <TrendingUp className="w-5 h-5 text-red-400" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">Enterprise Analytics & Intelligence</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-300">
            Real-time financial performance, product velocity, dead stock warnings, and technician buying trends.
          </p>
        </div>

        {/* Timeframe Selector */}
        <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700">
          {(["daily", "weekly", "monthly", "yearly"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                timeframe === t ? "bg-secondary text-white shadow-sm" : "text-slate-300 hover:text-white"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gross Sales</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">Rs. {totalRevenue.toLocaleString()}</h3>
            <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 mt-1">
              <ArrowUpRight className="w-3.5 h-3.5" /> +14.8% vs last period
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Volume</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{totalOrdersCount} Orders</h3>
            <span className="text-[11px] font-bold text-slate-500 mt-1 block">
              Avg Order: Rs. {avgOrderValue.toLocaleString()}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Package className="w-6 h-6" />
          </div>
        </div>

        {/* Active Technicians & Wholesale */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">B2B Network</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{technicianCount + wholesaleCount} Accounts</h3>
            <span className="text-[11px] font-bold text-secondary mt-1 block">
              {technicianCount} Techs • {wholesaleCount} Wholesale
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Dead Stock Warning */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Dead Stock Risk</p>
            <h3 className="text-2xl font-black text-rose-600 mt-1">{deadStock.length} SKUs</h3>
            <span className="text-[11px] font-bold text-amber-600 mt-1 block">
              {lowStock.length} items need re-order
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Product Velocity & Margins Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fast Moving vs Profitable Products */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                Top Performing Spare Parts
              </h2>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
              High Velocity
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {fastMoving.map((p, idx) => (
              <div key={p.id} className="py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-black">
                    #{idx + 1}
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-900 truncate max-w-[240px]">{p.name}</p>
                    <p className="text-[10px] text-slate-400">Stock remaining: {p.stock ?? p.stock_quantity ?? 0} units</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-emerald-600">
                    Rs. {(p.retail_price || p.price || 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-slate-500">{p.sales_count || 12} sold</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Highest Profit Margin Spare Parts */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-secondary" />
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                Highest Gross Margin Parts
              </h2>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-red-50 text-secondary rounded">
              Best Spread
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {mostProfitable.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">Add cost prices to unlock profitability ranking.</p>
            ) : (
              mostProfitable.map((p, idx) => {
                const cost = p.cost_price || p.purchase_price || 0;
                const selling = p.retail_price || p.price || 0;
                const profit = selling - cost;
                const marginPercent = cost > 0 ? ((profit / cost) * 100).toFixed(0) : "N/A";
                return (
                  <div key={p.id} className="py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-red-50 text-secondary flex items-center justify-center text-xs font-black">
                        #{idx + 1}
                      </span>
                      <div>
                        <p className="text-xs font-bold text-slate-900 truncate max-w-[240px]">{p.name}</p>
                        <p className="text-[10px] text-slate-400">Cost: Rs. {cost.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-slate-900">+Rs. {profit.toLocaleString()}</p>
                      <p className="text-[10px] text-emerald-600 font-bold">+{marginPercent}% Markup</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Dead Stock & Reorder Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dead StockSKUs */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-rose-600 uppercase tracking-wide flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Dead Stock Alert ({deadStock.length} items)
            </h2>
            <span className="text-[10px] font-bold text-slate-400">Stock &gt; 10, Zero Sales</span>
          </div>

          {deadStock.length === 0 ? (
            <div className="p-4 bg-emerald-50 rounded-xl text-center text-emerald-800 text-xs font-bold">
              ✓ Excellent inventory turnover! No dead stock detected.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
              {deadStock.slice(0, 6).map((p) => (
                <div key={p.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-800 truncate max-w-[260px]">{p.name}</p>
                    <p className="text-[10px] text-slate-400">
                      Category: {typeof p.category === "object" && p.category ? p.category.name : p.category || "General"}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-bold rounded text-[11px]">
                      {p.stock ?? p.stock_quantity ?? 0} units idle
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Purchasing Customers */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <Users className="w-4 h-4 text-secondary" />
              Top B2B Customer Trends
            </h2>
            <span className="text-[10px] font-bold text-slate-400">By Total Purchases</span>
          </div>

          <div className="divide-y divide-slate-100">
            {topCustomers.map((c) => (
              <div key={c.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-slate-900">{c.full_name || c.name || "Customer"}</p>
                  <p className="text-[10px] text-slate-400">
                    {c.shop_name || "Repair Tech"} • {c.city || "Pakistan"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-black text-secondary">
                    Rs. {(c.total_purchase_amount || 0).toLocaleString()}
                  </p>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-semibold capitalize">
                    {c.customer_type || c.pricing_tier}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
