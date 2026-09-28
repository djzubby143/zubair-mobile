import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { email, password, full_name, phone, shop_name, shop_address, city, customer_type } = await req.json();

    if (!email || !password || !full_name) {
      return NextResponse.json({ success: false, error: "Name, email, and password are required" }, { status: 400 });
    }

    const requestedTier = customer_type === "wholesale" || customer_type === "technician" ? customer_type : "retail";
    // Security: Self-registration is strictly locked to 'retail'. 
    // Higher tiers (wholesale, technician) require manual admin approval and verification.
    const effectiveTier = "retail";

    // Supabase Auth sign up
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name,
          phone,
          shop_name,
          customer_type: effectiveTier,
          pricing_tier: effectiveTier,
          requested_tier: requestedTier,
        },
      },
    });

    if (error || !data.user) {
      return NextResponse.json({ success: false, error: error?.message || "Registration failed" }, { status: 400 });
    }

    // Insert customer row strictly as retail
    await supabase.from("customers").upsert({
      id: data.user.id,
      name: full_name,
      email,
      phone: phone || "",
      shop_name: shop_name || "",
      shop_address: shop_address || "",
      city: city || "Gujranwala",
      customer_type: effectiveTier,
      pricing_tier: effectiveTier,
      requested_tier: requestedTier,
      is_approved: true, // Retail is auto-approved; admin approval needed for upgrade
    });

    // Send admin notification
    await createNotification({
      recipient_type: "admin",
      type: "customer_registration",
      title: `New Customer Registration: ${full_name} (${requestedTier === "retail" ? "Retail" : `Requested ${requestedTier}`})`,
      message: `${full_name} (${phone || email}) registered. Assigned: retail. Requested: ${requestedTier}. City: ${city || "Pakistan"}.`,
      data: { user_id: data.user.id, email, phone, assigned_tier: effectiveTier, requested_tier: requestedTier },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        full_name,
        pricing_tier: effectiveTier,
      },
      message: requestedTier !== "retail" 
        ? "Account created with standard Retail access. Your wholesale/technician application has been submitted to admin for verification."
        : "Registration successful. Welcome to Zubair Mobile!",
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
