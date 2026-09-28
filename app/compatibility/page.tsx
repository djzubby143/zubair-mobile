"use client";

import React, { useState, useEffect } from "react";
import {
  Smartphone,
  Search,
  ShoppingCart,
  Check,
  ChevronRight,
  Layers,
  Battery,
  Camera,
  Radio,
  Cpu,
  Wrench,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { CompatibilityDevice, Product } from "@/lib/types";
import { getSupportedDevices, getDeviceParts } from "@/lib/compatibility";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/lib/auth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function PhoneCompatibilityExplorer() {
  const { addToCart } = useCart();
  const { user } = useAuth();

  const [devices, setDevices] = useState<CompatibilityDevice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Selection state
  const [selectedBrand, setSelectedBrand] = useState<string>("Samsung");
  const [selectedDevice, setSelectedDevice] = useState<CompatibilityDevice | null>(null);
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>("All Parts");
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [addedItemMap, setAddedItemMap] = useState<{ [id: string]: boolean }>({});

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [devs, prodsRes] = await Promise.all([
          getSupportedDevices(),
          fetch("/api/products").then((r) => r.json()).catch(() => null),
        ]);
        setDevices(devs);
        const prods = Array.isArray(prodsRes)
          ? prodsRes
          : prodsRes?.products || [];
        setProducts(prods);

        const initialDev = devs.find((d) => d.brand.toLowerCase() === "samsung") || devs[0];
        if (initialDev) setSelectedDevice(initialDev);
      } catch (err) {
        console.error("Error loading phone explorer:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const brands = ["Samsung", "Apple", "Vivo", "Oppo", "Infinix", "Xiaomi", "Tecno"];

  const currentBrandDevices = devices.filter((d) =>
    selectedBrand ? d.brand.toLowerCase() === selectedBrand.toLowerCase() : true
  );

  const filteredDevices = currentBrandDevices.filter((d) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    const mName = (d.model_name || d.model || "").toLowerCase();
    const mCode = (d.model_code || (d.compatible_models_alias && d.compatible_models_alias[0]) || "").toLowerCase();
    return (
      mName.includes(q) ||
      mCode.includes(q) ||
      Boolean(d.series && d.series.toLowerCase().includes(q))
    );
  });

  const partsGrouped = selectedDevice ? getDeviceParts(selectedDevice, products) : {};
  const allCategories = ["All Parts", ...Object.keys(partsGrouped)];

  const displayedProducts =
    activeCategoryTab === "All Parts"
      ? Object.values(partsGrouped).flat()
      : partsGrouped[activeCategoryTab] || [];

  const handleAddToCart = (prod: Product) => {
    addToCart(prod, 1);
    setAddedItemMap((prev) => ({ ...prev, [prod.id]: true }));
    setTimeout(() => {
      setAddedItemMap((prev) => ({ ...prev, [prod.id]: false }));
    }, 1500);
  };

  const getCategoryIcon = (cat?: any) => {
    const catName = typeof cat === "object" && cat ? cat.name : (cat || "General");
    switch (String(catName).toLowerCase()) {
      case "lcd unit":
        return <Layers className="w-4 h-4 text-blue-500" />;
      case "battery":
        return <Battery className="w-4 h-4 text-emerald-500" />;
      case "camera":
        return <Camera className="w-4 h-4 text-purple-500" />;
      case "charging flex":
        return <Radio className="w-4 h-4 text-amber-500" />;
      case "ic parts":
        return <Cpu className="w-4 h-4 text-red-500" />;
      default:
        return <Wrench className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-slate-950 via-primary to-slate-900 rounded-3xl p-6 sm:p-10 text-white shadow-2xl relative overflow-hidden">
          <div className="relative z-10 max-w-2xl space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-600/30 text-red-300 border border-red-500/40">
              <Sparkles className="w-3.5 h-3.5" />
              Smart Parts Matching System
            </span>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
              Phone Model Spare Parts Explorer
            </h1>
            <p className="text-sm text-slate-300">
              Select your phone brand and exact model. Our compatibility algorithm instantly aggregates guaranteed
              matching LCD displays, batteries, charging boards, glass, and motherboard ICs.
            </p>
          </div>
          <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-x-8 translate-y-8">
            <Smartphone className="w-96 h-96 text-white" />
          </div>
        </div>

        {/* Step 1: Select Brand */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-secondary text-white text-[10px] flex items-center justify-center font-bold">
                1
              </span>
              Choose Smartphone Brand
            </h2>
            <span className="text-xs text-slate-500">{brands.length} major brands supported</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
            {brands.map((b) => (
              <button
                key={b}
                onClick={() => {
                  setSelectedBrand(b);
                  const firstOfBrand = devices.find((d) => d.brand.toLowerCase() === b.toLowerCase());
                  if (firstOfBrand) setSelectedDevice(firstOfBrand);
                }}
                className={`p-3.5 rounded-2xl border text-center font-extrabold text-sm transition-all cursor-pointer ${
                  selectedBrand.toLowerCase() === b.toLowerCase()
                    ? "bg-secondary text-white border-secondary shadow-lg shadow-red-500/20 scale-[1.02]"
                    : "bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Choose Model & Show Matching Parts */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Models Selector Column */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-secondary text-white text-[10px] flex items-center justify-center font-bold">
                    2
                  </span>
                  Select Model ({filteredDevices.length})
                </h3>
              </div>

              {/* Model Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder={`Search ${selectedBrand} models...`}
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-secondary"
                />
              </div>

              {/* Model Cards */}
              <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
                {filteredDevices.length === 0 ? (
                  <p className="text-xs text-slate-400 p-4 text-center">No models found for &quot;{searchFilter}&quot;.</p>
                ) : (
                  filteredDevices.map((dev) => (
                    <div
                      key={dev.id}
                      onClick={() => setSelectedDevice(dev)}
                      className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                        selectedDevice?.id === dev.id
                          ? "bg-red-50/80 border-secondary text-slate-900 ring-2 ring-red-400/20 shadow-xs"
                          : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs">{dev.model_name || dev.model}</span>
                        <ChevronRight className={`w-4 h-4 ${selectedDevice?.id === dev.id ? "text-secondary" : "text-slate-300"}`} />
                      </div>
                      <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400 font-medium">
                        <span>Code: {dev.model_code || (dev.compatible_models_alias && dev.compatible_models_alias[0]) || dev.model}</span>
                        <span>{dev.series}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Compatible Parts Matrix */}
          <div className="lg:col-span-8 space-y-4">
            {selectedDevice ? (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
                {/* Active Model Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-200 gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-secondary">
                      <Smartphone className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-black text-slate-900">{selectedDevice.model_name || selectedDevice.model}</h2>
                        <span className="text-xs px-2 py-0.5 rounded-md bg-slate-900 text-white font-bold">
                          {selectedDevice.brand}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Hardware Code: <strong className="text-slate-800">{selectedDevice.model_code || (selectedDevice.compatible_models_alias && selectedDevice.compatible_models_alias[0]) || selectedDevice.model}</strong> • Series:{" "}
                        {selectedDevice.series || "Standard Lineup"}
                      </p>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200 shrink-0">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    100% Fitment Guaranteed
                  </span>
                </div>

                {/* Category Filter Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                  {allCategories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategoryTab(cat)}
                      className={`px-3.5 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                        activeCategoryTab === cat
                          ? "bg-secondary text-white shadow-sm"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Product List */}
                {displayedProducts.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 border border-dashed rounded-2xl">
                    <Wrench className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-sm text-slate-700">No products found in this category.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Try selecting &quot;All Parts&quot; or search for generic components.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {displayedProducts.map((prod) => {
                      const isAdded = addedItemMap[prod.id];
                      return (
                        <div
                          key={prod.id}
                          className="p-4 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white hover:shadow-md transition-all flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1">
                              <span className="flex items-center gap-1">
                                {getCategoryIcon(prod.category)}
                                {typeof prod.category === "object" && prod.category ? prod.category.name : typeof prod.category === "string" ? prod.category : "General"}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded ${
                                  (prod.stock || prod.stock_quantity || 0) > 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                                }`}
                              >
                                {(prod.stock || prod.stock_quantity || 0) > 0 ? `${prod.stock || prod.stock_quantity} in stock` : "Out of stock"}
                              </span>
                            </div>

                            <h4 className="text-xs font-bold text-slate-900 line-clamp-2 mt-1">{prod.name}</h4>
                          </div>

                          <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-3">
                            <div>
                              <p className="text-sm font-black text-slate-900">
                                Rs. {(prod.retail_price || prod.price || 0).toLocaleString()}
                              </p>
                              {user?.pricing_tier === "wholesale" && prod.wholesale_price && (
                                <p className="text-[10px] text-emerald-600 font-bold">
                                  Wholesale: Rs. {prod.wholesale_price.toLocaleString()}
                                </p>
                              )}
                              {user?.pricing_tier === "technician" && prod.technician_price && (
                                <p className="text-[10px] text-blue-600 font-bold">
                                  Tech Rate: Rs. {prod.technician_price.toLocaleString()}
                                </p>
                              )}
                            </div>

                            <button
                              onClick={() => handleAddToCart(prod)}
                              disabled={(prod.stock || prod.stock_quantity || 0) <= 0}
                              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                isAdded
                                  ? "bg-emerald-600 text-white"
                                  : "bg-secondary hover:bg-secondary-dark text-white disabled:opacity-40"
                              }`}
                            >
                              {isAdded ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Added</span>
                                </>
                              ) : (
                                <>
                                  <ShoppingCart className="w-3.5 h-3.5" />
                                  <span>Add</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-12 text-center text-slate-400 border border-slate-200">
                Select a smartphone model to view its verified spare parts catalog.
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
