"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Package,
  Search,
  Plus,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Edit2,
  Trash2,
  ExternalLink,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { Category, Product } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { DEFAULT_CATALOG_PRODUCTS } from "@/lib/products";
import { getLiveCategories } from "@/lib/categories";
import { getCustomProducts, getDeletedProductKeys, deleteProduct, isProductDeleted } from "@/lib/customProducts";

const SAMPLE_PRODUCTS: Product[] = [
  {
    id: "prod-1",
    name: "VIVO Y20 SUNLONG BLACK UNIT",
    slug: "vivo-y20-sunlong-black-unit",
    sku: "ZB-LCD-V20S",
    category_id: "cat-1",
    category: { id: "cat-1", name: "LCD & Touch Units", slug: "lcd-units" },
    price: 2650,
    purchase_price: 1950,
    stock_quantity: 45,
    is_active: true,
    featured: true,
  },
  {
    id: "prod-2",
    name: "VIVO Y20 (ZNF) Y21-Y33S-Y17S-Y22 BLACK UNIT",
    slug: "vivo-y20-znf-y21-y33s-y17s-y22-black-unit",
    sku: "ZB-LCD-V20ZNF",
    category_id: "cat-1",
    category: { id: "cat-1", name: "LCD & Touch Units", slug: "lcd-units" },
    price: 2850,
    purchase_price: 2100,
    stock_quantity: 30,
    is_active: true,
    featured: true,
  },
  {
    id: "prod-6",
    name: "VIVO Y20 BLACK OCA GLASS",
    slug: "vivo-y20-black-oca-glass",
    sku: "ZB-OCA-VY20",
    category_id: "cat-3",
    category: { id: "cat-3", name: "OCA Glass & Lens", slug: "oca-glass" },
    price: 450,
    purchase_price: 280,
    stock_quantity: 4, // Low stock demo
    is_active: true,
    featured: false,
  },
  {
    id: "prod-9",
    name: "VIVO Y20 IC CHARGING FLEX",
    slug: "vivo-y20-ic-charging-flex",
    sku: "ZB-FLX-VY20",
    category_id: "cat-2",
    category: { id: "cat-2", name: "Charging Flex & Boards", slug: "charging-flex" },
    price: 650,
    purchase_price: 420,
    stock_quantity: 65,
    is_active: true,
    featured: false,
  },
  {
    id: "prod-11",
    name: "VIVO Y91 (ZNF) Y93-Y95-Y90 BLACK UNIT",
    slug: "vivo-y91-znf-y93-y95-y90-black-unit",
    sku: "ZB-LCD-VY91",
    category_id: "cat-1",
    category: { id: "cat-1", name: "LCD & Touch Units", slug: "lcd-units" },
    price: 2150,
    purchase_price: 1600,
    stock_quantity: 0, // Out of stock demo
    is_active: false,
    featured: false,
  },
];

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Deletion State
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Categories (merged with defaults + local + Supabase)
      const liveCats = await getLiveCategories();
      if (liveCats && liveCats.length > 0) {
        setCategories(liveCats as Category[]);
      }

      // 2. Fetch server-persisted custom products
      let serverCustoms: Product[] = [];
      try {
        const sRes = await fetch("/api/admin/products");
        if (sRes.ok) {
          const sJson = await sRes.json();
          if (sJson.success && Array.isArray(sJson.customProducts)) {
            serverCustoms = sJson.customProducts;
          }
        }
      } catch (e) {
        console.warn("Notice fetching server custom products:", e);
      }

      // 3. Fetch Products with category relation from Supabase
      const { data: prodData, error: prodError } = await supabase
        .from("products")
        .select("*, category:categories(*)")
        .order("created_at", { ascending: false });

      // Retrieve deleted product IDs / SKUs to avoid reviving deleted items
      const deletedSet = getDeletedProductKeys();

      // Retrieve local custom products
      const localCustoms = getCustomProducts();

      const mergedList: Product[] = [];
      const seenKeys = new Set<string>();

      // Put custom products FIRST (newly added products appear immediately at row 1)
      const combinedCustoms = [...localCustoms];
      for (const sc of serverCustoms) {
        const scKey = (sc.sku || sc.slug || sc.id || sc.name).toLowerCase();
        if (!combinedCustoms.some((c) => (c.sku || c.slug || c.id || c.name).toLowerCase() === scKey)) {
          combinedCustoms.push(sc);
        }
      }

      for (const item of combinedCustoms) {
        const key = (item.sku || item.slug || item.id || item.name).toLowerCase();
        const idKey = (item.id || "").toLowerCase();
        const nameLower = item.name.toLowerCase();
        if (!isProductDeleted(item, deletedSet) && !seenKeys.has(key)) {
          mergedList.push(item);
          seenKeys.add(key);
          seenKeys.add(idKey);
          seenKeys.add(nameLower);
        }
      }

      // Put Supabase remote products
      if (!prodError && prodData && prodData.length > 0) {
        for (let i = 0; i < prodData.length; i++) {
          const item = prodData[i] as Product;
          const key = (item.sku || item.slug || item.id || item.name).toLowerCase();
          const idKey = (item.id || "").toLowerCase();
          const nameLower = item.name.toLowerCase();
          if (!isProductDeleted(item, deletedSet) && !seenKeys.has(key) && !seenKeys.has(nameLower)) {
            mergedList.push(item);
            seenKeys.add(key);
            seenKeys.add(idKey);
            seenKeys.add(nameLower);
          }
        }
      }

      // Merge DEFAULT_CATALOG_PRODUCTS (including all 240 Side Key items)
      for (let i = 0; i < DEFAULT_CATALOG_PRODUCTS.length; i++) {
        const def = DEFAULT_CATALOG_PRODUCTS[i];
        const key = (def.sku || def.slug || def.id || def.name).toLowerCase();
        const idKey = def.id.toLowerCase();
        const nameLower = def.name.toLowerCase();

        if (!isProductDeleted(def, deletedSet) && !seenKeys.has(key) && !seenKeys.has(nameLower)) {
          mergedList.push(def);
          seenKeys.add(key);
          seenKeys.add(idKey);
          seenKeys.add(nameLower);
        }
      }

      setProducts(mergedList.length > 0 ? mergedList : SAMPLE_PRODUCTS);
    } catch (err) {
      console.warn("Notice loading admin inventory data:", err);
      setProducts(DEFAULT_CATALOG_PRODUCTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Event listeners for instant updates when a product is added or edited
    const handleStorageUpdate = (e: StorageEvent) => {
      if (
        !e.key ||
        e.key === "zubair_admin_custom_products" ||
        e.key === "zubair_admin_deleted_products"
      ) {
        loadData();
      }
    };

    const handleCustomUpdate = () => {
      loadData();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorageUpdate);
      window.addEventListener("zubair_products_updated", handleCustomUpdate);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", handleStorageUpdate);
        window.removeEventListener("zubair_products_updated", handleCustomUpdate);
      }
    };
  }, []);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);

    try {
      await deleteProduct(deleteTarget.id, deleteTarget.sku, deleteTarget.slug, deleteTarget.name);
      const targetKeys = new Set(
        [deleteTarget.id, deleteTarget.sku, deleteTarget.slug, deleteTarget.name]
          .filter(Boolean)
          .map((x) => String(x).toLowerCase().trim())
      );
      setProducts((prev) => prev.filter((p) => !isProductDeleted(p, targetKeys)));
      showToast(`Part "${deleteTarget.name}" was deleted successfully.`);
      setDeleteTarget(null);
    } catch (err) {
      console.error("Failed to delete product:", err);
    } finally {
      setDeleting(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    // Category filter
    if (selectedCategory !== "all") {
      const catObj = categories.find(
        (c) => c.id === selectedCategory || c.slug === selectedCategory
      );
      const catName = catObj?.name.toLowerCase() || "";
      const catSlug = catObj?.slug.toLowerCase() || "";
      const selectedLower = selectedCategory.toLowerCase();

      const pCatId = p.category_id || p.category?.id;
      const pCatSlug = p.category?.slug?.toLowerCase() || "";
      const pCatName = p.category?.name?.toLowerCase() || "";

      const matchCat =
        pCatId === selectedCategory ||
        pCatSlug === selectedLower ||
        pCatName === selectedLower ||
        (catSlug && pCatSlug === catSlug) ||
        (catName && pCatName === catName) ||
        (selectedLower.includes("side") &&
          (pCatName.includes("side") ||
            pCatSlug.includes("side") ||
            p.name.toLowerCase().includes("side key") ||
            p.slug.toLowerCase().includes("sidekey")));

      if (!matchCat) return false;
    }

    // Search query filter
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;

    return (
      p.name.toLowerCase().includes(q) ||
      p.sku?.toLowerCase().includes(q) ||
      p.category?.name.toLowerCase().includes(q) ||
      p.category?.slug?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-700 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-primary tracking-tight flex items-center gap-2.5">
            <Package className="w-6 h-6 text-secondary" />
            <span>Product Inventory Management</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage spare parts stock, wholesale rates, SKUs, and upload high-res images.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            href="/admin/products/import"
            className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 hover:border-[#dc2626] hover:text-[#dc2626] px-4 py-2.5 rounded-xl font-bold text-xs shadow-2xs transition-all cursor-pointer"
          >
            <UploadCloud className="w-4 h-4 text-[#dc2626]" />
            <span>Import Products (CSV / Excel)</span>
          </Link>
          <Link
            href="/admin/products/new"
            className="inline-flex items-center gap-2 bg-secondary hover:bg-secondary-hover text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all hover:shadow cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Part</span>
          </Link>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:max-w-xl">
          {/* Real-time search */}
          <div className="relative w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by part title, SKU (e.g. ZB-LCD), or model..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-surface text-xs text-charcoal focus:bg-white focus:outline-none focus:ring-2 focus:ring-secondary"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-48 px-3 py-2 rounded-xl border border-slate-200 bg-surface text-xs text-charcoal focus:bg-white focus:outline-none focus:ring-2 focus:ring-secondary"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500 w-full md:w-auto justify-between md:justify-end">
          <span>
            Total: <strong className="text-primary font-bold">{filteredProducts.length}</strong> Parts
          </span>
          <button
            onClick={loadData}
            className="p-1.5 rounded-lg text-slate-400 hover:text-secondary hover:bg-slate-50"
            title="Refresh inventory"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Products Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-3 border-secondary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500">Loading inventory from database...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Package className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-primary">No Spare Parts Found</p>
            <p className="text-xs text-slate-400">
              No parts matched your search filter criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-surface text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4 sm:px-6">Image</th>
                  <th className="py-3.5 px-4">Part Title & SKU</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Rates & Profit</th>
                  <th className="py-3.5 px-4">Stock Status</th>
                  <th className="py-3.5 px-4">Store Status</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((product) => {
                  const inStock = product.stock_quantity > 0;
                  const isLow = product.stock_quantity > 0 && product.stock_quantity <= 5;
                  const unitCost = product.purchase_price ?? null;
                  const unitProfit = unitCost !== null ? product.price - unitCost : null;
                  const marginPct = unitCost !== null && product.price > 0 ? ((unitProfit! / product.price) * 100).toFixed(0) : null;

                  return (
                    <tr key={product.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Thumbnail */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="w-12 h-12 aspect-square rounded-lg bg-slate-50 border border-slate-200 p-1 flex items-center justify-center overflow-hidden">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <Package className="w-6 h-6 text-slate-300" />
                          )}
                        </div>
                      </td>

                      {/* Name & SKU */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-bold text-primary text-xs sm:text-sm line-clamp-1">
                          {product.name}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-[10px] text-slate-400">
                            {product.sku}
                          </span>
                          {product.featured && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-secondary bg-secondary/10 px-1.5 rounded">
                              <Sparkles className="w-2.5 h-2.5" />
                              Featured
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold text-[11px]">
                          {product.category?.name || "Spare Part"}
                        </span>
                      </td>

                      {/* Rates & Profit */}
                      <td className="py-3.5 px-4">
                        <div className="font-black text-primary text-xs sm:text-sm">
                          Rs. {Number(product.wholesale_price ?? product.price).toLocaleString("en-PK")}
                        </div>
                        <div className="mt-0.5 space-y-0.5 text-[10px]">
                          {product.technician_price !== undefined && product.technician_price !== null ? (
                            <div className="text-amber-800 font-medium">
                              Tech: <span className="font-semibold font-mono">Rs. {Number(product.technician_price).toLocaleString("en-PK")}</span>
                            </div>
                          ) : null}
                          {product.retail_price !== undefined && product.retail_price !== null ? (
                            <div className="text-blue-800 font-medium">
                              Retail: <span className="font-semibold font-mono">Rs. {Number(product.retail_price).toLocaleString("en-PK")}</span>
                            </div>
                          ) : null}
                          {unitCost !== null ? (
                            <div className="text-slate-600">
                              Cost: <span className="font-mono font-bold text-slate-700">Rs. {Number(unitCost).toLocaleString("en-PK")}</span>
                              {marginPct !== null && (
                                <span className="ml-1 inline-flex items-center text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                                  +{marginPct}%
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">No cost set</span>
                          )}
                        </div>
                      </td>

                      {/* Stock Badge & MOQ */}
                      <td className="py-3.5 px-4">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded text-[11px] border border-amber-200">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            Low ({product.stock_quantity})
                          </span>
                        ) : inStock ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            {product.stock_quantity} in stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-700 font-semibold bg-rose-50 px-2 py-0.5 rounded text-[11px]">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            Out of stock
                          </span>
                        )}
                        <div className="mt-1">
                          <span className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.2 rounded ${
                            product.min_order_quantity && product.min_order_quantity > 1
                              ? "bg-amber-100 text-amber-900 border border-amber-300"
                              : "bg-slate-100 text-slate-500"
                          }`}>
                            MOQ: {product.min_order_quantity || 1} pcs
                          </span>
                        </div>
                      </td>

                      {/* Storefront Active */}
                      <td className="py-3.5 px-4">
                        {product.is_active ? (
                          <span className="text-[11px] font-semibold text-emerald-600">Active</span>
                        ) : (
                          <span className="text-[11px] font-semibold text-slate-400">Hidden</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-1 sm:gap-2">
                          {/* Live Preview */}
                          <Link
                            href={`/product/${product.slug}`}
                            target="_blank"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-secondary hover:bg-slate-100"
                            title="Preview on storefront"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>

                          {/* Edit */}
                          <Link
                            href={`/admin/products/${product.id}/edit`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-secondary hover:bg-slate-100"
                            title="Edit part"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Link>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(product)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            title="Delete part"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-primary/60 backdrop-blur-xs"
            onClick={() => setDeleteTarget(null)}
          />
          <div className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-4 z-10 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-primary">Delete Mobile Part?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Are you sure you want to delete{" "}
                <strong className="text-charcoal">&ldquo;{deleteTarget.name}&rdquo;</strong>{" "}
                (SKU: {deleteTarget.sku})? This action cannot be reversed.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm disabled:opacity-60"
              >
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
