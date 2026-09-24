import { supabase } from "@/lib/supabase";
import { AppNotification, NotificationType } from "@/lib/types";
import { Order } from "@/lib/orders";

export const STORAGE_KEY_NOTIFICATIONS = "zubair_mobile_notifications";

export const DEFAULT_NOTIFICATIONS: AppNotification[] = [
  {
    id: "notif-1",
    recipient_type: "admin",
    title: "New Wholesale Order Received",
    message: "Order #ZB-1002 placed by Ali Mobile Repair Center for Rs. 24,500.",
    type: "new_order",
    reference_id: "order-1002",
    is_read: false,
    link_url: "/admin/orders",
    whatsapp_text: "New order ZB-1002 received for Rs. 24,500",
    created_at: new Date(Date.now() - 30 * 60000).toISOString(),
  },
  {
    id: "notif-2",
    recipient_type: "admin",
    title: "Low Stock Alert: VIVO Y20 LCD",
    message: "Remaining stock for VIVO Y20 SUNLONG is 8 units (Threshold: 10).",
    type: "low_stock",
    reference_id: "p-1",
    is_read: false,
    link_url: "/admin/inventory",
    whatsapp_text: "Warning: VIVO Y20 LCD stock is low (8 left)",
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: "notif-3",
    recipient_type: "customer",
    title: "Order Dispatched via Asia Cargo",
    message: "Your order #ZB-998 has been dispatched via Asia Cargo. Bilty # AC-7721.",
    type: "order_dispatched",
    reference_id: "order-998",
    is_read: false,
    link_url: "/profile",
    whatsapp_text: "Assalam-o-Alaikum, your Zubair Mobile order #ZB-998 dispatched via Asia Cargo. Bilty: AC-7721.",
    created_at: new Date(Date.now() - 5 * 3600000).toISOString(),
  },
];

/**
 * Fetch all notifications for admin or customer
 */
export async function getNotifications(recipientType?: "admin" | "customer", recipientId?: string): Promise<AppNotification[]> {
  try {
    let query = supabase.from("notifications").select("*").order("created_at", { ascending: false });

    if (recipientType) {
      query = query.eq("recipient_type", recipientType);
    }
    if (recipientId) {
      query = query.eq("recipient_id", recipientId);
    }

    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(data));
      }
      return data as AppNotification[];
    }
  } catch (err) {
    console.warn("Supabase notifications fetch error, using local fallback:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (!recipientType) return parsed;
          return parsed.filter((n) => n.recipient_type === recipientType);
        }
      }
    } catch {}
  }

  if (!recipientType) return DEFAULT_NOTIFICATIONS;
  return DEFAULT_NOTIFICATIONS.filter((n) => n.recipient_type === recipientType);
}

/**
 * Dispatch / save a new notification
 */
export async function createNotification(
  payload: Omit<AppNotification, "id" | "created_at" | "is_read" | "recipient_type"> & { recipient_type?: "admin" | "customer" }
): Promise<AppNotification> {
  const newNotif: AppNotification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    recipient_type: "admin",
    ...payload,
    is_read: false,
    created_at: new Date().toISOString(),
  };

  try {
    await supabase.from("notifications").insert([newNotif]);
  } catch (err) {
    console.warn("Supabase notification insert warning:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const all = await getNotifications();
      const updated = [newNotif, ...all];
      localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(updated));
      window.dispatchEvent(new Event("zubair_notifications_updated"));
    } catch {}
  }

  return newNotif;
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(id: string): Promise<void> {
  try {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  } catch {}

  if (typeof window !== "undefined") {
    try {
      const all = await getNotifications();
      const updated = all.map((n) => (n.id === id ? { ...n, is_read: true } : n));
      localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(updated));
      window.dispatchEvent(new Event("zubair_notifications_updated"));
    } catch {}
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(recipientType: "admin" | "customer"): Promise<void> {
  try {
    await supabase.from("notifications").update({ is_read: true }).eq("recipient_type", recipientType);
  } catch {}

  if (typeof window !== "undefined") {
    try {
      const all = await getNotifications();
      const updated = all.map((n) =>
        n.recipient_type === recipientType ? { ...n, is_read: true } : n
      );
      localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(updated));
      window.dispatchEvent(new Event("zubair_notifications_updated"));
    } catch {}
  }
}

/**
 * WhatsApp Direct Link Generator
 */
export function buildWhatsAppNotificationUrl(phone: string, message: string): string {
  const cleanPhone = phone.replace(/[^0-9]/g, "");
  // If local Pakistani 03XX number, convert to international +923XX
  let intlPhone = cleanPhone;
  if (intlPhone.startsWith("03")) {
    intlPhone = "92" + intlPhone.slice(1);
  } else if (!intlPhone.startsWith("92")) {
    intlPhone = "92" + intlPhone;
  }
  return `https://wa.me/${intlPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Common Triggers
 */
export async function notifyAdminNewOrder(order: Order): Promise<void> {
  await createNotification({
    recipient_type: "admin",
    title: `New Order Placed: #${order.order_number}`,
    message: `${order.customer_name} (${order.shop_name || "Customer"}) placed order for Rs. ${order.total_amount.toLocaleString()}. Total items: ${order.total_items}.`,
    type: "new_order",
    reference_id: order.id,
    link_url: "/admin/orders",
    whatsapp_text: `*Zubair Mobile Order Alert*\nOrder: #${order.order_number}\nCustomer: ${order.customer_name}\nAmount: Rs. ${order.total_amount.toLocaleString()}`,
  });
}

export async function notifyCustomerOrderDispatched(
  customerPhone: string,
  order: Order
): Promise<{ notif: AppNotification; waUrl: string }> {
  const message = `Assalam-o-Alaikum! Your order #${order.order_number} has been dispatched from Zubair Mobile Gujranwala via ${order.cargo_name || "Cargo"}.\nBilty / Tracking No: ${order.tracking_number || "Provided in store"}\nTotal Bill: Rs. ${order.total_amount.toLocaleString()}\nFor help contact 0345-8032600.`;

  const notif = await createNotification({
    recipient_type: "customer",
    recipient_id: order.customer_id,
    title: `Order #${order.order_number} Dispatched!`,
    message: `Your cargo has been handed to ${order.cargo_name || "Cargo Service"}. Bilty #: ${order.tracking_number || "Attached"}.`,
    type: "order_dispatched",
    reference_id: order.id,
    link_url: "/profile",
    whatsapp_text: message,
  });

  const waUrl = buildWhatsAppNotificationUrl(customerPhone, message);
  return { notif, waUrl };
}
