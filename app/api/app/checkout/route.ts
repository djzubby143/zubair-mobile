import { NextRequest, NextResponse } from "next/server";
import { saveOrder, Order } from "@/lib/orders";
import { createNotification } from "@/lib/notifications";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      customer_name,
      customer_phone,
      customer_address,
      items,
      payment_method,
      order_notes,
      coupon_code,
      discount_amount,
    } = body;

    if (!customer_name || !customerPhoneValid(customer_phone) || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Name, valid phone, and non-empty items are required" },
        { status: 400 }
      );
    }

    const orderNumber = `ZM-${Date.now().toString().slice(-6)}`;
    const subtotal = items.reduce((sum: number, it: any) => sum + (it.price || 0) * (it.quantity || 1), 0);
    const delivery = subtotal >= 5000 ? 0 : 250;
    const discount = Number(discount_amount) || 0;
    const totalAmount = Math.max(0, subtotal + delivery - discount);

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      order_number: orderNumber,
      customer_name,
      customer_phone,
      customer_address: customer_address || "Shop Pickup",
      order_notes: order_notes || "",
      items,
      total_items: items.reduce((sum: number, it: any) => sum + (it.quantity || 1), 0),
      total_amount: totalAmount,
      status: "pending",
      payment_method: payment_method || "cod",
      payment_status: "unpaid",
      created_at: new Date().toISOString(),
    };

    // Save order
    await saveOrder(newOrder);

    // Decrement stock in Supabase products table
    for (const item of items) {
      try {
        const { data: prod } = await supabase
          .from("products")
          .select("stock_quantity")
          .eq("id", item.id)
          .maybeSingle();

        if (prod) {
          const newStock = Math.max(0, (prod.stock_quantity || 0) - item.quantity);
          await supabase.from("products").update({ stock_quantity: newStock }).eq("id", item.id);
        }
      } catch (stockErr) {
        console.warn(`Stock decrement failed for ${item.id}:`, stockErr);
      }
    }

    // Trigger Notification
    await createNotification({
      recipient_type: "admin",
      type: "new_order",
      title: `New Order Received: #${orderNumber}`,
      message: `${customer_name} placed order #${orderNumber} for Rs. ${totalAmount.toLocaleString()} (${items.length} items).`,
      reference_id: newOrder.id,
      data: { order_id: newOrder.id, order_number: orderNumber, total: totalAmount, phone: customer_phone },
    });

    return NextResponse.json({
      success: true,
      message: "Order placed successfully!",
      order: newOrder,
      whatsapp_link: `https://wa.me/923458032600?text=${encodeURIComponent(
        `*New Mobile App Order #${orderNumber}*\nName: ${customer_name}\nTotal: Rs. ${totalAmount}\nItems: ${items.length}`
      )}`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

function customerPhoneValid(phone: any): boolean {
  return typeof phone === "string" && phone.trim().length >= 7;
}
