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

    const tierRequested = customer_type === "wholesale" || customer_type === "technician" ? customer_type : "retail";

    // Supabase Auth sign up
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name,
          phone,
          shop_name,
          customer_type: tierRequested,
          pricing_tier: tierRequested,
        },
      },
    });

    if (error || !data.user) {
      return NextResponse.json({ success: false, error: error?.message || "Registration failed" }, { status: 400 });
    }

    // Insert customer row
    await supabase.from("customers").upsert({
      id: data.user.id,
      name: full_name,
      email,
      phone: phone || "",
      shop_name: shop_name || "",
      shop_address: shop_address || "",
      city: city || "Gujranwala",
      customer_type: tierRequested,
      pricing_tier: tierRequested,
      is_approved: tierRequested === "retail", // auto-approve retail, admin verifies wholesale/tech
    });

    // Send admin notification
    await createNotification({
      recipient_type: "admin",
      type: "customer_registration",
      title: `New ${tierRequested.toUpperCase()} Registration: ${full_name}`,
      message: `${full_name} (${phone || email}) registered as ${tierRequested} from ${city || "Pakistan"}.`,
      data: { user_id: data.user.id, email, phone, tier: tierRequested },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        full_name,
        pricing_tier: tierRequested,
      },
      message: "Registration successful. Welcome to Zubair Mobile!",
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
