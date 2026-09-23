"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Layers,
  ShoppingBag,
  Boxes,
  Truck,
  Plus,
  Trash2,
  PieChart,
  BarChart3,
  Receipt,
  Download,
  Printer,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  X,
} from "lucide-react";
import { getOrders, Order, calculateOrderProfit } from "@/lib/orders";
import { getExpenses, saveExpense, deleteExpense, getTotalExpenses, Expense } from "@/lib/expenses";
import { getPurchases, PurchaseEntry } from "@/lib/inventory";
import { getCustomProducts } from "@/lib/customProducts";
import { DEFAULT_CATALOG_PRODUCTS } from "@/lib/products";
import { Product } from "@/lib/types";

export default function AdminReportsPage() {
  const [timeRange, setTimeRange] = useState<"today" | "week" | "month" | "all">("month");
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [purchases, setPurchases] = useState<PurchaseEntry[]>([]);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isSavingExpense, setIsSavingExpense] = useState(false);

  // New Expense Form State
  const [expenseForm, setExpenseForm] = useState<{
    title: string;
    category: Expense["category"];
    amount: string;
    payment_method: Expense["payment_method"];
    notes: string;
  }>({
    title: "",
    category: "Packaging & Supplies",
    amount: "",
    payment_method: "Cash",
    notes: "",
  });

  const loadData = async () => {
    setOrders(getOrders());
    setExpenses(getExpenses());
    try {
      const purList = await getPurchases();
      setPurchases(purList);
    } catch (err) {
      console.error("Failed to load purchases in reports:", err);
    }
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      loadData();
    };

    window.addEventListener("storage", handleUpdate);
    window.addEventListener("zubair_orders_updated", handleUpdate);
    window.addEventListener("zubair_expenses_updated", handleUpdate);
    window.addEventListener("zubair_purchases_updated", handleUpdate);

    return () => {
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("zubair_orders_updated", handleUpdate);
      window.removeEventListener("zubair_expenses_updated", handleUpdate);
      window.removeEventListener("zubair_purchases_updated", handleUpdate);
    };
  }, []);

  // Filter Orders & Expenses by Time Range
  const filteredData = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = startOfToday - 7 * 86400000;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const filterByDate = (dateStr: string) => {
      const t = new Date(dateStr).getTime();
      if (timeRange === "today") return t >= startOfToday;
      if (timeRange === "week") return t >= startOfWeek;
      if (timeRange === "month") return t >= startOfMonth;
      return true;
    };

    const activeOrders = orders.filter((o) => o.status !== "cancelled" && filterByDate(o.created_at));
    const activeExpenses = expenses.filter((e) => filterByDate(e.date));

    // Sales metrics
    let grossSales = 0;
    let totalCogs = 0;
    let totalItemsSold = 0;

    for (const order of activeOrders) {
      grossSales += order.total_amount;
      const profitInfo = calculateOrderProfit(order);
      totalCogs += profitInfo.totalCost;
      totalItemsSold += order.total_items;
    }

    const grossProfit = Math.max(0, grossSales - totalCogs);
    const totalOperatingExpenses = getTotalExpenses(activeExpenses);
    const netProfit = grossProfit - totalOperatingExpenses;
    const grossMarginPct = grossSales > 0 ? ((grossProfit / grossSales) * 100).toFixed(1) : "0.0";
    const netMarginPct = grossSales > 0 ? ((netProfit / grossSales) * 100).toFixed(1) : "0.0";

    // Purchases
    const activePurchases = purchases.filter((p) => filterByDate(p.purchase_date));
    const totalPurchasesAmount = activePurchases.reduce((sum, p) => sum + (p.total_amount || 0), 0);
    const totalPurchasesPaid = activePurchases.reduce((sum, p) => sum + (p.paid_amount || 0), 0);
    const pendingSupplierPayments = Math.max(0, totalPurchasesAmount - totalPurchasesPaid);

    return {
      activeOrders,
      activeExpenses,
      grossSales,
      totalCogs,
      grossProfit,
      totalOperatingExpenses,
      netProfit,
      grossMarginPct,
      netMarginPct,
      totalItemsSold,
      totalPurchasesAmount,
      pendingSupplierPayments,
    };
  }, [orders, expenses, purchases, timeRange]);

  // Inventory Stock Valuation
  const stockValuation = useMemo(() => {
    const customProds = getCustomProducts();
    const map = new Map<string, Product>();
    for (const p of customProds) {
      if (p.is_active !== false) map.set(p.id, p);
    }
    for (const p of DEFAULT_CATALOG_PRODUCTS) {
      if (!map.has(p.id)) map.set(p.id, p);
    }
    const allProds = Array.from(map.values());

    let totalQty = 0;
    let totalCostVal = 0;
    let totalRetailVal = 0;

    for (const prod of allProds) {
      const qty = prod.stock_quantity ?? 30;
      totalQty += qty;
      const purchasePrice = prod.purchase_price || Math.round((prod.price || 1000) * 0.7);
      const retailPrice = prod.retail_price || prod.price || 1000;
      totalCostVal += purchasePrice * qty;
      totalRetailVal += retailPrice * qty;
    }

    return {
      totalSkus: allProds.length,
      totalUnits: totalQty,
      totalCostVal,
      totalRetailVal,
      potentialGrossMargin: Math.max(0, totalRetailVal - totalCostVal),
    };
  }, []);

  // Handle Save Expense
  const handleSaveExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.title.trim() || !expenseForm.amount) return;

    setIsSavingExpense(true);
    try {
      await saveExpense({
        title: expenseForm.title.trim(),
        category: expenseForm.category,
        amount: Number(expenseForm.amount),
        payment_method: expenseForm.payment_method,
        notes: expenseForm.notes.trim() || undefined,
        date: new Date().toISOString(),
      });

      setExpenseForm({
        title: "",
        category: "Packaging & Supplies",
        amount: "",
        payment_method: "Cash",
        notes: "",
      });
      setIsExpenseModalOpen(false);
      loadData();
    } catch (err) {
      console.warn("Expense save error:", err);
    } finally {
      setIsSavingExpense(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (confirm("Are you sure you want to delete this expense record?")) {
      await deleteExpense(id);
      loadData();
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#dc2626]/10 text-[#dc2626] flex items-center justify-center shrink-0 shadow-2xs">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-[#111827] tracking-tight">
                Accounting & Financial Reports
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Real-time Profit & Loss (P&L), Cost of Goods Sold, Operating Expenses, and Stock Valuation.
              </p>
            </div>
          </div>
        </div>

        {/* Time Period Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200 self-stretch sm:self-auto">
          {(["today", "week", "month", "all"] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                timeRange === range
                  ? "bg-[#111827] text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              {range === "today"
                ? "Today (آج)"
                : range === "week"
                ? "This Week"
                : range === "month"
                ? "This Month (ماہانہ)"
                : "All Time"}
            </button>
          ))}
        </div>
      </div>

      {/* Main P&L Summary KPIs (5 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Gross Sales */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Gross Sales</span>
            <ShoppingBag className="w-4 h-4 text-blue-500" />
          </div>
          <span className="text-xl font-black text-slate-900 block font-mono">
            Rs. {filteredData.grossSales.toLocaleString("en-PK")}
          </span>
          <span className="text-[10px] text-slate-400 block font-medium">
            {filteredData.activeOrders.length} orders ({filteredData.totalItemsSold} parts)
          </span>
        </div>

        {/* Card 2: COGS */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Cost of Goods (COGS)</span>
            <Boxes className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-xl font-black text-amber-800 block font-mono">
            Rs. {filteredData.totalCogs.toLocaleString("en-PK")}
          </span>
          <span className="text-[10px] text-slate-400 block font-medium">
            Total wholesale purchase cost
          </span>
        </div>

        {/* Card 3: Gross Profit */}
        <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Gross Profit</span>
            <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
              {filteredData.grossMarginPct}%
            </span>
          </div>
          <span className="text-xl font-black text-emerald-700 block font-mono">
            Rs. {filteredData.grossProfit.toLocaleString("en-PK")}
          </span>
          <span className="text-[10px] text-emerald-600 block font-medium">
            Sales minus unit costs
          </span>
        </div>

        {/* Card 4: Operating Expenses */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Expenses (اخراجات)</span>
            <DollarSign className="w-4 h-4 text-rose-500" />
          </div>
          <span className="text-xl font-black text-rose-600 block font-mono">
            Rs. {filteredData.totalOperatingExpenses.toLocaleString("en-PK")}
          </span>
          <span className="text-[10px] text-slate-400 block font-medium">
            Rent, packaging, electricity, cargo
          </span>
        </div>

        {/* Card 5: Net Profit */}
        <div className={`p-4 rounded-2xl border shadow-2xs space-y-1 ${
          filteredData.netProfit >= 0
            ? "bg-gradient-to-br from-emerald-600 to-emerald-700 text-white border-emerald-600"
            : "bg-rose-600 text-white border-rose-600"
        }`}>
          <div className="flex items-center justify-between text-white/80">
            <span className="text-[11px] font-bold uppercase tracking-wider">Net Profit (خالص منافع)</span>
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <span className="text-2xl font-black text-white block font-mono">
            Rs. {filteredData.netProfit.toLocaleString("en-PK")}
          </span>
          <span className="text-[10.5px] text-white/90 block font-medium">
            Margin: {filteredData.netMarginPct}% after all expenses
          </span>
        </div>
      </div>

      {/* Row: Stock Valuation & Supplier Pending Payables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Stock Valuation Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Boxes className="w-5 h-5 text-[#dc2626]" />
              <h3 className="font-bold text-sm text-[#111827]">Live Stock Valuation (مال کی کل مالیت)</h3>
            </div>
            <span className="text-xs bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-full">
              {stockValuation.totalSkus} SKUs
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Physical Stock</span>
              <span className="text-base font-black text-slate-800 font-mono">
                {stockValuation.totalUnits.toLocaleString()} Pcs
              </span>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">Cost Value (خرید)</span>
              <span className="text-base font-black text-blue-800 font-mono">
                Rs. {Math.round(stockValuation.totalCostVal / 1000)}k
              </span>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Retail Value (فروخت)</span>
              <span className="text-base font-black text-emerald-800 font-mono">
                Rs. {Math.round(stockValuation.totalRetailVal / 1000)}k
              </span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">Estimated Gross Profit in Inventory:</span>
            <span className="font-bold text-emerald-700 font-mono">
              Rs. {stockValuation.potentialGrossMargin.toLocaleString("en-PK")}
            </span>
          </div>
        </div>

        {/* Purchases & Supplier Payables Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-sm text-[#111827]">Supplier Purchases & Payables</h3>
            </div>
            <span className="text-xs bg-purple-50 text-purple-700 font-bold px-2 py-0.5 rounded-full border border-purple-200">
              ERP Inventory
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-3 bg-purple-50/70 rounded-xl border border-purple-200">
              <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">Period Purchases</span>
              <span className="text-base font-black text-purple-900 font-mono">
                Rs. {filteredData.totalPurchasesAmount.toLocaleString("en-PK")}
              </span>
            </div>
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
              <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">Pending to Suppliers</span>
              <span className="text-base font-black text-rose-700 font-mono">
                Rs. {filteredData.pendingSupplierPayments.toLocaleString("en-PK")}
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Record batch shipments in the <strong>Inventory Module</strong> to update supplier ledgers, stock quantities, and cost of goods automatically.
          </p>
        </div>
      </div>

      {/* Operating Expenses Tracker Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-[#111827] tracking-tight flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#dc2626]" />
              <span>Shop Operating Expenses Tracker (دکان کے اخراجات)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Record rent, electricity bills, staff tea, courier boxes, tape, and cargo fees.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsExpenseModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs font-bold rounded-xl shadow-xs transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add New Expense</span>
          </button>
        </div>

        {/* Expenses Table */}
        {filteredData.activeExpenses.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-400">
            No expenses recorded for this period. Click &ldquo;+ Add New Expense&rdquo; to log your first expense.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Expense Title</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4 text-right">Amount (PKR)</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.activeExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {new Date(exp.date).toLocaleDateString("en-PK")}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-800">{exp.title}</span>
                      {exp.notes && <span className="block text-[10px] text-slate-400">{exp.notes}</span>}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {exp.payment_method || "Cash"}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-black text-rose-600">
                      Rs. {exp.amount.toLocaleString("en-PK")}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete expense"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xs overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#dc2626]" />
                <h3 className="font-bold text-sm text-[#111827]">Add Operating Expense</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsExpenseModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveExpenseSubmit} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Expense Title / Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Courier Fly bags, Shop Rent, Tea bill"
                  value={expenseForm.title}
                  onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#dc2626] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Category *</label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value as Expense["category"] })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#dc2626] bg-white"
                  >
                    <option value="Packaging & Supplies">Packaging & Supplies</option>
                    <option value="Cargo & Freight">Cargo & Freight</option>
                    <option value="Shop Rent & Bills">Shop Rent & Bills</option>
                    <option value="Salaries">Staff Salaries</option>
                    <option value="Refreshments">Tea & Refreshments</option>
                    <option value="Repairs & Maintenance">Repairs & Maintenance</option>
                    <option value="Other">Other Miscellaneous</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Amount (PKR) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 2500"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#dc2626] font-mono font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Payment Method</label>
                <select
                  value={expenseForm.payment_method}
                  onChange={(e) => setExpenseForm({ ...expenseForm, payment_method: e.target.value as Expense["payment_method"] })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#dc2626] bg-white"
                >
                  <option value="Cash">Cash (دکان کا کیش)</option>
                  <option value="JazzCash / EasyPaisa">JazzCash / EasyPaisa</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Bill receipt # or paid to staff name"
                  value={expenseForm.notes}
                  onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#dc2626]"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  disabled={isSavingExpense}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingExpense}
                  className="px-5 py-2.5 bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs font-bold rounded-xl transition-colors shadow-xs disabled:opacity-50"
                >
                  {isSavingExpense ? "Saving..." : "Save Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
