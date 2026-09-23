"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Layers,
  Package,
  ShoppingCart,
  PhoneCall,
  ArrowRight,
  TrendingUp,
  MapPin,
  Clock,
  ExternalLink,
  Users,
  UserPlus,
  Receipt,
  Boxes,
  Image as ImageIcon,
  BarChart3,
  AlertTriangle,
  DollarSign,
  Truck,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getOrders, calculateOrderProfit, Order } from "@/lib/orders";
import { getExpenses, getTotalExpenses } from "@/lib/expenses";
import { getCustomProducts } from "@/lib/customProducts";
import { DEFAULT_CATALOG_PRODUCTS } from "@/lib/products";
import { Product } from "@/lib/types";

export default function AdminDashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [usersCount, setUsersCount] = useState<number>(3);
  const [categoriesCount, setCategoriesCount] = useState<number>(5);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        // 1. Fetch categories & products counts from Supabase
        const { count: catCount } = await supabase
          .from("categories")
          .select("*", { count: "exact", head: true });

        const { count: prodCount } = await supabase
          .from("products")
          .select("*", { count: "exact", head: true });

        const { count: uCount } = await supabase
          .from("customers")
          .select("*", { count: "exact", head: true });

        if (catCount) setCategoriesCount(catCount);
        if (uCount) setUsersCount(uCount);

        // Merge products
        const customProds = getCustomProducts();
        const map = new Map<string, Product>();
        for (const p of customProds) {
          if (p.is_active !== false) map.set(p.id, p);
        }
        for (const p of DEFAULT_CATALOG_PRODUCTS) {
          if (!map.has(p.id)) map.set(p.id, p);
        }
        setProducts(Array.from(map.values()));

        // Orders
        setOrders(getOrders());
      } catch (err) {
        console.warn("Notice loading dashboard stats:", err);
        setOrders(getOrders());
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();

    const handleUpdate = () => {
      setOrders(getOrders());
    };

    window.addEventListener("storage", handleUpdate);
    window.addEventListener("zubair_orders_updated", handleUpdate);
    return () => {
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("zubair_orders_updated", handleUpdate);
    };
  }, []);

  // Today & Overall KPIs
  const kpis = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const todayOrders = orders.filter(
      (o) => o.status !== "cancelled" && new Date(o.created_at).getTime() >= startOfToday
    );
    const todaySales = todayOrders.reduce((sum, o) => sum + o.total_amount, 0);

    let totalSales = 0;
    let totalGrossProfit = 0;
    for (const o of orders.filter((ord) => ord.status !== "cancelled")) {
      totalSales += o.total_amount;
      totalGrossProfit += calculateOrderProfit(o).totalProfit;
    }

    const expenses = getExpenses();
    const totalExpenses = getTotalExpenses(expenses);
    const totalNetProfit = totalGrossProfit - totalExpenses;

    // Low stock items (stock <= min_stock_level or <= 10)
    const lowStockItems = products.filter((p) => {
      const stock = p.stock_quantity ?? 30;
      const minStock = p.min_stock_level ?? 10;
      return stock <= minStock;
    });

    return {
      todayOrdersCount: todayOrders.length,
      todaySales,
      totalSales,
      totalGrossProfit,
      totalNetProfit,
      lowStockCount: lowStockItems.length,
      lowStockItems: lowStockItems.slice(0, 5),
    };
  }, [orders, products]);

  return (
    <div className="space-y-8 pb-12">
      {/* Top Welcome Banner */}
      <div className="bg-[#111827] text-white rounded-2xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-2.5">
          <div className="flex items-center gap-2">
            <span className="bg-[#dc2626] text-white font-extrabold text-[10px] uppercase px-2.5 py-0.5 rounded-full tracking-wider">
              Live ERP System
            </span>
            <span className="text-slate-400 text-xs font-semibold">Gujranwala Hub</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Zubair Mobile Spare Parts ERP Portal
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
            Control customer pricing tiers (Retail / Technician / Wholesale), dispatch cargo with tracking bilty numbers, track inventory stock levels, and monitor live Profit & Loss.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-2.5">
            <Link
              href="/admin/orders"
              className="inline-flex items-center gap-1.5 bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-colors"
            >
              <Receipt className="w-4 h-4" />
              <span>Orders & Bills ({orders.length})</span>
            </Link>
            <Link
              href="/admin/reports"
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Reports & P&L</span>
            </Link>
            <Link
              href="/admin/inventory"
              className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors border border-slate-700"
            >
              <Boxes className="w-4 h-4 text-amber-400" />
              <span>Inventory ERP</span>
            </Link>
            <Link
              href="/admin/users"
              className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors border border-slate-700"
            >
              <Users className="w-4 h-4 text-blue-400" />
              <span>Customer Khata</span>
            </Link>
          </div>
        </div>

        {/* Decorative Watermark */}
        <div className="absolute -right-8 -bottom-10 opacity-5 text-white pointer-events-none hidden md:block">
          <TrendingUp className="w-72 h-72" />
        </div>
      </div>

      {/* 6 Key Operational KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {/* KPI 1: Today's Orders */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10.5px] font-bold uppercase tracking-wider">Today&apos;s Orders</span>
            <ShoppingCart className="w-4 h-4 text-blue-500" />
          </div>
          <span className="text-2xl font-black text-slate-900 block font-mono">
            {kpis.todayOrdersCount}
          </span>
          <span className="text-[10px] text-slate-500 block font-medium">
            Sales: Rs. {kpis.todaySales.toLocaleString()}
          </span>
        </div>

        {/* KPI 2: Total Sales */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10.5px] font-bold uppercase tracking-wider">Total Sales</span>
            <Receipt className="w-4 h-4 text-[#dc2626]" />
          </div>
          <span className="text-xl font-black text-slate-900 block font-mono">
            Rs. {Math.round(kpis.totalSales / 1000)}k
          </span>
          <span className="text-[10px] text-slate-500 block font-medium">
            {orders.length} total orders
          </span>
        </div>

        {/* KPI 3: Net Profit */}
        <div className="bg-white rounded-2xl border border-emerald-200 bg-emerald-50/20 p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-[10.5px] font-bold uppercase tracking-wider">Net Profit</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-xl font-black text-emerald-700 block font-mono">
            Rs. {kpis.totalNetProfit.toLocaleString()}
          </span>
          <span className="text-[10px] text-emerald-600 block font-medium">
            After COGS & expenses
          </span>
        </div>

        {/* KPI 4: Low Stock Alert */}
        <div className="bg-white rounded-2xl border border-amber-200 bg-amber-50/20 p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-[10.5px] font-bold uppercase tracking-wider">Low Stock</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <span className="text-2xl font-black text-amber-700 block font-mono">
            {kpis.lowStockCount}
          </span>
          <Link href="/admin/inventory" className="text-[10px] text-amber-700 font-bold block hover:underline">
            View low items &rarr;
          </Link>
        </div>

        {/* KPI 5: Active Parts */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10.5px] font-bold uppercase tracking-wider">Active SKUs</span>
            <Package className="w-4 h-4 text-indigo-500" />
          </div>
          <span className="text-2xl font-black text-slate-900 block font-mono">
            {products.length}
          </span>
          <Link href="/admin/products" className="text-[10px] text-slate-500 font-medium block hover:underline">
            Manage catalog
          </Link>
        </div>

        {/* KPI 6: Registered Customers */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10.5px] font-bold uppercase tracking-wider">Customers</span>
            <Users className="w-4 h-4 text-purple-500" />
          </div>
          <span className="text-2xl font-black text-slate-900 block font-mono">
            {usersCount}
          </span>
          <Link href="/admin/users" className="text-[10px] text-purple-600 font-bold block hover:underline">
            View accounts & Khata
          </Link>
        </div>
      </div>

      {/* Row: Low Stock Alert Items Table & Quick Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Low Stock Alerts */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h2 className="font-black text-sm text-[#111827]">Low Stock Alerts (کم اسٹاک وارننگ)</h2>
            </div>
            <Link
              href="/admin/inventory"
              className="text-xs text-[#dc2626] font-bold hover:underline"
            >
              Open Inventory Module &rarr;
            </Link>
          </div>

          {kpis.lowStockItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              All spare parts have healthy stock levels above minimum thresholds.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10.5px] uppercase font-bold text-slate-400 border-b border-slate-100">
                  <tr>
                    <th className="py-2.5 px-3">Spare Part</th>
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3 text-center">Remaining Stock</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {kpis.lowStockItems.map((prod) => (
                    <tr key={prod.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {prod.name}
                        {prod.brand && (
                          <span className="block text-[10px] text-slate-400">{prod.brand}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                        {prod.sku || "-"}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10.5px] font-black bg-rose-100 text-rose-700 font-mono">
                          {prod.stock_quantity ?? 0} Pcs left
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <Link
                          href={`/admin/products/${prod.id}/edit`}
                          className="text-[11px] font-bold text-blue-600 hover:underline"
                        >
                          Restock
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Col: Quick ERP Actions */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <h2 className="font-black text-sm text-[#111827] pb-3 border-b border-slate-100 flex items-center gap-2">
            <Boxes className="w-4 h-4 text-[#dc2626]" />
            <span>Quick ERP Actions</span>
          </h2>

          <div className="space-y-2.5">
            <Link
              href="/admin/products/new"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-red-50 border border-slate-200/80 hover:border-red-200 transition-colors group"
            >
              <div>
                <span className="font-bold text-xs text-slate-800 group-hover:text-[#dc2626] block">
                  + Add Mobile Spare Part
                </span>
                <span className="text-[10px] text-slate-400">LCD, flex, glass, battery</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#dc2626] group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              href="/admin/users"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200/80 hover:border-blue-200 transition-colors group"
            >
              <div>
                <span className="font-bold text-xs text-slate-800 group-hover:text-blue-600 block">
                  + Customer Khata & Accounts
                </span>
                <span className="text-[10px] text-slate-400">Credit limits & payment records</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              href="/admin/reports"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200/80 hover:border-emerald-200 transition-colors group"
            >
              <div>
                <span className="font-bold text-xs text-slate-800 group-hover:text-emerald-700 block">
                  View Profit & Loss Reports
                </span>
                <span className="text-[10px] text-slate-400">COGS, margins & operating expenses</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              href="/admin/inventory"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-amber-50 border border-slate-200/80 hover:border-amber-200 transition-colors group"
            >
              <div>
                <span className="font-bold text-xs text-slate-800 group-hover:text-amber-800 block">
                  Supplier Purchase Ledger
                </span>
                <span className="text-[10px] text-slate-400">Stock movements & batch entries</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-800 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      {/* Operational Shop Info Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#111827] pb-3 border-b border-slate-100 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[#dc2626]" />
          <span>Shop & Warehouse Operations</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-500">
          <div className="space-y-1">
            <strong className="text-slate-800 block text-sm">Physical Store Address</strong>
            <p className="leading-relaxed">
              Shop No. B16, Chand Plaza, Garjakhi Darwaza, Gujranwala, Pakistan
            </p>
          </div>

          <div className="space-y-1">
            <strong className="text-slate-800 block text-sm">Working Hours</strong>
            <p className="flex items-center gap-1 text-slate-700">
              <Clock className="w-3.5 h-3.5 text-[#dc2626]" />
              Monday - Saturday: 10:00 AM - 9:00 PM
            </p>
            <p className="text-slate-400">Sunday: Closed / Emergency WhatsApp On-Call</p>
          </div>

          <div className="space-y-1">
            <strong className="text-slate-800 block text-sm">Courier & Cargo Transits</strong>
            <p className="leading-relaxed">
              Same day dispatch via TCS, Daewoo Express Cargo, Leopard, and local bus stands across Pakistan.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
