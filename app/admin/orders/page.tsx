"use client";

import React, { useState, useEffect } from "react";
import {
  Receipt,
  Printer,
  Download,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Truck,
  Package,
  Phone,
  MapPin,
  RefreshCw,
  ExternalLink,
  Store,
  Calendar,
  Layers,
  ArrowUpDown,
  Send,
  Copy,
  Check,
} from "lucide-react";
import { Order, getOrders, updateOrderStatus, updateOrderDispatch } from "@/lib/orders";
import { generateReceiptJpeg, printThermalReceipt, ThermalPaperWidth } from "@/lib/receiptGenerator";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [paperWidth, setPaperWidth] = useState<ThermalPaperWidth>(68);
  const [isGeneratingJpeg, setIsGeneratingJpeg] = useState<string | null>(null);
  const [previewOrder, setPreviewOrder] = useState<Order | null>(null);

  // Cargo & Bilty Dispatch Modal State
  const [dispatchOrder, setDispatchOrder] = useState<Order | null>(null);
  const [cargoName, setCargoName] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [copiedBilty, setCopiedBilty] = useState(false);

  const loadOrders = () => {
    const list = getOrders();
    setOrders(list);
  };

  useEffect(() => {
    loadOrders();

    const handleUpdate = () => {
      loadOrders();
    };

    window.addEventListener("zubair_orders_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener("zubair_orders_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const handleStatusChange = (order: Order, newStatus: Order["status"]) => {
    if (newStatus === "dispatched") {
      handleOpenDispatch(order);
      return;
    }
    updateOrderStatus(order.id, newStatus);
    loadOrders();
  };

  const handleOpenDispatch = (order: Order) => {
    setDispatchOrder(order);
    setCargoName(order.cargo_name || "");
    setTrackingNumber(order.tracking_number || "");
  };

  const handleSaveDispatch = () => {
    if (!dispatchOrder) return;
    if (!cargoName.trim()) {
      alert("Please enter the Cargo Service name (e.g. Daewoo, TCS, Leopard, Asia Cargo).");
      return;
    }
    updateOrderDispatch(dispatchOrder.id, cargoName, trackingNumber, "dispatched");
    loadOrders();
    setDispatchOrder(null);
  };

  const handleDownloadJpeg = async (order: Order) => {
    setIsGeneratingJpeg(order.id);
    try {
      await generateReceiptJpeg(order, paperWidth);
    } catch (err) {
      console.error("Error generating JPEG receipt:", err);
      alert("Failed to generate receipt image.");
    } finally {
      setIsGeneratingJpeg(null);
    }
  };

  const handlePrint = (order: Order) => {
    printThermalReceipt(order, paperWidth);
  };

  // Filtered orders
  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.shop_name && order.shop_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = selectedStatus === "all" || order.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  // Analytics
  const totalRevenue = orders.reduce((sum, o) => sum + o.total_amount, 0);
  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const completedCount = orders.filter((o) => o.status === "completed" || o.status === "confirmed").length;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Receipt className="w-7 h-7 text-[#dc2626]" />
            <span>Customer Orders & POS Bills</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage wholesale orders, download thermal JPEG bills, and print slips on 80mm/58mm POS receipt printers.
          </p>
        </div>

        <button
          onClick={loadOrders}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-2xs self-start sm:self-center"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Orders</span>
        </button>
      </div>

      {/* Analytics KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-[#dc2626] flex items-center justify-center shrink-0">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Orders</p>
            <p className="text-2xl font-black text-slate-900">{orders.length}</p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Orders</p>
            <p className="text-2xl font-black text-amber-600">{pendingCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Order Volume</p>
            <p className="text-2xl font-black text-slate-900">Rs. {totalRevenue.toLocaleString("en-PK")}</p>
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Order #, Customer, Phone..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#dc2626]"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {["all", "pending", "confirmed", "dispatched", "completed"].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors whitespace-nowrap ${
                selectedStatus === st
                  ? "bg-[#111827] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Paper Size Selector */}
        <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 shrink-0 self-start md:self-center">
          <Printer className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-[11px] font-bold text-slate-600">Printer Roll:</span>
          <select
            value={paperWidth}
            onChange={(e) => setPaperWidth(Number(e.target.value) as ThermalPaperWidth)}
            className="bg-white border border-slate-300 rounded-lg px-2 py-0.5 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
          >
            <option value={68}>68mm (Default / Your Printer)</option>
            <option value={58}>58mm (Small 2-inch)</option>
            <option value={80}>80mm (Wide 3-inch)</option>
          </select>
        </div>
      </div>

      {/* Orders List / Cards */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-2xs">
          <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No orders found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `No orders matching "${searchQuery}".`
              : "When customers submit orders through the shopping cart, they will be listed here."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const dateDisplay = new Date(order.created_at).toLocaleString("en-PK", {
              dateStyle: "medium",
              timeStyle: "short",
            });

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow overflow-hidden"
              >
                {/* Header Row */}
                <div className="p-4 sm:p-5 bg-slate-50/80 border-b border-slate-200/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm text-slate-900 bg-white border border-slate-300 px-2.5 py-1 rounded-lg shadow-2xs">
                        #{order.order_number}
                      </span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {dateDisplay}
                      </span>
                    </div>

                    {/* Status badge */}
                    <div className="flex items-center gap-2">
                      <select
                        value={order.status}
                        onChange={(e) =>
                          handleStatusChange(order, e.target.value as Order["status"])
                        }
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg border focus:outline-none cursor-pointer ${
                          order.status === "completed"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : order.status === "confirmed"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : order.status === "dispatched"
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="dispatched">Dispatched</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  </div>

                  {/* Actions: Dispatch Cargo, Thermal Print & JPEG Download */}
                  <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
                    <button
                      type="button"
                      onClick={() => handleOpenDispatch(order)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-2xs ${
                        order.cargo_name
                          ? "bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100"
                          : "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
                      }`}
                      title="Add or Edit Cargo Service and Tracking Bilty Number"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>{order.cargo_name ? "Cargo Bilty" : "Dispatch Cargo"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePrint(order)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-2xs"
                      title="Direct print to thermal POS roll"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-600" />
                      <span>Print Slip ({paperWidth}mm)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownloadJpeg(order)}
                      disabled={isGeneratingJpeg === order.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#dc2626] hover:bg-[#b91c1c] transition-colors shadow-2xs disabled:opacity-50"
                      title="Download receipt as JPEG image"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{isGeneratingJpeg === order.id ? "Saving..." : `JPEG (${paperWidth}mm)`}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPreviewOrder(order)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors"
                      title="View Bill Slip Preview"
                    >
                      <span>Preview</span>
                    </button>
                  </div>
                </div>

                {/* Body Details: Customer Info + Items Table */}
                <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Customer Info (4 cols) */}
                  <div className="lg:col-span-4 space-y-2.5 text-xs text-slate-600 border-b lg:border-b-0 lg:border-r border-slate-100 pb-4 lg:pb-0 lg:pr-4">
                    <p className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                      Customer Details
                    </p>
                    <div className="space-y-1.5">
                      <p className="font-bold text-slate-900 text-sm">{order.customer_name}</p>
                      {order.shop_name && (
                        <p className="flex items-center gap-1.5 text-slate-700 font-medium">
                          <Store className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{order.shop_name}</span>
                        </p>
                      )}
                      <p className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <a
                          href={`https://wa.me/92${order.customer_phone.replace(/^0/, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#25D366] font-semibold hover:underline"
                        >
                          {order.customer_phone}
                        </a>
                      </p>
                      <p className="flex items-start gap-1.5 text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span>{order.customer_address}</span>
                      </p>
                      {order.order_notes && (
                        <div className="mt-2 p-2 rounded-lg bg-amber-50 border border-amber-200/60 text-amber-800 text-[11px]">
                          <strong>Notes:</strong> {order.order_notes}
                        </div>
                      )}

                      {/* Cargo Service & Bilty Details */}
                      {order.cargo_name && (
                        <div className="mt-3 p-2.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold flex items-center gap-1.5 text-purple-800">
                              <Truck className="w-3.5 h-3.5 text-purple-600" />
                              {order.cargo_name}
                            </span>
                            <button
                              onClick={() => handleOpenDispatch(order)}
                              className="text-[10px] text-purple-600 hover:text-purple-900 font-bold underline cursor-pointer"
                            >
                              Edit
                            </button>
                          </div>
                          {order.tracking_number && (
                            <div className="font-mono text-[11px] text-slate-800 bg-white px-2 py-1 rounded border border-purple-100 font-bold">
                              Bilty / Tracking: {order.tracking_number}
                            </div>
                          )}
                          {order.dispatch_date && (
                            <p className="text-[10px] text-purple-600">
                              Dispatched: {new Date(order.dispatch_date).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" })}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Items List (8 cols) */}
                  <div className="lg:col-span-8 space-y-3">
                    <p className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center justify-between">
                      <span>Order Items ({order.total_items})</span>
                      <span className="text-[#16a34a] font-black text-sm">
                        Total: Rs. {order.total_amount.toLocaleString("en-PK")}
                      </span>
                    </p>

                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-[11px]">
                          <tr>
                            <th className="py-2 px-3">Item Description</th>
                            <th className="py-2 px-3 text-center">Qty</th>
                            <th className="py-2 px-3 text-right">Rate</th>
                            <th className="py-2 px-3 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {order.items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="py-2 px-3">
                                <span className="font-semibold text-slate-800">{item.name}</span>
                                {item.sku && (
                                  <span className="block text-[10px] text-slate-400 font-mono">
                                    SKU: {item.sku}
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-center font-bold text-slate-700">
                                {item.quantity}x
                              </td>
                              <td className="py-2 px-3 text-right text-slate-600">
                                Rs. {item.price.toLocaleString("en-PK")}
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-slate-900">
                                Rs. {(item.price * item.quantity).toLocaleString("en-PK")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dispatch & Cargo Tracking Modal */}
      {dispatchOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in duration-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold shadow-2xs">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    Dispatch Order #{dispatchOrder.order_number}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Enter cargo company and tracking/bilty number for customer.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDispatchOrder(null)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center font-bold text-base"
              >
                ✕
              </button>
            </div>

            {/* Customer Summary Chip */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Customer:</span>
                <span className="font-bold text-slate-900">{dispatchOrder.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Phone:</span>
                <span className="font-bold text-slate-900">{dispatchOrder.customer_phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Destination:</span>
                <span className="font-medium text-slate-700 truncate max-w-[280px]">
                  {dispatchOrder.customer_address}
                </span>
              </div>
            </div>

            {/* Form Inputs */}
            <div className="space-y-4 text-xs">
              {/* Cargo Name */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 flex items-center justify-between">
                  <span>Cargo / Courier Service Name *</span>
                  <span className="text-[10px] text-slate-400">e.g. Daewoo, TCS, Asia Cargo</span>
                </label>
                <input
                  type="text"
                  value={cargoName}
                  onChange={(e) => setCargoName(e.target.value)}
                  placeholder="e.g. Daewoo Cargo Express"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />

                {/* Quick Selection Chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    "Daewoo Cargo",
                    "TCS Courier",
                    "Leopard Courier",
                    "Asia Cargo",
                    "Faisal Movers",
                    "M&P Express",
                    "Al-Makkah Coach",
                    "Local Cargo Van",
                  ].map((service) => (
                    <button
                      key={service}
                      type="button"
                      onClick={() => setCargoName(service)}
                      className={`px-2 py-1 rounded-md text-[10px] font-bold transition-colors ${
                        cargoName === service
                          ? "bg-purple-600 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {service}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tracking / Bilty Number */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 flex items-center justify-between">
                  <span>Bilty / Tracking Number *</span>
                  <span className="text-[10px] text-slate-400">Printed on receipt slip</span>
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g. DW-882190 or 77482910"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Send WhatsApp message to Customer */}
              {cargoName.trim() && trackingNumber.trim() && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between gap-3">
                  <div className="text-[11px] text-emerald-900">
                    <p className="font-bold">Share Bilty on WhatsApp:</p>
                    <p className="text-emerald-700">Send instant bilty alert to {dispatchOrder.customer_name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const msg = encodeURIComponent(
                        `Assalam o Alaikum ${dispatchOrder.customer_name}!\n\nAap ka Zubair Mobile Order #${dispatchOrder.order_number} cargo par laga diya gaya hai.\n\n🚚 Cargo Service: ${cargoName.trim()}\n📦 Bilty / Tracking #: ${trackingNumber.trim()}\n\nAap parcel ko track kar sakte hain ya arrival par collect kar sakte hain. Shukriya!\n\nZubair Mobile Gujranwala\n0345-8032600`
                      );
                      const cleanPhone = dispatchOrder.customer_phone.replace(/^0/, "92");
                      window.open(`https://wa.me/${cleanPhone}?text=${msg}`, "_blank");
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>WhatsApp Bilty</span>
                  </button>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDispatchOrder(null)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDispatch}
                className="flex-1 py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                <Truck className="w-4 h-4" />
                <span>Save & Mark Dispatched</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bill Preview Modal */}
      {previewOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#dc2626]" />
                <span>Thermal Slip Preview #{previewOrder.order_number}</span>
              </h3>
              <button
                onClick={() => setPreviewOrder(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Thermal Receipt Simulation Paper */}
            <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-300 font-mono text-[11px] text-slate-800 space-y-2">
              <div className="text-center space-y-0.5">
                <img
                  src="/logo.jpg"
                  alt="Zubair Mobile"
                  className="w-12 h-12 object-contain mx-auto rounded bg-black"
                />
                <p className="font-bold text-sm">ZUBAIR MOBILE</p>
                <p className="text-[10px]">REPAIR SERVICES & SPARE PARTS</p>
                <p className="text-[9px]">Shop B16, Chand Plaza, Gujranwala</p>
                <p className="font-bold text-[10px]">WhatsApp: 0345-8032600</p>
              </div>

              <div className="border-t border-dashed border-slate-400 pt-2 text-[10px]">
                <div className="flex justify-between">
                  <span>ORDER: #{previewOrder.order_number}</span>
                  <span>{new Date(previewOrder.created_at).toLocaleDateString()}</span>
                </div>
                <div>CUSTOMER: {previewOrder.customer_name}</div>
                {previewOrder.shop_name && <div>SHOP: {previewOrder.shop_name}</div>}
                <div>PHONE: {previewOrder.customer_phone}</div>
                <div>ADDRESS: {previewOrder.customer_address}</div>
              </div>

              <div className="border-t border-dashed border-slate-400 pt-1">
                <table className="w-full text-[10px]">
                  <tbody>
                    {previewOrder.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="font-bold">{it.quantity}x</td>
                        <td className="px-1 truncate max-w-[140px]">{it.name}</td>
                        <td className="text-right font-bold">
                          Rs.{(it.price * it.quantity).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t-2 border-slate-800 pt-1 font-bold flex justify-between text-xs">
                <span>GRAND TOTAL:</span>
                <span>Rs. {previewOrder.total_amount.toLocaleString()}</span>
              </div>
              <p className="text-center text-[9px] text-slate-500 pt-1">
                *** THANK YOU FOR YOUR BUSINESS ***
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => handlePrint(previewOrder)}
                className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Print Slip ({paperWidth}mm)</span>
              </button>
              <button
                type="button"
                onClick={() => handleDownloadJpeg(previewOrder)}
                className="flex-1 py-2.5 px-3 rounded-xl bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download ({paperWidth}mm)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
