"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ShoppingCart, Camera } from "lucide-react";
import { Product } from "@/lib/types";
import { useCart } from "@/context/CartContext";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();
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

        {/* Price (Screenshot: Green text, "Rs 0" or "Rs 2,650") */}
        <div className="pt-1">
          <div className="text-xs sm:text-sm font-bold text-[#16a34a] tracking-tight">
            {formattedPrice}
          </div>
        </div>

        {/* Button: Vibrant Brand Red "Add to Cart" with cart icon */}
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
              {!isInStock ? "Out of Stock" : isAdded ? "Added!" : "Add to Cart"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
