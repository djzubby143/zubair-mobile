import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { recordLoginSession } from "@/lib/security";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { verifyPassword, hashPassword } from "@/lib/passwordAuth";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const USERS_FILE = path.resolve(process.cwd(), "data", "customer_users.json");

function getLocalUsers(): any[] {
  try {
    if (fs.existsSync(USERS_FILE)) {
      return JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
    }
  } catch {}
  return [];
}

function saveLocalUsers(users: any[]) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
  } catch {}
}

export async function POST(req: NextRequest) {
  try {
    // 1. Strict IP Rate Limiting for Authentication (Brute-Force & Credential Stuffing Protection)
    const ip = getClientIp(req.headers);
    const rl = checkRateLimit(`login-attempt-${ip}`, { limit: 15, windowMs: 60000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many login attempts. Please wait 60 seconds before trying again." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    const body = await req.json();
    const identifier = (body.email || body.username || body.phone || body.loginId || "").trim();
    const password = (body.password || "").trim();

    if (!identifier || !password) {
      return NextResponse.json(
        { success: false, error: "Username/Email and password are required." },
        { status: 400 }
      );
    }

    const userAgent = req.headers.get("user-agent") || "ZubairMobileApp/1.0";

    // 2. Try Supabase Auth (for standard admin/customer email accounts)
    if (identifier.includes("@")) {
      const { data: sbAuth, error: sbError } = await supabase.auth.signInWithPassword({
        email: identifier,
        password,
      });

      if (!sbError && sbAuth?.user && sbAuth?.session) {
        // Fetch profile
        const { data: customer } = await supabase
          .from("customers")
          .select("*")
          .eq("id", sbAuth.user.id)
          .maybeSingle();

        const pricing_tier = customer?.pricing_tier || customer?.role || "retail";

        recordLoginSession({
          user_id: sbAuth.user.id,
          user_email: sbAuth.user.email || identifier,
          ip_address: ip,
          user_agent: userAgent,
          status: "success",
        });

        return NextResponse.json({
          success: true,
          user: {
            id: sbAuth.user.id,
            email: sbAuth.user.email,
            username: customer?.username || sbAuth.user.email?.split("@")[0],
            full_name: customer?.name || customer?.full_name || sbAuth.user.user_metadata?.full_name || "Customer",
            phone: customer?.phone || "",
            pricing_tier,
            customer_type: customer?.customer_type || pricing_tier,
            shop_name: customer?.shop_name || "",
            role: customer?.role || sbAuth.user.user_metadata?.role || "customer",
          },
          session: {
            access_token: sbAuth.session.access_token,
            refresh_token: sbAuth.session.refresh_token,
            expires_at: sbAuth.session.expires_at,
          },
        });
      }
    }

    // 3. Fallback: Lookup in Customer Users Directory (Supabase & Server Database)
    let matchedCustomer: any = null;
    let isLocalRecord = false;

    // Check Supabase customers table
    try {
      const { data: sbCustomer } = await supabase
        .from("customers")
        .select("*")
        .or(`username.ilike.${identifier},phone.eq.${identifier},email.ilike.${identifier}`)
        .maybeSingle();

      if (sbCustomer) {
        matchedCustomer = sbCustomer;
      }
    } catch {}

    // Check local server users if not found in Supabase
    const localUsers = getLocalUsers();
    const idLower = identifier.toLowerCase();
    const localMatch = localUsers.find(
      (u) =>
        (u.username && u.username.toLowerCase() === idLower) ||
        (u.phone && u.phone === identifier) ||
        (u.email && u.email.toLowerCase() === idLower) ||
        (u.id && u.id.toLowerCase() === idLower)
    );

    if (localMatch) {
      if (!matchedCustomer) {
        matchedCustomer = localMatch;
        isLocalRecord = true;
      } else {
        // Enforce server password hash override if local has updated Bcrypt hash
        if (localMatch.password_hash) {
          matchedCustomer.password_hash = localMatch.password_hash;
        }
      }
    }

    if (!matchedCustomer) {
      recordLoginSession({
        user_id: "unknown",
        user_email: identifier,
        ip_address: ip,
        user_agent: userAgent,
        status: "failed",
      });
      return NextResponse.json(
        { success: false, error: "Invalid username/email or password." },
        { status: 401 }
      );
    }

    // Check inactive account
    if (matchedCustomer.status === "inactive") {
      return NextResponse.json(
        { success: false, error: "Your account is currently inactive. Please contact Zubair Mobile support." },
        { status: 403 }
      );
    }

    // Verify Password using Bcrypt (with automatic migration support for legacy SHA-256)
    const storedHash = matchedCustomer.password_hash || matchedCustomer.password;
    const verification = await verifyPassword(password, storedHash);

    if (!verification.valid) {
      recordLoginSession({
        user_id: matchedCustomer.id || "unknown",
        user_email: matchedCustomer.email || identifier,
        ip_address: ip,
        user_agent: userAgent,
        status: "failed",
      });
      return NextResponse.json(
        { success: false, error: "Invalid username/email or password." },
        { status: 401 }
      );
    }

    // 4. Zero-Downtime Migration Path: If password was verified using legacy hash, upgrade to modern Bcrypt
    if (verification.needsRehash) {
      try {
        const modernHash = await hashPassword(password);
        if (localMatch) {
          localMatch.password_hash = modernHash;
          delete localMatch.password;
          saveLocalUsers(localUsers);
        }
        if (matchedCustomer.id) {
          await supabase
            .from("customers")
            .update({ password: modernHash, password_hash: modernHash })
            .eq("id", matchedCustomer.id);
        }
      } catch (migrateErr) {
        console.warn("Notice: Background password upgrade to Bcrypt deferred:", migrateErr);
      }
    }

    const tier = matchedCustomer.pricing_tier || matchedCustomer.role || "retail";

    recordLoginSession({
      user_id: matchedCustomer.id,
      user_email: matchedCustomer.email || matchedCustomer.username || identifier,
      ip_address: ip,
      user_agent: userAgent,
      status: "success",
    });

    // Return sanitized customer profile
    const sanitizedUser = {
      id: matchedCustomer.id,
      username: matchedCustomer.username,
      full_name: matchedCustomer.full_name || matchedCustomer.name || "Customer",
      phone: matchedCustomer.phone,
      email: matchedCustomer.email || undefined,
      city: matchedCustomer.city || "Gujranwala",
      address: matchedCustomer.address || "",
      pricing_tier: tier,
      customer_type: matchedCustomer.customer_type || tier,
      shop_name: matchedCustomer.shop_name || "",
      role: matchedCustomer.role || "customer",
    };

    return NextResponse.json({
      success: true,
      user: sanitizedUser,
      session: {
        token: `zm_session_${Buffer.from(`${sanitizedUser.id}:${Date.now()}`).toString("base64")}`,
        expires_at: Math.floor(Date.now() / 1000) + 86400 * 7,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
