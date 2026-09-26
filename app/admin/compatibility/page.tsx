"use client";

import React, { useState, useEffect } from "react";
import {
  Smartphone,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Layers,
  Wrench,
  Cpu,
  Battery,
  Camera,
  Radio,
  Trash2,
} from "lucide-react";
import { CompatibilityDevice, Product } from "@/lib/types";
import { getSupportedDevices, getDeviceParts, registerDeviceModel } from "@/lib/compatibility";

export default function AdminCompatibilityPage() {
  const [devices, setDevices] = useState<CompatibilityDevice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<CompatibilityDevice | null>(null);
  const [deviceParts, setDeviceParts] = useState<{ [category: string]: Product[] }>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [filterBrand, setFilterBrand] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // New device form
  const [newBrand, setNewBrand] = useState("Samsung");
  const [newSeries, setNewSeries] = useState("Galaxy A");
  const [newModelName, setNewModelName] = useState("");
  const [newModelCode, setNewModelCode] = useState("");
  const [newReleaseYear, setNewReleaseYear] = useState<number>(2024);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const devs = await getSupportedDevices();
        setDevices(devs);
        if (devs.length > 0) {
          setSelectedDevice(devs[0]);
        }

        const res = await fetch("/api/admin/products");
        if (res.ok) {
          const resJson = await res.json();
          const prods: Product[] = Array.isArray(resJson)
            ? resJson
            : resJson.products || resJson.customProducts || [];
          setProducts(prods);
        }
      } catch (err) {
        console.error("Error loading compatibility data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (selectedDevice && products.length > 0) {
      const parts = getDeviceParts(selectedDevice, products);
      setDeviceParts(parts);
    }
  }, [selectedDevice, products]);

  const filteredDevices = devices.filter((d) => {
    const matchesBrand = filterBrand === "all" || d.brand.toLowerCase() === filterBrand.toLowerCase();
    const mName = (d.model_name || d.model || "").toLowerCase();
    const mCode = (d.model_code || (d.compatible_models_alias && d.compatible_models_alias[0]) || "").toLowerCase();
    const matchesSearch =
      mName.includes(searchQuery.toLowerCase()) ||
      mCode.includes(searchQuery.toLowerCase()) ||
      Boolean(d.series && d.series.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesBrand && matchesSearch;
  });

  const handleAddDevice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModelName.trim()) return;

    const newDev: CompatibilityDevice = {
      id: `dev-${Date.now()}`,
      brand: newBrand,
      series: newSeries,
      model: newModelName.trim(),
      model_name: newModelName.trim(),
      model_code: newModelCode.trim() || newModelName.trim(),
      release_year: newReleaseYear,
      image_url: "/placeholder-phone.png",
      aliases: [newModelName.toLowerCase()],
      compatible_models_alias: [newModelCode.trim() || newModelName.trim()],
    };

    registerDeviceModel(newDev);
    setDevices((prev) => [newDev, ...prev]);
    setSelectedDevice(newDev);
    setModalSuccess(`Added ${newBrand} ${newModelName} successfully!`);
    setTimeout(() => {
      setModalSuccess(null);
      setShowAddModal(false);
      setNewModelName("");
      setNewModelCode("");
    }, 1500);
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat.toLowerCase()) {
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
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-primary to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-2 bg-red-600/30 border border-red-500/40 rounded-xl">
              <Smartphone className="w-5 h-5 text-red-400" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">Product Compatibility Engine</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-300">
            Map spare parts across device generations. Customers and technicians can instantly find all LCDs, batteries, flexes & ICs matching any phone model.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-secondary hover:bg-secondary-dark text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Phone Model
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Device Picker Column */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Supported Devices</h2>
              <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                {filteredDevices.length} models
              </span>
            </div>

            {/* Search and Brand Filter */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search model (e.g. A54, 13 Pro)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-secondary"
                />
              </div>

              <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
                {["all", "Apple", "Samsung", "Vivo", "Oppo", "Infinix", "Xiaomi", "Tecno"].map((b) => (
                  <button
                    key={b}
                    onClick={() => setFilterBrand(b)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg whitespace-nowrap transition-all ${
                      filterBrand.toLowerCase() === b.toLowerCase()
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {b === "all" ? "All Brands" : b}
                  </button>
                ))}
              </div>
            </div>

            {/* Device list */}
            <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
              {filteredDevices.map((dev) => (
                <div
                  key={dev.id}
                  onClick={() => setSelectedDevice(dev)}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    selectedDevice?.id === dev.id
                      ? "bg-red-50/70 border-red-300 ring-2 ring-red-400/20 shadow-xs"
                      : "bg-white hover:bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-slate-900">{dev.model_name || dev.model}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold uppercase">
                      {dev.brand}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                    <span>{dev.series || dev.model_code || dev.model}</span>
                    <span>{dev.release_year || "All Versions"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mapped Parts Column */}
        <div className="lg:col-span-8 space-y-4">
          {selectedDevice ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-5">
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
                    <Smartphone className="w-6 h-6 text-slate-700" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black text-slate-900">{selectedDevice.model_name || selectedDevice.model}</h2>
                      <span className="text-xs px-2 py-0.5 bg-red-100 text-secondary font-bold rounded-md">
                        {selectedDevice.brand}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Code: <span className="font-mono text-slate-700">{selectedDevice.model_code || (selectedDevice.compatible_models_alias && selectedDevice.compatible_models_alias[0]) || selectedDevice.model}</span> | Series:{" "}
                      {selectedDevice.series || "Standard"}
                    </p>
                  </div>
                </div>

                <a
                  href={`/compatibility`}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-secondary hover:text-red-700"
                >
                  <span>Preview Customer View</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Categorized Parts Matrix */}
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-600">
                  Compatible Spare Parts Matrix
                </h3>

                {Object.keys(deviceParts).length === 0 ? (
                  <div className="p-8 text-center text-slate-400 border border-dashed rounded-xl">
                    <p className="text-xs font-semibold">
                      No products in current catalog specifically match &quot;{selectedDevice.model_name}&quot;.
                    </p>
                    <p className="text-[11px] mt-1 text-slate-400">
                      Ensure your product titles include either the brand, model name or model code.
                    </p>
                  </div>
                ) : (
                  Object.entries(deviceParts).map(([category, items]) => (
                    <div key={category} className="border border-slate-200 rounded-xl overflow-hidden">
                      <div className="bg-slate-50 px-4 py-2.5 flex items-center justify-between border-b border-slate-200">
                        <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                          {getCategoryIcon(category)}
                          <span>{category}</span>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-500">
                          {items.length} product(s) available
                        </span>
                      </div>

                      <div className="divide-y divide-slate-100">
                        {items.map((prod) => (
                          <div
                            key={prod.id}
                            className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                          >
                            <div className="min-w-0 pr-4">
                              <p className="text-xs font-bold text-slate-900 truncate">{prod.name}</p>
                              <div className="flex items-center gap-3 mt-0.5 text-[11px] text-slate-500">
                                <span>Stock: <strong className="text-slate-800">{prod.stock ?? prod.stock_quantity ?? 0}</strong></span>
                                <span>|</span>
                                <span>Category: {typeof prod.category === "object" && prod.category ? prod.category.name : (prod.category as any) || "General"}</span>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <p className="text-xs font-extrabold text-slate-900">
                                Rs. {prod.retail_price?.toLocaleString()}
                              </p>
                              <p className="text-[10px] text-emerald-600 font-semibold">
                                Wholesale: Rs. {prod.wholesale_price?.toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-12 text-center text-slate-400 border border-slate-200">
              Select a mobile device from the left panel to inspect its spare parts compatibility.
            </div>
          )}
        </div>
      </div>

      {/* Add Device Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Register New Device Model</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {modalSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {modalSuccess}
              </div>
            )}

            <form onSubmit={handleAddDevice} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Brand</label>
                <select
                  value={newBrand}
                  onChange={(e) => setNewBrand(e.target.value)}
                  className="w-full text-xs font-semibold p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                >
                  {["Samsung", "Apple", "Vivo", "Oppo", "Infinix", "Xiaomi", "Tecno", "Realme", "Google", "Huawei"].map(
                    (b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Series / Lineup</label>
                <input
                  type="text"
                  value={newSeries}
                  onChange={(e) => setNewSeries(e.target.value)}
                  placeholder="e.g. Galaxy S Series, iPhone 15 Series, Spark"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Model Name *</label>
                <input
                  type="text"
                  required
                  value={newModelName}
                  onChange={(e) => setNewModelName(e.target.value)}
                  placeholder="e.g. Galaxy S24 Ultra, iPhone 15 Pro Max"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Model Code (Hardware)</label>
                  <input
                    type="text"
                    value={newModelCode}
                    onChange={(e) => setNewModelCode(e.target.value)}
                    placeholder="e.g. SM-S928B, A3106"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Release Year</label>
                  <input
                    type="number"
                    value={newReleaseYear}
                    onChange={(e) => setNewReleaseYear(parseInt(e.target.value) || 2024)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-secondary text-white text-xs font-bold rounded-xl hover:bg-secondary-dark"
                >
                  Save Model
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
