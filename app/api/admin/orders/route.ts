import { NextRequest, NextResponse } from "next/server";
import { getOrders, saveOrder, updateOrderPayment, Order } from "@/lib/orders";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    const rl = checkRateLimit(`admin-orders-${ip}`, { limit: 60, windowMs: 60000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please wait a minute." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    let allOrders = await getOrders();

    if (status && status !== "all") {
      allOrders = allOrders.filter((o) => o.status === status);
    }

    if (search) {
      const q = search.toLowerCase().trim();
      allOrders = allOrders.filter(
        (o) =>
          o.order_number?.toLowerCase().includes(q) ||
          o.customer_name?.toLowerCase().includes(q) ||
          o.customer_phone?.includes(q) ||
          o.shop_name?.toLowerCase().includes(q)
      );
    }

    return NextResponse.json({
      success: true,
      count: allOrders.length,
      orders: allOrders,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { order_id, status, paid_amount, payment_status, payment_notes, cargo_name, tracking_number } = body;

    if (!order_id) {
      return NextResponse.json({ success: false, error: "order_id is required." }, { status: 400 });
    }

    const allOrders = await getOrders();
    const order = allOrders.find((o) => o.id === order_id);

    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found." }, { status: 404 });
    }

    const updatedOrder: Order = {
      ...order,
      status: status || order.status,
      payment_status: payment_status || order.payment_status,
      paid_amount: paid_amount !== undefined ? Number(paid_amount) : order.paid_amount,
      payment_notes: payment_notes !== undefined ? payment_notes : order.payment_notes,
      cargo_name: cargo_name !== undefined ? cargo_name : order.cargo_name,
      tracking_number: tracking_number !== undefined ? tracking_number : order.tracking_number,
      updated_at: new Date().toISOString(),
    };

    await saveOrder(updatedOrder);

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
