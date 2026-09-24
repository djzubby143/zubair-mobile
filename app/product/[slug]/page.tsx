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
  Star,
  MessageSquare,
  Send,
  Sparkles,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth, getEffectiveProductPrice } from "@/lib/auth";
import { resolveUserTier, sanitizeProductForTier } from "@/lib/pricingSecurity";
import { getCustomProducts } from "@/lib/customProducts";
import { supabase } from "@/lib/supabase";
import { DEFAULT_CATALOG_PRODUCTS } from "@/lib/products";
import { Product, ProductReview } from "@/lib/types";
import {
  getProductReviews,
  addProductReview,
  addRecentlyViewed,
  getRecentlyViewed,
} from "@/lib/marketing";

export default function ProductDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const { addToCart } = useCart();
  const { isLoggedIn, user } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  // Marketing states
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([]);
  const [newRating, setNewRating] = useState(5);
  const [newReviewText, setNewReviewText] = useState("");
  const [newReviewName, setNewReviewName] = useState(user?.full_name || "");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

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

  useEffect(() => {
    if (product) {
      addRecentlyViewed(product);
      getProductReviews(product.id).then((r) => setReviews(r));
      const recent = getRecentlyViewed().filter((p) => p.id !== product.id).slice(0, 4);
      setRecentlyViewed(recent);
    }
  }, [product]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !newReviewText.trim()) return;
    setReviewSubmitting(true);
    try {
      const created = await addProductReview({
        product_id: product.id,
        user_name: newReviewName.trim() || user?.full_name || "Valued Customer",
        rating: newRating,
        comment: newReviewText.trim(),
        verified_purchase: !!user,
        is_approved: true,
      });
      setReviews((prev) => [created, ...prev]);
      setReviewSuccess(true);
      setNewReviewText("");
      setTimeout(() => setReviewSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setReviewSubmitting(false);
    }
  };

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

            {/* Spare Part Specifications Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {product?.quality_grade && (
                <span className={`text-xs font-black px-2.5 py-1 rounded-md border ${
                  product.quality_grade === "Original"
                    ? "bg-purple-50 text-purple-700 border-purple-200"
                    : product.quality_grade === "OEM"
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}>
                  Grade: {product.quality_grade}
                </span>
              )}
              {product?.warranty && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Warranty: {product.warranty}
                </span>
              )}
              {product?.brand && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                  Brand: {product.brand}
                </span>
              )}
              {product?.model && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                  Model: {product.model}
                </span>
              )}
              {product?.part_type && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-red-50 text-red-700 border border-red-200">
                  {product.part_type}
                </span>
              )}
            </div>

            {/* Compatible Models Tags */}
            {product?.compatible_models && (
              <div className="pt-2">
                <span className="text-xs font-bold text-slate-500 block mb-1.5">Compatible Phone Models:</span>
                <div className="flex flex-wrap gap-1.5">
                  {(Array.isArray(product.compatible_models)
                    ? product.compatible_models
                    : (product.compatible_models as string).split(",")
                  ).map((cm: string, idx: number) => (
                    <span key={idx} className="text-[11px] font-semibold bg-slate-50 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                      {cm.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 w-fit px-2.5 py-1 rounded-md border border-emerald-200/60 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>In Stock & Tested Ready to Ship ({product?.stock_quantity ?? 50} units in Gujranwala Hub)</span>
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

      {/* Customer Reviews & Ratings Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
              <h2 className="text-lg font-black text-slate-900">Verified Customer Reviews & Feedback</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Tested and reviewed by mobile technicians and repair shop owners across Pakistan.
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-700 rounded-lg">
            {reviews.length} {reviews.length === 1 ? "Review" : "Reviews"}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Reviews List (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            {reviews.length === 0 ? (
              <div className="p-8 text-center text-slate-400 border border-dashed rounded-xl">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-semibold">No reviews yet for this spare part.</p>
                <p className="text-[11px] text-slate-400 mt-1">Be the first to share your technician experience!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map((r) => (
                  <div key={r.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/60 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{r.user_name}</span>
                        {r.verified_purchase && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Verified Buyer
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(r.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-amber-400">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${i < r.rating ? "fill-current" : "text-slate-300 fill-transparent"}`}
                        />
                      ))}
                    </div>

                    <p className="text-xs text-slate-700">{r.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Review Form (4 cols) */}
          <div className="lg:col-span-4">
            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-secondary" />
                Leave Technician Feedback
              </h3>

              {reviewSuccess && (
                <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Review submitted successfully!
                </div>
              )}

              <form onSubmit={handleSubmitReview} className="space-y-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Your Rating</label>
                  <div className="flex items-center gap-1.5 text-amber-400">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setNewRating(star)}
                        className="cursor-pointer"
                      >
                        <Star
                          className={`w-5 h-5 ${star <= newRating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`}
                        />
                      </button>
                    ))}
                    <span className="text-xs font-bold text-slate-700 ml-2">{newRating} / 5</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Name / Shop Name</label>
                  <input
                    type="text"
                    value={newReviewName}
                    onChange={(e) => setNewReviewName(e.target.value)}
                    placeholder="e.g. Aslam Telecom"
                    className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Your Review *</label>
                  <textarea
                    required
                    rows={3}
                    value={newReviewText}
                    onChange={(e) => setNewReviewText(e.target.value)}
                    placeholder="Display colors, touch fitting, flex durability..."
                    className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={reviewSubmitting || !newReviewText.trim()}
                  className="w-full py-2 bg-secondary hover:bg-secondary-dark text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  Submit Review
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Recently Viewed Products */}
      {recentlyViewed.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-secondary" />
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
              Recently Viewed Spare Parts
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {recentlyViewed.map((rp) => (
              <Link
                key={rp.id}
                href={`/product/${rp.slug || rp.id}`}
                className="p-3 rounded-xl border border-slate-100 hover:border-slate-300 hover:shadow-sm transition-all group flex flex-col justify-between"
              >
                <div className="aspect-square bg-slate-50 rounded-lg overflow-hidden flex items-center justify-center p-2 mb-2">
                  <img
                    src={rp.image_url || "/placeholder.png"}
                    alt={rp.name}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                  />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 line-clamp-2 group-hover:text-secondary">
                    {rp.name}
                  </p>
                  <p className="text-xs font-black text-slate-900 mt-1">
                    Rs. {(rp.retail_price || rp.price || 0).toLocaleString()}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
