import { supabase } from "@/lib/supabase";

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  sku?: string;
  purchase_price?: number; // Cost / Purchase Price (Admin-only)
}

export interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  shop_name?: string;
  order_notes?: string;
  items: OrderItem[];
  total_items: number;
  total_amount: number;
  paid_amount?: number; // Amount customer has paid so far (for partial payments / khata)
  payment_status?: "unpaid" | "partial" | "paid"; // Payment status
  payment_notes?: string; // Optional payment transaction notes (e.g. JazzCash ref, Cargo COD balance)
  total_cost?: number; // Total Purchase Cost for Admin
  total_profit?: number; // Total Net Profit (total_amount - total_cost)
  delivery_charges?: number; // Courier / Cargo delivery fee
  delivery_notes?: string; // Special delivery notes or instructions
  status: "pending" | "confirmed" | "packed" | "dispatched" | "delivered" | "cancelled";
  created_at: string;
  updated_at?: string;
  // Cargo Delivery & Tracking details
  cargo_name?: string;
  tracking_number?: string;
  dispatch_date?: string;
  customer_id?: string;
}

/**
 * Calculate net profit, cost, and margin percent for an order
 */
export function calculateOrderProfit(order: Order): {
  totalCost: number;
  totalProfit: number;
  marginPercent: number;
} {
  let costSum = 0;
  for (const item of order.items) {
    // If purchase_price is available use it, else default to realistic 78% of sale price
    const unitCost =
      item.purchase_price !== undefined && item.purchase_price !== null && item.purchase_price > 0
        ? item.purchase_price
        : Math.round(item.price * 0.78);
    costSum += unitCost * item.quantity;
  }

  const profit = Math.max(0, order.total_amount - costSum);
  const margin = order.total_amount > 0 ? (profit / order.total_amount) * 100 : 0;

  return {
    totalCost: costSum,
    totalProfit: profit,
    marginPercent: Math.round(margin * 10) / 10,
  };
}

/**
 * Get payment breakdown: total, paid, remaining, and status
 */
export function getOrderPaymentDetails(order: Order): {
  total: number;
  paid: number;
  remaining: number;
  status: "unpaid" | "partial" | "paid";
} {
  const total = Number(order.total_amount) || 0;
  const paid = Math.max(0, Number(order.paid_amount) || 0);
  const remaining = Math.max(0, total - paid);

  let status: "unpaid" | "partial" | "paid" = order.payment_status || "unpaid";
  if (paid >= total && total > 0) {
    status = "paid";
  } else if (paid > 0) {
    status = "partial";
  } else {
    status = "unpaid";
  }

  return { total, paid, remaining, status };
}

export const STORAGE_KEY_ORDERS = "zubair_mobile_orders";

// Initial demo orders for preview
export const INITIAL_ORDERS: Order[] = [
  {
    id: "ord-demo-1",
    order_number: "ZB-98241",
    customer_name: "Muhammad Ali",
    customer_phone: "03001234567",
    customer_address: "Shop No. 4, Mobile Market, Gondlanwala Road, Gujranwala",
    shop_name: "Ali Mobile Repairing",
    order_notes: "Urgent delivery via local cargo please",
    items: [
      { id: "p-1", name: "VIVO Y20 SUNLONG BLACK UNIT", price: 2650, purchase_price: 2050, quantity: 2, sku: "ZB-LCD-V20S" },
      { id: "p-9", name: "VIVO Y20 IC CHARGING FLEX", price: 320, purchase_price: 220, quantity: 5, sku: "ZB-FLX-VY20" },
      { id: "p-6", name: "VIVO Y20 BLACK OCA GLASS", price: 180, purchase_price: 110, quantity: 10, sku: "ZB-OCA-VY20" },
    ],
    total_items: 17,
    total_amount: 8700,
    paid_amount: 5000,
    payment_status: "partial",
    payment_notes: "5,000 received via JazzCash. Remaining balance 3,700 on cargo.",
    total_cost: 6300,
    total_profit: 2400,
    status: "dispatched",
    cargo_name: "Daewoo Cargo Express",
    tracking_number: "DW-982410-LHR",
    dispatch_date: new Date(Date.now() - 3600000 * 4).toISOString(),
    created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
  },
];

/**
 * Update payment for an order (paid_amount, payment_notes, payment_status)
 */
export async function updateOrderPayment(
  orderId: string,
  paidAmount: number,
  notes?: string
): Promise<Order | null> {
  let updatedOrder: Order | null = null;

  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ORDERS);
      const orders: Order[] = stored ? JSON.parse(stored) : [];
      const idx = orders.findIndex((o) => o.id === orderId);
      if (idx > -1) {
        const order = orders[idx];
        const total = Number(order.total_amount) || 0;
        const validPaid = Math.max(0, Number(paidAmount) || 0);
        const status: "unpaid" | "partial" | "paid" =
          validPaid >= total && total > 0
            ? "paid"
            : validPaid > 0
            ? "partial"
            : "unpaid";

        orders[idx] = {
          ...order,
          paid_amount: validPaid,
          payment_status: status,
          payment_notes: notes !== undefined ? notes : order.payment_notes,
        };
        updatedOrder = orders[idx];
        localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(orders));
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new CustomEvent("zubair_orders_updated", { detail: orders }));
      }
    } catch (err) {
      console.warn("Error updating order payment in localStorage:", err);
    }
  }

  // Attempt to update Supabase
  try {
    if (updatedOrder) {
      await supabase
        .from("orders")
        .update({
          paid_amount: updatedOrder.paid_amount,
          payment_status: updatedOrder.payment_status,
          payment_notes: updatedOrder.payment_notes,
        })
        .eq("id", orderId);
    }
  } catch (err) {
    console.warn("Notice: Supabase payment update skipped:", err);
  }

  return updatedOrder;
}

/**
 * Save an order to localStorage and optionally to Supabase if table exists
 */
export async function saveOrder(order: Order): Promise<void> {
  const { totalCost, totalProfit } = calculateOrderProfit(order);
  const orderWithProfit: Order = {
    ...order,
    total_cost: order.total_cost ?? totalCost,
    total_profit: order.total_profit ?? totalProfit,
  };

  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ORDERS);
      const orders: Order[] = stored ? JSON.parse(stored) : [];
      // Prepend so newest is first
      orders.unshift(orderWithProfit);
      localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(orders));
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("zubair_orders_updated", { detail: orders }));
    } catch (err) {
      console.warn("Error saving order to localStorage:", err);
    }
  }

  // Attempt to write to Supabase if orders table is created
  try {
    await supabase.from("orders").insert([
      {
        id: orderWithProfit.id,
        order_number: orderWithProfit.order_number,
        customer_name: orderWithProfit.customer_name,
        customer_phone: orderWithProfit.customer_phone,
        customer_address: orderWithProfit.customer_address,
        shop_name: orderWithProfit.shop_name || null,
        order_notes: orderWithProfit.order_notes || null,
        items: orderWithProfit.items,
        total_items: orderWithProfit.total_items,
        total_amount: orderWithProfit.total_amount,
        delivery_charges: orderWithProfit.delivery_charges || 0,
        total_cost: orderWithProfit.total_cost,
        total_profit: orderWithProfit.total_profit,
        status: orderWithProfit.status,
        cargo_name: orderWithProfit.cargo_name || null,
        tracking_number: orderWithProfit.tracking_number || null,
        dispatch_date: orderWithProfit.dispatch_date || null,
        delivery_notes: orderWithProfit.delivery_notes || null,
        customer_id: orderWithProfit.customer_id || null,
      },
    ]);
  } catch (err) {
    console.warn("Notice: Supabase orders insert skipped:", err);
  }

  // AUTOMATIC INVENTORY STOCK DECREASE: Deduct ordered quantities from stock
  try {
    const { decreaseStockForOrder } = await import("@/lib/inventory");
    await decreaseStockForOrder(orderWithProfit);
  } catch (stockErr) {
    console.warn("Notice updating inventory stock for order:", stockErr);
  }

  // Update customer totals in localStorage
  if (typeof window !== "undefined") {
    try {
      const custRaw = localStorage.getItem("zubair_mobile_customers");
      if (custRaw) {
        const custs = JSON.parse(custRaw);
        const cPhone = order.customer_phone.replace(/[^0-9]/g, "");
        const idx = custs.findIndex(
          (c: { phone?: string; id?: string }) =>
            (order.customer_id && c.id === order.customer_id) ||
            (c.phone && c.phone.replace(/[^0-9]/g, "") === cPhone)
        );
        if (idx !== -1) {
          const unpaid = Math.max(0, (order.total_amount || 0) - (order.paid_amount || 0));
          custs[idx] = {
            ...custs[idx],
            total_orders: (Number(custs[idx].total_orders) || 0) + 1,
            total_purchase_amount: (Number(custs[idx].total_purchase_amount) || 0) + Number(order.total_amount || 0),
            balance: (Number(custs[idx].balance) || 0) + unpaid,
          };
          localStorage.setItem("zubair_mobile_customers", JSON.stringify(custs));
        }
      }
    } catch {}
  }
}

export const STORAGE_KEY_DELETED_ORDERS = "zubair_deleted_order_ids";

/**
 * Get all orders merged from localStorage & initial orders
 */
export function getOrders(): Order[] {
  if (typeof window === "undefined") return INITIAL_ORDERS;
  try {
    let deletedIds: string[] = [];
    const deletedRaw = localStorage.getItem(STORAGE_KEY_DELETED_ORDERS);
    if (deletedRaw) {
      try {
        deletedIds = JSON.parse(deletedRaw);
      } catch {}
    }

    const stored = localStorage.getItem(STORAGE_KEY_ORDERS);
    let list: Order[] = [];
    if (stored !== null) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        list = parsed;
      }
    } else {
      // First time initialization: seed localStorage with INITIAL_ORDERS
      list = [...INITIAL_ORDERS];
      localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(list));
    }

    // Filter out any permanently deleted order IDs or order numbers
    return list.filter(
      (o) =>
        !deletedIds.includes(o.id) &&
        !deletedIds.includes(o.order_number)
    );
  } catch (err) {
    console.warn("Error reading orders:", err);
    return [];
  }
}

/**
 * Get orders for a specific logged-in customer
 */
export function getCustomerOrders(identifier: {
  customerId?: string;
  phone?: string;
  username?: string;
  fullName?: string;
}): Order[] {
  const allOrders = getOrders();
  if (!identifier.customerId && !identifier.phone && !identifier.username && !identifier.fullName) {
    return [];
  }

  const rawPhone = identifier.phone?.replace(/[^0-9]/g, "") || "";
  const phoneTail = rawPhone.length >= 9 ? rawPhone.slice(-9) : rawPhone;

  return allOrders.filter((order) => {
    // 1. Direct ID or Username match
    if (identifier.customerId && (order.customer_id === identifier.customerId || order.customer_id === identifier.username)) {
      return true;
    }
    if (identifier.username && order.customer_id === identifier.username) {
      return true;
    }

    // 2. Robust normalized Phone match (matches 0345... with 92345... or 345...)
    if (phoneTail && order.customer_phone) {
      const orderPhoneRaw = order.customer_phone.replace(/[^0-9]/g, "");
      if (orderPhoneRaw.includes(phoneTail) || (orderPhoneRaw.length >= 9 && phoneTail.includes(orderPhoneRaw.slice(-9)))) {
        return true;
      }
    }

    // 3. Name match fallback
    if (identifier.fullName && order.customer_name) {
      if (order.customer_name.trim().toLowerCase() === identifier.fullName.trim().toLowerCase()) {
        return true;
      }
    }

    return false;
  });
}

/**
 * Update an order's status
 */
export function updateOrderStatus(orderId: string, newStatus: Order["status"]): void {
  if (typeof window === "undefined") return;
  try {
    const orders = getOrders();
    const updated = orders.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o));
    localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(updated));
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new CustomEvent("zubair_orders_updated", { detail: updated }));
  } catch (err) {
    console.error("Failed to update order status:", err);
  }
}

/**
 * Customer notification interface
 */
export interface OrderNotification {
  id: string;
  order_id: string;
  order_number: string;
  customer_phone: string;
  customer_id?: string;
  cargo_name: string;
  tracking_number: string;
  title: string;
  message: string;
  created_at: string;
  read: boolean;
}

export const STORAGE_KEY_NOTIFICATIONS = "zubair_customer_notifications";

export function saveNotification(notif: OrderNotification): void {
  if (typeof window === "undefined") return;
  try {
    const stored = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
    const list: OrderNotification[] = stored ? JSON.parse(stored) : [];
    list.unshift(notif);
    localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(list));
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new CustomEvent("zubair_notifications_updated", { detail: list }));
  } catch (err) {
    console.warn("Error saving notification:", err);
  }
}

export function getCustomerNotifications(identifier: {
  customerId?: string;
  phone?: string;
}): OrderNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
    if (!stored) return [];
    const list: OrderNotification[] = JSON.parse(stored);
    const cleanPhone = identifier.phone?.replace(/[^0-9]/g, "");
    return list.filter((n) => {
      if (identifier.customerId && n.customer_id === identifier.customerId) return true;
      if (cleanPhone && n.customer_phone) {
        const p = n.customer_phone.replace(/[^0-9]/g, "");
        if (p && (p.includes(cleanPhone) || cleanPhone.includes(p))) return true;
      }
      return false;
    });
  } catch (err) {
    return [];
  }
}

/**
 * Update an order's cargo dispatch details and tracking number
 */
export function updateOrderDispatch(
  orderId: string,
  cargoName: string,
  trackingNumber: string,
  status: Order["status"] = "dispatched",
  deliveryNotes?: string
): void {
  if (typeof window === "undefined") return;
  try {
    const orders = getOrders();
    const dispatchDate = new Date().toISOString();
    const targetOrder = orders.find((o) => o.id === orderId);

    const updated = orders.map((o) =>
      o.id === orderId
        ? {
            ...o,
            cargo_name: cargoName.trim(),
            tracking_number: trackingNumber.trim(),
            dispatch_date: dispatchDate,
            delivery_notes: deliveryNotes?.trim() || o.delivery_notes,
            status,
            updated_at: new Date().toISOString(),
          }
        : o
    );
    localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(updated));
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new CustomEvent("zubair_orders_updated", { detail: updated }));

    // Auto-create customer notification
    if (targetOrder) {
      saveNotification({
        id: `notif-${Date.now()}`,
        order_id: targetOrder.id,
        order_number: targetOrder.order_number,
        customer_phone: targetOrder.customer_phone,
        customer_id: targetOrder.customer_id,
        cargo_name: cargoName.trim(),
        tracking_number: trackingNumber.trim(),
        title: `Order #${targetOrder.order_number} Dispatched!`,
        message: `Your order has been dispatched via ${cargoName.trim()} with Tracking/Bilty #: ${trackingNumber.trim()}`,
        created_at: dispatchDate,
        read: false,
      });
    }
  } catch (err) {
    console.error("Failed to update order dispatch details:", err);
  }
}

/**
 * Delete an order permanently (e.g. if customer doesn't respond or fake order)
 */
export async function deleteOrder(orderId: string): Promise<void> {
  if (typeof window !== "undefined") {
    try {
      // 1. Permanently track in deleted IDs list so it can never reappear
      let deletedIds: string[] = [];
      const deletedRaw = localStorage.getItem(STORAGE_KEY_DELETED_ORDERS);
      if (deletedRaw) {
        try {
          deletedIds = JSON.parse(deletedRaw);
        } catch {}
      }
      if (!deletedIds.includes(orderId)) {
        deletedIds.push(orderId);
      }

      // If this is the demo order "Muhammad Ali" (ord-demo-1 or ZB-98241), record both
      if (orderId === "ord-demo-1" || orderId === "ZB-98241") {
        if (!deletedIds.includes("ord-demo-1")) deletedIds.push("ord-demo-1");
        if (!deletedIds.includes("ZB-98241")) deletedIds.push("ZB-98241");
      }

      localStorage.setItem(STORAGE_KEY_DELETED_ORDERS, JSON.stringify(deletedIds));

      // 2. Remove from active localStorage orders
      const stored = localStorage.getItem(STORAGE_KEY_ORDERS);
      let list: Order[] = [];
      if (stored !== null) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) list = parsed;
        } catch {}
      } else {
        list = [...INITIAL_ORDERS];
      }

      const filtered = list.filter(
        (o) => o.id !== orderId && o.order_number !== orderId
      );

      localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(filtered));
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("zubair_orders_updated", { detail: filtered }));
    } catch (err) {
      console.error("Failed to delete order from localStorage:", err);
    }
  }

  // Attempt to delete from Supabase if table is configured
  try {
    await supabase.from("orders").delete().eq("id", orderId);
    await supabase.from("orders").delete().eq("order_number", orderId);
  } catch (err) {
    console.warn("Notice: Supabase order deletion skipped/not available:", err);
  }
}
