import { supabase } from "@/lib/supabase";
import { StaffAccount, ActivityLogEntry, LoginHistoryEntry, AdminStaffRole } from "@/lib/types";
export type { StaffAccount, ActivityLogEntry, LoginHistoryEntry, AdminStaffRole };

export const STORAGE_KEY_STAFF = "zubair_mobile_staff";
export const STORAGE_KEY_ACTIVITY_LOGS = "zubair_mobile_activity_logs";
export const STORAGE_KEY_LOGIN_HISTORY = "zubair_mobile_login_history";

export const DEFAULT_STAFF: StaffAccount[] = [
  {
    id: "staff-djzubby",
    username: "djzubby",
    full_name: "Dj Zubby (Super Admin)",
    name: "Dj Zubby",
    phone: "+92 345 8032600",
    email: "djzubby@zubairmobile.com",
    role: "super_admin",
    is_active: true,
    two_factor_enabled: false,
    permissions: {
      can_manage_prices: true,
      can_manage_inventory: true,
      can_manage_orders: true,
      can_view_reports: true,
      can_manage_users: true,
      can_manage_marketing: true,
    },
    last_login: new Date().toISOString(),
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: "staff-1",
    username: "zubair_admin",
    full_name: "Muhammad Zubair (Owner)",
    name: "Muhammad Zubair",
    phone: "+92 300 1234567",
    email: "zubair@zubairmobile.pk",
    role: "super_admin",
    is_active: true,
    two_factor_enabled: true,
    permissions: {
      can_manage_prices: true,
      can_manage_inventory: true,
      can_manage_orders: true,
      can_view_reports: true,
      can_manage_users: true,
      can_manage_marketing: true,
    },
    last_login: new Date().toISOString(),
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: "staff-2",
    username: "ahmed_inventory",
    full_name: "Ahmed Raza",
    name: "Ahmed Raza",
    phone: "+92 321 7654321",
    email: "ahmed@zubairmobile.pk",
    role: "inventory_manager",
    is_active: true,
    two_factor_enabled: false,
    permissions: {
      can_manage_prices: false,
      can_manage_inventory: true,
      can_manage_orders: true,
      can_view_reports: false,
      can_manage_users: false,
      can_manage_marketing: false,
    },
    last_login: new Date(Date.now() - 3600000).toISOString(),
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
  {
    id: "staff-3",
    username: "hamza_sales",
    full_name: "Hamza Tariq",
    name: "Hamza Tariq",
    phone: "+92 345 9876543",
    email: "hamza@zubairmobile.pk",
    role: "sales_manager",
    is_active: true,
    two_factor_enabled: false,
    permissions: {
      can_manage_prices: false,
      can_manage_inventory: false,
      can_manage_orders: true,
      can_view_reports: true,
      can_manage_users: true,
      can_manage_marketing: true,
    },
    last_login: new Date(Date.now() - 4 * 3600000).toISOString(),
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
];

export const DEFAULT_ACTIVITY_LOGS: ActivityLogEntry[] = [
  {
    id: "act-1",
    admin_name: "Ahmed Raza",
    role: "inventory_manager",
    action: "Updated Stock Quantity",
    target_type: "inventory",
    target_id: "p-1",
    old_value: "10 units",
    new_value: "35 units",
    ip_address: "192.168.1.104",
    created_at: new Date(Date.now() - 25 * 60000).toISOString(),
  },
  {
    id: "act-2",
    admin_name: "Muhammad Zubair",
    role: "super_admin",
    action: "Changed Product Price",
    target_type: "pricing",
    target_id: "p-5",
    old_value: "Rs. 2150",
    new_value: "Rs. 2250",
    ip_address: "192.168.1.100",
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: "act-3",
    admin_name: "Hamza Tariq",
    role: "sales_manager",
    action: "Dispatched Order via Daewoo Cargo",
    target_type: "order",
    target_id: "order-1002",
    old_value: "status: packed",
    new_value: "status: dispatched (Bilty: DW-8991)",
    ip_address: "192.168.1.102",
    created_at: new Date(Date.now() - 6 * 3600000).toISOString(),
  },
];

export const DEFAULT_LOGIN_HISTORY: LoginHistoryEntry[] = [
  {
    id: "log-1",
    username: "zubair_admin",
    role: "super_admin",
    ip_address: "192.168.1.100",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0",
    status: "success",
    timestamp: new Date().toISOString(),
  },
  {
    id: "log-2",
    username: "ahmed_inventory",
    role: "inventory_manager",
    ip_address: "192.168.1.104",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edge/122.0",
    status: "success",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
  },
];

/**
 * Staff Accounts Management
 */
export async function getStaffAccounts(): Promise<StaffAccount[]> {
  try {
    const { data, error } = await supabase.from("staff_accounts").select("*").order("created_at", { ascending: true });
    if (!error && data && data.length > 0) {
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY_STAFF, JSON.stringify(data));
      }
      return data as StaffAccount[];
    }
  } catch {}

  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_STAFF);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
  }
  return DEFAULT_STAFF;
}

export async function saveStaffAccount(account: Omit<StaffAccount, "id" | "created_at"> & { id?: string }): Promise<StaffAccount> {
  const staffList = await getStaffAccounts();
  const id = account.id || `staff-${Date.now()}`;
  const record: StaffAccount = {
    ...account,
    id,
    created_at: new Date().toISOString(),
  };

  try {
    await supabase.from("staff_accounts").upsert([record]);
  } catch {}

  if (typeof window !== "undefined") {
    try {
      const existing = staffList.filter((s) => s.id !== id);
      const updated = [...existing, record];
      localStorage.setItem(STORAGE_KEY_STAFF, JSON.stringify(updated));
      window.dispatchEvent(new Event("zubair_staff_updated"));
    } catch {}
  }
  return record;
}

export function createStaffAccount(
  data: {
    name: string;
    email: string;
    phone?: string;
    role: AdminStaffRole;
    is_active?: boolean;
    two_factor_enabled?: boolean;
  },
  adminName?: string
): StaffAccount {
  const rolePermissions: Record<AdminStaffRole, StaffAccount["permissions"]> = {
    super_admin: {
      can_manage_prices: true,
      can_manage_inventory: true,
      can_manage_orders: true,
      can_view_reports: true,
      can_manage_users: true,
      can_manage_marketing: true,
    },
    inventory_manager: {
      can_manage_prices: false,
      can_manage_inventory: true,
      can_manage_orders: true,
      can_view_reports: false,
      can_manage_users: false,
      can_manage_marketing: false,
    },
    sales_manager: {
      can_manage_prices: false,
      can_manage_inventory: false,
      can_manage_orders: true,
      can_view_reports: true,
      can_manage_users: true,
      can_manage_marketing: true,
    },
    accountant: {
      can_manage_prices: false,
      can_manage_inventory: false,
      can_manage_orders: true,
      can_view_reports: true,
      can_manage_users: false,
      can_manage_marketing: false,
    },
    order_manager: {
      can_manage_prices: false,
      can_manage_inventory: false,
      can_manage_orders: true,
      can_view_reports: false,
      can_manage_users: false,
      can_manage_marketing: false,
    },
  };

  const newStaff: StaffAccount = {
    id: `staff-${Date.now()}`,
    username: data.email.split("@")[0] || `staff_${Date.now()}`,
    full_name: data.name,
    name: data.name,
    email: data.email,
    phone: data.phone,
    role: data.role,
    is_active: data.is_active ?? true,
    two_factor_enabled: data.two_factor_enabled ?? false,
    permissions: rolePermissions[data.role] || {
      can_manage_prices: false,
      can_manage_inventory: false,
      can_manage_orders: true,
      can_view_reports: false,
      can_manage_users: false,
      can_manage_marketing: false,
    },
    created_at: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_STAFF);
      const list: StaffAccount[] = stored ? JSON.parse(stored) : DEFAULT_STAFF;
      const updated = [newStaff, ...list];
      localStorage.setItem(STORAGE_KEY_STAFF, JSON.stringify(updated));
      window.dispatchEvent(new Event("zubair_staff_updated"));
    } catch {}
  }

  return newStaff;
}

/**
 * Activity Logs
 */
export async function getActivityLogs(limit: number = 100): Promise<ActivityLogEntry[]> {
  try {
    const { data, error } = await supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!error && data && data.length > 0) {
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY_ACTIVITY_LOGS, JSON.stringify(data));
      }
      return data as ActivityLogEntry[];
    }
  } catch {}

  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ACTIVITY_LOGS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed.slice(0, limit);
      }
    } catch {}
  }
  return DEFAULT_ACTIVITY_LOGS.slice(0, limit);
}

export async function logAdminActivity(entry: Omit<ActivityLogEntry, "id" | "created_at">): Promise<void> {
  const record: ActivityLogEntry = {
    id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    ...entry,
    created_at: new Date().toISOString(),
  };

  try {
    await supabase.from("activity_logs").insert([record]);
  } catch {}

  if (typeof window !== "undefined") {
    try {
      const list = await getActivityLogs();
      const updated = [record, ...list].slice(0, 100);
      localStorage.setItem(STORAGE_KEY_ACTIVITY_LOGS, JSON.stringify(updated));
      window.dispatchEvent(new Event("zubair_activity_logs_updated"));
    } catch {}
  }
}

/**
 * Login History
 */
export async function getLoginHistory(limit: number = 50): Promise<LoginHistoryEntry[]> {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_LOGIN_HISTORY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed.slice(0, limit);
      }
    } catch {}
  }
  return DEFAULT_LOGIN_HISTORY.slice(0, limit);
}

export function recordLoginAttempt(attempt: Omit<LoginHistoryEntry, "id" | "timestamp">): void {
  if (typeof window === "undefined") return;
  const newEntry: LoginHistoryEntry = {
    id: `log-${Date.now()}`,
    ...attempt,
    timestamp: new Date().toISOString(),
  };
  try {
    const stored = localStorage.getItem(STORAGE_KEY_LOGIN_HISTORY);
    const list: LoginHistoryEntry[] = stored ? JSON.parse(stored) : DEFAULT_LOGIN_HISTORY;
    const updated = [newEntry, ...list].slice(0, 50);
    localStorage.setItem(STORAGE_KEY_LOGIN_HISTORY, JSON.stringify(updated));
  } catch {}
}

export function recordLoginSession(attempt: {
  user_id?: string;
  user_email?: string;
  username?: string;
  ip_address: string;
  user_agent: string;
  status: "success" | "failed";
  role?: string;
}): void {
  recordLoginAttempt({
    username: attempt.user_email || attempt.username || attempt.user_id || "guest",
    user_email: attempt.user_email,
    role: attempt.role || "customer",
    ip_address: attempt.ip_address,
    user_agent: attempt.user_agent,
    status: attempt.status,
  });
}
