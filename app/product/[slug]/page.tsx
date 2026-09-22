"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ShoppingCart,
  PhoneCall,
  ShieldCheck,
  Truck,
  CheckCircle2,
  Package,
  Lock,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth, getEffectiveProductPrice } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { DEFAULT_CATALOG_PRODUCTS } from "@/lib/products";
import { Product } from "@/lib/types";

export default function ProductDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const { addToCart } = useCart();
  const { isLoggedIn, user } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    async function loadProduct() {
      setLoading(true);
      try {
        // Try local mock first
        const localMatch = DEFAULT_CATALOG_PRODUCTS.find(
          (p) => p.slug === slug || p.id === slug
        );

        // Try Supabase
        const { data, error } = await supabase
          .from("products")
          .select("*, category:categories(*)")
          .or(`slug.eq.${slug},id.eq.${slug}`)
          .maybeSingle();

        if (data && !error) {
          setProduct(data as Product);
          const moq = data.min_order_quantity && data.min_order_quantity > 0 ? data.min_order_quantity : 1;
          setQuantity(moq);
        } else if (localMatch) {
          setProduct(localMatch);
          const moq = localMatch.min_order_quantity && localMatch.min_order_quantity > 0 ? localMatch.min_order_quantity : 1;
          setQuantity(moq);
        } else {
          // Fallback generic product
          const fallbackName = slug
            ? slug
                .split("-")
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(" ")
            : "Mobile Spare Part";
          const fallbackProduct: Product = {
            id: slug || "part-1",
            name: fallbackName,
            slug: slug || "mobile-spare-part",
            price: 2650,
            stock_quantity: 50,
            min_order_quantity: 1,
            sku: `ZB-${slug ? slug.toUpperCase().slice(0, 6) : "PART"}-01`,
            is_active: true,
          };
          setProduct(fallbackProduct);
          setQuantity(1);
        }
      } catch (err) {
        console.warn("Error loading product detail:", err);
      } finally {
        setLoading(false);
      }
    }

    if (slug) {
      loadProduct();
    }
  }, [slug]);

  const moq = product?.min_order_quantity && product.min_order_quantity > 0 ? product.min_order_quantity : 1;
  const productName = product?.name || "Mobile Spare Part";
  const { price: effectivePrice, isRetail, tierName, wholesalePrice, retailPrice } =
    product
      ? getEffectiveProductPrice(product, user)
      : { price: 2650, isRetail: false, tierName: "Wholesale", wholesalePrice: 2650, retailPrice: 3315 };
  const sku = product?.sku || `ZB-${slug ? slug.toUpperCase().slice(0, 6) : "PART"}-01`;

  const handleAdd = () => {
    if (!isLoggedIn || !product) return;
    addToCart({ ...product, price: effectivePrice }, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const whatsappMessage = encodeURIComponent(
    `Hello Zubair Mobile! I am interested in ordering: ${productName} (SKU: ${sku}). Please confirm availability.`
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb / Back Button */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#dc2626] mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to All Spare Parts</span>
      </Link>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        {/* Left Column: Image / Visual container */}
        <div className="aspect-square bg-slate-50 rounded-xl border border-slate-100 flex flex-col items-center justify-center p-8 relative overflow-hidden">
          {product?.image_url ? (
            <img
              src={product.image_url}
              alt={productName}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-32 h-32 sm:w-44 sm:h-44 rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 bg-white/70 shadow-xs">
              <Package className="w-16 h-16 sm:w-20 sm:h-20 text-slate-400 mb-2" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                GENUINE PART
              </span>
            </div>
          )}
          <div className="absolute top-4 left-4 flex flex-col gap-1.5">
            <span className="bg-[#111827] text-white text-xs font-bold px-2.5 py-1 rounded-md border border-slate-700">
              Zubair Mobile Tested
            </span>
            {moq > 1 && (
              <span className="bg-amber-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-md shadow-xs uppercase tracking-wider">
                Min Order: {moq} Pcs
              </span>
            )}
          </div>
        </div>

        {/* Right Column: Product Info & Actions */}
        <div className="flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-red-50 text-[#dc2626] font-bold text-xs px-2.5 py-0.5 rounded-full border border-red-100">
                Mobile Spare Part
              </span>
              <span className="text-xs font-mono text-slate-400">SKU: {sku}</span>
              {moq > 1 && (
                <span className="bg-amber-50 text-amber-800 font-bold text-xs px-2.5 py-0.5 rounded-full border border-amber-200">
                  کم از کم آرڈر: {moq} پیس
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111827] tracking-tight">
              {productName}
            </h1>

            <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 w-fit px-2.5 py-1 rounded-md border border-emerald-200/60 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>In Stock & Tested Ready to Ship</span>
            </div>

            {/* Price Tag (Hidden unless logged in) */}
            <div className="pt-3">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`text-xs font-bold uppercase tracking-wider ${
                    isRetail ? "text-blue-600" : "text-emerald-700"
                  }`}
                >
                  {isRetail ? "Retail Price / پرچون ریٹ" : "Wholesale Price / ہول سیل ریٹ"}
                </span>
                <span
                  className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full ${
                    isRetail
                      ? "bg-blue-100 text-blue-800"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {isRetail ? "Retail Customer" : "Shopkeeper / Technician"}
                </span>
              </div>
              {isLoggedIn ? (
                <span
                  className={`text-3xl font-black ${
                    isRetail ? "text-blue-600" : "text-[#16a34a]"
                  }`}
                >
                  Rs. {effectivePrice.toLocaleString("en-PK")}
                </span>
              ) : (
                <div className="p-4 bg-red-50/80 border border-red-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#dc2626] text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#111827]">Login Required to View Price</p>
                      <p className="text-[11px] text-slate-500">
                        Wholesale prices are available for verified shopkeepers & technicians.
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs font-bold rounded-lg shadow-2xs transition-colors shrink-0"
                  >
                    <span>Login to View Rate</span>
                  </Link>
                </div>
              )}
            </div>

            <p className="text-sm text-slate-500 leading-relaxed pt-2">
              Original equipment grade replacement spare part for mobile phones. Tested for
              proper touch response, display clarity, flex continuity, and durability.
              Available for wholesale and retail dispatch directly from Chand Plaza, Gujranwala.
            </p>
          </div>

          {/* Action Row */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            {isLoggedIn ? (
              <>
                <div className="flex items-center gap-3">
                  <label htmlFor="qty" className="text-xs font-bold uppercase text-slate-400">
                    Quantity:
                  </label>
                  <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(moq, quantity - 1))}
                      className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-sm cursor-pointer"
                      title={quantity <= moq ? `Minimum order quantity is ${moq}` : "Decrease quantity"}
                    >
                      -
                    </button>
                    <span className="px-4 py-1.5 text-sm font-bold text-slate-900 min-w-[2rem] text-center font-mono">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity(quantity + 1)}
                      className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-sm cursor-pointer"
                      title="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                  {moq > 1 && (
                    <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                      Min: {moq} Pcs
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={handleAdd}
                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm text-white shadow-sm transition-all ${
                      added ? "bg-[#25D366]" : "bg-[#dc2626] hover:bg-[#b91c1c]"
                    }`}
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>{added ? "Added to Cart!" : "Add To Cart"}</span>
                  </button>

                  <a
                    href={`https://wa.me/923458032600?text=${whatsappMessage}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-sm transition-all"
                  >
                    <PhoneCall className="w-4 h-4" />
                    <span>WhatsApp Order</span>
                  </a>
                </div>
              </>
            ) : (
              <div className="pt-2">
                <Link
                  href="/login"
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm bg-[#dc2626] hover:bg-[#b91c1c] text-white shadow-xs transition-all"
                >
                  <Lock className="w-4 h-4" />
                  <span>Login to Order this Spare Part</span>
                </Link>
                <div className="mt-2 text-center">
                  <span className="text-xs text-slate-400">
                    New Customer? Contact Zubair Mobile on WhatsApp:{" "}
                    <a
                      href="https://wa.me/923458032600"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#25D366] font-bold hover:underline"
                    >
                      03458032600
                    </a>
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#dc2626]" />
                <span>Quality Tested Before Dispatch</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-[#dc2626]" />
                <span>Fast Courier Across Pakistan</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
