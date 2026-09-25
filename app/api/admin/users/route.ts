import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { supabase } from "@/lib/supabase";
import { CustomerUser } from "@/lib/types";
import { verifyAdminRequest } from "@/lib/adminAuth";

const IS_VERCEL = !!process.env.VERCEL;
const DATA_DIR = IS_VERCEL ? path.join("/tmp", "zubair-data") : path.resolve(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "customer_users.json");

const globalUsersStore = global as unknown as {
  __zubair_customer_users?: CustomerUser[];
};

if (!globalUsersStore.__zubair_customer_users) {
  globalUsersStore.__zubair_customer_users = [];
}

const PASSWORD_SALT = process.env.PASSWORD_SALT || "zm_secure_salt_2026_pk";

function hashPassword(plain: string): string {
  return crypto.createHash("sha256").update(plain + PASSWORD_SALT).digest("hex");
}

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (e) {
    // Read-only filesystem warning, safe fallback to memory
  }
}

const BUNDLED_USERS_FILE = path.resolve(process.cwd(), "data", "customer_users.json");

function migrateLegacyPasswords(users: any[]): CustomerUser[] {
  let modified = false;
  const migrated = users.map((u) => {
    const item = { ...u };
    if (item.password && !item.password_hash) {
      item.password_hash = hashPassword(item.password);
      delete item.password;
      modified = true;
    } else if (item.password) {
      delete item.password;
      modified = true;
    }
    return item;
  });

  if (modified) {
    try {
      ensureDataDir();
      fs.writeFileSync(USERS_FILE, JSON.stringify(migrated, null, 2), "utf-8");
    } catch {}
  }
  return migrated;
}

function getServerUsers(): CustomerUser[] {
  try {
    ensureDataDir();
    if (fs.existsSync(USERS_FILE)) {
      const raw = fs.readFileSync(USERS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const cleaned = migrateLegacyPasswords(parsed);
        globalUsersStore.__zubair_customer_users = cleaned;
        return cleaned;
      }
    } else if (IS_VERCEL && fs.existsSync(BUNDLED_USERS_FILE)) {
      const raw = fs.readFileSync(BUNDLED_USERS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const cleaned = migrateLegacyPasswords(parsed);
        globalUsersStore.__zubair_customer_users = cleaned;
        return cleaned;
      }
    }
  } catch (e) {
    // Silently continue to memory store
  }
  return globalUsersStore.__zubair_customer_users || [];
}

function saveServerUsers(users: CustomerUser[]) {
  // Ensure no plaintext passwords are ever saved
  const sanitized = users.map((u) => {
    const item = { ...u };
    delete (item as any).password;
    return item;
  });

  globalUsersStore.__zubair_customer_users = sanitized;
  try {
    ensureDataDir();
    fs.writeFileSync(USERS_FILE, JSON.stringify(sanitized, null, 2), "utf-8");
  } catch (e) {
    // Handled in-memory on read-only serverless platforms
  }
}

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // 1. Enforce Admin Authorization Guard
    const auth = await verifyAdminRequest(req, "can_manage_users");
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: auth.error || "Unauthorized: Admin privileges required." },
        { status: auth.status || 401 }
      );
    }

    const serverUsers = getServerUsers();
    const serverMap = new Map<string, CustomerUser>();
    for (const u of serverUsers) {
      if (u.id) serverMap.set(u.id.toLowerCase().trim(), u);
      if (u.username) serverMap.set(u.username.toLowerCase().trim(), u);
      if (u.phone) serverMap.set(u.phone.toLowerCase().trim(), u);
    }

    // Try fetching Supabase customers
    let sbUsers: CustomerUser[] = [];
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data && Array.isArray(data)) {
        sbUsers = data as CustomerUser[];
      }
    } catch {}

    // Merge: Supabase records enriched with server-persisted pricing_tier
    const mergedList: CustomerUser[] = [];
    const seen = new Set<string>();

    for (const sb of sbUsers) {
      const idKey = (sb.id || "").toLowerCase().trim();
      const userKey = (sb.username || "").toLowerCase().trim();
      const phoneKey = (sb.phone || "").toLowerCase().trim();
      if (idKey) seen.add(idKey);
      if (userKey) seen.add(userKey);
      if (phoneKey) seen.add(phoneKey);

      // Check if server store has pricing_tier override
      const serverMatch =
        (idKey ? serverMap.get(idKey) : undefined) ||
        (userKey ? serverMap.get(userKey) : undefined) ||
        (phoneKey ? serverMap.get(phoneKey) : undefined);

      const tier =
        serverMatch?.pricing_tier ||
        (sb.pricing_tier as "retail" | "technician" | "wholesale") ||
        (sb.role === "technician" ? "technician" : sb.role === "retail" ? "retail" : "wholesale");

      mergedList.push({
        ...sb,
        pricing_tier: tier,
      });
    }

    // Add any server-only users
    for (const u of serverUsers) {
      const idKey = (u.id || "").toLowerCase().trim();
      const userKey = (u.username || "").toLowerCase().trim();
      const phoneKey = (u.phone || "").toLowerCase().trim();
      if (!seen.has(idKey) && !seen.has(userKey) && !seen.has(phoneKey)) {
        if (idKey) seen.add(idKey);
        if (userKey) seen.add(userKey);
        if (phoneKey) seen.add(phoneKey);
        mergedList.push(u);
      }
    }

    // Sanitize users: Never expose passwords or password hashes in API responses
    const sanitizedUsers = mergedList.map((u) => {
      const copy = { ...u };
      delete (copy as any).password;
      delete (copy as any).password_hash;
      return copy;
    });

    return NextResponse.json({ success: true, users: sanitizedUsers });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Enforce Admin Authorization Guard
    const auth = await verifyAdminRequest(req, "can_manage_users");
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: auth.error || "Unauthorized: Admin privileges required." },
        { status: auth.status || 401 }
      );
    }

    const body = (await req.json()) as Partial<CustomerUser> & { password?: string };
    if (!body || (!body.username && !body.id && !body.phone)) {
      return NextResponse.json({ success: false, error: "User identifier required" }, { status: 400 });
    }

    const currentUsers = getServerUsers();
    const idKey = (body.id || "").toLowerCase().trim();
    const userKey = (body.username || "").toLowerCase().trim();
    const phoneKey = (body.phone || "").toLowerCase().trim();

    const idx = currentUsers.findIndex(
      (u) =>
        (idKey && u.id && u.id.toLowerCase().trim() === idKey) ||
        (userKey && u.username && u.username.toLowerCase().trim() === userKey) ||
        (phoneKey && u.phone && u.phone.toLowerCase().trim() === phoneKey)
    );

    // Compute password hash if new password supplied, never store plaintext
    let newHash: string | undefined = undefined;
    if (body.password && body.password.trim()) {
      newHash = hashPassword(body.password.trim());
    }

    let updatedRecord: CustomerUser;
    let updatedList: CustomerUser[];
    if (idx !== -1) {
      const existing = currentUsers[idx];
      updatedRecord = {
        ...existing,
        ...body,
        updated_at: new Date().toISOString(),
      };
      if (newHash) {
        (updatedRecord as any).password_hash = newHash;
      }
      delete (updatedRecord as any).password;
      updatedList = [...currentUsers];
      updatedList[idx] = updatedRecord;
    } else {
      updatedRecord = {
        id: body.id || `cust-${Date.now()}`,
        username: body.username || (body.phone ? `user_${body.phone}` : `user_${Date.now()}`),
        full_name: body.full_name || "",
        shop_name: body.shop_name || "",
        phone: body.phone || "",
        city: body.city || "Gujranwala",
        address: body.address || "",
        role: body.pricing_tier || body.role || "customer",
        status: body.status || "active",
        pricing_tier: body.pricing_tier || "retail",
        notes: body.notes || null,
        created_at: body.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      (updatedRecord as any).password_hash = newHash || hashPassword("ZM@DefaultPass2026");
      delete (updatedRecord as any).password;
      updatedList = [updatedRecord, ...currentUsers];
    }

    saveServerUsers(updatedList);

    // Also attempt Supabase sync
    try {
      const isUuid = updatedRecord.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(updatedRecord.id);
      const sbRecord: Record<string, unknown> = {
        username: updatedRecord.username.trim().toLowerCase(),
        full_name: updatedRecord.full_name,
        shop_name: updatedRecord.shop_name,
        phone: updatedRecord.phone,
        city: updatedRecord.city,
        address: updatedRecord.address,
        role: updatedRecord.pricing_tier || updatedRecord.role || "customer",
        status: updatedRecord.status || "active",
        notes: updatedRecord.notes || `tier:${updatedRecord.pricing_tier || "retail"}`,
        updated_at: new Date().toISOString(),
      };
      if (isUuid) sbRecord.id = updatedRecord.id;

      let res = await supabase.from("customers").upsert([{ ...sbRecord, pricing_tier: updatedRecord.pricing_tier }], {
        onConflict: isUuid ? "id" : "username",
      });

      if (res.error) {
        await supabase.from("customers").upsert([sbRecord], { onConflict: isUuid ? "id" : "username" });
      }
    } catch {}

    // Never return password or password_hash to the client
    const sanitizedReturn = { ...updatedRecord };
    delete (sanitizedReturn as any).password;
    delete (sanitizedReturn as any).password_hash;

    return NextResponse.json({ success: true, user: sanitizedReturn });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // 1. Enforce Admin Authorization Guard
    const auth = await verifyAdminRequest(req, "can_manage_users");
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: auth.error || "Unauthorized: Admin privileges required." },
        { status: auth.status || 401 }
      );
    }

    let id: string | undefined;
    let username: string | undefined;

    const queryKey = req.nextUrl.searchParams.get("key") || req.nextUrl.searchParams.get("id");
    if (queryKey) id = queryKey;
    const queryUsername = req.nextUrl.searchParams.get("username");
    if (queryUsername) username = queryUsername;

    try {
      const body = await req.json();
      if (body) {
        if (body.id) id = body.id;
        if (body.username) username = body.username;
      }
    } catch {}

    if (!id && !username) {
      return NextResponse.json({ success: false, error: "Missing ID or Username" }, { status: 400 });
    }

    const currentUsers = getServerUsers();
    const filtered = currentUsers.filter(
      (u) =>
        (!id || (u.id !== id && u.username?.toLowerCase() !== id.toLowerCase())) &&
        (!username || u.username?.toLowerCase() !== username.toLowerCase())
    );
    saveServerUsers(filtered);

    // Try Supabase delete
    try {
      const isUuid = id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      if (isUuid && id) {
        await supabase.from("customers").delete().eq("id", id);
      } else if (username) {
        await supabase.from("customers").delete().eq("username", username.toLowerCase());
      }
    } catch {}

    return NextResponse.json({ success: true, message: "User deleted successfully." });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
