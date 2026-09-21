"use client";

import React, { useState, useEffect } from "react";
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
  Image as ImageIcon,
  Receipt,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getOrders, calculateOrderProfit } from "@/lib/orders";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    categoriesCount: 5,
    productsCount: 12,
    usersCount: 3,
    ordersCount: 0,
    totalProfit: 0,
    loading: true,
  });

  useEffect(() => {
    async function loadStats() {
      try {
        const { count: catCount } = await supabase
          .from("categories")
          .select("*", { count: "exact", head: true });

        const { count: prodCount } = await supabase
          .from("products")
          .select("*", { count: "exact", head: true });

        const { count: uCount } = await supabase
          .from("customers")
          .select("*", { count: "exact", head: true });

        let localUsersCount = uCount ?? null;
        if (localUsersCount === null) {
          const local = localStorage.getItem("zubair_mobile_customers");
          if (local) {
            try {
              localUsersCount = JSON.parse(local).length;
            } catch {}
          }
        }

        const ordersList = getOrders();
        const profit = ordersList.reduce((sum, o) => sum + calculateOrderProfit(o).totalProfit, 0);

        setStats({
          categoriesCount: catCount ?? 5,
          productsCount: prodCount ?? 12,
          usersCount: localUsersCount ?? 3,
          ordersCount: ordersList.length,
          totalProfit: profit,
          loading: false,
        });
      } catch (err) {
        console.warn("Failed to load live counts, using defaults:", err);
        const ordersList = getOrders();
        const profit = ordersList.reduce((sum, o) => sum + calculateOrderProfit(o).totalProfit, 0);
        setStats({
          categoriesCount: 5,
          productsCount: 12,
          usersCount: 3,
          ordersCount: ordersList.length,
          totalProfit: profit,
          loading: false,
        });
      }
    }

    loadStats();
  }, []);

  return (
    <div className="space-y-8">
      {/* Top Welcome Banner */}
      <div className="bg-primary text-white rounded-2xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-2">
          <span className="text-secondary-light font-bold text-xs uppercase tracking-wider">
            Admin Overview
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Welcome to Zubair Mobile Admin Portal
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Manage your mobile spare parts inventory, categories, wholesale pricing, and
            orders dispatched from Chand Plaza, Gujranwala.
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              href="/admin/orders"
              className="inline-flex items-center gap-2 bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-colors"
            >
              <Receipt className="w-4 h-4" />
              <span>Orders & Bills ({stats.ordersCount})</span>
            </Link>
            <Link
              href="/admin/banner"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors"
            >
              <ImageIcon className="w-4 h-4" />
              <span>Hero Offer Banner</span>
            </Link>
            <Link
              href="/admin/users"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors"
            >
              <Users className="w-4 h-4" />
              <span>Users</span>
            </Link>
            <Link
              href="/admin/categories"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors"
            >
              <Layers className="w-4 h-4" />
              <span>Categories</span>
            </Link>
            <Link
              href="/admin/products"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors"
            >
              <Package className="w-4 h-4" />
              <span>Products</span>
            </Link>
          </div>
        </div>

        {/* Subtle decorative watermark */}
        <div className="absolute -right-8 -bottom-10 opacity-10 text-white pointer-events-none hidden md:block">
          <TrendingUp className="w-64 h-64" />
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Metric 1: Registered Users */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Registered Users
            </span>
            <div className="text-3xl font-black text-[#111827]">
              {stats.loading ? "..." : stats.usersCount}
            </div>
            <Link
              href="/admin/users"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#dc2626] hover:underline pt-1"
            >
              <span>+ Register / View</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#dc2626]/10 text-[#dc2626] flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 2: Categories */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Active Categories
            </span>
            <div className="text-3xl font-black text-primary">
              {stats.loading ? "..." : stats.categoriesCount}
            </div>
            <Link
              href="/admin/categories"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#dc2626] hover:underline pt-1"
            >
              <span>View all</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 3: Products */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Listed Parts
            </span>
            <div className="text-3xl font-black text-primary">
              {stats.loading ? "..." : stats.productsCount}
            </div>
            <Link
              href="/admin/products"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#dc2626] hover:underline pt-1"
            >
              <span>Manage items</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 4: WhatsApp Orders */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Direct Orders
            </span>
            <div className="text-2xl font-black text-whatsapp">WhatsApp</div>
            <a
              href="https://wa.me/923458032600"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-whatsapp hover:underline pt-1"
            >
              <span>0345-8032600</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-whatsapp/10 text-whatsapp flex items-center justify-center">
            <PhoneCall className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 5: Net Profit & Orders */}
        <div className="bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-white rounded-2xl border border-emerald-300 p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Total Net Profit
            </span>
            <div className="text-2xl font-black text-emerald-700">
              Rs. {stats.totalProfit.toLocaleString("en-PK")}
            </div>
            <Link
              href="/admin/orders"
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline pt-1"
            >
              <span>View {stats.ordersCount} Orders</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Shop Location & Operational Summary Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-primary pb-3 border-b border-slate-100 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-secondary" />
          <span>Shop & Warehouse Operations</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-500">
          <div className="space-y-1">
            <strong className="text-charcoal block text-sm">Physical Store Address</strong>
            <p className="leading-relaxed">
              Shop No. B16, Chand Plaza, Garjakhi Darwaza, Gujranwala, Pakistan
            </p>
          </div>

          <div className="space-y-1">
            <strong className="text-charcoal block text-sm">Working Hours</strong>
            <p className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-secondary" />
              Monday - Saturday: 10:00 AM - 9:00 PM
            </p>
            <p className="text-slate-400">Sunday: Closed / Emergency WhatsApp On-Call</p>
          </div>

          <div className="space-y-1">
            <strong className="text-charcoal block text-sm">Courier & Cargo Transits</strong>
            <p className="leading-relaxed">
              Same day dispatch via TCS, Daewoo Express Cargo, Leopard, and local bus stands.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
