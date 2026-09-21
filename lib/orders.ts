import { supabase } from "@/lib/supabase";

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  sku?: string;
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
  status: "pending" | "confirmed" | "dispatched" | "completed";
  created_at: string;
  // Cargo Delivery & Tracking details
  cargo_name?: string;
  tracking_number?: string;
  dispatch_date?: string;
  customer_id?: string;
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
      { id: "p-1", name: "VIVO Y20 SUNLONG BLACK UNIT", price: 2650, quantity: 2, sku: "ZB-LCD-V20S" },
      { id: "p-9", name: "VIVO Y20 IC CHARGING FLEX", price: 320, quantity: 5, sku: "ZB-FLX-VY20" },
      { id: "p-6", name: "VIVO Y20 BLACK OCA GLASS", price: 180, quantity: 10, sku: "ZB-OCA-VY20" },
    ],
    total_items: 17,
    total_amount: 8700,
    status: "dispatched",
    cargo_name: "Daewoo Cargo Express",
    tracking_number: "DW-982410-LHR",
    dispatch_date: new Date(Date.now() - 3600000 * 4).toISOString(),
    created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
  },
];

/**
 * Save an order to localStorage and optionally to Supabase if table exists
 */
export async function saveOrder(order: Order): Promise<void> {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ORDERS);
      const orders: Order[] = stored ? JSON.parse(stored) : [];
      // Prepend so newest is first
      orders.unshift(order);
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
        id: order.id,
        order_number: order.order_number,
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        customer_address: order.customer_address,
        shop_name: order.shop_name || null,
        items: order.items,
        total_items: order.total_items,
        total_amount: order.total_amount,
        status: order.status,
        cargo_name: order.cargo_name || null,
        tracking_number: order.tracking_number || null,
        dispatch_date: order.dispatch_date || null,
        customer_id: order.customer_id || null,
      },
    ]);
  } catch (err) {
    console.warn("Notice: Supabase orders insert skipped:", err);
  }
}

/**
 * Get all orders merged from localStorage & initial orders
 */
export function getOrders(): Order[] {
  if (typeof window === "undefined") return INITIAL_ORDERS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY_ORDERS);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Error reading orders:", err);
  }
  return INITIAL_ORDERS;
}

/**
 * Get orders for a specific logged-in customer
 */
export function getCustomerOrders(identifier: {
  customerId?: string;
  phone?: string;
  username?: string;
}): Order[] {
  const allOrders = getOrders();
  if (!identifier.customerId && !identifier.phone && !identifier.username) {
    return [];
  }

  const cleanPhone = identifier.phone?.replace(/[^0-9]/g, "");

  return allOrders.filter((order) => {
    if (identifier.customerId && order.customer_id === identifier.customerId) return true;
    if (identifier.username && order.customer_id === identifier.username) return true;
    if (cleanPhone && order.customer_phone) {
      const orderPhoneClean = order.customer_phone.replace(/[^0-9]/g, "");
      if (orderPhoneClean && (orderPhoneClean.includes(cleanPhone) || cleanPhone.includes(orderPhoneClean))) {
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
 * Update an order's cargo dispatch details and tracking number
 */
export function updateOrderDispatch(
  orderId: string,
  cargoName: string,
  trackingNumber: string,
  status: Order["status"] = "dispatched"
): void {
  if (typeof window === "undefined") return;
  try {
    const orders = getOrders();
    const dispatchDate = new Date().toISOString();
    const updated = orders.map((o) =>
      o.id === orderId
        ? {
            ...o,
            cargo_name: cargoName.trim(),
            tracking_number: trackingNumber.trim(),
            dispatch_date: dispatchDate,
            status,
          }
        : o
    );
    localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(updated));
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new CustomEvent("zubair_orders_updated", { detail: updated }));
  } catch (err) {
    console.error("Failed to update order dispatch details:", err);
  }
}
