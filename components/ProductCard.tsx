"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ShoppingCart, Camera, Lock } from "lucide-react";
import { Product } from "@/lib/types";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/lib/auth";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();
  const { isLoggedIn, loading: authLoading } = useAuth();
  const [isAdded, setIsAdded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const isInStock = (product.stock_quantity ?? 0) > 0;
  const priceValue = Number(product.price) || 0;
  const formattedPrice = `Rs ${priceValue.toLocaleString("en-PK")}`;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isInStock) return;

    addToCart(product, 1);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1200);
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200/80 hover:border-sky-300 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden">
      {/* Product Image Area (Screenshot: light gray contain area or 'NO IMAGE AVAILABLE') */}
      <Link
        href={`/product/${product.slug}`}
        className="block relative aspect-square w-full bg-[#f4f6f8] border-b border-slate-100 overflow-hidden group"
      >
        {product.image_url && !imgError ? (
          <img
            src={product.image_url}
            alt={product.name}
            onError={() => setImgError(true)}
            className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          /* Exact 'NO IMAGE AVAILABLE' placeholder seen in screenshot */
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

      {/* Product Info (Screenshot: Title, description, green price, Add to Cart) */}
      <div className="p-3 sm:p-3.5 flex flex-col flex-1 justify-between space-y-2.5">
        <div className="space-y-1">
          {/* Title: 2-line clamped uppercase bold (Screenshot Style) */}
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

          {/* Subtitle / Description (Screenshot: "No description available") */}
          <p className="text-[10px] text-slate-400 truncate">
            {product.short_description || "No description available"}
          </p>
        </div>

        {/* Price (Hidden if not logged in, shown only after login) */}
        <div className="pt-0.5">
          {isLoggedIn ? (
            <div className="text-xs sm:text-sm font-bold text-[#16a34a] tracking-tight">
              {formattedPrice}
            </div>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-1 text-[10.5px] font-bold text-[#dc2626] bg-red-50 hover:bg-red-100/80 px-2 py-0.5 rounded border border-red-200/60 transition-colors"
              title="Click to login and view wholesale prices"
            >
              <Lock className="w-3 h-3 text-[#dc2626]" />
              <span>Login for Price</span>
            </Link>
          )}
        </div>

        {/* Button: Add to Cart (Logged-in) or Login to Order (Guest) */}
        <div>
          {isLoggedIn ? (
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
                {!isInStock ? "Out of Stock" : isAdded ? "Added!" : "Add to Cart"}
              </span>
            </button>
          ) : (
            <Link
              href="/login"
              className="w-full flex items-center justify-center gap-1.5 py-1.5 sm:py-2 px-2.5 rounded-md text-slate-700 bg-slate-100 hover:bg-red-50 hover:text-[#dc2626] hover:border-red-200 border border-slate-200 text-[11px] font-bold shadow-2xs transition-all duration-200"
            >
              <Lock className="w-3.5 h-3.5 text-[#dc2626]" />
              <span>Login to Order</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
