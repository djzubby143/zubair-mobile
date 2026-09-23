"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Layers,
  LogOut,
  Sparkles,
  ExternalLink,
  Menu,
  X,
  User,
  Users,
  Image as ImageIcon,
  ShieldAlert,
  Receipt,
  UploadCloud,
  Boxes,
  BarChart3,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          // If no active session, redirect to login
          router.replace("/login");
          return;
        }

        setUserEmail(session.user?.email || "Admin");
      } catch (err) {
        console.warn("Auth check error, redirecting to login:", err);
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    }

    checkAuth();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        router.replace("/login");
      } else if (session) {
        setUserEmail(session.user?.email || "Admin");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      router.push("/");
    }
  };

  const navItems = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Inventory", href: "/admin/inventory", icon: Boxes },
    { name: "Orders & Bills", href: "/admin/orders", icon: Receipt },
    { name: "Reports & P&L", href: "/admin/reports", icon: BarChart3 },
    { name: "Hero Banner", href: "/admin/banner", icon: ImageIcon },
    { name: "Users", href: "/admin/users", icon: Users },
    { name: "Categories", href: "/admin/categories", icon: Layers },
    { name: "Products", href: "/admin/products", icon: Package },
    { name: "Import Products", href: "/admin/products/import", icon: UploadCloud },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Verifying Admin Session...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col lg:flex-row">
      {/* Mobile Top Navigation Bar */}
      <div className="lg:hidden bg-primary text-white px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5">
          <img
            src="/logo.jpg"
            alt="Zubair Mobile"
            className="w-7 h-7 object-contain rounded bg-black border border-red-500/30"
          />
          <span className="font-extrabold text-sm tracking-tight text-white">
            ZUBAIR <span className="text-[#dc2626]">ADMIN</span>
          </span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
          aria-label="Toggle admin navigation"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Desktop & Mobile Drawer Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#111827] text-slate-300 flex flex-col justify-between shadow-xl transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Top: Brand & Nav Links */}
        <div>
          {/* Brand Logo Header */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/logo.jpg"
                alt="Zubair Mobile"
                className="w-10 h-10 object-contain rounded-lg bg-black border border-red-500/30 shadow-md shrink-0"
              />
              <div className="flex flex-col">
                <span className="font-black text-base text-white tracking-tight leading-none">
                  ZUBAIR <span className="text-[#dc2626]">MOBILE</span>
                </span>
                <span className="text-[10px] text-red-400 font-semibold tracking-wider uppercase mt-1">
                  Repair & Parts Admin
                </span>
              </div>
            </div>
            {/* Close button on mobile */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="p-4 space-y-1.5">
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 px-3 mb-2">
              Management
            </p>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-secondary text-white shadow-sm"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom: User Info & Actions */}
        <div className="p-4 border-t border-slate-800 space-y-3">
          {/* User Email Pill */}
          <div className="flex items-center gap-2.5 px-3 py-2 bg-slate-900/80 rounded-xl text-xs">
            <div className="w-7 h-7 rounded-full bg-secondary/20 text-secondary-light flex items-center justify-center shrink-0">
              <User className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-slate-400 font-medium truncate">Logged in as</p>
              <p className="font-bold text-white text-xs truncate">{userEmail}</p>
            </div>
          </div>

          {/* Storefront Link */}
          <Link
            href="/"
            target="_blank"
            className="flex items-center justify-between w-full px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="w-3.5 h-3.5" />
              View Live Store
            </span>
            <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">
              New Tab
            </span>
          </Link>

          {/* Logout Button */}
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full px-3.5 py-2.5 rounded-xl text-xs font-bold bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 hover:text-white transition-colors border border-rose-900/40"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
