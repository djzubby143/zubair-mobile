import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { saveOrder, Order, getOrders } from "@/lib/orders";
import { createNotification } from "@/lib/notifications";
import { supabase } from "@/lib/supabase";
import { resolveServerTier } from "@/lib/pricingSecurity";
import { DEFAULT_CATALOG_PRODUCTS } from "@/lib/products";
import { getServerCustomProducts, saveServerCustomProducts } from "@/lib/serverProducts";
import { getServerOrders, saveServerOrder } from "@/lib/serverOrders";
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
      // 4. Acquire Atomic Mutex Lock for Stock & Price Verification
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

        // C. Atomic Stock Decrement
        // 1. Supabase products table
        for (const vItem of verifiedItems) {
          try {
            const { data: current } = await supabase
              .from("products")
              .select("id, stock_quantity")
              .or(`id.eq.${vItem.id},sku.eq.${vItem.sku || "none"}`)
              .maybeSingle();

            if (current) {
              const currentStock = Number(current.stock_quantity) || 0;
              if (currentStock < vItem.quantity) {
                throw new Error(`Item "${vItem.name}" ran out of stock concurrently.`);
              }
              const updatedStock = currentStock - vItem.quantity;
              await supabase.from("products").update({ stock_quantity: updatedStock }).eq("id", current.id);
            }
          } catch (stockErr: any) {
            console.warn(`Stock decrement notice for ${vItem.id}:`, stockErr.message);
          }
        }

        // 2. Server Custom Products
        let customModified = false;
        for (const vItem of verifiedItems) {
          const idx = serverCustom.findIndex((p) => p.id === vItem.id || p.sku === vItem.sku);
          if (idx !== -1) {
            const prev = serverCustom[idx].stock_quantity || 0;
            if (prev < vItem.quantity) {
              throw new Error(`Item "${vItem.name}" ran out of stock concurrently.`);
            }
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

        // D. Create & Save Order Record
        const orderNumber = `ZM-${Date.now().toString().slice(-6)}`;
        const newOrder: Order & { idempotency_key?: string } = {
          id: effectiveIdempotencyKey.startsWith("ord-")
            ? effectiveIdempotencyKey
            : `ord-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          order_number: orderNumber,
          customer_name: resolvedName,
          customer_phone: resolvedPhone,
          customer_address: resolvedAddress,
          order_notes: (order_notes || "").trim(),
          items: verifiedItems,
          total_items: verifiedItems.reduce((sum: number, it: any) => sum + it.quantity, 0),
          total_amount: finalTotal,
          delivery_charges: delivery,
          discount_amount: serverDiscount,
          coupon_code: cleanCoupon || undefined,
          status: "pending",
          payment_method: payment_method || "cod",
          payment_status: "unpaid",
          created_at: new Date().toISOString(),
          idempotency_key: effectiveIdempotencyKey,
        };

        await saveOrder(newOrder);
        try {
          saveServerOrder(newOrder);
        } catch {}

        // Dispatch Notification
        createNotification({
          recipient_type: "admin",
          type: "new_order",
          title: `New Order Received: #${orderNumber}`,
          message: `${resolvedName} placed order #${orderNumber} for Rs. ${finalTotal.toLocaleString()} (${verifiedItems.length} items).`,
          reference_id: newOrder.id,
          data: { order_id: newOrder.id, order_number: orderNumber, total: finalTotal, phone: resolvedPhone },
        }).catch(() => {});

        // Cache completed order
        completedOrdersCache.set(effectiveIdempotencyKey, {
          order: newOrder,
          timestamp: Date.now(),
        });

        return newOrder;
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
