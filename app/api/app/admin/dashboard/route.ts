import { NextRequest, NextResponse } from "next/server";
import { getOrders } from "@/lib/orders";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const orders = await getOrders();

    const pendingOrders = orders.filter((o) => o.status === "pending" || !o.status);
    const completedOrders = orders.filter((o) => (o.status as any) === "delivered" || (o.status as any) === "completed");
    const totalRevenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

    // Calculate today's sales
    const today = new Date().toISOString().slice(0, 10);
    const todayOrders = orders.filter((o) => (o.created_at || "").slice(0, 10) === today);
    const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

    // Fetch low stock from database
    let lowStockCount = 0;
    try {
      const { count } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .lte("stock_quantity", 5);
      lowStockCount = count || 0;
    } catch {}

    return NextResponse.json({
      success: true,
      kpis: {
        today_sales: todayRevenue,
        today_orders: todayOrders.length,
        total_revenue: totalRevenue,
        total_orders: orders.length,
        pending_orders: pendingOrders.length,
        completed_orders: completedOrders.length,
        low_stock_alerts: lowStockCount,
      },
      recent_orders: orders.slice(0, 10),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
