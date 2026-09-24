import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { recordLoginSession } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, error: "Email and password are required" }, { status: 400 });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "ZubairMobileApp/1.0";

    if (error || !data.user) {
      recordLoginSession({
        user_id: "unknown",
        user_email: email,
        ip_address: ip,
        user_agent: userAgent,
        status: "failed",
      });
      return NextResponse.json({ success: false, error: error?.message || "Invalid credentials" }, { status: 401 });
    }

    // Fetch customer profile for pricing tier
    const { data: customer } = await supabase
      .from("customers")
      .select("*")
      .eq("id", data.user.id)
      .maybeSingle();

    const pricing_tier = customer?.pricing_tier || "retail";

    recordLoginSession({
      user_id: data.user.id,
      user_email: data.user.email || email,
      ip_address: ip,
      user_agent: userAgent,
      status: "success",
    });

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        full_name: customer?.name || data.user.user_metadata?.full_name || "Customer",
        phone: customer?.phone || "",
        pricing_tier,
        customer_type: customer?.customer_type || "retail",
        shop_name: customer?.shop_name || "",
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
