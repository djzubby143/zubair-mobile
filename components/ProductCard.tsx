"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ShoppingCart, Camera, Heart, Star, Plus, Minus } from "lucide-react";
import { Product } from "@/lib/types";
import { useCart } from "@/context/CartContext";
import { useAuth, getEffectiveProductPrice } from "@/lib/auth";
import { isInWishlist, toggleWishlistItem } from "@/lib/marketing";

interface ProductCardProps {
  product: Product;
  index?: number;
}

export default function ProductCard({ product, index = 0 }: ProductCardProps) {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [isAdded, setIsAdded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [isWished, setIsWished] = useState(false);
  
  // Local state for the [- 1 +] quantity picker
  const minQty = product.min_order_quantity && product.min_order_quantity > 0 ? product.min_order_quantity : 1;
  const [quantity, setQuantity] = useState(minQty);

  useEffect(() => {
    const custId = user?.id || "guest-user";
    setIsWished(isInWishlist(custId, product.id));

    const handleWishlistUpdate = () => setIsWished(isInWishlist(custId, product.id));
    window.addEventListener("zubair_wishlist_updated", handleWishlistUpdate);
    return () => window.removeEventListener("zubair_wishlist_updated", handleWishlistUpdate);
  }, [user, product.id]);

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const custId = user?.id || "guest-user";
    setIsWished(toggleWishlistItem(custId, product));
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.stock_quantity && quantity < product.stock_quantity) {
      setQuantity(prev => prev + 1);
    }
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (quantity > minQty) {
      setQuantity(prev => prev - 1);
    }
  };

  const isInStock = (product.stock_quantity ?? 0) > 0;
  const { price: effectivePrice, activeTier } = getEffectiveProductPrice(product, user);
  const formattedPrice = `Rs ${effectivePrice.toLocaleString("en-PK")}`;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isInStock) return;

    addToCart(
      { ...product, price: effectivePrice, pricing_tier: activeTier },
      quantity // Use the selected quantity from the picker
    );
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1200);
  };

  const displayImage = product.image_url && !imgError ? product.image_url : null;

  return (
    <div 
      className="bg-white rounded border border-gray-200 hover:border-red-300 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between overflow-hidden relative animate-fade-in-up group"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Top Right Stock Ribbon */}
      <div className="absolute top-0 right-0 z-10 overflow-hidden w-24 h-24 pointer-events-none">
        <div className={`absolute transform rotate-45 text-center text-white font-bold text-[10px] py-1 right-[-35px] top-[16px] w-[120px] shadow-sm ${
          isInStock ? 'bg-[#25D366]' : 'bg-gray-400'
        }`}>
          {isInStock ? 'Stock High' : 'Out of Stock'}
        </div>
      </div>

      {/* Product Image Area */}
      <div className="relative aspect-square w-full bg-[#f4f6f8] border-b border-gray-100 p-4">
        <Link href={`/product/${product.slug}`} className="block w-full h-full">
          {displayImage ? (
            <img
              src={displayImage}
              alt={product.name}
              onError={() => setImgError(true)}
              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <Camera className="w-8 h-8 opacity-50" />
            </div>
          )}
        </Link>
        <button
          onClick={handleToggleWishlist}
          className="absolute top-2 left-2 z-10 p-1.5 rounded-full bg-white/80 text-gray-400 hover:text-red-500 shadow-sm"
        >
          <Heart className={`w-4 h-4 ${isWished ? "fill-red-500 text-red-500" : ""}`} />
        </button>
      </div>

      {/* Product Info (Left Aligned as requested) */}
      <div className="p-3 flex flex-col flex-1 justify-between bg-white space-y-3">
        <div className="space-y-1">
          {/* Tag & Rating */}
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-gray-500 font-medium uppercase tracking-wider">
              {product.quality_grade || "ORIGINAL"}
            </span>
            <span className="flex items-center gap-0.5 text-amber-500 font-bold">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> 5.0
            </span>
          </div>

          {/* Title */}
          <Link href={`/product/${product.slug}`} className="block">
            <h3 className="font-bold text-xs sm:text-sm text-gray-900 uppercase line-clamp-2 leading-snug group-hover:text-red-600 transition-colors">
              {product.name}
            </h3>
          </Link>
        </div>

        {/* Price & Quantity Adjuster Line */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-sm sm:text-base font-black text-red-600">
            {formattedPrice}
          </span>
          
          {/* Quantity Selector [- 1 +] */}
          {isInStock && (
            <div className="flex items-center border border-gray-300 rounded overflow-hidden h-7">
              <button onClick={handleDecrement} className="px-2 bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors">
                <Minus className="w-3 h-3" />
              </button>
              <span className="px-3 text-xs font-semibold text-gray-800 border-x border-gray-300 min-w-[32px] text-center">
                {quantity}
              </span>
              <button onClick={handleIncrement} className="px-2 bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors">
                <Plus className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Full Width Button */}
        <button
          onClick={handleAddToCart}
          disabled={!isInStock}
          className={`w-full flex items-center justify-center gap-2 py-2 rounded-md text-[11px] font-bold uppercase tracking-wider transition-colors ${
            !isInStock
              ? "bg-slate-200 text-slate-500 cursor-not-allowed"
              : isAdded
              ? "bg-[#25D366] text-white"
              : "bg-red-600 hover:bg-red-700 text-white"
          }`}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          {!isInStock ? "Out of Stock" : isAdded ? "Added!" : "Add to Cart"}
        </button>
      </div>
    </div>
  );
}