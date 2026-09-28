import fs from "fs";
import path from "path";
import { AppNotification } from "@/lib/types";
import { supabase } from "@/lib/supabase";

const NOTIFICATIONS_FILE = path.join(process.cwd(), "data", "notifications.json");

export function getServerNotifications(recipientType?: "admin" | "customer"): AppNotification[] {
  try {
    if (!fs.existsSync(NOTIFICATIONS_FILE)) {
      const defaultNotifs: AppNotification[] = [
        {
          id: "notif-seed-1",
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
      ];
      fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(defaultNotifs, null, 2), "utf8");
      return recipientType ? defaultNotifs.filter((n) => n.recipient_type === recipientType) : defaultNotifs;
    }

    const raw = fs.readFileSync(NOTIFICATIONS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    const list: AppNotification[] = Array.isArray(parsed) ? parsed : [];

    if (recipientType) {
      return list.filter((n) => n.recipient_type === recipientType);
    }
    return list;
  } catch (err) {
    console.error("Error reading server notifications:", err);
    return [];
  }
}

export async function createPersistentNotification(
  payload: Omit<AppNotification, "id" | "created_at" | "is_read"> & {
    id?: string;
    is_read?: boolean;
    created_at?: string;
  }
): Promise<AppNotification> {
  const newNotif: AppNotification = {
    id: payload.id || `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title: payload.title,
    message: payload.message,
    type: payload.type,
    recipient_type: payload.recipient_type || "admin",
    recipient_id: payload.recipient_id,
    reference_id: payload.reference_id,
    link_url: payload.link_url || (payload.type === "new_order" ? "/admin/orders" : undefined),
    whatsapp_text: payload.whatsapp_text,
    data: payload.data,
    is_read: payload.is_read || false,
    created_at: payload.created_at || new Date().toISOString(),
  };

  try {
    const list = getServerNotifications();
    // Deduplication check: Avoid inserting exact same reference_id and type
    const existingIndex = list.findIndex(
      (n) => n.reference_id && n.reference_id === newNotif.reference_id && n.type === newNotif.type
    );

    if (existingIndex >= 0) {
      list[existingIndex] = { ...list[existingIndex], ...newNotif };
    } else {
      list.unshift(newNotif);
    }

    // Keep last 200 notifications to prevent unbounded growth
    const trimmed = list.slice(0, 200);
    fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(trimmed, null, 2), "utf8");
  } catch (err) {
    console.error("Error saving persistent notification to file:", err);
  }

  // Attempt Supabase insert safely
  try {
    await supabase.from("notifications").insert([newNotif]);
  } catch {}

  return newNotif;
}

export function markServerNotificationAsRead(id: string): boolean {
  try {
    const list = getServerNotifications();
    let found = false;
    const updated = list.map((n) => {
      if (n.id === id) {
        found = true;
        return { ...n, is_read: true };
      }
      return n;
    });

    if (found) {
      fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(updated, null, 2), "utf8");
    }
    return found;
  } catch (err) {
    console.error("Error marking server notification as read:", err);
    return false;
  }
}

export function markAllServerNotificationsAsRead(recipientType: "admin" | "customer" = "admin"): boolean {
  try {
    const list = getServerNotifications();
    const updated = list.map((n) => {
      if (n.recipient_type === recipientType) {
        return { ...n, is_read: true };
      }
      return n;
    });

    fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(updated, null, 2), "utf8");
    return true;
  } catch (err) {
    console.error("Error marking all server notifications as read:", err);
    return false;
  }
}
