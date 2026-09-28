import { NextRequest, NextResponse } from "next/server";
import { getOrders, Order } from "@/lib/orders";
import { getServerOrders } from "@/lib/serverOrders";
import { supabase } from "@/lib/supabase";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/**
 * Mask sensitive customer PII for public tracking
 */
function sanitizeOrderForPublic(order: Order): Partial<Order> {
  const nameParts = (order.customer_name || "Customer").split(" ");
  const maskedName = nameParts
    .map((part) => (part.length > 1 ? `${part[0]}${"*".repeat(Math.min(part.length - 1, 4))}` : part))
    .join(" ");

  const cleanPhone = (order.customer_phone || "").replace(/[^0-9]/g, "");
  const maskedPhone =
    cleanPhone.length >= 10
      ? `${cleanPhone.slice(0, 4)}****${cleanPhone.slice(-3)}`
      : "*******";

  // Retain only city or masked address
  const addrParts = (order.customer_address || "Pakistan").split(",");
  const city = addrParts[addrParts.length - 1].trim();
  const maskedAddress = `Protected Address, ${city}`;

  return {
    id: order.id,
    order_number: order.order_number,
    customer_name: maskedName,
    customer_phone: maskedPhone,
    customer_address: maskedAddress,
    items: order.items,
    total_items: order.total_items,
    total_amount: order.total_amount,
    delivery_charges: order.delivery_charges,
    status: order.status,
    payment_method: order.payment_method,
    payment_status: order.payment_status,
    created_at: order.created_at,
  };
}

export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    const rl = checkRateLimit(`app-orders-${ip}`, { limit: 40, windowMs: 60000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please slow down." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    const { searchParams } = new URL(req.url);
    const orderNumber = searchParams.get("order_number")?.trim();
    const phone = searchParams.get("phone")?.trim();

    // 1. Check if caller has verified customer or admin authentication
    let authUser: any = null;
    let isAdmin = false;
    const authHeader = req.headers.get("authorization") || "";

    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "").trim();
      const { data: authData, error: authError } = await supabase.auth.getUser(token);
      if (!authError && authData?.user) {
        authUser = authData.user;
        const email = (authUser.email || "").toLowerCase();
        const role = (authUser.user_metadata?.role || "").toLowerCase();
        isAdmin =
          email === "admin@zubairmobile.com" ||
          email === "zubair@zubairmobile.pk" ||
          role === "admin" ||
          role === "super_admin";
      }
    }

    const serverOrders = getServerOrders();
    const localOrders = await getOrders();
    const orderMap = new Map<string, Order>();
    for (const o of localOrders) {
      if (o.id) orderMap.set(o.id.toLowerCase(), o);
      if (o.order_number) orderMap.set(o.order_number.toLowerCase(), o);
    }
    for (const o of serverOrders) {
      if (o.id) orderMap.set(o.id.toLowerCase(), o);
      if (o.order_number) orderMap.set(o.order_number.toLowerCase(), o);
    }
    const allOrders = Array.from(new Set(orderMap.values()));

    // 2. Authenticated Admin Access: Full view
    if (isAdmin) {
      if (orderNumber) {
        const match = allOrders.find(
          (o) => o.order_number?.toLowerCase() === orderNumber.toLowerCase() || o.id === orderNumber
        );
        return match
          ? NextResponse.json({ success: true, order: match })
          : NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
      }
      if (phone) {
        const cleanPhone = phone.replace(/[^0-9]/g, "");
        const matchedOrders = allOrders.filter((o) =>
          (o.customer_phone || "").replace(/[^0-9]/g, "").includes(cleanPhone)
        );
        return NextResponse.json({ success: true, count: matchedOrders.length, orders: matchedOrders });
      }
      return NextResponse.json({ success: true, count: allOrders.length, orders: allOrders });
    }

    // 3. Authenticated Customer Access: Scoped to their own user record
    if (authUser) {
      const authPhone = (authUser.user_metadata?.phone || authUser.phone || "").replace(/[^0-9]/g, "");
      const authEmail = (authUser.email || "").toLowerCase();
      const authId = authUser.id;

      const myOrders = allOrders.filter((o) => {
        const orderPhone = (o.customer_phone || "").replace(/[^0-9]/g, "");
        const isIdMatch = (o as any).customer_id === authId;
        const isPhoneMatch = authPhone && orderPhone && (orderPhone === authPhone || orderPhone.endsWith(authPhone.slice(-7)));
        const isEmailMatch = (o as any).customer_email && (o as any).customer_email.toLowerCase() === authEmail;
        return isIdMatch || isPhoneMatch || isEmailMatch;
      });

      if (orderNumber) {
        const singleMatch = myOrders.find(
          (o) => o.order_number?.toLowerCase() === orderNumber.toLowerCase() || o.id === orderNumber
        );
        return singleMatch
          ? NextResponse.json({ success: true, order: singleMatch })
          : NextResponse.json({ success: false, error: "Order not found in your account." }, { status: 404 });
      }

      return NextResponse.json({ success: true, count: myOrders.length, orders: myOrders });
    }

    // 4. Unauthenticated Guest Tracking: MUST verify ownership with BOTH order_number AND matching phone
    // Enforce dedicated strict rate limit on guest lookups to prevent brute force scraping
    const guestLimit = checkRateLimit(`guest-track-${ip}`, { limit: 12, windowMs: 60000 });
    if (!guestLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many guest tracking requests. Please slow down." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    if (!orderNumber && !phone) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: Login required to view orders. To track a guest order, provide both order_number and phone.",
        },
        { status: 401 }
      );
    }

    if (phone && !orderNumber) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: Login required to view order history. For tracking a specific order, please provide both order_number and phone.",
        },
        { status: 401 }
      );
    }

    if (orderNumber && !phone) {
      return NextResponse.json(
        {
          success: false,
          error: "Verification required: Please provide the phone number matching this order.",
        },
        { status: 400 }
      );
    }

    // Both orderNumber and phone are present
    const cleanSearchPhone = (phone || "").replace(/[^0-9]/g, "");
    if (cleanSearchPhone.length < 4) {
      return NextResponse.json(
        { success: false, error: "Invalid verification phone number." },
        { status: 400 }
      );
    }

    const match = allOrders.find(
      (o) => o.order_number?.toLowerCase() === orderNumber?.toLowerCase() || o.id === orderNumber
    );

    if (!match) {
      return NextResponse.json({ success: false, error: "Order not found." }, { status: 404 });
    }

    // Verify ownership: order's phone must match provided phone
    const orderPhoneClean = (match.customer_phone || "").replace(/[^0-9]/g, "");
    const isOwner =
      orderPhoneClean === cleanSearchPhone ||
      (cleanSearchPhone.length >= 7 && orderPhoneClean.endsWith(cleanSearchPhone)) ||
      (orderPhoneClean.length >= 7 && cleanSearchPhone.endsWith(orderPhoneClean.slice(-7)));

    if (!isOwner) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Phone number does not match this order." },
        { status: 403 }
      );
    }

    // Return sanitized public tracking order with sensitive customer PII masked
    return NextResponse.json({
      success: true,
      order: sanitizeOrderForPublic(match),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
