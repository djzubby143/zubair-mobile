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
  Printer,
  Download,
  Receipt,
  FileDown,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/lib/auth";
import { Order, saveOrder } from "@/lib/orders";
import { generateReceiptJpeg, printThermalReceipt, ThermalPaperWidth } from "@/lib/receiptGenerator";

export default function CartPage() {
  const {
    items,
    cartCount,
    cartSubtotal,
    deliveryCharges,
    cartTotal,
    appliedCoupon,
    discountAmount,
    couponError,
    applyCoupon,
    removeCoupon,
    updateQuantity,
    removeFromCart,
    clearCart,
    isLoaded,
  } = useCart();
  const { isLoggedIn, user } = useAuth();

  const [couponCodeInput, setCouponCodeInput] = useState("");

  // Customer Checkout Form State
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  // Order Receipt & Bill States
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [showBillModal, setShowBillModal] = useState(false);
  const [isGeneratingJpeg, setIsGeneratingJpeg] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [whatsappUrl, setWhatsappUrl] = useState("");
  const [paperWidth, setPaperWidth] = useState<ThermalPaperWidth>(68);

  useEffect(() => {
    if (user) {
      if (user.full_name && !customerName) setCustomerName(user.full_name);
      if (user.phone && !customerPhone) setCustomerPhone(user.phone);
      if (user.address && !customerAddress) {
        setCustomerAddress(`${user.address}${user.city ? `, ${user.city}` : ""}`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleWhatsAppCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPlacingOrder) return;

    // Validation
    const errors: { [key: string]: string } = {};
    if (!customerName.trim()) {
      errors.name = "Please enter your full name.";
    }
    if (!customerPhone.trim()) {
      errors.phone = "Please enter your WhatsApp or phone number.";
    }
    // Stock availability & MOQ validation
    for (const item of items) {
      if (item.min_order_quantity && item.min_order_quantity > 1 && item.quantity < item.min_order_quantity) {
        errors.stock = `"${item.name}" requires minimum order quantity of ${item.min_order_quantity} pcs.`;
        setFormErrors(errors);
        return;
      }
      if (item.stock_quantity !== undefined && item.stock_quantity !== null && item.stock_quantity > 0 && item.quantity > item.stock_quantity) {
        errors.stock = `Quantity for "${item.name}" exceeds available stock (${item.stock_quantity} available). Please adjust quantity.`;
        setFormErrors(errors);
        return;
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});

    // Generate Order Number
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const orderNumber = `ZB-${randomSuffix}`;

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      order_number: orderNumber,
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim(),
      customer_address: customerAddress.trim(),
      shop_name: user?.shop_name || undefined,
      order_notes: orderNotes.trim() || undefined,
      items: items.map((i) => ({
        id: i.id,
        name: i.name,
        price: i.price,
        purchase_price: user?.role === "admin" ? (i.purchase_price ?? undefined) : undefined,
        quantity: i.quantity,
        sku: i.sku,
      })),
      total_items: cartCount,
      total_amount: cartTotal,
      delivery_charges: deliveryCharges,
      status: "pending",
      created_at: new Date().toISOString(),
      customer_id: user?.id || user?.username || user?.phone || undefined,
    };

    try {
      setIsPlacingOrder(true);
      // Save order
      await saveOrder(newOrder);

      // Construct WhatsApp message
      const formattedSubtotal = cartSubtotal.toLocaleString("en-PK");
      const formattedTotal = cartTotal.toLocaleString("en-PK");
      const deliveryFeeLabel = deliveryCharges === 0 ? "FREE (Cargo Delivery)" : `Rs. ${deliveryCharges}`;
      const rateTierLabel =
        user?.role === "admin"
          ? "Admin (تمام ریٹ)"
          : user?.pricing_tier === "technician"
          ? "Technician (ٹیکنیشن ریٹ)"
          : user?.pricing_tier === "wholesale"
          ? "Wholesale (ہول سیل ریٹ)"
          : "Retail / Customer (پرچون ریٹ)";
      const itemsManifest = items
        .map((item) => {
          const lineTotal = (item.price * item.quantity).toLocaleString("en-PK");
          const skuPart = item.sku ? ` (SKU: ${item.sku})` : "";
          return `${item.quantity}x ${item.name}${skuPart} - Rs. ${lineTotal}`;
        })
        .join("\n");

      const messageLines = [
        `Assalam o Alaikum Zubair Mobile! I placed Order #${orderNumber}:`,
        "------------------------------",
        itemsManifest,
        "------------------------------",
        `Total Items: ${cartCount}`,
        `Items Subtotal: Rs. ${formattedSubtotal}`,
        `Delivery Charges: ${deliveryFeeLabel}`,
        `Grand Total: Rs. ${formattedTotal}`,
        "",
        "Customer Details:",
        `Name: ${customerName.trim()}`,
        `Phone: ${customerPhone.trim()}`,
        `Address / City: ${customerAddress.trim()}`,
        `Rate Applied: ${rateTierLabel}`,
      ];

      if (orderNotes.trim()) {
        messageLines.push(`Notes: ${orderNotes.trim()}`);
      }

      messageLines.push("------------------------------");
      messageLines.push("Please confirm my order and cargo dispatch.");

      const rawMessage = messageLines.join("\n");
      const encodedMessage = encodeURIComponent(rawMessage);
      const waLink = `https://wa.me/923458032600?text=${encodedMessage}`;

      setWhatsappUrl(waLink);
      setPlacedOrder(newOrder);
      setShowBillModal(true);

      // Auto-download bill JPEG for convenience
      generateReceiptJpeg(newOrder, paperWidth).catch((err) => console.warn("Auto-download JPEG:", err));

      // Open WhatsApp
      window.open(waLink, "_blank", "noopener,noreferrer");
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handleDownloadJpeg = async () => {
    if (!placedOrder) return;
    setIsGeneratingJpeg(true);
    try {
      await generateReceiptJpeg(placedOrder, paperWidth);
    } catch (err) {
      console.error("Failed to generate receipt JPEG:", err);
      alert("Failed to download bill image.");
    } finally {
      setIsGeneratingJpeg(false);
    }
  };

  const handlePrintSlip = () => {
    if (!placedOrder) return;
    printThermalReceipt(placedOrder, paperWidth);
  };

  const handleCloseModal = () => {
    setShowBillModal(false);
    clearCart();
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
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#111827]">Login Required to View Rates & Checkout</h4>
              <p className="text-xs text-slate-600">
                مخصوص ٹیکنیشن یا ہول سیل ریٹس دیکھنے اور آرڈر کنفرم کرنے کیلئے لاگ ان کریں۔
              </p>
            </div>
          </div>
          <Link
            href="/login"
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors shrink-0 text-center"
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
                          {item.min_order_quantity && item.min_order_quantity > 1 && (
                            <span className="inline-flex items-center text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded w-fit">
                              Min Order: {item.min_order_quantity} Pcs (کم از کم {item.min_order_quantity} پیس)
                            </span>
                          )}
                          <div className="sm:hidden text-xs font-bold text-[#16a34a] flex flex-wrap items-center gap-1.5">
                            <span>Rs. {item.price.toLocaleString("en-PK")} each</span>
                            {item.pricing_tier === "technician" ? (
                              <span className="text-[9px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                ٹیکنیشن ریٹ
                              </span>
                            ) : item.pricing_tier === "wholesale" ? (
                              <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                ہول سیل ریٹ
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                پرچون ریٹ
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Unit Price (Col 2 - Desktop) */}
                      <div className="hidden sm:block sm:col-span-2 text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-xs font-bold text-slate-700">
                            Rs. {item.price.toLocaleString("en-PK")}
                          </span>
                          {item.pricing_tier === "technician" ? (
                            <span className="text-[9px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 mt-0.5">
                              ٹیکنیشن ریٹ
                            </span>
                          ) : item.pricing_tier === "wholesale" ? (
                            <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 mt-0.5">
                              ہول سیل ریٹ
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 mt-0.5">
                              پرچون ریٹ
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quantity Controls (Col 2) */}
                      <div className="w-full sm:w-auto sm:col-span-2 flex items-center justify-between sm:justify-center gap-3">
                        <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                          {(() => {
                            const itemMoq = item.min_order_quantity && item.min_order_quantity > 0 ? item.min_order_quantity : 1;
                            const isAtMoq = item.quantity <= itemMoq;
                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  if (isAtMoq) {
                                    removeFromCart(item.id);
                                  } else {
                                    updateQuantity(item.id, item.quantity - 1);
                                  }
                                }}
                                className={`p-1.5 sm:p-2 transition-colors cursor-pointer ${
                                  isAtMoq
                                    ? "text-rose-500 hover:bg-rose-50"
                                    : "text-slate-500 hover:text-[#111827] hover:bg-slate-100"
                                }`}
                                title={isAtMoq ? `Remove from cart (Minimum order is ${itemMoq})` : "Decrease quantity"}
                                aria-label="Decrease quantity"
                              >
                                {isAtMoq ? (
                                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                ) : (
                                  <Minus className="w-3.5 h-3.5" />
                                )}
                              </button>
                            );
                          })()}
                          <span className="px-2.5 sm:px-3 text-xs font-bold text-[#111827] min-w-[2rem] text-center font-mono">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            disabled={item.quantity >= maxStock}
                            className="p-1.5 sm:p-2 text-slate-500 hover:text-[#111827] hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
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
                          <span className="text-xs sm:text-sm font-bold text-[#16a34a]">
                            Rs. {lineTotal.toLocaleString("en-PK")}
                          </span>
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
                  <span className="font-bold text-[#111827]">
                    Rs. {cartSubtotal.toLocaleString("en-PK")}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <span>Cargo / Courier Fee:</span>
                  <span className={`font-bold ${deliveryCharges === 0 ? "text-emerald-600" : "text-slate-800"}`}>
                    {deliveryCharges === 0 ? "FREE (Rs. 5000+)" : `Rs. ${deliveryCharges}`}
                  </span>
                </div>

                {/* Coupon Code Voucher Entry */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Discount Voucher</span>
                    {appliedCoupon && (
                      <button
                        type="button"
                        onClick={removeCoupon}
                        className="text-[11px] text-rose-600 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {appliedCoupon ? (
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                        <span className="font-mono bg-white px-2 py-0.5 rounded border border-emerald-300">
                          {appliedCoupon.code}
                        </span>
                        <span>
                          ({appliedCoupon.discount_type === "percentage" ? `${appliedCoupon.discount_value}% OFF` : `Rs. ${appliedCoupon.discount_value} OFF`})
                        </span>
                      </div>
                      <span className="font-extrabold text-emerald-700">
                        -Rs. {discountAmount.toLocaleString("en-PK")}
                      </span>
                    </div>
                  ) : (
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="Coupon code (e.g. WELCOME500)"
                        value={couponCodeInput}
                        onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                        className="flex-1 text-xs font-mono font-bold uppercase p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-secondary"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (couponCodeInput.trim()) {
                            applyCoupon(couponCodeInput.trim());
                            setCouponCodeInput("");
                          }
                        }}
                        className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        Apply
                      </button>
                    </div>
                  )}

                  {couponError && (
                    <p className="text-[11px] font-semibold text-rose-600">{couponError}</p>
                  )}
                </div>

                {discountAmount > 0 && (
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-600 pt-1">
                    <span>Coupon Savings:</span>
                    <span>-Rs. {discountAmount.toLocaleString("en-PK")}</span>
                  </div>
                )}

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1 text-xs text-slate-500">
                  <p className="font-semibold text-[#111827]">Delivery Dispatch:</p>
                  <p>
                    All Pakistan Cargo (Daewoo, TCS, Leopard, Bilal Cargo) or Direct Shop Pickup
                    at Chand Plaza, Gujranwala.
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-baseline justify-between">
                  <span className="text-sm font-extrabold text-[#111827]">Grand Total:</span>
                  <span className="text-2xl font-black text-[#16a34a]">
                    Rs. {cartTotal.toLocaleString("en-PK")}
                  </span>
                </div>
              </div>
            </div>

            {/* Direct WhatsApp Checkout Form */}
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

              {!isLoggedIn ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    <span>موبائل دکاندار یا ٹیکنیشن ہیں؟ ہول سیل یا ٹیکنیشن ریٹ کیلئے</span>
                  </div>
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center gap-1 px-2.5 py-1 bg-[#dc2626] hover:bg-[#b91c1c] text-white text-[11px] font-bold rounded-lg transition-colors shrink-0"
                  >
                    لاگ ان کریں
                  </Link>
                </div>
              ) : (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between">
                  <span className="text-slate-600">
                    Logged in as: <strong className="text-slate-900">{user?.full_name || user?.username}</strong>
                  </span>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    {user?.role === "admin"
                      ? "Admin"
                      : user?.pricing_tier === "technician"
                      ? "ٹیکنیشن ریٹ"
                      : "ہول سیل ریٹ"}
                  </span>
                </div>
              )}

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
                    disabled={isPlacingOrder}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <PhoneCall className={`w-4 h-4 ${isPlacingOrder ? "animate-pulse" : ""}`} />
                    <span>{isPlacingOrder ? "Placing Order..." : "Send Order via WhatsApp"}</span>
                  </button>
                  <p className="text-[10px] text-slate-400 text-center mt-2">
                    Clicking will open WhatsApp with your itemized bill pre-filled.
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Order Placed & Thermal Bill Modal */}
      {showBillModal && placedOrder && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8 animate-in fade-in zoom-in duration-200">
            {/* Header / Success Indicator */}
            <div className="text-center space-y-1">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2 shadow-xs">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-black text-[#111827] tracking-tight">
                Order Placed Successfully!
              </h3>
              <p className="text-xs text-slate-500">
                A high-resolution thermal bill has been generated for your order.
              </p>
            </div>

            {/* Thermal POS Receipt Preview Card */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-dashed border-slate-300 font-mono text-[11px] text-slate-800 space-y-2.5 shadow-inner">
              {/* Receipt Header with Logo */}
              <div className="text-center space-y-0.5 pb-1 border-b border-dashed border-slate-300">
                <img
                  src="/logo.jpg"
                  alt="Zubair Mobile"
                  className="w-12 h-12 object-contain mx-auto rounded bg-black border border-red-500/20"
                />
                <p className="font-black text-sm tracking-tight text-slate-900 mt-1">ZUBAIR MOBILE</p>
                <p className="text-[10px] font-bold text-slate-600">REPAIR SERVICES & SPARE PARTS</p>
                <p className="text-[9px] text-slate-500">Shop B16, Chand Plaza, Garjakhi Darwaza, Gujranwala</p>
                <p className="font-bold text-[10px] text-[#dc2626]">WhatsApp: 0345-8032600</p>
              </div>

              {/* Order Info */}
              <div className="text-[10.5px] space-y-0.5">
                <div className="flex justify-between font-bold">
                  <span>ORDER: #{placedOrder.order_number}</span>
                  <span className="font-normal text-slate-500">
                    {new Date(placedOrder.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <div>CUSTOMER: {placedOrder.customer_name}</div>
                <div>PHONE: {placedOrder.customer_phone}</div>
                <div className="truncate">ADDRESS: {placedOrder.customer_address}</div>
              </div>

              {/* Items Table */}
              <div className="border-t border-b border-dashed border-slate-300 py-1.5 space-y-1">
                <div className="flex justify-between font-bold text-[10px] text-slate-500 uppercase">
                  <span>Item</span>
                  <span>Amount</span>
                </div>
                {placedOrder.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between items-start text-[10.5px]">
                    <span className="truncate max-w-[210px]">
                      {it.quantity}x {it.name}
                    </span>
                    <span className="font-bold shrink-0">
                      Rs. {(it.price * it.quantity).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              {/* Grand Total */}
              <div className="flex justify-between items-baseline font-black text-xs pt-1">
                <span>GRAND TOTAL:</span>
                <span className="text-sm text-[#16a34a]">
                  Rs. {placedOrder.total_amount.toLocaleString()}
                </span>
              </div>

              <p className="text-center text-[9px] text-slate-400 pt-1">
                *** Tested Spare Parts • Shukriya ***
              </p>
            </div>

            {/* Paper Size Selector */}
            <div className="flex items-center justify-between bg-slate-100 px-3 py-2 rounded-xl text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span>Printer Roll:</span>
              </span>
              <select
                value={paperWidth}
                onChange={(e) => setPaperWidth(Number(e.target.value) as ThermalPaperWidth)}
                className="bg-white border border-slate-300 rounded-lg px-2 py-1 font-bold text-xs text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value={68}>68mm (Default / Your Printer)</option>
                <option value={58}>58mm (Small 2-inch)</option>
                <option value={80}>80mm (Wide 3-inch)</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              {/* Download JPEG Bill Button */}
              <button
                type="button"
                onClick={handleDownloadJpeg}
                disabled={isGeneratingJpeg}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-[#dc2626] hover:bg-[#b91c1c] text-white shadow-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{isGeneratingJpeg ? "Generating Image..." : `Download Bill (JPEG - ${paperWidth}mm)`}</span>
              </button>

              {/* Print Thermal Slip Button */}
              <button
                type="button"
                onClick={handlePrintSlip}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-slate-900 hover:bg-black text-white shadow-xs flex items-center justify-center gap-2 transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>Print Thermal Slip ({paperWidth}mm)</span>
              </button>

              {/* WhatsApp Confirmation Button */}
              <button
                type="button"
                onClick={() => window.open(whatsappUrl, "_blank", "noopener,noreferrer")}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-xs flex items-center justify-center gap-2 transition-all"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Send via WhatsApp (0345-8032600)</span>
              </button>

              {/* Dismiss / Continue Shopping */}
              <button
                type="button"
                onClick={handleCloseModal}
                className="w-full py-2 text-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors pt-1"
              >
                Done & Clear Cart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
