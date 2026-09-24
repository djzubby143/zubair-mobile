"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  X,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  Package,
  ShieldCheck,
  Truck,
  AlertCircle,
} from "lucide-react";
import { useCart } from "@/context/CartContext";

export default function CartDrawer() {
  const router = useRouter();
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
    isCartOpen,
    closeCart,
    updateQuantity,
    removeFromCart,
    isLoaded,
  } = useCart();

  const [couponCodeInput, setCouponCodeInput] = useState("");

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isCartOpen) {
        closeCart();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCartOpen, closeCart]);

  // Prevent background scrolling when cart drawer is open
  useEffect(() => {
    if (isCartOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isCartOpen]);

  if (!isLoaded) return null;

  const handleCheckoutClick = () => {
    closeCart();
    router.push("/cart");
  };

  return (
    <>
      {/* Backdrop Overlay */}
      <div
        onClick={closeCart}
        className={`fixed inset-0 bg-black/60 backdrop-blur-xs z-50 transition-opacity duration-300 ${
          isCartOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        aria-hidden="true"
      />

      {/* Slide-over Right Panel */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 w-full sm:w-[440px] bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out border-l border-slate-200 ${
          isCartOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping Cart Drawer"
      >
        {/* Drawer Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#dc2626] text-white flex items-center justify-center shadow-2xs">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-[#111827] tracking-tight">
                  Shopping Cart
                </h2>
                <span className="bg-red-100 text-[#dc2626] text-[11px] font-bold px-2 py-0.5 rounded-full border border-red-200">
                  {cartCount} {cartCount === 1 ? "Item" : "Items"}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Zubair Mobile Wholesale Hub
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeCart}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer"
            aria-label="Close cart drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free Dispatch / Shipping banner */}
        <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-2 flex items-center justify-between text-[11px] text-emerald-800 font-semibold shrink-0">
          <span className="flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-emerald-600" />
            Cargo Dispatch Across Pakistan
          </span>
          <span className="text-[10px] bg-emerald-200/80 text-emerald-900 px-1.5 py-0.5 rounded font-bold">
            Fast Bilty
          </span>
        </div>

        {/* Drawer Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 divide-y divide-slate-100">
          {items.length === 0 ? (
            /* Empty State */
            <div className="h-full flex flex-col items-center justify-center text-center py-12 px-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-50 text-[#dc2626] flex items-center justify-center border-2 border-dashed border-red-200">
                <ShoppingCart className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#111827]">
                  Your Cart is Empty
                </h3>
                <p className="text-xs text-slate-500 max-w-[240px]">
                  Aapka cart abhi khali hai. Apni pasandeeda spare parts cart me add karein.
                </p>
              </div>
              <button
                type="button"
                onClick={closeCart}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs font-bold shadow-md transition-all cursor-pointer"
              >
                <Package className="w-4 h-4" />
                <span>Start Shopping</span>
              </button>
            </div>
          ) : (
            /* Cart Items List */
            items.map((item) => {
              const itemTotal = item.price * item.quantity;
              const moq = item.min_order_quantity && item.min_order_quantity > 0 ? item.min_order_quantity : 1;
              const isAtMoq = item.quantity <= moq;

              return (
                <div
                  key={item.id}
                  className="pt-3.5 first:pt-0 flex gap-3 group"
                >
                  {/* Thumbnail */}
                  <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-xl bg-slate-50 border border-slate-200 p-1.5 flex items-center justify-center shrink-0 overflow-hidden relative">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <Package className="w-7 h-7 text-slate-300" />
                    )}
                  </div>

                  {/* Item Details & Actions */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="text-xs font-bold text-[#111827] line-clamp-2 leading-snug">
                          {item.name}
                        </h4>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors shrink-0 cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* SKU & MOQ Badge */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {item.sku && (
                          <span className="text-[10px] font-mono text-slate-400">
                            {item.sku}
                          </span>
                        )}
                        {moq > 1 && (
                          <span className="text-[9.5px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded">
                            Min Order: {moq} pcs
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Price & Quantity Controls */}
                    <div className="flex items-center justify-between gap-2 mt-2 pt-1 border-t border-slate-100/80">
                      <div>
                        <span className="text-xs font-black text-[#16a34a]">
                          Rs. {itemTotal.toLocaleString("en-PK")}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-1">
                          (Rs. {item.price.toLocaleString("en-PK")} ea)
                        </span>
                        {item.pricing_tier === "retail" && (
                          <span className="text-[8.5px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded ml-1 border border-blue-200">
                            Retail / پرچون
                          </span>
                        )}
                        {item.pricing_tier === "technician" && (
                          <span className="text-[8.5px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded ml-1 border border-amber-200">
                            Technician / ٹیکنیشن
                          </span>
                        )}
                        {item.pricing_tier === "wholesale" && (
                          <span className="text-[8.5px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded ml-1 border border-emerald-200">
                            Wholesale / ہول سیل
                          </span>
                        )}
                      </div>

                      {/* Quantity Stepper */}
                      <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden shadow-2xs">
                        <button
                          type="button"
                          onClick={() => {
                            if (isAtMoq) {
                              // If at MOQ, clicking minus asks to remove or removes
                              removeFromCart(item.id);
                            } else {
                              updateQuantity(item.id, item.quantity - 1);
                            }
                          }}
                          className={`p-1.5 transition-colors cursor-pointer ${
                            isAtMoq
                              ? "text-rose-500 hover:bg-rose-50"
                              : "text-slate-600 hover:bg-slate-100"
                          }`}
                          title={isAtMoq ? `Remove item (Minimum order is ${moq})` : "Decrease quantity"}
                          aria-label="Decrease quantity"
                        >
                          {isAtMoq ? (
                            <Trash2 className="w-3 h-3 text-rose-500" />
                          ) : (
                            <Minus className="w-3 h-3" />
                          )}
                        </button>

                        <span className="px-2.5 py-0.5 text-xs font-bold text-[#111827] min-w-[28px] text-center font-mono">
                          {item.quantity}
                        </span>

                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="p-1.5 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Increase quantity"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Drawer Bottom Checkout Footer */}
        {items.length > 0 && (
          <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50/80 space-y-3 shrink-0">
            {/* Subtotal & Delivery */}
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-500 font-medium">
                <span>Subtotal ({cartCount} items)</span>
                <span className="font-bold text-slate-700">
                  Rs. {cartSubtotal.toLocaleString("en-PK")}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-500 font-medium">
                <span>Cargo Delivery Fee:</span>
                <span className={`font-bold ${deliveryCharges === 0 ? "text-emerald-600" : "text-slate-700"}`}>
                  {deliveryCharges === 0 ? "FREE (Rs. 5000+)" : `Rs. ${deliveryCharges}`}
                </span>
              </div>

              {/* Coupon Row */}
              <div className="pt-1.5 border-t border-slate-200 space-y-1">
                {appliedCoupon ? (
                  <div className="flex items-center justify-between text-[11px] text-emerald-700 font-bold bg-emerald-50 p-1.5 rounded-lg border border-emerald-200">
                    <span className="font-mono">{appliedCoupon.code}</span>
                    <div className="flex items-center gap-2">
                      <span>-Rs. {discountAmount}</span>
                      <button
                        type="button"
                        onClick={removeCoupon}
                        className="text-rose-500 hover:text-rose-700"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-1">
                    <input
                      type="text"
                      placeholder="Coupon Code"
                      value={couponCodeInput}
                      onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                      className="flex-1 text-[11px] font-mono font-bold uppercase px-2 py-1 bg-white border border-slate-200 rounded-lg outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (couponCodeInput.trim()) {
                          applyCoupon(couponCodeInput.trim());
                          setCouponCodeInput("");
                        }
                      }}
                      className="px-2.5 py-1 bg-slate-900 text-white text-[11px] font-bold rounded-lg hover:bg-slate-800 cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                )}
                {couponError && <p className="text-[10px] text-rose-500 font-bold">{couponError}</p>}
              </div>

              {discountAmount > 0 && (
                <div className="flex items-center justify-between text-xs font-bold text-emerald-600">
                  <span>Coupon Discount:</span>
                  <span>-Rs. {discountAmount.toLocaleString("en-PK")}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-sm sm:text-base font-black text-[#111827] pt-1 border-t border-slate-200">
                <span>Total Amount:</span>
                <span className="text-[#dc2626] font-mono">
                  Rs. {cartTotal.toLocaleString("en-PK")}
                </span>
              </div>
            </div>

            {/* Buttons */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleCheckoutClick}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#dc2626] hover:bg-[#b91c1c] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-[0.99] cursor-pointer"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={closeCart}
                className="w-full py-2 text-xs font-bold text-slate-600 hover:text-[#dc2626] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Continue Shopping (مزید خریداری کریں)
              </button>
            </div>

            {/* Quick Guarantees */}
            <div className="flex items-center justify-center gap-4 pt-1 text-[10px] text-slate-500 font-semibold border-t border-slate-200/60">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#dc2626]" />
                100% Tested Genuine
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-emerald-600" />
                Safe Cargo Packing
              </span>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
