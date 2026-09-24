import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");

    if (!userId) {
      return NextResponse.json({ success: false, error: "user_id is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("wishlists")
      .select("*, product:products(*)")
      .eq("customer_id", userId);

    if (error) {
      return NextResponse.json({ success: true, items: [] });
    }

    return NextResponse.json({ success: true, items: data || [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, product_id, action } = body;

    if (!user_id || !product_id) {
      return NextResponse.json({ success: false, error: "user_id and product_id are required" }, { status: 400 });
    }

    if (action === "remove") {
      await supabase.from("wishlists").delete().match({ customer_id: user_id, product_id });
      return NextResponse.json({ success: true, message: "Item removed from wishlist" });
    }

    await supabase.from("wishlists").upsert({
      customer_id: user_id,
      product_id,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, message: "Item added to wishlist" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
