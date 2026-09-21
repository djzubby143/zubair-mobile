"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Store,
  Phone,
  MapPin,
  Package,
  Truck,
  Receipt,
  Download,
  Printer,
  Copy,
  Check,
  Clock,
  CheckCircle2,
  AlertCircle,
  LogOut,
  ShoppingBag,
  ExternalLink,
  PhoneCall,
  Calendar,
  Layers,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Order, getCustomerOrders, getOrders } from "@/lib/orders";
import { generateReceiptJpeg, printThermalReceipt, ThermalPaperWidth } from "@/lib/receiptGenerator";

export default function ProfilePage() {
  const router = useRouter();
  const { isLoggedIn, user, loading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [paperWidth, setPaperWidth] = useState<ThermalPaperWidth>(68);
  const [copiedBilty, setCopiedBilty] = useState<string | null>(null);
  const [isGeneratingJpeg, setIsGeneratingJpeg] = useState<string | null>(null);

  const loadUserOrders = () => {
    if (!user) return;
    const userOrders = getCustomerOrders({
      customerId: user.id || user.username,
      phone: user.phone,
      username: user.username,
    });
    setOrders(userOrders);
  };

  useEffect(() => {
    if (user) {
      loadUserOrders();
    }

    const handleUpdate = () => {
      if (user) loadUserOrders();
    };

    window.addEventListener("zubair_orders_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener("zubair_orders_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [user]);

  const handleCopyBilty = (bilty: string) => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(bilty);
      setCopiedBilty(bilty);
      setTimeout(() => setCopiedBilty(null), 2500);
    }
  };

  const handleDownloadJpeg = async (order: Order) => {
    setIsGeneratingJpeg(order.id);
    try {
      await generateReceiptJpeg(order, paperWidth);
    } catch (err) {
      console.error("Error generating receipt JPEG:", err);
      alert("Failed to download bill image.");
    } finally {
      setIsGeneratingJpeg(null);
    }
  };

  const handlePrintSlip = (order: Order) => {
    printThermalReceipt(order, paperWidth);
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("zubair_customer_user");
      window.location.href = "/";
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <div className="w-10 h-10 border-4 border-[#dc2626] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Loading Your Account & Orders...
        </p>
      </div>
    );
  }

  if (!isLoggedIn || !user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-5">
        <div className="w-16 h-16 rounded-full bg-red-50 text-[#dc2626] flex items-center justify-center mx-auto border border-red-100 shadow-xs">
          <User className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-black text-[#111827]">Customer Login Required</h2>
          <p className="text-xs text-slate-500">
            Please log in to your registered shop account to view your profile, order history, and live cargo tracking.
          </p>
        </div>
        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/login"
            className="px-6 py-2.5 rounded-xl bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs font-bold shadow-xs transition-colors"
          >
            Login to Account
          </Link>
          <Link
            href="/"
            className="px-6 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
          >
            Back to Store
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Profile Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-radial from-red-50 to-transparent opacity-60 pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#dc2626] text-white flex items-center justify-center font-black text-2xl shadow-md shrink-0">
              {user.shop_name?.charAt(0) || user.full_name?.charAt(0) || "Z"}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-[#111827] tracking-tight">
                  {user.shop_name || user.full_name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Verified Shop Account
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Contact Person: <strong className="text-slate-800">{user.full_name}</strong>
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 pt-1">
                {user.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-[#25D366]" />
                    {user.phone}
                  </span>
                )}
                {user.address && (
                  <span className="flex items-center gap-1 text-slate-500">
                    <MapPin className="w-3.5 h-3.5 text-[#dc2626]" />
                    {user.address} {user.city ? `, ${user.city}` : ""}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-center">
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-transparent transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Orders & Cargo Tracking Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-black text-[#111827] tracking-tight flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#dc2626]" />
              <span>My Orders & Cargo Tracking</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live status, Bilty numbers, and printable thermal bills for all your wholesale orders.
            </p>
          </div>

          {/* Paper Size selector */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold self-start sm:self-center shadow-2xs">
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-500 text-[11px]">Printer Roll:</span>
            <select
              value={paperWidth}
              onChange={(e) => setPaperWidth(Number(e.target.value) as ThermalPaperWidth)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 font-bold text-xs text-slate-800 focus:outline-none"
            >
              <option value={68}>68mm (Your Printer)</option>
              <option value={58}>58mm</option>
              <option value={80}>80mm</option>
            </select>
          </div>
        </div>

        {/* Orders List */}
        {orders.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4 shadow-xs">
            <div className="w-16 h-16 rounded-full bg-slate-50 text-slate-300 flex items-center justify-center mx-auto border-2 border-dashed border-slate-200">
              <Package className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#111827]">No Orders Placed Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Once you place an order via the Shopping Cart, your tracking status and cargo bilty numbers will appear here.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs font-bold shadow-xs transition-colors"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Browse Spare Parts Catalog</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const isDispatched = order.status === "dispatched";
              const dateDisplay = new Date(order.created_at).toLocaleString("en-PK", {
                dateStyle: "medium",
                timeStyle: "short",
              });

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-3xl border border-slate-200 shadow-xs hover:shadow-sm transition-shadow overflow-hidden"
                >
                  {/* Order Top Bar */}
                  <div className="p-4 sm:p-5 bg-slate-50/70 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-mono font-black text-sm text-slate-900 bg-white border border-slate-300 px-2.5 py-1 rounded-lg shadow-2xs">
                        #{order.order_number}
                      </span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {dateDisplay}
                      </span>

                      {/* Status Badge */}
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full border flex items-center gap-1 ${
                          order.status === "completed"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : order.status === "dispatched"
                            ? "bg-purple-50 text-purple-700 border-purple-200 animate-pulse"
                            : order.status === "confirmed"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {order.status === "completed" && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {order.status === "dispatched" && <Truck className="w-3.5 h-3.5" />}
                        {order.status === "confirmed" && <Check className="w-3.5 h-3.5" />}
                        {order.status === "pending" && <Clock className="w-3.5 h-3.5" />}
                        <span className="capitalize">{order.status}</span>
                      </span>
                    </div>

                    {/* Receipt Action Buttons */}
                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <button
                        type="button"
                        onClick={() => handlePrintSlip(order)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-colors shadow-2xs"
                        title="Print 80mm/68mm Thermal Slip"
                      >
                        <Printer className="w-3.5 h-3.5 text-slate-600" />
                        <span>Print Slip</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownloadJpeg(order)}
                        disabled={isGeneratingJpeg === order.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#dc2626] hover:bg-[#b91c1c] transition-colors shadow-2xs disabled:opacity-50"
                        title="Download Bill as JPEG image"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{isGeneratingJpeg === order.id ? "Saving..." : "Download JPEG"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Body: Live Cargo Tracking Box (When Dispatched) */}
                  <div className="p-4 sm:p-5 space-y-4">
                    {isDispatched && order.cargo_name && (
                      <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 border-2 border-purple-200 space-y-2.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                              <Truck className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-[11px] font-bold uppercase tracking-wider text-purple-600">
                                Dispatched via Cargo
                              </p>
                              <h4 className="text-base font-black text-slate-900">
                                {order.cargo_name}
                              </h4>
                            </div>
                          </div>

                          {order.dispatch_date && (
                            <span className="text-xs text-slate-500 font-medium">
                              Dispatched: {new Date(order.dispatch_date).toLocaleDateString("en-PK", { dateStyle: "medium" })}
                            </span>
                          )}
                        </div>

                        {/* Bilty Number & Copy Button */}
                        {order.tracking_number && (
                          <div className="p-3 bg-white rounded-xl border border-purple-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="space-y-0.5">
                              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                Bilty / Tracking Number
                              </span>
                              <p className="font-mono text-sm font-black text-purple-900 tracking-wide">
                                {order.tracking_number}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleCopyBilty(order.tracking_number!)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-100 hover:bg-purple-200 text-purple-800 transition-colors self-start sm:self-center"
                            >
                              {copiedBilty === order.tracking_number ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy Bilty #</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}

                        <p className="text-[11px] text-purple-700">
                          ℹ️ You can track or collect your cargo parcel from your local cargo office using this bilty number.
                        </p>
                      </div>
                    )}

                    {/* Items Table */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                        <span>Items in Order ({order.total_items})</span>
                        <span className="text-[#16a34a] font-bold text-sm">
                          Total: Rs. {order.total_amount.toLocaleString("en-PK")}
                        </span>
                      </div>

                      <div className="border border-slate-100 rounded-xl overflow-hidden">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-50/80 text-slate-400 font-bold border-b border-slate-100 text-[11px]">
                            <tr>
                              <th className="py-2 px-3">Item</th>
                              <th className="py-2 px-3 text-center">Qty</th>
                              <th className="py-2 px-3 text-right">Rate</th>
                              <th className="py-2 px-3 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {order.items.map((it, idx) => (
                              <tr key={idx}>
                                <td className="py-2 px-3">
                                  <span className="font-semibold text-slate-800">{it.name}</span>
                                  {it.sku && (
                                    <span className="block text-[10px] text-slate-400 font-mono">
                                      SKU: {it.sku}
                                    </span>
                                  )}
                                </td>
                                <td className="py-2 px-3 text-center font-bold text-slate-700">
                                  {it.quantity}x
                                </td>
                                <td className="py-2 px-3 text-right text-slate-500">
                                  Rs. {it.price.toLocaleString("en-PK")}
                                </td>
                                <td className="py-2 px-3 text-right font-bold text-slate-900">
                                  Rs. {(it.price * it.quantity).toLocaleString("en-PK")}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* WhatsApp Inquire Link */}
                    <div className="flex items-center justify-between pt-1 text-xs">
                      <span className="text-slate-400 text-[11px]">
                        Need help with this order?
                      </span>
                      <a
                        href={`https://wa.me/923458032600?text=${encodeURIComponent(
                          `Assalam o Alaikum! I need an update on my Order #${order.order_number}.`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-bold text-[#25D366] hover:underline"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                        <span>WhatsApp Zubair Mobile</span>
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
