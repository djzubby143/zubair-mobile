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
  Bell,
  Edit2,
  Save,
  X,
  Camera,
  UploadCloud,
} from "lucide-react";
import { useAuth, updateCustomerProfile } from "@/lib/auth";
import { Order, getCustomerOrders, getCustomerNotifications, OrderNotification } from "@/lib/orders";
import { generateReceiptJpeg, printThermalReceipt, ThermalPaperWidth } from "@/lib/receiptGenerator";
import { uploadAvatarImage } from "@/lib/storage";

export default function ProfilePage() {
  const router = useRouter();
  const { isLoggedIn, user, loading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<OrderNotification[]>([]);
  const [paperWidth, setPaperWidth] = useState<ThermalPaperWidth>(68);
  const [copiedBilty, setCopiedBilty] = useState<string | null>(null);
  const [isGeneratingJpeg, setIsGeneratingJpeg] = useState<string | null>(null);

  // Profile Edit State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [editShopName, setEditShopName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [editSuccessMsg, setEditSuccessMsg] = useState<string | null>(null);
  const [editErrorMsg, setEditErrorMsg] = useState<string | null>(null);

  const loadUserData = () => {
    if (!user) return;
    const userOrders = getCustomerOrders({
      customerId: user.id || user.username,
      phone: user.phone,
      username: user.username,
      fullName: user.full_name,
    });
    setOrders(userOrders);

    const notifs = getCustomerNotifications({
      customerId: user.id || user.username,
      phone: user.phone,
    });
    setNotifications(notifs);
  };

  const handleOpenEdit = () => {
    if (!user) return;
    setEditFullName(user.full_name || "");
    setEditShopName(user.shop_name || "");
    setEditPhone(user.phone || "");
    setEditCity(user.city || "");
    setEditAddress(user.address || "");
    setAvatarFile(null);
    setAvatarPreview(user.avatar_url || null);
    setEditErrorMsg(null);
    setEditSuccessMsg(null);
    setShowEditModal(true);
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setEditErrorMsg("Please select a valid image file (JPG, PNG, or WEBP).");
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      setEditErrorMsg("Image size exceeds 4MB limit.");
      return;
    }

    setAvatarFile(file);
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
    setEditErrorMsg(null);
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditErrorMsg(null);

    if (!editPhone.trim()) {
      setEditErrorMsg("Please enter your primary WhatsApp / Phone number.");
      return;
    }
    if (!editAddress.trim()) {
      setEditErrorMsg("Please enter your delivery city and shop address.");
      return;
    }

    setIsSavingProfile(true);
    try {
      let finalAvatarUrl = avatarPreview;

      if (avatarFile) {
        const uploadRes = await uploadAvatarImage(avatarFile);
        if (uploadRes.url) {
          finalAvatarUrl = uploadRes.url;
        } else if (uploadRes.error) {
          console.warn("Avatar upload issue:", uploadRes.error);
        }
      }

      await updateCustomerProfile({
        full_name: editFullName.trim(),
        shop_name: editShopName.trim(),
        phone: editPhone.trim(),
        city: editCity.trim(),
        address: editAddress.trim(),
        avatar_url: finalAvatarUrl,
      });

      setEditSuccessMsg("Profile and photo updated successfully!");
      setTimeout(() => {
        setEditSuccessMsg(null);
        setShowEditModal(false);
      }, 1000);
      loadUserData();
    } catch (err) {
      console.error("Failed to update profile:", err);
      setEditErrorMsg("Failed to update profile. Please try again.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadUserData();
    }

    const handleUpdate = () => {
      if (user) loadUserData();
    };

    window.addEventListener("zubair_orders_updated", handleUpdate);
    window.addEventListener("zubair_notifications_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener("zubair_orders_updated", handleUpdate);
      window.removeEventListener("zubair_notifications_updated", handleUpdate);
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
            <div className="relative group shrink-0">
              <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-[#dc2626] text-white flex items-center justify-center font-black text-2xl sm:text-3xl shadow-md overflow-hidden border-2 border-white ring-2 ring-slate-200">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.full_name || "Profile"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  user.shop_name?.charAt(0) || user.full_name?.charAt(0) || "Z"
                )}
              </div>
              <button
                type="button"
                onClick={handleOpenEdit}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-slate-900 hover:bg-[#dc2626] text-white flex items-center justify-center shadow-md transition-colors cursor-pointer border-2 border-white"
                title="Upload / Change Profile Picture"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
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

          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-center">
            <button
              type="button"
              onClick={handleOpenEdit}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#dc2626] hover:bg-[#b91c1c] shadow-xs transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Profile & Address</span>
            </button>

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

      {/* Live Dispatched Cargo Notifications */}
      {notifications.length > 0 && (
        <div className="space-y-3">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className="p-4 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-200"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center font-bold shrink-0 text-white shadow-inner">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-white/25 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">
                      Order #{notif.order_number} Dispatched!
                    </span>
                    <span className="text-white/80 text-[11px]">
                      {new Date(notif.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-sm font-black mt-1">
                    Your parcel has been handed over to {notif.cargo_name}!
                  </h3>
                  <p className="text-xs text-purple-100 mt-0.5">
                    Tracking / Bilty ID:{" "}
                    <strong className="text-white font-mono bg-black/20 px-2 py-0.5 rounded border border-white/20">
                      {notif.tracking_number}
                    </strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center">
                <button
                  type="button"
                  onClick={() => handleCopyBilty(notif.tracking_number)}
                  className="px-3.5 py-2 rounded-xl bg-white text-purple-900 text-xs font-black hover:bg-purple-50 transition-colors shadow-2xs flex items-center gap-1.5"
                >
                  {copiedBilty === notif.tracking_number ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Bilty</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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

                    {/* Customer & Delivery Address for this order */}
                    {order.customer_address && (
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#dc2626] shrink-0" />
                          <span>Delivery Address: <strong className="text-slate-800">{order.customer_address}</strong></span>
                        </div>
                        {order.customer_phone && (
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>Contact: <strong className="text-slate-700">{order.customer_phone}</strong></span>
                          </div>
                        )}
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

      {/* Edit Profile & Delivery Details Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in duration-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-[#dc2626] flex items-center justify-center font-bold shadow-2xs">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    Edit Profile & Delivery Details
                  </h3>
                  <p className="text-xs text-slate-500">
                    Update your primary phone number, shop name, and delivery address.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center font-bold text-base"
              >
                ✕
              </button>
            </div>

            {/* Error / Success feedback */}
            {editErrorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{editErrorMsg}</span>
              </div>
            )}

            {editSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{editSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              {/* Profile Photo Upload Section */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-[#dc2626] text-white flex items-center justify-center font-black text-2xl shadow-xs overflow-hidden border-2 border-white ring-1 ring-slate-200 shrink-0">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    editShopName.charAt(0) || editFullName.charAt(0) || "Z"
                  )}
                </div>

                <div className="space-y-1 text-center sm:text-left flex-1">
                  <div className="flex items-center justify-center sm:justify-start gap-1.5">
                    <span className="font-bold text-slate-800 text-xs">Profile Picture</span>
                    <span className="text-[10px] text-slate-400 font-medium">پروفائل تصویر</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    JPG, PNG, or WEBP (Max 4MB).
                  </p>
                  <div className="flex items-center gap-2 pt-1 justify-center sm:justify-start">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-[#dc2626] text-slate-700 hover:text-[#dc2626] text-[11px] font-bold cursor-pointer transition-colors shadow-2xs">
                      <Camera className="w-3.5 h-3.5" />
                      <span>{avatarPreview ? "Change Photo" : "Upload Photo"}</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleAvatarSelect}
                        className="hidden"
                      />
                    </label>
                    {avatarPreview && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        className="text-[11px] text-rose-600 hover:underline font-semibold cursor-pointer"
                      >
                        Remove Photo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Full Name */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Contact Person / Full Name *</label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  placeholder="e.g. Muhammad Ali"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#dc2626] font-medium"
                />
              </div>

              {/* Shop Name */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Mobile Repair Shop Name</label>
                <input
                  type="text"
                  value={editShopName}
                  onChange={(e) => setEditShopName(e.target.value)}
                  placeholder="e.g. Ali Mobile Repairing Center"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#dc2626] font-medium"
                />
              </div>

              {/* Primary Mobile / WhatsApp Number */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700">Primary Mobile / WhatsApp Number *</label>
                  <span className="text-[10px] text-[#25D366] font-bold">پرائمری رابطہ نمبر</span>
                </div>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="03001234567"
                    required
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#dc2626] font-mono font-bold"
                  />
                </div>
                <p className="text-[10px] text-slate-400">
                  Used for cargo dispatch updates and order tracking.
                </p>
              </div>

              {/* City */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">City *</label>
                <input
                  type="text"
                  value={editCity}
                  onChange={(e) => setEditCity(e.target.value)}
                  placeholder="e.g. Gujranwala / Lahore / Faisalabad"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#dc2626] font-medium"
                />
              </div>

              {/* Complete Delivery Address */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700">Complete Shop / Delivery Address *</label>
                  <span className="text-[10px] text-[#dc2626] font-bold">کارگو ڈیلیوری ایڈریس</span>
                </div>
                <textarea
                  rows={3}
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="Shop #, Plaza name, Market or Street name, City..."
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#dc2626] font-medium leading-relaxed"
                />
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  disabled={isSavingProfile}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#dc2626] hover:bg-[#b91c1c] text-white font-bold text-xs shadow-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingProfile ? "Saving Details..." : "Save Profile Changes"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
