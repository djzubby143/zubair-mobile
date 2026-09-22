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
import { resolveUserTier, sanitizeProductForTier } from "@/lib/pricingSecurity";
import { getCustomProducts } from "@/lib/customProducts";
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
      const tier = resolveUserTier(user);
      try {
        // Try secure API first
        try {
          const res = await fetch(`/api/products/${slug}`, {
            headers: {
              "x-user-tier": tier,
            },
          });
          if (res.ok) {
            const json = await res.json();
            if (json.success && json.product) {
              setProduct(json.product);
              const moq = json.product.min_order_quantity && json.product.min_order_quantity > 0 ? json.product.min_order_quantity : 1;
              setQuantity(moq);
              return;
            }
          }
        } catch (apiErr) {
          console.warn("API product detail fallback:", apiErr);
        }

        // Try local custom products first, then local catalog mock
        const customMatch = getCustomProducts().find(
          (p) => p.slug === slug || p.id === slug || (p.sku && p.sku.toLowerCase() === slug.toLowerCase())
        );
        const localMatch = customMatch || DEFAULT_CATALOG_PRODUCTS.find(
          (p) => p.slug === slug || p.id === slug || (p.sku && p.sku.toLowerCase() === slug.toLowerCase())
        );

        // Try Supabase
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
        let detailQuery = supabase.from("products").select("*, category:categories(*)");
        if (isUuid) {
          detailQuery = detailQuery.or(`slug.eq.${slug},id.eq.${slug}`);
        } else {
          detailQuery = detailQuery.eq("slug", slug);
        }
        const { data, error } = await detailQuery.maybeSingle();

        if (data && !error) {
          const sanitized = sanitizeProductForTier(data as Product, tier);
          setProduct(sanitized);
          const moq = sanitized.min_order_quantity && sanitized.min_order_quantity > 0 ? sanitized.min_order_quantity : 1;
          setQuantity(moq);
        } else if (localMatch) {
          const sanitized = sanitizeProductForTier(localMatch, tier);
          setProduct(sanitized);
          const moq = sanitized.min_order_quantity && sanitized.min_order_quantity > 0 ? sanitized.min_order_quantity : 1;
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
          setProduct(sanitizeProductForTier(fallbackProduct, tier));
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
  }, [slug, user]);

  const moq = product?.min_order_quantity && product.min_order_quantity > 0 ? product.min_order_quantity : 1;
  const productName = product?.name || "Mobile Spare Part";
  const priceInfo = product
    ? getEffectiveProductPrice(product, user)
    : {
        price: 2650,
        activeTier: "retail" as const,
        tierName: "Retail",
        tierLabelUrdu: "پرچون ریٹ",
        isRetail: true,
        isTechnician: false,
        isWholesale: false,
        isGuest: true,
        canSeeTechnicianRate: false,
        canSeeWholesaleRate: false,
        wholesalePrice: 2650,
        technicianPrice: 2950,
        retailPrice: 3315,
      };

  const sku = product?.sku || `ZB-${slug ? slug.toUpperCase().slice(0, 6) : "PART"}-01`;

  const handleAdd = () => {
    if (!product) return;
    addToCart(
      {
        ...product,
        price: priceInfo.price,
        retail_price: priceInfo.retailPrice,
        technician_price: priceInfo.technicianPrice,
        pricing_tier: priceInfo.activeTier,
      },
      quantity
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const whatsappMessage = encodeURIComponent(
    `Hello Zubair Mobile! I am interested in ordering: ${productName} (SKU: ${sku}) at ${priceInfo.tierLabelUrdu} (Rs. ${priceInfo.price.toLocaleString("en-PK")}). Please confirm availability.`
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

            {/* Main Effective Price Display - Strict Single Tier Display */}
            <div className="pt-2 space-y-2">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-bold uppercase tracking-wider ${
                    priceInfo.activeTier === "wholesale"
                      ? "text-emerald-700"
                      : priceInfo.activeTier === "technician"
                      ? "text-amber-700"
                      : "text-blue-600"
                  }`}
                >
                  {priceInfo.tierName} Price / {priceInfo.tierLabelUrdu}
                </span>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    priceInfo.activeTier === "wholesale"
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      : priceInfo.activeTier === "technician"
                      ? "bg-amber-100 text-amber-800 border border-amber-200"
                      : "bg-blue-100 text-blue-800 border border-blue-200"
                  }`}
                >
                  {priceInfo.isGuest
                    ? "عوامی پرچون قیمت"
                    : priceInfo.activeTier === "wholesale"
                    ? "ہول سیل ڈیلر ریٹ"
                    : priceInfo.activeTier === "technician"
                    ? "موبائل ٹیکنیشن ریٹ"
                    : "پرچون کسٹمر ریٹ"}
                </span>
              </div>

              {/* Exact Price */}
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-3xl sm:text-4xl font-black ${
                    priceInfo.activeTier === "wholesale"
                      ? "text-[#16a34a]"
                      : priceInfo.activeTier === "technician"
                      ? "text-amber-600"
                      : "text-blue-600"
                  }`}
                >
                  Rs. {priceInfo.price.toLocaleString("en-PK")}
                </span>
              </div>

              {/* Status Note: strictly relevant to this user tier only */}
              {priceInfo.activeTier === "wholesale" && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                  <span>آپ ہول سیل ڈیلر اکاؤنٹ پر لاگ ان ہیں، آپ کو خصوصی ہول سیل ریٹ دیا جا رہا ہے۔</span>
                </div>
              )}

              {priceInfo.activeTier === "technician" && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-600 shrink-0" />
                  <span>آپ تصدیق شدہ موبائل ٹیکنیشن ہیں، آپ کو خصوصی ٹیکنیشن ریٹ دیا جا رہا ہے۔</span>
                </div>
              )}

              {priceInfo.isGuest && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-[#dc2626] shrink-0" />
                    <span>موبائل دکاندار یا ٹیکنیشن ہیں؟ اپنے خصوصی ریٹ کیلئے لاگ ان کریں۔</span>
                  </div>
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-[#dc2626] hover:bg-[#b91c1c] text-white text-[11px] font-bold rounded-lg shadow-2xs transition-colors shrink-0"
                  >
                    <span>لاگ ان کریں &rarr;</span>
                  </Link>
                </div>
              )}
            </div>

            <p className="text-sm text-slate-500 leading-relaxed pt-1">
              Original equipment grade replacement spare part for mobile phones. Tested for
              proper touch response, display clarity, flex continuity, and durability.
              Available for wholesale, technician, and retail dispatch directly from Chand Plaza, Gujranwala.
            </p>
          </div>

          {/* Action Row */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
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
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm text-white shadow-sm transition-all cursor-pointer ${
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
