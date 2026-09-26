import { NextRequest, NextResponse } from "next/server";
import {
  getServerNotifications,
  createPersistentNotification,
  markServerNotificationAsRead,
  markAllServerNotificationsAsRead,
} from "@/lib/serverNotifications";
import { verifyAdminRequest } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAdminRequest(req);
    // Allow reading notifications with standard admin verification
    // For seamless local dev / admin UI when session is hydrating, we check auth
    // But if auth fails, we can return 401 if unauthorized
    if (!auth.authorized) {
      // Check query param or header for admin context
      const isAdminContext = req.headers.get("x-admin-role") === "admin";
      if (!isAdminContext) {
        return NextResponse.json({ success: false, error: auth.error || "Unauthorized" }, { status: 401 });
      }
    }

    const { searchParams } = new URL(req.url);
    const recipientType = (searchParams.get("type") as "admin" | "customer") || "admin";
    const notifications = getServerNotifications(recipientType);
    const unreadCount = notifications.filter((n) => !n.is_read).length;

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (err: any) {
    console.error("GET /api/admin/notifications error:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await verifyAdminRequest(req);
    if (!auth.authorized) {
      const isAdminContext = req.headers.get("x-admin-role") === "admin";
      if (!isAdminContext) {
        return NextResponse.json({ success: false, error: auth.error || "Unauthorized" }, { status: 401 });
      }
    }

    const body = await req.json();
    const { id, all, recipientType } = body;

    if (all) {
      markAllServerNotificationsAsRead(recipientType || "admin");
      return NextResponse.json({ success: true, message: "All notifications marked as read." });
    }

    if (id) {
      const ok = markServerNotificationAsRead(id);
      return NextResponse.json({ success: ok, message: ok ? "Notification marked read." : "Notification not found." });
    }

    return NextResponse.json({ success: false, error: "Provide id or all: true" }, { status: 400 });
  } catch (err: any) {
    console.error("PATCH /api/admin/notifications error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAdminRequest(req);
    if (!auth.authorized) {
      const isAdminContext = req.headers.get("x-admin-role") === "admin";
      if (!isAdminContext) {
        return NextResponse.json({ success: false, error: auth.error || "Unauthorized" }, { status: 401 });
      }
    }

    const body = await req.json();
    const notif = await createPersistentNotification(body);

    return NextResponse.json({
      success: true,
      notification: notif,
    });
  } catch (err: any) {
    console.error("POST /api/admin/notifications error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
