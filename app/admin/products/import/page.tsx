"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Trash2,
  ArrowLeft,
  Package,
  Layers,
  Sparkles,
  RefreshCw,
  Eye,
  FileText,
  Copy,
  Info,
  Check,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getLiveCategories, LiveCategory, DEFAULT_CATEGORIES } from "@/lib/categories";

interface StagedProduct {
  id: string;
  name: string;
  sku: string;
  slug: string;
  categoryName: string;
  categoryId?: string | null;
  price: number; // Wholesale
  technicianPrice?: number | null;
  retailPrice?: number | null;
  purchasePrice?: number | null;
  stockQuantity: number;
  minOrderQuantity: number;
  imageUrl?: string | null;
  shortDescription?: string | null;
  status: "valid" | "warning" | "error";
  statusMessage: string;
}

export default function AdminImportProductsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"file" | "paste">("file");
  const [categories, setCategories] = useState<LiveCategory[]>(DEFAULT_CATEGORIES);
  const [stagedProducts, setStagedProducts] = useState<StagedProduct[]>([]);
  const [rawPastedText, setRawPastedText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [importSuccess, setImportSuccess] = useState<{ count: number; failed: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load live categories on mount
  useEffect(() => {
    async function loadCats() {
      try {
        const live = await getLiveCategories();
        if (live && live.length > 0) {
          setCategories(live);
        }
      } catch (err) {
        console.warn("Category load error:", err);
      }
    }
    loadCats();
  }, []);

  // Helper to generate a clean URL slug
  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  // Helper to download the sample CSV template
  const handleDownloadSampleCsv = () => {
    const headers = [
      "name",
      "sku",
      "category",
      "wholesale_price",
      "technician_price",
      "retail_price",
      "purchase_price",
      "stock_quantity",
      "min_order_quantity",
      "image_url",
      "short_description",
    ];

    const sampleRows = [
      [
        "VIVO Y20 SUNLONG BLACK UNIT",
        "ZB-LCD-V20S",
        "LCD & Touch Units",
        "2650",
        "2950",
        "3315",
        "1950",
        "50",
        "1",
        "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800",
        "Original Sunlong brand premium display unit with touch screen",
      ],
      [
        "VIVO Y20 BLACK OCA GLASS",
        "ZB-OCA-VY20",
        "OCA Glass & Lens",
        "450",
        "520",
        "600",
        "280",
        "100",
        "5",
        "",
        "High quality Mitsubishi OCA glass",
      ],
      [
        "VIVO Y20 IC CHARGING FLEX",
        "ZB-FLX-VY20",
        "Charging Flex & Boards",
        "650",
        "750",
        "850",
        "420",
        "40",
        "2",
        "",
        "Fast charging supported with full IC mic protection",
      ],
      [
        "SAMSUNG A12 BLACK UNIT OLED",
        "ZB-LCD-SA12",
        "LCD & Touch Units",
        "3200",
        "3600",
        "4100",
        "2400",
        "35",
        "1",
        "",
        "Tested original equipment replacement LCD screen",
      ],
    ];

    const csvContent = [
      headers.join(","),
      ...sampleRows.map((row) =>
        row
          .map((cell) => {
            const str = cell.toString().replace(/"/g, '""');
            return str.includes(",") || str.includes('"') || str.includes("\n") ? `"${str}"` : str;
          })
          .join(",")
      ),
    ].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "zubair_mobile_sample_products_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Robust CSV / TSV Line Parser supporting quoted fields
  const parseDelimitedText = (text: string): string[][] => {
    const lines = text.split(/\r\n|\n|\r/);
    const rows: string[][] = [];

    for (const rawLine of lines) {
      if (!rawLine.trim()) continue;

      // Auto-detect delimiter: Tab (from Excel copy-paste) or Comma
      const delimiter = rawLine.includes("\t") ? "\t" : ",";

      const row: string[] = [];
      let inQuotes = false;
      let currentField = "";

      for (let i = 0; i < rawLine.length; i++) {
        const char = rawLine[i];
        const nextChar = rawLine[i + 1];

        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            currentField += '"';
            i++; // skip escaped quote
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === delimiter && !inQuotes) {
          row.push(currentField.trim());
          currentField = "";
        } else {
          currentField += char;
        }
      }
      row.push(currentField.trim());
      rows.push(row);
    }

    return rows;
  };

  // Process rows into StagedProduct objects
  const processRawRows = (rows: string[][]) => {
    if (rows.length < 2) {
      setErrorMessage("The file or pasted text must have a header row and at least one product row.");
      return;
    }

    const headers = rows[0].map((h) => h.toLowerCase().trim().replace(/[\s_-]+/g, ""));
    const dataRows = rows.slice(1);

    // Map column indices
    const getIndex = (aliases: string[]) => {
      return headers.findIndex((h) => aliases.some((a) => h.includes(a)));
    };

    const nameIdx = getIndex(["name", "title", "product", "part", "item"]);
    const skuIdx = getIndex(["sku", "code", "partno", "itemcode"]);
    const catIdx = getIndex(["category", "type", "cat"]);
    const wholesaleIdx = getIndex(["wholesale", "price", "tradeprice", "wprice", "baseprice"]);
    const technicianIdx = getIndex(["technician", "tech", "techprice", "tprice", "repair"]);
    const retailIdx = getIndex(["retail", "selling", "rprice", "customerprice", "publicprice"]);
    const purchaseIdx = getIndex(["purchase", "cost", "buy", "buyprice", "costprice"]);
    const stockIdx = getIndex(["stock", "qty", "quantity", "inventory"]);
    const moqIdx = getIndex(["moq", "minorder", "minimumorder", "minqty"]);
    const imageIdx = getIndex(["image", "img", "photo", "picture", "url"]);
    const descIdx = getIndex(["description", "desc", "shortdesc", "notes", "detail"]);

    if (nameIdx === -1 || wholesaleIdx === -1) {
      setErrorMessage(
        "Could not detect required columns. Please make sure your file has 'name' and 'wholesale_price' headers."
      );
      return;
    }

    const staged: StagedProduct[] = [];

    dataRows.forEach((row, idx) => {
      // Skip totally blank rows
      if (row.length === 0 || row.every((c) => !c.trim())) return;

      const rawName = row[nameIdx] || "";
      const rawSku = skuIdx !== -1 ? row[skuIdx] || "" : "";
      const rawCat = catIdx !== -1 ? row[catIdx] || "" : "";
      const rawWholesale = wholesaleIdx !== -1 ? row[wholesaleIdx] || "" : "";
      const rawTech = technicianIdx !== -1 ? row[technicianIdx] || "" : "";
      const rawRetail = retailIdx !== -1 ? row[retailIdx] || "" : "";
      const rawPurchase = purchaseIdx !== -1 ? row[purchaseIdx] || "" : "";
      const rawStock = stockIdx !== -1 ? row[stockIdx] || "" : "";
      const rawMoq = moqIdx !== -1 ? row[moqIdx] || "" : "";
      const rawImage = imageIdx !== -1 ? row[imageIdx] || "" : "";
      const rawDesc = descIdx !== -1 ? row[descIdx] || "" : "";

      const cleanName = rawName.trim();
      const numWholesale = parseFloat(rawWholesale.replace(/[^0-9.]/g, ""));
      const numTech = rawTech ? parseFloat(rawTech.replace(/[^0-9.]/g, "")) : null;
      const numRetail = rawRetail ? parseFloat(rawRetail.replace(/[^0-9.]/g, "")) : null;
      const numPurchase = rawPurchase ? parseFloat(rawPurchase.replace(/[^0-9.]/g, "")) : null;
      const numStock = rawStock ? parseInt(rawStock.replace(/[^0-9]/g, ""), 10) : 50;
      const numMoq = rawMoq ? parseInt(rawMoq.replace(/[^0-9]/g, ""), 10) : 1;

      // Auto-SKU if missing
      const cleanSku =
        rawSku.trim() ||
        `ZB-${cleanName.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 6) || "PART"}-${(idx + 1)
          .toString()
          .padStart(3, "0")}`;

      // Resolve Category ID
      let matchedCatId: string | null = null;
      if (rawCat.trim()) {
        const found = categories.find(
          (c) =>
            c.name.toLowerCase() === rawCat.trim().toLowerCase() ||
            c.slug.toLowerCase() === generateSlug(rawCat.trim())
        );
        if (found) {
          matchedCatId = found.id;
        }
      }

      // Validation Status
      let status: "valid" | "warning" | "error" = "valid";
      let statusMessage = "Ready to import";

      if (!cleanName) {
        status = "error";
        statusMessage = "Missing product name";
      } else if (isNaN(numWholesale) || numWholesale <= 0) {
        status = "error";
        statusMessage = "Invalid or missing wholesale price";
      } else if (!rawCat.trim() || !matchedCatId) {
        status = "warning";
        statusMessage = rawCat.trim()
          ? `Category "${rawCat.trim()}" not found (will be unassigned)`
          : "No category provided";
      } else if (!rawSku.trim()) {
        status = "warning";
        statusMessage = "SKU generated automatically";
      }

      staged.push({
        id: `staged-${idx}-${Date.now()}`,
        name: cleanName,
        sku: cleanSku.toUpperCase(),
        slug: generateSlug(cleanName) + "-" + Math.random().toString(36).substring(2, 6),
        categoryName: rawCat.trim() || "Uncategorized",
        categoryId: matchedCatId,
        price: isNaN(numWholesale) ? 0 : numWholesale,
        technicianPrice: numTech && !isNaN(numTech) ? numTech : null,
        retailPrice: numRetail && !isNaN(numRetail) ? numRetail : null,
        purchasePrice: numPurchase && !isNaN(numPurchase) ? numPurchase : null,
        stockQuantity: isNaN(numStock) || numStock < 0 ? 50 : numStock,
        minOrderQuantity: isNaN(numMoq) || numMoq < 1 ? 1 : numMoq,
        imageUrl: rawImage.trim() || null,
        shortDescription: rawDesc.trim() || null,
        status,
        statusMessage,
      });
    });

    setStagedProducts(staged);
    setErrorMessage(null);
  };

  // Handle file input
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsing(true);
    setFileName(file.name);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const rows = parseDelimitedText(text);
        processRawRows(rows);
      } catch (err) {
        console.error("CSV parse error:", err);
        setErrorMessage("Failed to read file. Please ensure it is a valid CSV or TXT file.");
      } finally {
        setParsing(false);
      }
    };
    reader.readAsText(file);
  };

  // Handle pasted text parsing
  const handleProcessPastedText = () => {
    if (!rawPastedText.trim()) {
      setErrorMessage("Please paste table data from Excel or Google Sheets into the box.");
      return;
    }
    setParsing(true);
    setFileName("Pasted Data");
    setErrorMessage(null);

    try {
      const rows = parseDelimitedText(rawPastedText);
      processRawRows(rows);
    } catch (err) {
      console.error("Paste parse error:", err);
      setErrorMessage("Failed to parse pasted data.");
    } finally {
      setParsing(false);
    }
  };

  // Remove individual row from staging
  const handleRemoveStagedRow = (id: string) => {
    setStagedProducts((prev) => prev.filter((item) => item.id !== id));
  };

  // Execute Batch Database Insertion
  const handleExecuteImport = async () => {
    const validItems = stagedProducts.filter((item) => item.status !== "error");
    if (validItems.length === 0) {
      setErrorMessage("No valid products to import. Please fix or remove errored rows.");
      return;
    }

    setImporting(true);
    setErrorMessage(null);
    setImportProgress({ current: 0, total: validItems.length });

    const BATCH_SIZE = 25;
    let successfulCount = 0;
    let failedCount = 0;

    for (let i = 0; i < validItems.length; i += BATCH_SIZE) {
      const chunk = validItems.slice(i, i + BATCH_SIZE);

      const recordsToInsert = chunk.map((p) => ({
        name: p.name,
        sku: p.sku,
        slug: p.slug,
        category_id: p.categoryId || null,
        price: p.price,
        technician_price: p.technicianPrice,
        retail_price: p.retailPrice,
        purchase_price: p.purchasePrice,
        stock_quantity: p.stockQuantity,
        min_order_quantity: p.minOrderQuantity,
        image_url: p.imageUrl,
        short_description: p.shortDescription,
        is_active: true,
        featured: false,
      }));

      try {
        let { error } = await supabase.from("products").insert(recordsToInsert);

        if (error) {
          console.warn("Batch insert error, attempting schema fallback:", error.message);
          // If columns purchase_price, technician_price, retail_price, or min_order_quantity are missing remotely
          if (
            error.message &&
            (error.message.includes("purchase_price") ||
              error.message.includes("technician_price") ||
              error.message.includes("retail_price") ||
              error.message.includes("min_order_quantity"))
          ) {
            const fallbackRecords = recordsToInsert.map((rec) => {
              const copy = { ...rec } as Record<string, unknown>;
              if (error?.message.includes("min_order_quantity")) delete copy.min_order_quantity;
              if (error?.message.includes("purchase_price")) delete copy.purchase_price;
              if (error?.message.includes("technician_price")) delete copy.technician_price;
              if (error?.message.includes("retail_price")) delete copy.retail_price;
              return copy;
            });
            const retryRes = await supabase.from("products").insert(fallbackRecords);
            if (retryRes.error) {
              console.error("Fallback insert failed:", retryRes.error);
              failedCount += chunk.length;
            } else {
              successfulCount += chunk.length;
            }
          } else {
            failedCount += chunk.length;
          }
        } else {
          successfulCount += chunk.length;
        }
      } catch (err) {
        console.error("Chunk exception:", err);
        failedCount += chunk.length;
      }

      setImportProgress({ current: Math.min(i + BATCH_SIZE, validItems.length), total: validItems.length });
    }

    setImporting(false);
    setImportSuccess({ count: successfulCount, failed: failedCount });
  };

  // Reset entire staging state
  const handleReset = () => {
    setStagedProducts([]);
    setFileName(null);
    setRawPastedText("");
    setImportSuccess(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const validCount = stagedProducts.filter((i) => i.status === "valid").length;
  const warningCount = stagedProducts.filter((i) => i.status === "warning").length;
  const errorCount = stagedProducts.filter((i) => i.status === "error").length;
  const totalStock = stagedProducts.reduce((acc, curr) => acc + (curr.stockQuantity || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/products"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#dc2626] mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Products Inventory</span>
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#dc2626] text-white flex items-center justify-center shadow-xs">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-[#111827] tracking-tight">
                Bulk Product Import (ایک ساتھ پروڈکٹس امپورٹ)
              </h1>
              <p className="text-xs text-slate-500">
                CSV یا ایکسل کے ذریعے سینکڑوں پارٹس ایک کلک میں ڈیٹا بیس میں شامل کریں۔
              </p>
            </div>
          </div>
        </div>

        {/* Action: Download Sample CSV */}
        <button
          type="button"
          onClick={handleDownloadSampleCsv}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold shadow-2xs hover:border-[#dc2626] hover:text-[#dc2626] transition-all shrink-0 cursor-pointer"
        >
          <Download className="w-4 h-4 text-[#dc2626]" />
          <span>Download Sample CSV (سیمپل فائل)</span>
        </button>
      </div>

      {/* Success Modal / Banner */}
      {importSuccess && (
        <div className="p-6 bg-emerald-50 border-2 border-emerald-300 rounded-2xl shadow-sm space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-emerald-950">
                Products Imported Successfully! (کامیابی سے امپورٹ ہو گئے)
              </h3>
              <p className="text-xs text-emerald-800">
                <strong>{importSuccess.count}</strong> پروڈکٹس کامیابی سے سسٹم اور ڈیٹا بیس میں شامل ہو چکے ہیں۔
                {importSuccess.failed > 0 && (
                  <span className="text-rose-700 ml-1">
                    ({importSuccess.failed} پروڈکٹس خامی کی وجہ سے امپورٹ نہ ہو سکے)
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/admin/products"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              <Package className="w-4 h-4" />
              <span>View Products in Inventory</span>
            </Link>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white text-emerald-900 border border-emerald-300 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Import More Products</span>
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Source Input Card: Tabs (File Upload or Paste from Excel) */}
      {stagedProducts.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Tab Selector */}
          <div className="flex border-b border-slate-200 bg-slate-50/70 p-1.5 gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab("file")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "file"
                  ? "bg-white text-[#dc2626] shadow-2xs border border-slate-200/80"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              <span>Method 1: Upload CSV / Excel File</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("paste")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "paste"
                  ? "bg-white text-[#dc2626] shadow-2xs border border-slate-200/80"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Copy className="w-4 h-4" />
              <span>Method 2: Copy & Paste from Excel / Google Sheets</span>
            </button>
          </div>

          <div className="p-6 sm:p-8">
            {activeTab === "file" ? (
              /* Tab 1: Drag & Drop File Zone */
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-[#dc2626] bg-slate-50/60 hover:bg-red-50/20 rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all space-y-3 group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv, text/csv, text/plain, .tsv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-16 h-16 rounded-2xl bg-white text-slate-400 group-hover:text-[#dc2626] group-hover:scale-105 transition-all mx-auto flex items-center justify-center shadow-xs border border-slate-200">
                  <FileSpreadsheet className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-800">
                    Click to browse or drag and drop your CSV file here
                  </h3>
                  <p className="text-xs text-slate-500">
                    Supports .CSV, .TXT files exported from Excel, Google Sheets, or ERP software
                  </p>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-200/70 text-slate-700 text-[11px] font-bold">
                  <span>UTF-8 Comma / Tab Separated</span>
                </div>
              </div>
            ) : (
              /* Tab 2: Paste Direct from Excel */
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    Paste Rows directly from Excel or Google Sheets:
                  </label>
                  <p className="text-xs text-slate-500">
                    ایکسل سے کالمز اور ڈیٹا کاپی کریں اور نیچے باکس میں سیدھا پیسٹ کر کے بٹن دبائیں۔
                  </p>
                </div>
                <textarea
                  rows={8}
                  value={rawPastedText}
                  onChange={(e) => setRawPastedText(e.target.value)}
                  placeholder={`name\tsku\tcategory\twholesale_price\ttechnician_price\tretail_price\tstock_quantity\nVIVO Y20 BLACK UNIT\tZB-LCD-V20\tLCD & Touch Units\t2650\t2950\t3315\t50\nOPPO A53 LCD UNIT\tZB-LCD-A53\tLCD & Touch Units\t2850\t3200\t3600\t30`}
                  className="w-full p-3.5 text-xs font-mono rounded-xl border border-slate-300 focus:border-[#dc2626] focus:outline-none focus:ring-1 focus:ring-[#dc2626] bg-slate-50"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleProcessPastedText}
                    disabled={!rawPastedText.trim() || parsing}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Process Pasted Products</span>
                  </button>
                </div>
              </div>
            )}

            {/* Help / Guidance Card */}
            <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-red-100 text-[#dc2626] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <strong className="text-slate-900 block">Required Columns</strong>
                  <span>پروڈکٹ کا نام (`name`) اور ہول سیل قیمت (`wholesale_price`) ہونا لازمی ہے۔</span>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 font-bold flex items-center justify-center shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <strong className="text-slate-900 block">3-Tier Pricing</strong>
                  <span>آپ ہول سیل، ٹیکنیشن، اور پرچون تینوں ریٹس کالمز میں دے سکتے ہیں۔</span>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <strong className="text-slate-900 block">Auto-Generation</strong>
                  <span>اگر SKU یا Slug خالی ہو تو سسٹم خود بخود یونیک کوڈ بنا دے گا۔</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Staged Data Preview & Verification Table */}
      {stagedProducts.length > 0 && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Summary Metric Strip */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-700">
                <span>File:</span>
                <span className="bg-slate-100 px-2.5 py-1 rounded-lg font-mono text-[#111827]">
                  {fileName || "Uploaded Data"}
                </span>
              </div>
              <span className="text-slate-300">•</span>
              <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                ✓ {validCount} Ready
              </span>
              {warningCount > 0 && (
                <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  ⚠ {warningCount} Warnings
                </span>
              )}
              {errorCount > 0 && (
                <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                  ✕ {errorCount} Errors
                </span>
              )}
              <span className="text-slate-300">•</span>
              <span className="text-slate-500 font-medium">
                Total Units Stock: <strong>{totalStock} pcs</strong>
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleReset}
                disabled={importing}
                className="px-3 py-1.5 border border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Clear / Re-upload
              </button>
              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={importing || validCount + warningCount === 0}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs font-bold rounded-xl shadow-md transition-all disabled:opacity-50 cursor-pointer"
              >
                {importing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>
                      Importing ({importProgress?.current} / {importProgress?.total})...
                    </span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    <span>Confirm & Import {validCount + warningCount} Products</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Import Progress Bar */}
          {importing && importProgress && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2 shadow-xs">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-700">Importing in batches to database...</span>
                <span className="text-[#dc2626]">
                  {Math.round((importProgress.current / importProgress.total) * 100)}% ({importProgress.current} /{" "}
                  {importProgress.total})
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#dc2626] transition-all duration-300 rounded-full"
                  style={{
                    width: `${(importProgress.current / importProgress.total) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Staging Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto max-h-[550px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-3 w-12 text-center">#</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-4 min-w-[220px]">Product Name</th>
                    <th className="py-3 px-3">SKU</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3 text-right">Wholesale (PKR)</th>
                    <th className="py-3 px-3 text-right">Technician (PKR)</th>
                    <th className="py-3 px-3 text-right">Retail (PKR)</th>
                    <th className="py-3 px-3 text-center">Stock / MOQ</th>
                    <th className="py-3 px-3 text-center w-12">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stagedProducts.map((prod, idx) => (
                    <tr
                      key={prod.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        prod.status === "error"
                          ? "bg-rose-50/50"
                          : prod.status === "warning"
                          ? "bg-amber-50/30"
                          : ""
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {prod.status === "valid" ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Valid</span>
                          </span>
                        ) : prod.status === "warning" ? (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200"
                            title={prod.statusMessage}
                          >
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>Warning</span>
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200"
                            title={prod.statusMessage}
                          >
                            <XCircle className="w-3 h-3 text-rose-600" />
                            <span>Error</span>
                          </span>
                        )}
                      </td>

                      {/* Product Name */}
                      <td className="py-2.5 px-4 font-bold text-slate-900">
                        <div className="line-clamp-1">{prod.name || "<Unnamed>"}</div>
                        {prod.shortDescription && (
                          <div className="text-[10px] text-slate-400 font-normal truncate max-w-xs">
                            {prod.shortDescription}
                          </div>
                        )}
                      </td>

                      {/* SKU */}
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        {prod.sku}
                      </td>

                      {/* Category */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {prod.categoryId ? (
                          <span className="bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded text-[11px]">
                            {prod.categoryName}
                          </span>
                        ) : (
                          <span className="text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded text-[10.5px]">
                            {prod.categoryName || "Uncategorized"}
                          </span>
                        )}
                      </td>

                      {/* Wholesale Price */}
                      <td className="py-2.5 px-3 text-right font-black text-emerald-700 whitespace-nowrap">
                        Rs. {prod.price.toLocaleString("en-PK")}
                      </td>

                      {/* Technician Price */}
                      <td className="py-2.5 px-3 text-right font-bold text-amber-700 whitespace-nowrap">
                        {prod.technicianPrice ? `Rs. ${prod.technicianPrice.toLocaleString("en-PK")}` : "—"}
                      </td>

                      {/* Retail Price */}
                      <td className="py-2.5 px-3 text-right font-bold text-blue-700 whitespace-nowrap">
                        {prod.retailPrice ? `Rs. ${prod.retailPrice.toLocaleString("en-PK")}` : "—"}
                      </td>

                      {/* Stock & MOQ */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span className="font-bold text-slate-800">{prod.stockQuantity} pcs</span>
                        {prod.minOrderQuantity > 1 && (
                          <span className="text-[9.5px] text-slate-400 block">
                            (Min: {prod.minOrderQuantity})
                          </span>
                        )}
                      </td>

                      {/* Remove Action */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveStagedRow(prod.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Remove row from import"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
