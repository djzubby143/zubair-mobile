"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Boxes,
  Plus,
  Search,
  AlertTriangle,
  ArrowUpRight,
  TrendingDown,
  History,
  Building2,
  Package,
  CheckCircle2,
  X,
  FileText,
  DollarSign,
  Truck,
  Phone,
  MapPin,
  RefreshCw,
  Edit2,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { Product } from "@/lib/types";
import {
  Supplier,
  PurchaseEntry,
  PurchaseItem,
  getSuppliers,
  saveSupplier,
  deleteSupplier,
  getPurchases,
  savePurchaseEntry,
  adjustProductStock,
  getLowStockProducts,
  DEFAULT_SUPPLIERS,
} from "@/lib/inventory";
import { DEFAULT_CATALOG_PRODUCTS } from "@/lib/products";
import { getCustomProducts } from "@/lib/customProducts";
import { supabase } from "@/lib/supabase";

export default function AdminInventoryPage() {
  const [activeTab, setActiveTab] = useState<"stock" | "new-purchase" | "purchases" | "suppliers">("stock");

  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<PurchaseEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "out" | "instock">("all");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Quick Stock Adjustment Modal
  const [adjustTarget, setAdjustTarget] = useState<Product | null>(null);
  const [newStockVal, setNewStockVal] = useState<number>(0);

  // View Purchase Modal
  const [viewPurchaseTarget, setViewPurchaseTarget] = useState<PurchaseEntry | null>(null);

  // Supplier Modal (Add / Edit)
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Partial<Supplier> | null>(null);

  // New Purchase Form State
  const [purchaseForm, setPurchaseForm] = useState<{
    supplier_id: string;
    supplier_name: string;
    reference_invoice_no: string;
    purchase_date: string;
    payment_status: "paid" | "partial" | "unpaid";
    payment_method: string;
    paid_amount: number;
    notes: string;
    items: PurchaseItem[];
  }>({
    supplier_id: "",
    supplier_name: "",
    reference_invoice_no: "",
    purchase_date: new Date().toISOString().split("T")[0],
    payment_status: "paid",
    payment_method: "Cash",
    paid_amount: 0,
    notes: "",
    items: [],
  });

  // Current Item in Purchase Form Builder
  const [selectedProdId, setSelectedProdId] = useState("");
  const [itemQty, setItemQty] = useState<number>(10);
  const [itemCost, setItemCost] = useState<number>(0);
  const [itemWholesale, setItemWholesale] = useState<number>(0);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load all products, suppliers, and purchases
  const loadAllData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Products
      let loadedProducts: Product[] = [];
      try {
        const { data: dbData } = await supabase
          .from("products")
          .select("*, category:categories(*)")
          .order("name", { ascending: true });

        if (dbData && dbData.length > 0) {
          loadedProducts = dbData as Product[];
        }
      } catch (err) {
        console.warn("Notice reading products Supabase:", err);
      }

      const customs = getCustomProducts();
      const pMap = new Map<string, Product>();

      for (const p of customs) {
        const key = (p.sku || p.id || p.name).toLowerCase();
        pMap.set(key, p);
      }
      for (const p of loadedProducts) {
        const key = (p.sku || p.id || p.name).toLowerCase();
        if (!pMap.has(key)) pMap.set(key, p);
      }
      for (const p of DEFAULT_CATALOG_PRODUCTS) {
        const key = (p.sku || p.id || p.name).toLowerCase();
        if (!pMap.has(key)) pMap.set(key, p);
      }

      setProducts(Array.from(pMap.values()));

      // 2. Fetch Suppliers
      const supList = await getSuppliers();
      setSuppliers(supList);
      if (supList.length > 0 && !purchaseForm.supplier_id) {
        setPurchaseForm((prev) => ({
          ...prev,
          supplier_id: supList[0].id,
          supplier_name: supList[0].name,
        }));
      }

      // 3. Fetch Purchases
      const purList = await getPurchases();
      setPurchases(purList);
    } catch (err) {
      console.error("Error loading inventory data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();

    const handleUpdate = () => {
      loadAllData();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("zubair_inventory_updated", handleUpdate);
      window.addEventListener("zubair_suppliers_updated", handleUpdate);
      window.addEventListener("zubair_purchases_updated", handleUpdate);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("zubair_inventory_updated", handleUpdate);
        window.removeEventListener("zubair_suppliers_updated", handleUpdate);
        window.removeEventListener("zubair_purchases_updated", handleUpdate);
      }
    };
  }, []);

  // Summary KPIs
  const stats = useMemo(() => {
    let totalStockUnits = 0;
    let totalStockValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const p of products) {
      const qty = Number(p.stock_quantity) || 0;
      const cost = Number(p.purchase_price) || Math.round(Number(p.price) * 0.78) || 0;
      totalStockUnits += qty;
      totalStockValue += qty * cost;
      if (qty === 0) {
        outOfStockCount++;
      } else if (qty <= 5) {
        lowStockCount++;
      }
    }

    const totalPurchasesCost = purchases.reduce((acc, p) => acc + (Number(p.total_amount) || 0), 0);

    return {
      totalStockUnits,
      totalStockValue,
      lowStockCount,
      outOfStockCount,
      totalPurchasesCost,
    };
  }, [products, purchases]);

  // Filtered products for stock table
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return products.filter((p) => {
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.category?.name && p.category.name.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      const qty = Number(p.stock_quantity) || 0;
      if (stockFilter === "low") return qty > 0 && qty <= 5;
      if (stockFilter === "out") return qty === 0;
      if (stockFilter === "instock") return qty > 5;
      return true;
    });
  }, [products, searchQuery, stockFilter]);

  // Handle Quick Stock Save
  const handleSaveStockAdjustment = async () => {
    if (!adjustTarget) return;
    try {
      await adjustProductStock(adjustTarget.id, newStockVal, adjustTarget.sku);
      showToast(`Stock updated for ${adjustTarget.name} to ${newStockVal} units.`);
      setAdjustTarget(null);
      loadAllData();
    } catch (err) {
      console.error("Failed to adjust stock:", err);
    }
  };

  // Pre-fill item purchase defaults when selecting product
  const handleSelectProductForPurchase = (prodId: string) => {
    setSelectedProdId(prodId);
    const prod = products.find((p) => p.id === prodId);
    if (prod) {
      const cost = prod.purchase_price ? Number(prod.purchase_price) : Math.round(Number(prod.price) * 0.78);
      setItemCost(cost);
      setItemWholesale(Number(prod.wholesale_price || prod.price) || 0);
    }
  };

  // Add Item to Purchase Draft
  const handleAddItemToPurchase = () => {
    if (!selectedProdId) {
      alert("Please select a product first.");
      return;
    }
    const prod = products.find((p) => p.id === selectedProdId);
    if (!prod) return;

    if (itemQty <= 0) {
      alert("Quantity must be greater than 0.");
      return;
    }

    const subtotal = itemQty * itemCost;
    const newItem: PurchaseItem = {
      product_id: prod.id,
      product_name: prod.name,
      sku: prod.sku || `ZB-${prod.name.slice(0, 4).toUpperCase()}`,
      quantity: Number(itemQty),
      purchase_price: Number(itemCost),
      wholesale_price: Number(itemWholesale) || undefined,
      subtotal,
    };

    setPurchaseForm((prev) => {
      const updatedItems = [...prev.items, newItem];
      const sumAmount = updatedItems.reduce((acc, i) => acc + i.subtotal, 0);
      return {
        ...prev,
        items: updatedItems,
        paid_amount: prev.payment_status === "paid" ? sumAmount : prev.paid_amount,
      };
    });

    // Reset picker
    setSelectedProdId("");
    setItemQty(10);
    setItemCost(0);
    setItemWholesale(0);
  };

  const handleRemovePurchaseItem = (index: number) => {
    setPurchaseForm((prev) => {
      const updated = prev.items.filter((_, i) => i !== index);
      const sumAmount = updated.reduce((acc, i) => acc + i.subtotal, 0);
      return {
        ...prev,
        items: updated,
        paid_amount: prev.payment_status === "paid" ? sumAmount : Math.min(prev.paid_amount, sumAmount),
      };
    });
  };

  // Submit Completed Purchase Order -> Automatically increases stock!
  const handleSubmitPurchaseEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (purchaseForm.items.length === 0) {
      alert("Please add at least one product item to this purchase entry.");
      return;
    }

    const totalQty = purchaseForm.items.reduce((acc, i) => acc + i.quantity, 0);
    const totalAmount = purchaseForm.items.reduce((acc, i) => acc + i.subtotal, 0);

    const sup = suppliers.find((s) => s.id === purchaseForm.supplier_id);
    const supplierName = sup ? sup.name : purchaseForm.supplier_name || "General Supplier";

    const entry: PurchaseEntry = {
      id: `po-${Date.now()}`,
      purchase_number: `PO-${Math.floor(1000 + Math.random() * 9000)}`,
      supplier_id: purchaseForm.supplier_id || undefined,
      supplier_name: supplierName,
      purchase_date: new Date(purchaseForm.purchase_date).toISOString(),
      reference_invoice_no: purchaseForm.reference_invoice_no || `BILTY-${Date.now().toString().slice(-6)}`,
      items: purchaseForm.items,
      total_items: totalQty,
      total_amount: totalAmount,
      paid_amount: Number(purchaseForm.paid_amount) || 0,
      payment_status: purchaseForm.payment_status,
      payment_method: purchaseForm.payment_method,
      status: "received",
      notes: purchaseForm.notes || undefined,
      created_at: new Date().toISOString(),
    };

    try {
      await savePurchaseEntry(entry);
      showToast(`Purchase #${entry.purchase_number} saved! Stock increased by +${totalQty} items.`);
      // Reset form
      setPurchaseForm({
        supplier_id: suppliers[0]?.id || "",
        supplier_name: suppliers[0]?.name || "",
        reference_invoice_no: "",
        purchase_date: new Date().toISOString().split("T")[0],
        payment_status: "paid",
        payment_method: "Cash",
        paid_amount: 0,
        notes: "",
        items: [],
      });
      setActiveTab("purchases");
      loadAllData();
    } catch (err) {
      console.error("Failed to save purchase:", err);
      alert("Failed to save purchase entry. Please try again.");
    }
  };

  // Save Supplier
  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier?.name || !editingSupplier?.phone) {
      alert("Supplier name and phone are required.");
      return;
    }

    const supRecord: Supplier = {
      id: editingSupplier.id || `sup-${Date.now()}`,
      name: editingSupplier.name.trim(),
      contact_person: editingSupplier.contact_person?.trim() || undefined,
      phone: editingSupplier.phone.trim(),
      email: editingSupplier.email?.trim() || undefined,
      city: editingSupplier.city?.trim() || "Lahore",
      address: editingSupplier.address?.trim() || undefined,
      payment_terms: editingSupplier.payment_terms || "Cash",
      notes: editingSupplier.notes?.trim() || undefined,
      created_at: editingSupplier.created_at || new Date().toISOString(),
    };

    try {
      await saveSupplier(supRecord);
      showToast(`Supplier ${supRecord.name} saved!`);
      setSupplierModalOpen(false);
      setEditingSupplier(null);
      loadAllData();
    } catch (err) {
      console.error("Failed to save supplier:", err);
    }
  };

  const handleDeleteSupplier = async (supId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete supplier "${name}"?`)) return;
    try {
      await deleteSupplier(supId);
      showToast(`Supplier "${name}" deleted.`);
      loadAllData();
    } catch (err) {
      console.error("Failed to delete supplier:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-700 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-primary tracking-tight flex items-center gap-2.5">
            <Boxes className="w-6 h-6 text-secondary" />
            <span>Inventory & Purchase Management</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track stock quantities, record supplier purchases, automate stock in/out, and manage suppliers.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setActiveTab("new-purchase")}
            className="inline-flex items-center gap-2 bg-[#dc2626] hover:bg-[#b91c1c] text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Purchase Entry</span>
          </button>
          <button
            type="button"
            onClick={loadAllData}
            title="Refresh Data"
            className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-primary hover:bg-slate-50 shadow-2xs transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Card 1: Total Units */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] uppercase font-bold text-slate-400">Total Stock</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-primary mt-2">
            {stats.totalStockUnits.toLocaleString("en-PK")} <span className="text-xs font-semibold text-slate-400">Pcs</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Across {products.length} catalog parts</span>
        </div>

        {/* Card 2: Inventory Value */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] uppercase font-bold text-slate-400">Stock Valuation</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#16a34a] mt-2">
            Rs. {stats.totalStockValue.toLocaleString("en-PK")}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">At purchase cost basis</span>
        </div>

        {/* Card 3: Low Stock Alert */}
        <div
          onClick={() => {
            setActiveTab("stock");
            setStockFilter("low");
          }}
          className={`bg-white rounded-2xl border p-4 shadow-2xs cursor-pointer transition-all ${
            stats.lowStockCount > 0
              ? "border-amber-300 hover:border-amber-400 bg-amber-50/20"
              : "border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] uppercase font-bold text-amber-700">Low Stock Alert</span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-700 mt-2">
            {stats.lowStockCount} <span className="text-xs font-semibold text-amber-600">Items</span>
          </div>
          <span className="text-[10px] text-amber-600 font-medium mt-1 block">&le; 5 units remaining (Click to view)</span>
        </div>

        {/* Card 4: Out of Stock */}
        <div
          onClick={() => {
            setActiveTab("stock");
            setStockFilter("out");
          }}
          className={`bg-white rounded-2xl border p-4 shadow-2xs cursor-pointer transition-all ${
            stats.outOfStockCount > 0
              ? "border-red-300 hover:border-red-400 bg-red-50/20"
              : "border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] uppercase font-bold text-red-600">Out of Stock</span>
            <div className="w-7 h-7 rounded-lg bg-red-100 text-red-700 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#dc2626] mt-2">
            {stats.outOfStockCount} <span className="text-xs font-semibold text-red-500">Items</span>
          </div>
          <span className="text-[10px] text-red-500 font-medium mt-1 block">0 units remaining (Click to view)</span>
        </div>
      </div>

      {/* Low Stock Urgent Banner (if items exist) */}
      {stats.lowStockCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-950">
                Warning: {stats.lowStockCount} mobile spare parts are running low in stock!
              </p>
              <p className="text-[11px] text-amber-800">
                Create a purchase entry to restock and prevent checkout delays.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab("new-purchase")}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-2xs shrink-0"
          >
            <span>Create Purchase Order</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab("stock")}
          className={`pb-3 px-3 text-xs font-bold transition-all flex items-center gap-2 border-b-2 ${
            activeTab === "stock"
              ? "border-[#dc2626] text-[#dc2626]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Stock Tracking ({products.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("new-purchase")}
          className={`pb-3 px-3 text-xs font-bold transition-all flex items-center gap-2 border-b-2 ${
            activeTab === "new-purchase"
              ? "border-[#dc2626] text-[#dc2626]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>Add Purchase Entry</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("purchases")}
          className={`pb-3 px-3 text-xs font-bold transition-all flex items-center gap-2 border-b-2 ${
            activeTab === "purchases"
              ? "border-[#dc2626] text-[#dc2626]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <History className="w-4 h-4" />
          <span>Purchase History ({purchases.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("suppliers")}
          className={`pb-3 px-3 text-xs font-bold transition-all flex items-center gap-2 border-b-2 ${
            activeTab === "suppliers"
              ? "border-[#dc2626] text-[#dc2626]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Suppliers Directory ({suppliers.length})</span>
        </button>
      </div>

      {/* TAB 1: STOCK TRACKING */}
      {activeTab === "stock" && (
        <div className="space-y-4">
          {/* Search & Stock Filter Toolbar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:max-w-md">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search stock by part name, SKU (e.g. ZB-LCD), category..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-surface text-xs text-charcoal focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#dc2626]"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>

            {/* Quick Status Filter Pills */}
            <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto">
              <button
                type="button"
                onClick={() => setStockFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  stockFilter === "all"
                    ? "bg-[#111827] text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All ({products.length})
              </button>
              <button
                type="button"
                onClick={() => setStockFilter("low")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  stockFilter === "low"
                    ? "bg-amber-600 text-white shadow-2xs"
                    : "bg-amber-50 text-amber-800 hover:bg-amber-100"
                }`}
              >
                Low Stock ({stats.lowStockCount})
              </button>
              <button
                type="button"
                onClick={() => setStockFilter("out")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  stockFilter === "out"
                    ? "bg-red-600 text-white shadow-2xs"
                    : "bg-red-50 text-red-700 hover:bg-red-100"
                }`}
              >
                Out of Stock ({stats.outOfStockCount})
              </button>
              <button
                type="button"
                onClick={() => setStockFilter("instock")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  stockFilter === "instock"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                }`}
              >
                In Stock
              </button>
            </div>
          </div>

          {/* Stock Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[10.5px] uppercase font-bold text-slate-500 tracking-wider">
                    <th className="py-3 px-4">Item & SKU</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Purchase Cost</th>
                    <th className="py-3 px-4">Wholesale Rate</th>
                    <th className="py-3 px-4">Current Stock</th>
                    <th className="py-3 px-4">Stock Status</th>
                    <th className="py-3 px-4 text-right">Adjust Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        No products match your search or filter.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      const qty = Number(p.stock_quantity) || 0;
                      const isLow = qty > 0 && qty <= 5;
                      const isOut = qty === 0;

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 max-w-xs">
                            <span className="font-bold text-slate-900 block truncate" title={p.name}>
                              {p.name}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400">{p.sku}</span>
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-medium">
                              {p.category?.name || "Spare Part"}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-700">
                            Rs. {Number(p.purchase_price || Math.round(Number(p.price) * 0.78)).toLocaleString("en-PK")}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-emerald-700">
                            Rs. {Number(p.wholesale_price || p.price).toLocaleString("en-PK")}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-black text-sm text-slate-900">{qty}</span>{" "}
                            <span className="text-[10px] text-slate-400">pcs</span>
                          </td>
                          <td className="py-3 px-4">
                            {isOut ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                                Out of Stock
                              </span>
                            ) : isLow ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                Low Stock ({qty})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                In Stock
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setAdjustTarget(p);
                                setNewStockVal(qty);
                              }}
                              className="px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-colors inline-flex items-center gap-1"
                            >
                              <Edit2 className="w-3 h-3 text-slate-400" />
                              <span>Update</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ADD PURCHASE ENTRY */}
      {activeTab === "new-purchase" && (
        <form onSubmit={handleSubmitPurchaseEntry} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Form Info + Items Table */}
            <div className="lg:col-span-2 space-y-6">
              {/* Shipment / Supplier Information */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#dc2626]" />
                  <span>Supplier & Shipment Information</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Supplier Select */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Supplier</label>
                    <select
                      value={purchaseForm.supplier_id}
                      onChange={(e) => {
                        const sup = suppliers.find((s) => s.id === e.target.value);
                        setPurchaseForm((prev) => ({
                          ...prev,
                          supplier_id: e.target.value,
                          supplier_name: sup ? sup.name : "",
                        }));
                      }}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-surface focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#dc2626]"
                    >
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.city})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Reference / Invoice / Bilty # */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Supplier Bilty / Invoice #
                    </label>
                    <input
                      type="text"
                      value={purchaseForm.reference_invoice_no}
                      onChange={(e) =>
                        setPurchaseForm((prev) => ({ ...prev, reference_invoice_no: e.target.value }))
                      }
                      placeholder="e.g. DAEWOO-8921 / INV-402"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-surface focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#dc2626]"
                    />
                  </div>

                  {/* Date */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Purchase Date</label>
                    <input
                      type="date"
                      value={purchaseForm.purchase_date}
                      onChange={(e) =>
                        setPurchaseForm((prev) => ({ ...prev, purchase_date: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-surface focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#dc2626]"
                    />
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method</label>
                    <select
                      value={purchaseForm.payment_method}
                      onChange={(e) =>
                        setPurchaseForm((prev) => ({ ...prev, payment_method: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-surface focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#dc2626]"
                    >
                      <option value="Cash">Cash</option>
                      <option value="Bank Transfer">Bank Transfer (HBL / Meezan)</option>
                      <option value="JazzCash / EasyPaisa">JazzCash / EasyPaisa</option>
                      <option value="Cargo COD">Cargo COD (Cash on Delivery)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Items Picker Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#dc2626]" />
                  <span>Add Received Spare Parts</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {/* Product Picker */}
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Select Product</label>
                    <select
                      value={selectedProdId}
                      onChange={(e) => handleSelectProductForPurchase(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-surface focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#dc2626]"
                    >
                      <option value="">-- Choose Spare Part --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku}) - Cur Stock: {p.stock_quantity}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Received Qty (Pcs)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={itemQty}
                      onChange={(e) => setItemQty(Math.max(1, Number(e.target.value) || 1))}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-surface focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#dc2626]"
                    />
                  </div>

                  {/* Purchase Cost */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Unit Cost (Rs.)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={itemCost}
                      onChange={(e) => setItemCost(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-surface focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#dc2626]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-500">
                    Line Total: <strong className="text-slate-900 font-mono">Rs. {(itemQty * itemCost).toLocaleString("en-PK")}</strong>
                  </span>

                  <button
                    type="button"
                    onClick={handleAddItemToPurchase}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-2xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item to Purchase</span>
                  </button>
                </div>

                {/* Items Added Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden mt-3">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                        <th className="py-2.5 px-3">Part Name</th>
                        <th className="py-2.5 px-3">SKU</th>
                        <th className="py-2.5 px-3">Qty</th>
                        <th className="py-2.5 px-3">Cost / Unit</th>
                        <th className="py-2.5 px-3">Subtotal</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {purchaseForm.items.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                            No parts added yet. Select a product above and click &quot;Add Item&quot;.
                          </td>
                        </tr>
                      ) : (
                        purchaseForm.items.map((it, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/60">
                            <td className="py-2.5 px-3 font-semibold text-slate-900">{it.product_name}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-400 text-[10.5px]">{it.sku}</td>
                            <td className="py-2.5 px-3 font-black text-slate-900">+{it.quantity}</td>
                            <td className="py-2.5 px-3 font-mono">Rs. {it.purchase_price.toLocaleString("en-PK")}</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">
                              Rs. {it.subtotal.toLocaleString("en-PK")}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemovePurchaseItem(idx)}
                                className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Col: Bill Summary & Submit */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                  Purchase Order Summary
                </h3>

                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Total Unique Lines:</span>
                    <strong className="text-slate-900">{purchaseForm.items.length}</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Total Units Added:</span>
                    <strong className="text-slate-900 font-bold">
                      {purchaseForm.items.reduce((acc, i) => acc + i.quantity, 0)} Pcs
                    </strong>
                  </div>
                  <div className="border-t border-slate-100 pt-2 flex items-center justify-between text-base font-black">
                    <span className="text-slate-900">Total Payable:</span>
                    <span className="text-[#16a34a] font-mono">
                      Rs. {purchaseForm.items.reduce((acc, i) => acc + i.subtotal, 0).toLocaleString("en-PK")}
                    </span>
                  </div>
                </div>

                {/* Payment Status */}
                <div className="border-t border-slate-100 pt-3 space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Payment Status</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(["paid", "partial", "unpaid"] as const).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => {
                            const tot = purchaseForm.items.reduce((acc, i) => acc + i.subtotal, 0);
                            setPurchaseForm((prev) => ({
                              ...prev,
                              payment_status: st,
                              paid_amount: st === "paid" ? tot : st === "unpaid" ? 0 : prev.paid_amount,
                            }));
                          }}
                          className={`py-1.5 rounded-lg text-xs font-bold uppercase transition-colors ${
                            purchaseForm.payment_status === st
                              ? "bg-slate-900 text-white shadow-2xs"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>

                  {purchaseForm.payment_status === "partial" && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Paid Amount (Rs.)</label>
                      <input
                        type="number"
                        min={0}
                        value={purchaseForm.paid_amount}
                        onChange={(e) =>
                          setPurchaseForm((prev) => ({ ...prev, paid_amount: Number(e.target.value) || 0 }))
                        }
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-surface focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#dc2626]"
                      />
                    </div>
                  )}

                  {/* Notes */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Notes / Remarks</label>
                    <textarea
                      rows={2}
                      value={purchaseForm.notes}
                      onChange={(e) => setPurchaseForm((prev) => ({ ...prev, notes: e.target.value }))}
                      placeholder="e.g. Daewoo cargo bilty attached, carton 3 of 4 received"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-surface focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#dc2626]"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={purchaseForm.items.length === 0}
                  className="w-full py-3 rounded-xl bg-[#dc2626] hover:bg-[#b91c1c] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Receive Shipment & Increase Stock</span>
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* TAB 3: PURCHASE HISTORY */}
      {activeTab === "purchases" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase">Received Shipments History</h3>
                <p className="text-[11px] text-slate-500">
                  Every purchase automatically increased product stock upon reception.
                </p>
              </div>
              <span className="text-xs font-bold text-slate-500">
                Total Purchases: Rs. {stats.totalPurchasesCost.toLocaleString("en-PK")}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                    <th className="py-3 px-4">PO #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Supplier</th>
                    <th className="py-3 px-4">Bilty / Inv #</th>
                    <th className="py-3 px-4">Total Items</th>
                    <th className="py-3 px-4">Total Amount</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4 text-right">View Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {purchases.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        No purchase history found.
                      </td>
                    </tr>
                  ) : (
                    purchases.map((po) => (
                      <tr key={po.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-[#dc2626]">{po.purchase_number}</td>
                        <td className="py-3 px-4 text-slate-500">
                          {new Date(po.purchase_date).toLocaleDateString("en-PK", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">{po.supplier_name}</td>
                        <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                          {po.reference_invoice_no || "N/A"}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800">{po.total_items} pcs</td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-700">
                          Rs. {Number(po.total_amount).toLocaleString("en-PK")}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              po.payment_status === "paid"
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : po.payment_status === "partial"
                                ? "bg-amber-50 text-amber-800 border border-amber-200"
                                : "bg-red-50 text-red-800 border border-red-200"
                            }`}
                          >
                            {po.payment_status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setViewPurchaseTarget(po)}
                            className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-slate-700 text-[11px] font-bold shadow-2xs transition-colors"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SUPPLIERS DIRECTORY */}
      {activeTab === "suppliers" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase">Registered Suppliers</h3>
              <p className="text-[11px] text-slate-500">
                Directory of wholesale importers and spare part distributors.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingSupplier({
                  id: `sup-${Date.now()}`,
                  name: "",
                  contact_person: "",
                  phone: "",
                  city: "Lahore",
                  address: "",
                  payment_terms: "Cash",
                  notes: "",
                });
                setSupplierModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-secondary hover:bg-secondary-hover text-white text-xs font-bold rounded-xl shadow-2xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Supplier</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliers.map((sup) => (
              <div
                key={sup.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-sm text-slate-900 leading-snug">{sup.name}</h4>
                    <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded shrink-0">
                      {sup.city}
                    </span>
                  </div>
                  {sup.contact_person && (
                    <p className="text-xs text-slate-500 mt-1">Contact: {sup.contact_person}</p>
                  )}
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-2.5">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-mono">{sup.phone}</span>
                  </div>
                  {sup.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="text-[11px] text-slate-500 line-clamp-2">{sup.address}</span>
                    </div>
                  )}
                  {sup.payment_terms && (
                    <div className="text-[10.5px] text-slate-400">
                      Terms: <span className="font-semibold text-slate-700">{sup.payment_terms}</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-100 pt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSupplier(sup);
                      setSupplierModalOpen(true);
                    }}
                    className="text-xs font-bold text-slate-600 hover:text-primary transition-colors flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSupplier(sup.id, sup.name)}
                    className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 1: QUICK STOCK ADJUSTMENT */}
      {adjustTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-sm p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 uppercase">Adjust Part Stock</h3>
              <button
                type="button"
                onClick={() => setAdjustTarget(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <p className="font-bold text-xs text-slate-900">{adjustTarget.name}</p>
              <p className="text-[10.5px] font-mono text-slate-400">{adjustTarget.sku}</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">New Stock Quantity (Pcs)</label>
              <input
                type="number"
                min={0}
                value={newStockVal}
                onChange={(e) => setNewStockVal(Math.max(0, Number(e.target.value) || 0))}
                className="w-full px-3 py-2 text-base font-black text-slate-900 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#dc2626]"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAdjustTarget(null)}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveStockAdjustment}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-[#dc2626] hover:bg-[#b91c1c] transition-colors shadow-2xs"
              >
                Save Stock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: VIEW PURCHASE DETAIL */}
      {viewPurchaseTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl p-5 space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-mono text-[#dc2626] font-bold">
                  {viewPurchaseTarget.purchase_number}
                </span>
                <h3 className="text-sm font-black text-slate-900 uppercase">
                  {viewPurchaseTarget.supplier_name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewPurchaseTarget(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Invoice / Bilty</span>
                <span className="font-mono font-bold text-slate-800">
                  {viewPurchaseTarget.reference_invoice_no || "N/A"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Date</span>
                <span className="font-bold text-slate-800">
                  {new Date(viewPurchaseTarget.purchase_date).toLocaleDateString("en-PK")}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Payment Status</span>
                <span className="font-bold text-slate-800 uppercase">{viewPurchaseTarget.payment_status}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Payment Method</span>
                <span className="font-bold text-slate-800">{viewPurchaseTarget.payment_method}</span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">Shipment Contents</h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-[10px] uppercase font-bold text-slate-500">
                      <th className="p-2">Part Name</th>
                      <th className="p-2">SKU</th>
                      <th className="p-2">Qty</th>
                      <th className="p-2">Cost</th>
                      <th className="p-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {viewPurchaseTarget.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="p-2 font-medium">{it.product_name}</td>
                        <td className="p-2 font-mono text-slate-400 text-[10.5px]">{it.sku}</td>
                        <td className="p-2 font-bold text-slate-900">+{it.quantity}</td>
                        <td className="p-2 font-mono">Rs. {it.purchase_price.toLocaleString("en-PK")}</td>
                        <td className="p-2 font-mono font-bold text-emerald-700 text-right">
                          Rs. {it.subtotal.toLocaleString("en-PK")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
              <span className="text-xs text-slate-500">Total Purchase Investment:</span>
              <span className="text-lg font-black text-emerald-700 font-mono">
                Rs. {Number(viewPurchaseTarget.total_amount).toLocaleString("en-PK")}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD / EDIT SUPPLIER */}
      {supplierModalOpen && editingSupplier && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveSupplier}
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md p-5 space-y-4 animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 uppercase">
                {editingSupplier.name ? "Edit Supplier" : "Add New Supplier"}
              </h3>
              <button
                type="button"
                onClick={() => setSupplierModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Company / Supplier Name *</label>
                <input
                  type="text"
                  required
                  value={editingSupplier.name || ""}
                  onChange={(e) => setEditingSupplier((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Hall Road Tech Traders"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-surface focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#dc2626]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Contact Person</label>
                <input
                  type="text"
                  value={editingSupplier.contact_person || ""}
                  onChange={(e) => setEditingSupplier((prev) => ({ ...prev, contact_person: e.target.value }))}
                  placeholder="e.g. Haji Abdul Rehman"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-surface focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#dc2626]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone / WhatsApp *</label>
                  <input
                    type="text"
                    required
                    value={editingSupplier.phone || ""}
                    onChange={(e) => setEditingSupplier((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="0300-1234567"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-surface focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#dc2626]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={editingSupplier.city || "Lahore"}
                    onChange={(e) => setEditingSupplier((prev) => ({ ...prev, city: e.target.value }))}
                    placeholder="Lahore / Karachi"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-surface focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#dc2626]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Address / Market</label>
                <input
                  type="text"
                  value={editingSupplier.address || ""}
                  onChange={(e) => setEditingSupplier((prev) => ({ ...prev, address: e.target.value }))}
                  placeholder="e.g. Shop # 14, Hall Road, Lahore"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-surface focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#dc2626]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Terms</label>
                <input
                  type="text"
                  value={editingSupplier.payment_terms || "Cash"}
                  onChange={(e) => setEditingSupplier((prev) => ({ ...prev, payment_terms: e.target.value }))}
                  placeholder="e.g. Cash / 15 Days Credit"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-surface focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#dc2626]"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSupplierModalOpen(false)}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-[#dc2626] hover:bg-[#b91c1c] transition-colors shadow-2xs"
              >
                Save Supplier
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
