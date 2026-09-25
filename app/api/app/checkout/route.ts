import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { Order, getOrders } from "@/lib/orders";
import { createNotification } from "@/lib/notifications";
import { supabase } from "@/lib/supabase";
import { resolveServerTier } from "@/lib/pricingSecurity";
import { DEFAULT_CATALOG_PRODUCTS } from "@/lib/products";
import { getServerCustomProducts } from "@/lib/serverProducts";
import { getServerOrders, saveServerOrder } from "@/lib/serverOrders";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// In-Memory Idempotency & In-Flight Lock Cache
const completedOrdersCache = new Map<string, { order: Order; timestamp: number }>();
const inFlightCheckoutLocks = new Map<string, Promise<any>>();

// In-Process Mutex for Serialized Atomic Stock Decrement
let checkoutMutex = Promise.resolve();

function acquireCheckoutLock(): Promise<() => void> {
  let release: () => void;
  const lockPromise = new Promise<void>((resolve) => {
    release = resolve;
  });
  const currentMutex = checkoutMutex;
  checkoutMutex = currentMutex.then(() => lockPromise);
  return currentMutex.then(() => release);
}

// Clean up old idempotency cache periodically
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    completedOrdersCache.forEach((record, key) => {
      if (now - record.timestamp > 300000) {
        completedOrdersCache.delete(key);
      }
    });
  }, 60000);
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    const rl = checkRateLimit(`checkout-${ip}`, { limit: 20, windowMs: 60000 });
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

    // 1. Idempotency Key Determination
    const clientKey = (idempotency_key || req.headers.get("x-idempotency-key") || "").trim();
    // Auto-generate deterministic idempotency hash to catch rapid double-clicks even if client omitted the key
    const itemsSignature = items
      .map((it: any) => `${it.id || it.sku}:${Math.max(1, parseInt(it.quantity, 10) || 1)}`)
      .sort()
      .join(",");
    const timeWindow = Math.floor(Date.now() / 20000); // 20-second deduplication window
    const autoSignature = crypto
      .createHash("sha256")
      .update(`${resolvedPhone}:${itemsSignature}:${timeWindow}`)
      .digest("hex")
      .slice(0, 16);

    const effectiveIdempotencyKey = clientKey || `auto-${autoSignature}`;

    // 2. Check Completed Orders Cache
    const cached = completedOrdersCache.get(effectiveIdempotencyKey);
    if (cached && Date.now() - cached.timestamp < 300000) {
      return NextResponse.json({
        success: true,
        message: "Order already placed.",
        order: cached.order,
      });
    }

    // Check disk/Supabase existing orders for idempotency key
    const existingOrders = [...(await getOrders()), ...getServerOrders()];
    const existingMatch = existingOrders.find(
      (o) => (o as any).idempotency_key === effectiveIdempotencyKey || o.id === effectiveIdempotencyKey
    );
    if (existingMatch) {
      completedOrdersCache.set(effectiveIdempotencyKey, { order: existingMatch, timestamp: Date.now() });
      return NextResponse.json({
        success: true,
        message: "Order already placed.",
        order: existingMatch,
      });
    }

    // 3. Handle In-Flight Concurrent Request Locking
    if (inFlightCheckoutLocks.has(effectiveIdempotencyKey)) {
      try {
        const orderResult = await inFlightCheckoutLocks.get(effectiveIdempotencyKey);
        return NextResponse.json({
          success: true,
          message: "Order placed successfully!",
          order: orderResult,
        });
      } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message || "Checkout failed" }, { status: 400 });
      }
    }

    // Create execution promise
    const executionPromise = (async () => {
      // 4. Acquire Atomic Mutex Lock for In-Process Serialization
      const releaseMutex = await acquireCheckoutLock();

      try {
        // Resolve verified server pricing tier
        const userTier = await resolveServerTier(req);

        // Fetch fresh inventory sources
        const serverCustom = getServerCustomProducts();
        const verifiedItems: any[] = [];
        let computedSubtotal = 0;

        // A. Verify Product Authenticity, Available Stock & Calculate Truth Prices
        for (const item of items) {
          const q = Math.max(1, parseInt(item.quantity, 10) || 1);

          // Find authoritative product in Supabase or server catalog
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
            throw new Error(`Product "${item.name || item.id}" could not be found.`);
          }

          // Strict Stock Check
          const availableStock = Number(dbProd.stock_quantity ?? dbProd.stock ?? 0);
          if (availableStock < q) {
            throw new Error(
              `Insufficient stock for "${dbProd.name}". Available: ${availableStock}, Requested: ${q}. Please adjust quantity.`
            );
          }

          // Calculate verified price strictly from server tier, IGNORING client price
          const wholesale = Number(dbProd.wholesale_price ?? dbProd.price ?? 0);
          let authorizedUnitPrice = Number(dbProd.retail_price) || Math.round(wholesale * 1.25);

          if (userTier === "technician" && dbProd.technician_price) {
            authorizedUnitPrice = Number(dbProd.technician_price);
          } else if (userTier === "wholesale" && wholesale > 0) {
            authorizedUnitPrice = wholesale;
          } else if (userTier === "admin" && wholesale > 0) {
            authorizedUnitPrice = wholesale;
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

        // B. Server-Side Coupon Validation (NEVER trust client-supplied discount_amount)
        let serverDiscount = 0;
        const cleanCoupon = (coupon_code || "").trim().toUpperCase();

        if (cleanCoupon) {
          // Check database coupons
          let validCoupon: any = null;
          try {
            const { data: dbCoupon } = await supabase
              .from("coupons")
              .select("*")
              .eq("code", cleanCoupon)
              .eq("is_active", true)
              .maybeSingle();

            if (dbCoupon) {
              const now = new Date();
              const isNotExpired = !dbCoupon.expiry_date || new Date(dbCoupon.expiry_date) > now;
              const hasUses = dbCoupon.max_uses === null || (dbCoupon.used_count || 0) < dbCoupon.max_uses;
              if (isNotExpired && hasUses) {
                validCoupon = dbCoupon;
              }
            }
          } catch {}

          // Fallback verified promo coupon rules
          if (!validCoupon) {
            const VERIFIED_RULES: Record<string, { type: "fixed" | "percentage"; val: number; min: number }> = {
              WELCOME500: { type: "fixed", val: 500, min: 3000 },
              WHOLESALE5: { type: "percentage", val: 5, min: 10000 },
              FREESHIP: { type: "fixed", val: 250, min: 2500 },
            };

            if (VERIFIED_RULES[cleanCoupon]) {
              const rule = VERIFIED_RULES[cleanCoupon];
              validCoupon = {
                code: cleanCoupon,
                discount_type: rule.type,
                discount_value: rule.val,
                min_order_amount: rule.min,
              };
            }
          }

          if (validCoupon) {
            const minRequired = Number(validCoupon.min_order_amount) || 0;
            if (computedSubtotal >= minRequired) {
              if (validCoupon.discount_type === "percentage") {
                serverDiscount = Math.round((computedSubtotal * Number(validCoupon.discount_value)) / 100);
              } else {
                serverDiscount = Math.min(computedSubtotal, Number(validCoupon.discount_value));
              }
            }
          }
        }

        const delivery = computedSubtotal >= 5000 ? 0 : 250;
        const finalTotal = Math.max(0, computedSubtotal + delivery - serverDiscount);

        // Strict Database-Level Atomic Transaction
        // If process_atomic_checkout RPC is unavailable or fails, checkout MUST fail safely without creating an order or changing stock.
        const serverSupabase = getSupabaseServerClient();
        const { data: rpcData, error: rpcError } = await serverSupabase.rpc("process_atomic_checkout", {
          p_order_id: effectiveIdempotencyKey.startsWith("ord-")
            ? effectiveIdempotencyKey
            : `ord-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          p_order_number: `ZM-${Date.now().toString().slice(-6)}`,
          p_customer_name: resolvedName,
          p_customer_phone: resolvedPhone,
          p_customer_address: resolvedAddress,
          p_total_amount: finalTotal,
          p_delivery_charges: delivery,
          p_discount_amount: serverDiscount,
          p_payment_method: payment_method || "cod",
          p_idempotency_key: effectiveIdempotencyKey,
          p_items: verifiedItems,
          p_order_notes: (order_notes || "").trim() || null,
          p_pricing_tier: userTier,
        });

        if (rpcError) {
          throw new Error(`Database atomic checkout failed: ${rpcError.message}`);
        }

        if (!rpcData || !rpcData.success) {
          throw new Error(rpcData?.error || "Database atomic checkout failed to complete.");
        }

        const dbOrder = (rpcData.order || rpcData) as Order;

        // Cache completed order in memory and local server cache
        completedOrdersCache.set(effectiveIdempotencyKey, {
          order: dbOrder,
          timestamp: Date.now(),
        });
        try {
          saveServerOrder(dbOrder);
        } catch {}

        // Dispatch Notification
        createNotification({
          recipient_type: "admin",
          type: "new_order",
          title: `New Order Received: #${dbOrder.order_number || dbOrder.id}`,
          message: `${resolvedName} placed order #${dbOrder.order_number || dbOrder.id} for Rs. ${finalTotal.toLocaleString()} (${verifiedItems.length} items).`,
          reference_id: dbOrder.id,
          data: { order_id: dbOrder.id, order_number: dbOrder.order_number, total: finalTotal, phone: resolvedPhone },
        }).catch(() => {});

        return dbOrder;
      } finally {
        releaseMutex();
      }
    })();

    inFlightCheckoutLocks.set(effectiveIdempotencyKey, executionPromise);

    try {
      const orderResult = await executionPromise;
      return NextResponse.json({
        success: true,
        message: "Order placed successfully!",
        order: orderResult,
        whatsapp_link: `https://wa.me/923458032600?text=${encodeURIComponent(
          `*New Mobile App Order #${orderResult.order_number}*\nName: ${orderResult.customer_name}\nTotal: Rs. ${orderResult.total_amount}\nItems: ${orderResult.items?.length}`
        )}`,
      });
    } finally {
      inFlightCheckoutLocks.delete(effectiveIdempotencyKey);
    }
  } catch (err: any) {
    console.error("Checkout order error:", err);
    return NextResponse.json({ success: false, error: err.message || "Checkout failed" }, { status: 400 });
  }
}

function customerPhoneValid(phone: any): boolean {
  if (typeof phone !== "string") return false;
  const digits = phone.replace(/[^0-9]/g, "");
  return digits.length >= 10;
}
