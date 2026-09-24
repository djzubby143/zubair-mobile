import { NextRequest, NextResponse } from "next/server";
import { getOrders } from "@/lib/orders";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone");
    const orderNumber = searchParams.get("order_number");

    const allOrders = await getOrders();

    if (orderNumber) {
      const match = allOrders.find(
        (o) => o.order_number?.toLowerCase() === orderNumber.toLowerCase() || o.id === orderNumber
      );
      if (!match) return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
      return NextResponse.json({ success: true, order: match });
    }

    if (phone) {
      const cleanPhone = phone.replace(/[^0-9]/g, "");
      const customerOrders = allOrders.filter((o) => {
        const orderPhone = (o.customer_phone || "").replace(/[^0-9]/g, "");
        return orderPhone.includes(cleanPhone) || cleanPhone.includes(orderPhone);
      });
      return NextResponse.json({ success: true, count: customerOrders.length, orders: customerOrders });
    }

    // Default return recent orders
    return NextResponse.json({ success: true, count: allOrders.length, orders: allOrders.slice(0, 20) });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
