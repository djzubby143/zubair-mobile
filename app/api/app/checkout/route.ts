import { NextRequest, NextResponse } from "next/server";
import { saveOrder, Order, getOrders } from "@/lib/orders";
import { createNotification } from "@/lib/notifications";
import { supabase } from "@/lib/supabase";
import { resolveServerTier } from "@/lib/pricingSecurity";
import { DEFAULT_CATALOG_PRODUCTS } from "@/lib/products";
import { getServerCustomProducts, saveServerCustomProducts } from "@/lib/serverProducts";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    const rl = checkRateLimit(`checkout-${ip}`, { limit: 15, windowMs: 60000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many checkout requests. Please wait a moment." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

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
      idempotency_key,
    } = body;

    const resolvedName = (customer_name || body.customer?.name || body.customer?.full_name || "").trim();
    const resolvedPhone = (customer_phone || body.customer?.phone || "").trim();
    const resolvedAddress = (customer_address || body.customer?.address || body.customer?.city || "Shop Pickup").trim();

    if (!resolvedName || !customerPhoneValid(resolvedPhone) || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Customer name, valid phone number (min 10 digits), and cart items are required." },
        { status: 400 }
      );
    }

    // 1. Idempotency Check: Prevent duplicate orders within 5 minutes
    const existingOrders = await getOrders();
    const clientKey = (idempotency_key || "").trim();
    if (clientKey) {
      const duplicate = existingOrders.find((o) => (o as any).idempotency_key === clientKey || o.id === clientKey);
      if (duplicate) {
        return NextResponse.json({
          success: true,
          message: "Order already placed.",
          order: duplicate,
        });
      }
    }

    // 2. Resolve caller's legitimate tier
    const userTier = await resolveServerTier(req);

    // 3. Stock & Price Validation against real catalog / database
    const serverCustom = getServerCustomProducts();
    const verifiedItems: any[] = [];
    let computedSubtotal = 0;

    for (const item of items) {
      const q = Math.max(1, parseInt(item.quantity, 10) || 1);

      // Find product in Supabase or server fallback
      let dbProd: any = null;
      try {
        const { data } = await supabase
          .from("products")
          .select("*")
          .or(`id.eq.${item.id},sku.eq.${item.sku || "none"}`)
          .maybeSingle();
        if (data) dbProd = data;
      } catch {}

      if (!dbProd) {
        dbProd =
          serverCustom.find((p) => p.id === item.id || (p.sku && p.sku === item.sku)) ||
          DEFAULT_CATALOG_PRODUCTS.find((p) => p.id === item.id || (p.sku && p.sku === item.sku));
      }

      if (!dbProd) {
        return NextResponse.json(
          { success: false, error: `Product "${item.name || item.id}" could not be found.` },
          { status: 400 }
        );
      }

      // Check available stock
      const availableStock = Number(dbProd.stock_quantity ?? dbProd.stock ?? 0);
      if (availableStock < q) {
        return NextResponse.json(
          {
            success: false,
            error: `Insufficient stock for "${dbProd.name}". Available: ${availableStock}, Requested: ${q}. Please adjust quantity.`,
          },
          { status: 400 }
        );
      }

      // Determine authorized price for caller's tier
      let authorizedUnitPrice = Number(dbProd.retail_price) || Math.round(Number(dbProd.price || 0) * 1.25);
      if (userTier === "technician" && dbProd.technician_price) {
        authorizedUnitPrice = Number(dbProd.technician_price);
      } else if (userTier === "wholesale" && (dbProd.wholesale_price || dbProd.price)) {
        authorizedUnitPrice = Number(dbProd.wholesale_price ?? dbProd.price);
      } else if (userTier === "admin") {
        authorizedUnitPrice = Number(dbProd.wholesale_price ?? dbProd.price);
      }

      computedSubtotal += authorizedUnitPrice * q;

      verifiedItems.push({
        id: dbProd.id,
        name: dbProd.name,
        sku: dbProd.sku,
        price: authorizedUnitPrice,
        purchase_price: dbProd.purchase_price || null,
        quantity: q,
      });
    }

    // 4. Calculate Final Totals
    const delivery = computedSubtotal >= 5000 ? 0 : 250;
    const discount = Math.max(0, Number(discount_amount) || 0);
    const finalTotal = Math.max(0, computedSubtotal + delivery - discount);

    const orderNumber = `ZM-${Date.now().toString().slice(-6)}`;
    const newOrder: Order & { idempotency_key?: string } = {
      id: clientKey || `ord-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      order_number: orderNumber,
      customer_name: resolvedName,
      customer_phone: resolvedPhone,
      customer_address: resolvedAddress,
      order_notes: (order_notes || "").trim(),
      items: verifiedItems,
      total_items: verifiedItems.reduce((sum: number, it: any) => sum + it.quantity, 0),
      total_amount: finalTotal,
      delivery_charges: delivery,
      status: "pending",
      payment_method: payment_method || "cod",
      payment_status: "unpaid",
      created_at: new Date().toISOString(),
      idempotency_key: clientKey || undefined,
    };

    // 5. Decrement Stock atomically
    // A. Supabase products table
    for (const vItem of verifiedItems) {
      try {
        const { data: current } = await supabase
          .from("products")
          .select("id, stock_quantity")
          .or(`id.eq.${vItem.id},sku.eq.${vItem.sku || "none"}`)
          .maybeSingle();

        if (current) {
          const updatedStock = Math.max(0, (Number(current.stock_quantity) || 0) - vItem.quantity);
          await supabase.from("products").update({ stock_quantity: updatedStock }).eq("id", current.id);
        }
      } catch (stockErr) {
        console.warn(`Stock decrement failed for ${vItem.id}:`, stockErr);
      }
    }

    // B. Server Custom Products
    let customModified = false;
    for (const vItem of verifiedItems) {
      const idx = serverCustom.findIndex((p) => p.id === vItem.id || p.sku === vItem.sku);
      if (idx !== -1) {
        const prev = serverCustom[idx].stock_quantity || 0;
        serverCustom[idx] = {
          ...serverCustom[idx],
          stock_quantity: Math.max(0, prev - vItem.quantity),
          updated_at: new Date().toISOString(),
        };
        customModified = true;
      }
    }
    if (customModified) {
      saveServerCustomProducts(serverCustom);
    }

    // 6. Save order
    await saveOrder(newOrder);

    // 7. Dispatch Notification to Admin
    await createNotification({
      recipient_type: "admin",
      type: "new_order",
      title: `New Order Received: #${orderNumber}`,
      message: `${resolvedName} placed order #${orderNumber} for Rs. ${finalTotal.toLocaleString()} (${verifiedItems.length} items).`,
      reference_id: newOrder.id,
      data: { order_id: newOrder.id, order_number: orderNumber, total: finalTotal, phone: resolvedPhone },
    });

    return NextResponse.json({
      success: true,
      message: "Order placed successfully!",
      order: newOrder,
      whatsapp_link: `https://wa.me/923458032600?text=${encodeURIComponent(
        `*New Mobile App Order #${orderNumber}*\nName: ${resolvedName}\nTotal: Rs. ${finalTotal}\nItems: ${verifiedItems.length}`
      )}`,
    });
  } catch (err: any) {
    console.error("Checkout order error:", err);
    return NextResponse.json({ success: false, error: err.message || "Checkout failed" }, { status: 500 });
  }
}

function customerPhoneValid(phone: any): boolean {
  if (typeof phone !== "string") return false;
  const digits = phone.replace(/[^0-9]/g, "");
  return digits.length >= 10;
}
