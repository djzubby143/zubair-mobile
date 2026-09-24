import { NextRequest, NextResponse } from "next/server";
import { getOrders } from "@/lib/orders";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

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
    const phone = searchParams.get("phone");
    const orderNumber = searchParams.get("order_number");

    if (!phone && !orderNumber) {
      return NextResponse.json(
        { success: false, error: "Please provide your order_number or phone number to track orders." },
        { status: 400 }
      );
    }

    const allOrders = await getOrders();

    if (orderNumber) {
      const match = allOrders.find(
        (o) => o.order_number?.toLowerCase() === orderNumber.toLowerCase().trim() || o.id === orderNumber.trim()
      );
      if (!match) return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
      return NextResponse.json({ success: true, order: match });
    }

    if (phone) {
      const cleanPhone = phone.replace(/[^0-9]/g, "");
      if (cleanPhone.length < 7) {
        return NextResponse.json({ success: false, error: "Invalid phone number." }, { status: 400 });
      }
      const customerOrders = allOrders.filter((o) => {
        const orderPhone = (o.customer_phone || "").replace(/[^0-9]/g, "");
        return orderPhone.includes(cleanPhone) || cleanPhone.includes(orderPhone);
      });
      return NextResponse.json({ success: true, count: customerOrders.length, orders: customerOrders });
    }

    return NextResponse.json({ success: true, count: 0, orders: [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
