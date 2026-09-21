"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import { useCart } from "@/context/CartContext";

export default function ProductDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  // Sample data fallback for preview
  const productName = slug
    ? slug
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
    : "Mobile Spare Part";

  const price = 2650;
  const sku = `ZB-${slug ? slug.toUpperCase().slice(0, 6) : "PART"}-01`;

  const handleAdd = () => {
    addToCart(
      {
        id: slug || "part-1",
        name: productName,
        price: price,
        image_url: null,
        stock_quantity: 50,
        quantity: quantity,
        sku: sku,
      },
      quantity
    );
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
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-secondary mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to All Spare Parts</span>
      </Link>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        {/* Left Column: Image / Visual container */}
        <div className="aspect-square bg-slate-50 rounded-xl border border-slate-100 flex flex-col items-center justify-center p-8 relative">
          <div className="w-32 h-32 sm:w-44 sm:h-44 rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 bg-white/70 shadow-xs">
            <Package className="w-16 h-16 sm:w-20 sm:h-20 text-slate-400 mb-2" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              GENUINE PART
            </span>
          </div>
          <div className="absolute top-4 left-4">
            <span className="bg-primary text-white text-xs font-bold px-2.5 py-1 rounded-md">
              Zubair Mobile Tested
            </span>
          </div>
        </div>

        {/* Right Column: Product Info & Actions */}
        <div className="flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="bg-secondary/10 text-secondary font-semibold text-xs px-2.5 py-0.5 rounded-full">
                Mobile Spare Part
              </span>
              <span className="text-xs font-mono text-slate-400">SKU: {sku}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
              {productName}
            </h1>

            <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 w-fit px-2.5 py-1 rounded-md border border-emerald-200/60 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>In Stock & Tested Ready to Ship</span>
            </div>

            <div className="pt-3">
              <span className="text-xs text-slate-400 uppercase font-semibold block">
                Wholesale Price
              </span>
              <span className="text-3xl font-black text-primary">
                Rs. {price.toLocaleString("en-PK")}
              </span>
            </div>

            <p className="text-sm text-slate-500 leading-relaxed pt-2">
              Original equipment grade replacement spare part for mobile phones. Tested for
              proper touch response, display clarity, flex continuity, and durability.
              Available for wholesale and retail dispatch directly from Chand Plaza, Gujranwala.
            </p>
          </div>

          {/* Action Row */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-3">
              <label htmlFor="qty" className="text-xs font-bold uppercase text-slate-400">
                Quantity:
              </label>
              <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-charcoal font-bold text-sm"
                >
                  -
                </button>
                <span className="px-4 py-1.5 text-sm font-bold text-primary min-w-[2rem] text-center">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-charcoal font-bold text-sm"
                >
                  +
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleAdd}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm text-white shadow-sm transition-all ${
                  added ? "bg-whatsapp" : "bg-secondary hover:bg-secondary-hover"
                }`}
              >
                <ShoppingCart className="w-4 h-4" />
                <span>{added ? "Added to Cart!" : "Add To Cart"}</span>
              </button>

              <a
                href={`https://wa.me/923458032600?text=${whatsappMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm bg-whatsapp hover:bg-whatsapp-hover text-white shadow-sm transition-all"
              >
                <PhoneCall className="w-4 h-4" />
                <span>WhatsApp Order</span>
              </a>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-secondary" />
                <span>Quality Tested Before Dispatch</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-secondary" />
                <span>Fast Courier Across Pakistan</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
