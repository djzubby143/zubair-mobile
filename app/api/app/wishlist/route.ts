import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    const rl = checkRateLimit(`wishlist-get-${ip}`, { limit: 60, windowMs: 60000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please slow down." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");

    if (!userId) {
      return NextResponse.json({ success: false, error: "user_id is required" }, { status: 400 });
    }

    // Try singular 'wishlist' table first, then plural 'wishlists'
    let { data, error } = await supabase
      .from("wishlist")
      .select("*, product:products(*)")
      .eq("customer_id", userId);

    if (error) {
      const fallback = await supabase
        .from("wishlists")
        .select("*, product:products(*)")
        .eq("customer_id", userId);
      data = fallback.data;
    }

    return NextResponse.json({ success: true, items: data || [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    const rl = checkRateLimit(`wishlist-post-${ip}`, { limit: 30, windowMs: 60000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please slow down." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    const body = await req.json();
    const { user_id, product_id, action } = body;

    if (!user_id || !product_id) {
      return NextResponse.json({ success: false, error: "user_id and product_id are required" }, { status: 400 });
    }

    const targetTable = "wishlist";

    if (action === "remove") {
      let { error } = await supabase.from(targetTable).delete().match({ customer_id: user_id, product_id });
      if (error) {
        await supabase.from("wishlists").delete().match({ customer_id: user_id, product_id });
      }
      return NextResponse.json({ success: true, message: "Item removed from wishlist" });
    }

    const row = {
      id: `wsh-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      customer_id: user_id,
      product_id,
      created_at: new Date().toISOString(),
    };

    let { error } = await supabase.from(targetTable).upsert(row, { onConflict: "customer_id,product_id" });
    if (error) {
      await supabase.from("wishlists").upsert(row, { onConflict: "customer_id,product_id" });
    }

    return NextResponse.json({ success: true, message: "Item added to wishlist" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
