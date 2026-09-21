"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
  Package,
  ShieldCheck,
  Truck,
  PhoneCall,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Lock,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/lib/auth";

export default function CartPage() {
  const { items, cartCount, cartSubtotal, updateQuantity, removeFromCart, clearCart, isLoaded } =
    useCart();
  const { isLoggedIn, user } = useAuth();

  // Customer Checkout Form State
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (user) {
      if (user.full_name && !customerName) setCustomerName(user.full_name);
      if (user.phone && !customerPhone) setCustomerPhone(user.phone);
      if (user.address && !customerAddress) {
        setCustomerAddress(`${user.address}${user.city ? `, ${user.city}` : ""}`);
      }
    }
  }, [user]);

  const handleWhatsAppCheckout = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLoggedIn) return;

    // Validation
    const errors: { [key: string]: string } = {};
    if (!customerName.trim()) {
      errors.name = "Please enter your full name.";
    }
    if (!customerPhone.trim()) {
      errors.phone = "Please enter your WhatsApp or phone number.";
    }
    if (!customerAddress.trim()) {
      errors.address = "Please enter your delivery city and shop/home address.";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});

    // Construct WhatsApp message
    const formattedSubtotal = cartSubtotal.toLocaleString("en-PK");
    const itemsManifest = items
      .map((item) => {
        const lineTotal = (item.price * item.quantity).toLocaleString("en-PK");
        const skuPart = item.sku ? ` (SKU: ${item.sku})` : "";
        return `${item.quantity}x ${item.name}${skuPart} - Rs. ${lineTotal}`;
      })
      .join("\n");

    const messageLines = [
      "Assalam o Alaikum Zubair Mobile! I want to place an order:",
      "------------------------------",
      itemsManifest,
      "------------------------------",
      `Total Items: ${cartCount}`,
      `Total Amount: Rs. ${formattedSubtotal}`,
      "",
      "Customer Details:",
      `Name: ${customerName.trim()}`,
      `Phone: ${customerPhone.trim()}`,
      `Address / City: ${customerAddress.trim()}`,
    ];

    if (orderNotes.trim()) {
      messageLines.push(`Notes: ${orderNotes.trim()}`);
    }

    messageLines.push("------------------------------");
    messageLines.push("Please confirm my order and share cargo / payment details.");

    const rawMessage = messageLines.join("\n");
    const encodedMessage = encodeURIComponent(rawMessage);
    const whatsappUrl = `https://wa.me/923458032600?text=${encodedMessage}`;

    // Open WhatsApp
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  if (!isLoaded) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="w-12 h-12 border-4 border-[#dc2626] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm font-semibold text-slate-500">Loading your shopping cart...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-[#dc2626] transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Continue Shopping</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-[#111827] tracking-tight flex items-center gap-3">
            <span>Shopping Cart</span>
            {cartCount > 0 && (
              <span className="bg-red-50 text-[#dc2626] text-xs sm:text-sm font-bold px-3 py-1 rounded-full border border-red-100">
                {cartCount} {cartCount === 1 ? "Item" : "Items"}
              </span>
            )}
          </h1>
        </div>

        {items.length > 0 && (
          <button
            type="button"
            onClick={clearCart}
            className="inline-flex items-center gap-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-2 rounded-lg transition-colors border border-rose-200/60 self-start sm:self-center"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear Entire Cart</span>
          </button>
        )}
      </div>

      {/* Guest Login Alert Banner if not logged in */}
      {!isLoggedIn && items.length > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#dc2626] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#111827]">Login Required to View Prices & Checkout</h4>
              <p className="text-xs text-slate-600">
                Wholesale prices and cargo dispatch are reserved for verified mobile repair shops.
              </p>
            </div>
          </div>
          <Link
            href="/login"
            className="px-4 py-2 bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs font-bold rounded-lg shadow-2xs transition-colors shrink-0 text-center"
          >
            Login to View Rates
          </Link>
        </div>
      )}

      {items.length === 0 ? (
        /* Empty Cart State */
        <div className="bg-white rounded-2xl border border-slate-200 p-12 sm:p-16 text-center max-w-lg mx-auto shadow-xs space-y-6">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300 border-2 border-dashed border-slate-200">
            <ShoppingCart className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-[#111827] tracking-tight">Your Cart is Empty</h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-sm mx-auto">
              You haven&apos;t added any mobile spare parts or LCD units to your cart yet.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#dc2626] hover:bg-[#b91c1c] text-white text-sm font-bold shadow-md transition-all hover:scale-105"
            >
              <Package className="w-4 h-4" />
              <span>Browse Parts Catalog</span>
            </Link>
          </div>
        </div>
      ) : (
        /* Main Cart Layout (Items List + Order Summary / Checkout) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Cart Items List (8 Cols) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="hidden sm:grid grid-cols-12 gap-4 p-4 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 bg-slate-50/60">
                <span className="col-span-6">Product Details</span>
                <span className="col-span-2 text-center">Unit Price</span>
                <span className="col-span-2 text-center">Quantity</span>
                <span className="col-span-2 text-right">Subtotal</span>
              </div>

              {/* Items List */}
              <div className="divide-y divide-slate-100">
                {items.map((item) => {
                  const lineTotal = item.price * item.quantity;
                  const maxStock = item.stock_quantity ?? 99;

                  return (
                    <div
                      key={item.id}
                      className="p-4 sm:p-5 flex flex-col sm:grid sm:grid-cols-12 gap-4 items-center hover:bg-slate-50/50 transition-colors"
                    >
                      {/* Product Details (Col 6) */}
                      <div className="w-full sm:col-span-6 flex items-center gap-3.5">
                        {/* Square Thumbnail */}
                        <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-center p-2 relative overflow-hidden">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <Package className="w-8 h-8 text-slate-400" />
                          )}
                        </div>

                        {/* Title & SKU */}
                        <div className="min-w-0 flex-1 space-y-1">
                          <h3 className="text-xs sm:text-sm font-bold text-[#111827] line-clamp-2 leading-snug">
                            {item.name}
                          </h3>
                          {item.sku && (
                            <p className="text-[11px] font-mono text-slate-400">
                              SKU: {item.sku}
                            </p>
                          )}
                          <div className="sm:hidden text-xs font-bold text-[#16a34a]">
                            {isLoggedIn ? (
                              `Rs. ${item.price.toLocaleString("en-PK")} each`
                            ) : (
                              <span className="text-[#dc2626] flex items-center gap-1">
                                <Lock className="w-3 h-3" /> Login for Price
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Unit Price (Col 2 - Desktop) */}
                      <div className="hidden sm:block sm:col-span-2 text-center">
                        {isLoggedIn ? (
                          <span className="text-xs font-bold text-slate-700">
                            Rs. {item.price.toLocaleString("en-PK")}
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-[#dc2626] bg-red-50 px-2 py-0.5 rounded border border-red-100">
                            Login for Price
                          </span>
                        )}
                      </div>

                      {/* Quantity Controls (Col 2) */}
                      <div className="w-full sm:w-auto sm:col-span-2 flex items-center justify-between sm:justify-center gap-3">
                        <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="p-1.5 sm:p-2 text-slate-500 hover:text-[#111827] hover:bg-slate-100 transition-colors"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-2.5 sm:px-3 text-xs font-bold text-[#111827] min-w-[2rem] text-center">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            disabled={item.quantity >= maxStock}
                            className="p-1.5 sm:p-2 text-slate-500 hover:text-[#111827] hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Mobile Delete */}
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                          className="sm:hidden p-2 text-slate-400 hover:text-rose-600 rounded-lg"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Line Subtotal & Desktop Delete (Col 2) */}
                      <div className="w-full sm:w-auto sm:col-span-2 flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                        <div className="text-right">
                          <span className="sm:hidden text-xs text-slate-400 mr-2">
                            Total:
                          </span>
                          {isLoggedIn ? (
                            <span className="text-xs sm:text-sm font-bold text-[#16a34a]">
                              Rs. {lineTotal.toLocaleString("en-PK")}
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold text-[#dc2626]">
                              Hidden
                            </span>
                          )}
                        </div>

                        {/* Desktop Delete */}
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                          className="hidden sm:inline-flex p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Remove item from cart"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Gujranwala Store Trust Banner */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-2 text-slate-700 font-medium">
                <ShieldCheck className="w-4 h-4 text-[#dc2626] shrink-0" />
                <span>All screens, flex cables, and ICs tested prior to dispatch.</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#dc2626] shrink-0" />
                <span>Same-day cargo dispatch across Pakistan.</span>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary & WhatsApp Checkout (4 Cols) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Order Summary Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
              <h2 className="text-base font-bold text-[#111827] uppercase tracking-wider pb-3 border-b border-slate-100 flex items-center justify-between">
                <span>Order Summary</span>
                <span className="text-xs bg-slate-100 text-slate-700 font-semibold px-2.5 py-0.5 rounded-full">
                  {cartCount} Items
                </span>
              </h2>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Items Subtotal</span>
                  {isLoggedIn ? (
                    <span className="font-bold text-[#111827]">
                      Rs. {cartSubtotal.toLocaleString("en-PK")}
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-[#dc2626] flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Login for Price
                    </span>
                  )}
                </div>

                <div className="flex items-start justify-between text-xs text-slate-500 pt-1">
                  <span>Cargo / Courier Delivery:</span>
                  <span className="text-right font-medium text-slate-700 max-w-[170px]">
                    Calculated by weight & city (Pay upon arrival)
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1 text-xs text-slate-500">
                  <p className="font-semibold text-[#111827]">Delivery Dispatch:</p>
                  <p>
                    All Pakistan Cargo (Daewoo, TCS, Leopard, Asia Cargo) or Direct Shop Pickup
                    at Chand Plaza, Gujranwala.
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-baseline justify-between">
                  <span className="text-sm font-extrabold text-[#111827]">Total Payable:</span>
                  {isLoggedIn ? (
                    <span className="text-2xl font-black text-[#16a34a]">
                      Rs. {cartSubtotal.toLocaleString("en-PK")}
                    </span>
                  ) : (
                    <span className="text-sm font-bold text-[#dc2626] flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5" /> Login for Rate
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Direct WhatsApp Checkout Form or Login Prompt */}
            {isLoggedIn ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[#25D366]">
                    <PhoneCall className="w-5 h-5" />
                    <h3 className="font-black text-sm uppercase tracking-wider text-[#111827]">
                      WhatsApp Direct Checkout
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500">
                    Enter your details to generate an instant WhatsApp order receipt and confirm
                    dispatch.
                  </p>
                </div>

                <form onSubmit={handleWhatsAppCheckout} className="space-y-3.5 text-xs">
                  {/* Full Name */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 flex items-center justify-between">
                      <span>Full Name *</span>
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Muhammad Zubair"
                      className={`w-full px-3.5 py-2.5 rounded-lg border text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#25D366] transition-all ${
                        formErrors.name
                          ? "border-rose-300 bg-rose-50/30"
                          : "border-slate-200 bg-white"
                      }`}
                    />
                    {formErrors.name && (
                      <p className="text-[11px] text-rose-600 font-medium">{formErrors.name}</p>
                    )}
                  </div>

                  {/* Phone */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 flex items-center justify-between">
                      <span>WhatsApp Number *</span>
                    </label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="03001234567"
                      className={`w-full px-3.5 py-2.5 rounded-lg border text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#25D366] transition-all ${
                        formErrors.phone
                          ? "border-rose-300 bg-rose-50/30"
                          : "border-slate-200 bg-white"
                      }`}
                    />
                    {formErrors.phone && (
                      <p className="text-[11px] text-rose-600 font-medium">{formErrors.phone}</p>
                    )}
                  </div>

                  {/* Address */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 flex items-center justify-between">
                      <span>Delivery Address & City *</span>
                    </label>
                    <textarea
                      rows={2}
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="Shop name, Market, City (e.g. Shop 4, Mobile Market, Gujranwala)"
                      className={`w-full px-3.5 py-2.5 rounded-lg border text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#25D366] transition-all ${
                        formErrors.address
                          ? "border-rose-300 bg-rose-50/30"
                          : "border-slate-200 bg-white"
                      }`}
                    />
                    {formErrors.address && (
                      <p className="text-[11px] text-rose-600 font-medium">{formErrors.address}</p>
                    )}
                  </div>

                  {/* Order Notes */}
                  <div className="space-y-1">
                    <label className="font-medium text-slate-500">Order Notes (Optional)</label>
                    <input
                      type="text"
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      placeholder="e.g. Urgent Daewoo cargo please"
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#25D366]"
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-md hover:shadow-lg transition-all"
                    >
                      <PhoneCall className="w-4 h-4" />
                      <span>Send Order via WhatsApp</span>
                    </button>
                    <p className="text-[10px] text-slate-400 text-center mt-2">
                      Clicking will open WhatsApp with your itemized bill pre-filled.
                    </p>
                  </div>
                </form>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 text-center">
                <div className="w-12 h-12 rounded-full bg-red-100 text-[#dc2626] flex items-center justify-center mx-auto">
                  <Lock className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-black text-sm uppercase text-[#111827]">
                    Customer Login Required
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Please log into your registered shop account to unlock wholesale rates and submit your order.
                  </p>
                </div>
                <div className="pt-2 space-y-2">
                  <Link
                    href="/login"
                    className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm bg-[#dc2626] hover:bg-[#b91c1c] text-white shadow-xs transition-all"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Login to Place Order</span>
                  </Link>
                  <p className="text-[11px] text-slate-400">
                    New customer? WhatsApp{" "}
                    <a
                      href="https://wa.me/923458032600"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#25D366] font-bold hover:underline"
                    >
                      03458032600
                    </a>{" "}
                    for registration.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
