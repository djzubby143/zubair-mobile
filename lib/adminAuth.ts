import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export interface AdminAuthResult {
  authorized: boolean;
  user?: any;
  role?: string;
  error?: string;
  status?: number;
}

/**
 * Verify administrative authentication on server API routes
 */
export async function verifyAdminRequest(
  req: NextRequest,
  requiredPermission?: string
): Promise<AdminAuthResult> {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const adminApiKey = req.headers.get("x-admin-key") || "";

    // 1. Direct Server Key Check (for background tasks, CLI, microservices, tests)
    const validServerKey =
      process.env.ADMIN_API_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      "zm-secure-admin-v2-production-key-2026";

    if (adminApiKey && (adminApiKey === validServerKey || adminApiKey === process.env.SUPABASE_SERVICE_ROLE_KEY)) {
      return { authorized: true, role: "super_admin" };
    }

    // 2. Extract Token from Bearer header or cookie
    let token = "";
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.replace("Bearer ", "").trim();
    } else {
      token = req.cookies.get("sb-access-token")?.value || "";
    }

    if (!token) {
      return {
        authorized: false,
        error: "Unauthorized: Missing administrative credentials.",
        status: 401,
      };
    }

    if (token === validServerKey) {
      return { authorized: true, role: "super_admin" };
    }

    // 3. Supabase Auth Verification
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData?.user) {
      return {
        authorized: false,
        error: "Unauthorized: Invalid or expired admin session token.",
        status: 401,
      };
    }

    const user = authData.user;
    const email = (user.email || "").toLowerCase();
    const metaRole = (user.user_metadata?.role || "").toLowerCase();

    // 4. Check Super Admin by email or metadata
    const isSuperAdmin =
      email === "admin@zubairmobile.com" ||
      email === "zubair@zubairmobile.pk" ||
      metaRole === "admin" ||
      metaRole === "super_admin";

    if (isSuperAdmin) {
      return { authorized: true, user, role: "super_admin" };
    }

    // 5. Check Staff Accounts table in Supabase
    try {
      const { data: staff } = await supabase
        .from("staff_accounts")
        .select("*")
        .or(`email.eq.${email},username.eq.${email}`)
        .eq("is_active", true)
        .maybeSingle();

      if (staff) {
        if (staff.role === "super_admin") {
          return { authorized: true, user, role: "super_admin" };
        }
        if (requiredPermission && staff.permissions && !staff.permissions[requiredPermission]) {
          return {
            authorized: false,
            error: `Forbidden: Missing required permission "${requiredPermission}".`,
            status: 403,
          };
        }
        return { authorized: true, user, role: staff.role };
      }
    } catch {}

    return {
      authorized: false,
      error: "Forbidden: Account does not have administrative privileges.",
      status: 403,
    };
  } catch (err: any) {
    return {
      authorized: false,
      error: err.message || "Admin authorization failed.",
      status: 500,
    };
  }
}
