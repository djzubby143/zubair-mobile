"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ShoppingCart, Camera, Lock, Heart, Star } from "lucide-react";
import { Product } from "@/lib/types";
import { useCart } from "@/context/CartContext";
import { useAuth, getEffectiveProductPrice } from "@/lib/auth";
import { isInWishlist, toggleWishlistItem } from "@/lib/marketing";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();
  const { isLoggedIn, user, loading: authLoading } = useAuth();
  const [isAdded, setIsAdded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [isWished, setIsWished] = useState(false);

  useEffect(() => {
    const custId = user?.id || "guest-user";
    setIsWished(isInWishlist(custId, product.id));

    const handleWishlistUpdate = () => {
      setIsWished(isInWishlist(custId, product.id));
    };
    window.addEventListener("zubair_wishlist_updated", handleWishlistUpdate);
    return () => window.removeEventListener("zubair_wishlist_updated", handleWishlistUpdate);
  }, [user, product.id]);

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const custId = user?.id || "guest-user";
    const newState = toggleWishlistItem(custId, product);
    setIsWished(newState);
  };

  const isInStock = (product.stock_quantity ?? 0) > 0;
  const {
    price: effectivePrice,
    activeTier,
    tierName,
    tierLabelUrdu,
    isRetail,
    isTechnician,
    isWholesale,
    isGuest,
  } = getEffectiveProductPrice(product, user);
  const formattedPrice = `Rs ${effectivePrice.toLocaleString("en-PK")}`;
  const minQty = product.min_order_quantity && product.min_order_quantity > 0 ? product.min_order_quantity : 1;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isInStock) return;

    // Add with user's effective price and pricing tier
    addToCart(
      {
        ...product,
        price: effectivePrice,
        pricing_tier: activeTier,
      },
      minQty
    );
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1200);
  };

  const isSideKey =
    (product.category?.name && product.category.name.toLowerCase().includes("side")) ||
    product.name.toLowerCase().includes("side key") ||
    product.name.toLowerCase().includes("sidekey") ||
    product.name.toLowerCase().includes("power key") ||
    product.name.toLowerCase().includes("volume key");

  const displayImage =
    product.image_url && !imgError
      ? product.image_url
      : isSideKey
      ? "/images/sidekey-placeholder.svg"
      : null;

  return (
    <div className="bg-white rounded-lg border border-slate-200/80 hover:border-sky-300 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden relative">
      {/* Product Image Area (Screenshot: light gray contain area or 'NO IMAGE AVAILABLE') */}
      <div className="relative aspect-square w-full bg-[#f4f6f8] border-b border-slate-100 overflow-hidden group">
        <Link
          href={`/product/${product.slug}`}
          className="block w-full h-full"
        >
          {minQty > 1 && (
            <span className="absolute top-2 left-2 z-10 bg-amber-600 text-white text-[9.5px] font-black px-2 py-0.5 rounded-md shadow-xs tracking-wider uppercase">
              Min: {minQty} pcs
            </span>
          )}
          {displayImage ? (
            <img
              src={displayImage}
              alt={product.name}
              onError={() => setImgError(true)}
              className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-3 text-slate-400 select-none">
              <div className="w-16 h-16 sm:w-20 sm:h-20 border border-slate-300 rounded flex flex-col items-center justify-center bg-white/60 p-2 shadow-2xs">
                <Camera className="w-7 h-7 sm:w-8 sm:h-8 text-slate-400 mb-1" />
                <span className="text-[7.5px] font-black uppercase text-center text-slate-400 leading-tight">
                  NO IMAGE<br />AVAILABLE
                </span>
              </div>
            </div>
          )}
        </Link>

        {/* Wishlist Button */}
        <button
          type="button"
          onClick={handleToggleWishlist}
          className={`absolute top-2 right-2 z-10 p-1.5 rounded-full backdrop-blur-xs transition-all ${
            isWished
              ? "bg-rose-50 text-rose-600 border border-rose-200"
              : "bg-white/80 text-slate-400 hover:text-rose-500 hover:bg-white"
          }`}
          title={isWished ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart className={`w-3.5 h-3.5 ${isWished ? "fill-rose-500 text-rose-500" : ""}`} />
        </button>
      </div>

      {/* Product Info */}
      <div className="p-3 sm:p-3.5 flex flex-col flex-1 justify-between space-y-2.5">
        <div className="space-y-1">
          {/* Quality Grade & Rating Bar */}
          <div className="flex items-center justify-between text-[10px] text-slate-500 pb-0.5">
            <span className="font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded text-[9.5px]">
              {product.quality_grade || "Original"}
            </span>
            <span className="flex items-center gap-0.5 text-amber-500 font-bold text-[10px]">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span>5.0</span>
            </span>
          </div>

          {/* Title */}
          <Link
            href={`/product/${product.slug}`}
            className="block text-slate-900 hover:text-[#dc2626] transition-colors"
          >
            <h3
              className="font-bold text-[11px] sm:text-xs text-slate-900 uppercase line-clamp-2 h-8 sm:h-8.5 leading-snug tracking-tight"
              title={product.name}
            >
              {product.name}
            </h3>
          </Link>

          <p className="text-[10px] text-slate-400 truncate">
            {product.short_description || "No description available"}
          </p>
        </div>

        {/* Price Section: Retail is public, Technician/Wholesale has login indicator */}
        <div className="pt-0.5 space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`text-xs sm:text-sm font-black tracking-tight ${
                isWholesale
                  ? "text-[#16a34a]"
                  : isTechnician
                  ? "text-amber-700"
                  : "text-blue-600"
              }`}
            >
              {formattedPrice}
            </span>
            <span
              className={`text-[8.5px] font-bold px-1.5 py-0.2 rounded uppercase tracking-wider ${
                isWholesale
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : isTechnician
                  ? "bg-amber-50 text-amber-800 border border-amber-200"
                  : "bg-blue-50 text-blue-700 border border-blue-200"
              }`}
            >
              {tierLabelUrdu}
            </span>
          </div>

          {/* If visitor is guest, show teaser to login for wholesale/technician rates */}
          {isGuest && (
            <Link
              href="/login"
              className="inline-flex items-center gap-1 text-[9.5px] text-[#dc2626] hover:text-red-700 font-semibold transition-colors"
              title="ٹیکنیشن و ہول سیل ڈسکاؤنٹ ریٹ کے لیے لاگ ان کریں"
            >
              <Lock className="w-2.5 h-2.5" />
              <span>ٹیکنیشن / ہول سیل ریٹ: لاگ ان کریں</span>
            </Link>
          )}
        </div>

        {/* Button: Add to Cart */}
        <div>
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!isInStock}
            className={`w-full flex items-center justify-center gap-1.5 py-1.5 sm:py-2 px-2.5 rounded-md text-white text-[11px] font-bold shadow-2xs transition-all duration-200 ${
              !isInStock
                ? "bg-slate-300 cursor-not-allowed text-slate-500"
                : isAdded
                ? "bg-[#25D366] text-white"
                : "bg-[#dc2626] hover:bg-[#b91c1c] active:scale-[0.98]"
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>
              {!isInStock
                ? "Out of Stock"
                : isAdded
                ? "Added!"
                : minQty > 1
                ? `Add ${minQty} Pcs`
                : "Add to Cart"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
