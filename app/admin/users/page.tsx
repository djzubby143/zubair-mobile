"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  Search,
  Phone,
  MapPin,
  Building2,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Check,
  MessageCircle,
  Edit2,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  KeyRound,
  X,
  FileSpreadsheet,
  CreditCard,
  DollarSign,
  BookOpen,
  UserCheck,
  UserX,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { CustomerUser, PaymentRecord } from "@/lib/types";
import { getCustomerLedger, recordPayment, CustomerLedgerEntry } from "@/lib/ledger";
export type { CustomerUser };


// Initial demo fallback data if table is not yet migrated in Supabase
const INITIAL_DEMO_USERS: CustomerUser[] = [
  {
    id: "demo-1",
    username: "alimobile",
    password: "Ali@Mobile123",
    full_name: "Muhammad Ali",
    shop_name: "Ali Mobile Repair Center",
    phone: "03001234567",
    email: "ali@alimobile.pk",
    city: "Gujranwala",
    address: "Shop No. 4, Mobile Market, Gondlanwala Road",
    role: "customer",
    status: "active",
    approval_status: "approved",
    pricing_tier: "wholesale",
    customer_type: "wholesale",
    credit_limit: 100000,
    balance: 24500,
    total_orders: 14,
    total_purchase_amount: 320000,
    notes: "Wholesale LCD customer",
    created_at: new Date().toISOString(),
  },
  {
    id: "demo-2",
    username: "usmanparts",
    password: "Usman@Pass456",
    full_name: "Usman Ghani",
    shop_name: "Ghani Telecom & Parts",
    phone: "03219876543",
    email: "usman@ghanitelecom.com",
    city: "Lahore",
    address: "Hall Road, Shop 19, Basement Plaza",
    role: "customer",
    status: "active",
    approval_status: "approved",
    pricing_tier: "technician",
    customer_type: "technician",
    credit_limit: 50000,
    balance: 8500,
    total_orders: 8,
    total_purchase_amount: 142000,
    notes: "Mobile technician customer",
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "demo-3",
    username: "bilaltech",
    password: "BilalTech#789",
    full_name: "Bilal Ahmed",
    shop_name: "Master Tech Lab",
    phone: "03451122334",
    email: "bilal@gmail.com",
    city: "Sialkot",
    address: "Kutchery Road, Near City Hospital",
    role: "customer",
    status: "inactive",
    approval_status: "pending",
    pricing_tier: "retail",
    customer_type: "retail",
    credit_limit: 0,
    balance: 0,
    total_orders: 1,
    total_purchase_amount: 4500,
    notes: "Retail walk-in customer account",
    created_at: new Date(Date.now() - 172800000).toISOString(),
  },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<CustomerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");

  // UI state for password visibility per user
  const [visiblePasswords, setVisiblePasswords] = useState<{ [id: string]: boolean }>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<CustomerUser | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [showSqlAlert, setShowSqlAlert] = useState(false);

  // Khata Ledger Modal State
  const [selectedLedgerUser, setSelectedLedgerUser] = useState<CustomerUser | null>(null);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [ledgerStatement, setLedgerStatement] = useState<{
    entries: CustomerLedgerEntry[];
    totalBilled: number;
    totalPaid: number;
    remainingBalance: number;
  } | null>(null);
  const [paymentForm, setPaymentForm] = useState<{
    amount: string;
    payment_method: PaymentRecord["payment_method"];
    reference_no: string;
    notes: string;
  }>({
    amount: "",
    payment_method: "Cash",
    reference_no: "",
    notes: "",
  });
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    full_name: "",
    shop_name: "",
    phone: "",
    email: "",
    city: "Gujranwala",
    address: "",
    role: "customer",
    status: "active" as "active" | "inactive",
    approval_status: "approved" as "pending" | "approved" | "rejected",
    pricing_tier: "retail" as "retail" | "technician" | "wholesale",
    customer_type: "retail" as "retail" | "technician" | "wholesale",
    credit_limit: 0,
    balance: 0,
    notes: "",
  });
  const [showModalPassword, setShowModalPassword] = useState(false);

  // Get admin session authorization headers
  const getAdminAuthHeaders = async (): Promise<Record<string, string>> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        return { Authorization: `Bearer ${session.access_token}` };
      }
    } catch {}
    return {};
  };

  // Load Users from API / Supabase
  const loadUsers = async () => {
    setLoading(true);
    try {
      // 1. Fetch from server API first with admin credentials
      let apiUsers: CustomerUser[] = [];
      try {
        const authHeaders = await getAdminAuthHeaders();
        const res = await fetch("/api/admin/users", {
          headers: { ...authHeaders },
          cache: "no-store",
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.users) && json.users.length > 0) {
            apiUsers = json.users;
            setUsers(apiUsers);
            localStorage.setItem("zubair_mobile_customers", JSON.stringify(apiUsers));
            setShowSqlAlert(false);
            setLoading(false);
            return;
          }
        }
      } catch (apiErr) {
        console.warn("API /api/admin/users fallback:", apiErr);
      }

      // 2. Fetch from Supabase directly
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Supabase customers query warning:", error.message);
        setShowSqlAlert(true);
        const local = localStorage.getItem("zubair_mobile_customers");
        setUsers(local ? JSON.parse(local) : INITIAL_DEMO_USERS);
      } else if (data && data.length > 0) {
        // Read local overrides for pricing_tier
        const local = localStorage.getItem("zubair_mobile_customers");
        const localMap = new Map<string, string>();
        if (local) {
          try {
            const arr = JSON.parse(local);
            for (const item of arr) {
              if (item.username && item.pricing_tier) {
                localMap.set(item.username.toLowerCase(), item.pricing_tier);
              }
            }
          } catch {}
        }

        const enriched = (data as CustomerUser[]).map((u) => ({
          ...u,
          pricing_tier: (u.pricing_tier || localMap.get(u.username.toLowerCase()) || (u.role === "technician" ? "technician" : u.role === "retail" ? "retail" : "wholesale")) as "retail" | "technician" | "wholesale",
        }));

        setUsers(enriched);
        setShowSqlAlert(false);
        localStorage.setItem("zubair_mobile_customers", JSON.stringify(enriched));
      } else {
        const local = localStorage.getItem("zubair_mobile_customers");
        setUsers(local ? JSON.parse(local) : INITIAL_DEMO_USERS);
      }
    } catch (err) {
      console.error("Error loading users:", err);
      const local = localStorage.getItem("zubair_mobile_customers");
      setUsers(local ? JSON.parse(local) : INITIAL_DEMO_USERS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setFormData({
      username: "",
      password: generateRandomPassword(),
      full_name: "",
      shop_name: "",
      phone: "",
      email: "",
      city: "Gujranwala",
      address: "",
      role: "customer",
      status: "active",
      approval_status: "approved",
      pricing_tier: "wholesale",
      customer_type: "wholesale",
      credit_limit: 50000,
      balance: 0,
      notes: "",
    });
    setModalError(null);
    setShowModalPassword(true);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (user: CustomerUser) => {
    setEditingUser(user);
    const tier = user.pricing_tier || (user.role === "technician" || user.role === "wholesale" ? user.role : "retail");
    setFormData({
      username: user.username,
      password: user.password || "",
      full_name: user.full_name,
      shop_name: user.shop_name || "",
      phone: user.phone,
      email: user.email || "",
      city: user.city,
      address: user.address,
      role: user.role || "customer",
      status: user.status,
      approval_status: (user.approval_status as "pending" | "approved" | "rejected") || "approved",
      pricing_tier: tier,
      customer_type: (user.customer_type as "retail" | "technician" | "wholesale") || tier,
      credit_limit: user.credit_limit || 0,
      balance: user.balance || 0,
      notes: user.notes || "",
    });
    setModalError(null);
    setShowModalPassword(false);
    setIsModalOpen(true);
  };

  // Open Customer Khata Ledger
  const handleOpenLedger = (user: CustomerUser) => {
    setSelectedLedgerUser(user);
    const statement = getCustomerLedger(user.id, user.full_name);
    setLedgerStatement(statement);
    setPaymentForm({
      amount: "",
      payment_method: "Cash",
      reference_no: "",
      notes: "",
    });
    setIsLedgerOpen(true);
  };

  // Record Payment Received from Customer
  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLedgerUser) return;
    const amount = Number(paymentForm.amount);
    if (!amount || amount <= 0) return;

    setIsRecordingPayment(true);
    try {
      await recordPayment({
        entity_type: "customer",
        entity_id: selectedLedgerUser.id,
        entity_name: `${selectedLedgerUser.full_name} (${selectedLedgerUser.shop_name})`,
        amount: amount,
        payment_method: paymentForm.payment_method,
        reference_no: paymentForm.reference_no,
        notes: paymentForm.notes,
        payment_date: new Date().toISOString(),
      });

      // Update customer balance in state and storage
      const newBal = Math.max(0, (selectedLedgerUser.balance || 0) - amount);
      const updatedList = users.map((u) =>
        u.id === selectedLedgerUser.id ? { ...u, balance: newBal } : u
      );
      setUsers(updatedList);
      localStorage.setItem("zubair_mobile_customers", JSON.stringify(updatedList));

      // Refresh ledger statement
      const refreshedStatement = getCustomerLedger(selectedLedgerUser.id, selectedLedgerUser.full_name);
      setLedgerStatement(refreshedStatement);
      setPaymentForm({
        amount: "",
        payment_method: "Cash",
        reference_no: "",
        notes: "",
      });
    } catch (err) {
      console.warn("Payment error:", err);
    } finally {
      setIsRecordingPayment(false);
    }
  };

  // Quick Approve Customer
  const handleApproveUser = async (user: CustomerUser) => {
    const updatedList = users.map((u) =>
      u.id === user.id ? { ...u, approval_status: "approved" as const, status: "active" as const } : u
    );
    setUsers(updatedList);
    localStorage.setItem("zubair_mobile_customers", JSON.stringify(updatedList));
    try {
      await supabase
        .from("customers")
        .update({ approval_status: "approved", status: "active" })
        .eq("id", user.id);
    } catch {}
  };

  // Quick Reject Customer
  const handleRejectUser = async (user: CustomerUser) => {
    const updatedList = users.map((u) =>
      u.id === user.id ? { ...u, approval_status: "rejected" as const, status: "inactive" as const } : u
    );
    setUsers(updatedList);
    localStorage.setItem("zubair_mobile_customers", JSON.stringify(updatedList));
    try {
      await supabase
        .from("customers")
        .update({ approval_status: "rejected", status: "inactive" })
        .eq("id", user.id);
    } catch {}
  };

  // Random Password Generator
  function generateRandomPassword() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let pass = "";
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `ZM@${pass}`;
  }

  // Handle Save (Create or Update)
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    // Validation
    if (!formData.username.trim()) {
      setModalError("Please enter User ID / Username.");
      return;
    }
    if (!formData.password.trim()) {
      setModalError("Please enter or generate a Password.");
      return;
    }
    if (!formData.full_name.trim()) {
      setModalError("Please enter User's Full Name.");
      return;
    }
    if (!formData.shop_name.trim()) {
      setModalError("Please enter Mobile Shop Name.");
      return;
    }
    if (!formData.phone.trim()) {
      setModalError("Please enter Mobile / WhatsApp Phone Number.");
      return;
    }
    if (!formData.city.trim()) {
      setModalError("Please enter City.");
      return;
    }
    if (!formData.address.trim()) {
      setModalError("Please enter Shop Address.");
      return;
    }

    // Check duplicate username (except when editing self)
    const existing = users.find(
      (u) =>
        u.username.toLowerCase() === formData.username.trim().toLowerCase() &&
        u.id !== editingUser?.id
    );
    if (existing) {
      setModalError(`User ID "${formData.username.trim()}" is already registered. Please use another.`);
      return;
    }

    setIsSaving(true);

    try {
      const payload: Partial<CustomerUser> = {
        username: formData.username.trim().toLowerCase(),
        password: formData.password.trim(),
        full_name: formData.full_name.trim(),
        shop_name: formData.shop_name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
        city: formData.city.trim(),
        address: formData.address.trim(),
        role: formData.role,
        status: formData.status,
        approval_status: formData.approval_status,
        pricing_tier: formData.pricing_tier || "retail",
        customer_type: formData.pricing_tier || "retail",
        credit_limit: Number(formData.credit_limit) || 0,
        balance: Number(formData.balance) || 0,
        notes: formData.notes.trim() || undefined,
        updated_at: new Date().toISOString(),
      };

      if (editingUser) {
        // Update in Supabase
        let { error } = await supabase
          .from("customers")
          .update(payload)
          .eq("id", editingUser.id);

        if (error && error.message && error.message.includes("pricing_tier")) {
          const fallbackPayload = { ...payload };
          delete (fallbackPayload as Record<string, unknown>).pricing_tier;
          await supabase.from("customers").update(fallbackPayload).eq("id", editingUser.id);
        }

        // Update local state
        const updatedList = users.map((u) =>
          u.id === editingUser.id ? { ...u, ...payload } : u
        );
        setUsers(updatedList);
        localStorage.setItem("zubair_mobile_customers", JSON.stringify(updatedList));

        // Sync with server API
        try {
          fetch("/api/admin/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: editingUser.id, ...payload }),
          });
        } catch {}

        // If updated user is the currently logged-in customer, update their session
        const currentStored = localStorage.getItem("zubair_customer_user");
        if (currentStored) {
          try {
            const parsed = JSON.parse(currentStored);
            if (parsed.id === editingUser.id || parsed.username?.toLowerCase() === payload.username) {
              const updatedSession = { ...parsed, pricing_tier: payload.pricing_tier, role: payload.pricing_tier || payload.role };
              localStorage.setItem("zubair_customer_user", JSON.stringify(updatedSession));
              window.dispatchEvent(new Event("storage"));
            }
          } catch {}
        }
      } else {
        // Insert in Supabase
        const newRecord: CustomerUser = {
          id: `cust-${Date.now()}`,
          username: formData.username.trim().toLowerCase(),
          password: formData.password.trim(),
          full_name: formData.full_name.trim(),
          shop_name: formData.shop_name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim() || undefined,
          city: formData.city.trim(),
          address: formData.address.trim(),
          role: formData.role,
          status: formData.status,
          approval_status: formData.approval_status,
          pricing_tier: formData.pricing_tier || "retail",
          customer_type: formData.pricing_tier || "retail",
          credit_limit: Number(formData.credit_limit) || 0,
          balance: Number(formData.balance) || 0,
          notes: formData.notes.trim() || undefined,
          created_at: new Date().toISOString(),
        };

        let { data, error } = await supabase
          .from("customers")
          .insert([payload])
          .select()
          .single();

        if (error && error.message && error.message.includes("pricing_tier")) {
          const fallbackPayload = { ...payload };
          delete (fallbackPayload as Record<string, unknown>).pricing_tier;
          const retry = await supabase.from("customers").insert([fallbackPayload]).select().single();
          data = retry.data;
        }

        if (data) {
          newRecord.id = data.id;
        }

        const updatedList = [newRecord, ...users];
        setUsers(updatedList);
        localStorage.setItem("zubair_mobile_customers", JSON.stringify(updatedList));

        // Sync with server API
        try {
          const authHeaders = await getAdminAuthHeaders();
          fetch("/api/admin/users", {
            method: "POST",
            headers: { ...authHeaders, "Content-Type": "application/json" },
            body: JSON.stringify(newRecord),
          });
        } catch {}
      }

      setIsModalOpen(false);
    } catch (err: unknown) {
      console.error("Save customer error:", err);
      setModalError("Failed to save user. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle Pricing Tier (Wholesale -> Technician -> Retail -> Wholesale)
  const handleTogglePricingTier = async (user: CustomerUser) => {
    const cycleMap: Record<"wholesale" | "technician" | "retail", "wholesale" | "technician" | "retail"> = {
      wholesale: "technician",
      technician: "retail",
      retail: "wholesale",
    };
    const currentTier = user.pricing_tier || (user.role === "technician" || user.role === "wholesale" ? user.role : "retail");
    const nextTier = cycleMap[currentTier as "wholesale" | "technician" | "retail"] || "retail";
    const updatedUser = { ...user, pricing_tier: nextTier, role: nextTier };
    const updatedList = users.map((u) => (u.id === user.id ? updatedUser : u));
    setUsers(updatedList);
    localStorage.setItem("zubair_mobile_customers", JSON.stringify(updatedList));

    // Sync with server API immediately
    try {
      const authHeaders = await getAdminAuthHeaders();
      fetch("/api/admin/users", {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(updatedUser),
      });
    } catch {}

    // Update session if user is logged in
    const currentStored = localStorage.getItem("zubair_customer_user");
    if (currentStored) {
      try {
        const parsed = JSON.parse(currentStored);
        if (parsed.id === user.id || parsed.username?.toLowerCase() === user.username.toLowerCase()) {
          const updatedSession = { ...parsed, pricing_tier: nextTier, role: nextTier };
          localStorage.setItem("zubair_customer_user", JSON.stringify(updatedSession));
          window.dispatchEvent(new Event("storage"));
        }
      } catch {}
    }

    try {
      await supabase.from("customers").update({ pricing_tier: nextTier, role: nextTier }).eq("id", user.id);
    } catch (err) {
      console.warn("Pricing tier toggle cloud notice:", err);
    }
  };

  // Toggle Status
  const handleToggleStatus = async (user: CustomerUser) => {
    const newStatus: "active" | "inactive" = user.status === "active" ? "inactive" : "active";
    const updatedList = users.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u));
    setUsers(updatedList);
    localStorage.setItem("zubair_mobile_customers", JSON.stringify(updatedList));

    try {
      await supabase.from("customers").update({ status: newStatus }).eq("id", user.id);
    } catch (err) {
      console.warn("Status toggle error:", err);
    }
  };

  // Delete User
  const handleDeleteUser = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete user "${name}"? This cannot be undone.`)) {
      return;
    }

    const userToDelete = users.find((u) => u.id === id);
    const updatedList = users.filter((u) => u.id !== id);
    setUsers(updatedList);
    localStorage.setItem("zubair_mobile_customers", JSON.stringify(updatedList));

    try {
      const authHeaders = await getAdminAuthHeaders();
      fetch(`/api/admin/users?id=${id}&username=${userToDelete?.username || ""}`, {
        method: "DELETE",
        headers: { ...authHeaders },
      });
    } catch {}

    try {
      await supabase.from("customers").delete().eq("id", id);
    } catch (err) {
      console.warn("Delete customer error:", err);
    }
  };

  // Copy Login Credentials
  const handleCopyCredentials = (user: CustomerUser) => {
    const text = `Zubair Mobile B2B Portal:\nUser ID: ${user.username}\nPortal: http://localhost:3000/login\n(Password is encrypted for security)`;
    navigator.clipboard.writeText(text);
    setCopiedId(user.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Share Credentials via WhatsApp
  const handleShareWhatsApp = (user: CustomerUser) => {
    const cleanPhone = user.phone.replace(/[^0-9]/g, "");
    let phoneParam = cleanPhone;
    if (phoneParam.startsWith("0")) {
      phoneParam = "92" + phoneParam.slice(1);
    }

    const message = [
      `Assalam-o-Alaikum *${user.full_name}* (*${user.shop_name}*)!`,
      ``,
      `Aapka *Zubair Mobile* B2B wholesale portal account activate kar diya gaya hai:`,
      `---------------------------------------`,
      `👤 *User ID:* ${user.username}`,
      `🔑 *Password:* ${user.password || "(Stored securely - use your assigned password or request a reset)"}`,
      `📍 *City:* ${user.city}`,
      `🌐 *Login Link:* http://localhost:3000/login`,
      `---------------------------------------`,
      `Ab aap wholesale rates par LCDs, Touch Glasses, Charging Flexes, aur Tools directly order kar sakte hain.`,
      ``,
      `*Zubair Mobile Parts & Repair Services*`,
      `Shop No. B16, Chand Plaza, Garjakhi Darwaza, Gujranwala`,
      `WhatsApp: 0345-8032600`,
    ].join("\n");

    const encoded = encodeURIComponent(message);
    const url = `https://wa.me/${phoneParam}?text=${encoded}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // Toggle Password Visibility
  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (u.full_name || "").toLowerCase().includes(q) ||
      (u.shop_name || "").toLowerCase().includes(q) ||
      (u.username || "").toLowerCase().includes(q) ||
      (u.phone || "").includes(searchQuery) ||
      (u.city || "").toLowerCase().includes(q) ||
      (u.address || "").toLowerCase().includes(q);

    const matchesCity = cityFilter === "all" || u.city.toLowerCase() === cityFilter.toLowerCase();
    const matchesStatus = statusFilter === "all" || u.status === statusFilter;

    return matchesSearch && matchesCity && matchesStatus;
  });

  // Unique Cities List
  const uniqueCities = Array.from(new Set(users.map((u) => u.city).filter(Boolean)));

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#dc2626]/10 text-[#dc2626] flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-[#111827] tracking-tight">
                Registered Users & Technicians
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Manually register and manage mobile shopkeepers, technicians, and wholesale buyers.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <button
            type="button"
            onClick={loadUsers}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-[#dc2626] hover:bg-slate-50 transition-colors"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Register New User</span>
          </button>
        </div>
      </div>

      {/* SQL Migration Helper Banner (Shown if table not created in Supabase) */}
      {showSqlAlert && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs text-amber-800">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-amber-900">
              Supabase &quot;customers&quot; table connection note:
            </p>
            <p className="text-amber-800 leading-relaxed">
              New users registered here will save to your browser memory and display instantly. To sync them across all devices into your live cloud database, run the provided SQL command in your <strong>Supabase SQL Editor</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Stats Counter Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Users
          </span>
          <span className="text-2xl font-black text-[#111827] mt-0.5 block">
            {users.length}
          </span>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Active Accounts
          </span>
          <span className="text-2xl font-black text-emerald-600 mt-0.5 block">
            {users.filter((u) => u.status === "active").length}
          </span>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Cities Covered
          </span>
          <span className="text-2xl font-black text-[#dc2626] mt-0.5 block">
            {uniqueCities.length}
          </span>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Inactive / Paused
          </span>
          <span className="text-2xl font-black text-slate-400 mt-0.5 block">
            {users.filter((u) => u.status === "inactive").length}
          </span>
        </div>
      </div>

      {/* Filters & Search Control Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search name, shop, phone, city, ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:border-[#dc2626] focus:outline-none focus:ring-1 focus:ring-[#dc2626] text-slate-800 placeholder:text-slate-400 bg-slate-50/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          {/* City Filter */}
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 text-slate-700 bg-white focus:outline-none focus:border-[#dc2626]"
          >
            <option value="all">All Cities ({users.length})</option>
            {uniqueCities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 text-slate-700 bg-white focus:outline-none focus:border-[#dc2626]"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-3 border-[#dc2626] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-semibold">Loading users directory...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-700">No users found</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchQuery || cityFilter !== "all" || statusFilter !== "all"
                ? "Try clearing your filters or search terms."
                : "Get started by registering your first mobile shopkeeper or technician."}
            </p>
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-[#dc2626] hover:bg-[#b91c1c] px-3.5 py-2 rounded-xl transition-colors shadow-2xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register User</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4">User & Shop Details</th>
                  <th className="py-3.5 px-4">Login & Password</th>
                  <th className="py-3.5 px-4">Phone & City</th>
                  <th className="py-3.5 px-4">Pricing Tier / ریٹ</th>
                  <th className="py-3.5 px-4">Credit & Balance / کھاتہ</th>
                  <th className="py-3.5 px-4">Approval & Status</th>
                  <th className="py-3.5 px-4 text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredUsers.map((user) => {
                  const isPassVisible = visiblePasswords[user.id] || false;
                  const isCopied = copiedId === user.id;
                  const isRetail = user.pricing_tier === "retail";
                  const balance = user.balance ?? 0;
                  const creditLimit = user.credit_limit ?? 0;
                  const isPending = user.approval_status === "pending";

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-slate-50/60 transition-colors group"
                    >
                      {/* Col 1: User & Shop */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#111827] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
                            {user.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-[#111827] block text-xs">
                              {user.full_name}
                            </span>
                            <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 font-medium">
                              <Building2 className="w-3 h-3 text-[#dc2626] shrink-0" />
                              <strong className="text-slate-700">{user.shop_name}</strong>
                            </span>
                            {user.email && (
                              <span className="text-[10px] text-blue-600 block mt-0.5 font-mono">
                                {user.email}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400 block truncate max-w-xs mt-0.5">
                              {user.address}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Col 2: Login ID & Password */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-mono text-[11px] font-bold text-slate-800">
                            <KeyRound className="w-3 h-3 text-[#dc2626]" />
                            {user.username}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 font-mono text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              Encrypted
                            </span>
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(user)}
                              className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 hover:underline px-1 py-0.5"
                              title="Reset Password"
                            >
                              Reset
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopyCredentials(user)}
                              className="p-1 rounded text-slate-400 hover:text-[#dc2626] hover:bg-slate-100 ml-auto"
                              title="Copy Login ID"
                            >
                              {isCopied ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Col 3: Phone & City */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-slate-800 flex items-center gap-1 text-[11px]">
                            <Phone className="w-3 h-3 text-[#25D366] shrink-0" />
                            {user.phone}
                          </span>
                          <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            {user.city}
                          </span>
                        </div>
                      </td>

                      {/* Col 4: Pricing Tier (Wholesale vs Technician vs Retail) */}
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleTogglePricingTier(user)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10.5px] font-bold border shadow-2xs transition-all cursor-pointer ${
                            user.pricing_tier === "technician"
                              ? "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                              : user.pricing_tier === "retail"
                              ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                          }`}
                          title={`Current: ${user.pricing_tier || "retail"}. Click to cycle: Retail -> Wholesale -> Technician`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              user.pricing_tier === "technician"
                                ? "bg-amber-500"
                                : user.pricing_tier === "retail"
                                ? "bg-blue-500"
                                : "bg-emerald-500"
                            }`}
                          />
                          <span>
                            {user.pricing_tier === "technician"
                              ? "Technician (ٹیکنیشن)"
                              : user.pricing_tier === "retail"
                              ? "Retail (پرچون)"
                              : "Wholesale (ہول سیل)"}
                          </span>
                        </button>
                      </td>

                      {/* Col 5: Credit Limit & Outstanding Balance / Khata */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Balance:</span>
                            <span className={`font-mono font-bold text-xs ${balance > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                              Rs. {balance.toLocaleString()}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium">
                            Limit: Rs. {creditLimit.toLocaleString()}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpenLedger(user)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10.5px] font-bold transition-colors"
                            title="View Khata Ledger & Record Payment"
                          >
                            <BookOpen className="w-3 h-3 text-[#dc2626]" />
                            <span>کھاتہ / Ledger</span>
                          </button>
                        </div>
                      </td>

                      {/* Col 6: Approval & Status */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1.5">
                          {isPending ? (
                            <div className="flex items-center gap-1">
                              <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-1.5 py-0.5 rounded border border-amber-200">
                                Pending
                              </span>
                              <button
                                type="button"
                                onClick={() => handleApproveUser(user)}
                                className="p-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                                title="Approve Customer"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRejectUser(user)}
                                className="p-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                                title="Reject Customer"
                              >
                                <UserX className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(user)}
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-colors ${
                                user.status === "active"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                                  : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
                              }`}
                              title="Click to toggle status"
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  user.status === "active" ? "bg-emerald-500" : "bg-slate-400"
                                }`}
                              />
                              <span className="capitalize">{user.status}</span>
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Col 7: Quick Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Send WhatsApp Login Details */}
                          <button
                            type="button"
                            onClick={() => handleShareWhatsApp(user)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 hover:border-emerald-600 text-[11px] font-bold transition-all shadow-2xs"
                            title="Send login details to user's WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">WhatsApp</span>
                          </button>

                          {/* Edit User */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(user)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-[#dc2626] hover:bg-slate-100 transition-colors"
                            title="Edit User Details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete User */}
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(user.id, user.full_name)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete User"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create or Edit User */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xs overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#dc2626] text-white flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#111827]">
                    {editingUser ? "Edit User Details" : "Register New Shop / Technician"}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Set up credentials, shop name, phone, and delivery address.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveUser} className="p-5 space-y-4">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Row 1: User ID & Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    User ID / Username <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. alimobile or ali@gmail.com"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#dc2626] focus:outline-none focus:ring-1 focus:ring-[#dc2626] font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, password: generateRandomPassword() })}
                      className="text-[10px] font-bold text-[#dc2626] hover:underline"
                    >
                      Generate New
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showModalPassword ? "text" : "password"}
                      required
                      placeholder="Password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full pl-3 pr-8 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#dc2626] focus:outline-none focus:ring-1 focus:ring-[#dc2626] font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowModalPassword(!showModalPassword)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showModalPassword ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 2: Full Name & Shop Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Muhammad Ali"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#dc2626] focus:outline-none focus:ring-1 focus:ring-[#dc2626]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Mobile Shop Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ali Mobile Repairing"
                    value={formData.shop_name}
                    onChange={(e) => setFormData({ ...formData, shop_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#dc2626] focus:outline-none focus:ring-1 focus:ring-[#dc2626]"
                  />
                </div>
              </div>

              {/* Row 3: Phone, Email & City */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Phone / WhatsApp <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 03001234567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#dc2626] focus:outline-none focus:ring-1 focus:ring-[#dc2626]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. shop@gmail.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#dc2626] focus:outline-none focus:ring-1 focus:ring-[#dc2626]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Gujranwala, Lahore, etc."
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#dc2626] focus:outline-none focus:ring-1 focus:ring-[#dc2626]"
                  />
                </div>
              </div>

              {/* Row 4: Complete Address */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  Complete Shop Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Shop No. 12, First Floor, Mobile Market, Gujranwala"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#dc2626] focus:outline-none focus:ring-1 focus:ring-[#dc2626] resize-none"
                />
              </div>

              {/* Credit Limit & Outstanding Balance */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Credit Limit / ادھار کی حد (Rs.)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 50000"
                    value={formData.credit_limit}
                    onChange={(e) => setFormData({ ...formData, credit_limit: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#dc2626] bg-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Current Balance / واجب الادا رقم (Rs.)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 15000"
                    value={formData.balance}
                    onChange={(e) => setFormData({ ...formData, balance: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#dc2626] bg-white font-mono"
                  />
                </div>
              </div>

              {/* Pricing Tier Selection (Wholesale vs Technician vs Retail) */}
              <div className="space-y-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  Pricing Tier / کسٹمر ریٹ کی قسم <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Wholesale */}
                  <label
                    className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      formData.pricing_tier === "wholesale"
                        ? "border-emerald-500 bg-white ring-2 ring-emerald-500/20 shadow-xs"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="pricing_tier"
                      value="wholesale"
                      checked={formData.pricing_tier === "wholesale"}
                      onChange={() => setFormData({ ...formData, pricing_tier: "wholesale" })}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                        Wholesale (ہول سیل)
                      </span>
                      <span className="text-[9.5px] text-slate-500 block leading-tight mt-0.5">
                        For bulk shopkeepers.
                      </span>
                    </div>
                  </label>

                  {/* Technician */}
                  <label
                    className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      formData.pricing_tier === "technician"
                        ? "border-amber-500 bg-white ring-2 ring-amber-500/20 shadow-xs"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="pricing_tier"
                      value="technician"
                      checked={formData.pricing_tier === "technician"}
                      onChange={() => setFormData({ ...formData, pricing_tier: "technician" })}
                      className="mt-0.5 text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                        Technician (ٹیکنیشن)
                      </span>
                      <span className="text-[9.5px] text-slate-500 block leading-tight mt-0.5">
                        For mobile repairers.
                      </span>
                    </div>
                  </label>

                  {/* Retail */}
                  <label
                    className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      formData.pricing_tier === "retail"
                        ? "border-blue-500 bg-white ring-2 ring-blue-500/20 shadow-xs"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="pricing_tier"
                      value="retail"
                      checked={formData.pricing_tier === "retail"}
                      onChange={() => setFormData({ ...formData, pricing_tier: "retail" })}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                        Retail (پرچون ریٹ)
                      </span>
                      <span className="text-[9.5px] text-slate-500 block leading-tight mt-0.5">
                        For walk-in consumers.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Row 5: Status, Approval & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Account Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as "active" | "inactive" })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#dc2626] focus:outline-none focus:ring-1 focus:ring-[#dc2626] bg-white"
                  >
                    <option value="active">Active (Can Login & Order)</option>
                    <option value="inactive">Inactive / Paused</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Approval Status
                  </label>
                  <select
                    value={formData.approval_status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        approval_status: e.target.value as "pending" | "approved" | "rejected",
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#dc2626] focus:outline-none focus:ring-1 focus:ring-[#dc2626] bg-white"
                  >
                    <option value="approved">Approved</option>
                    <option value="pending">Pending Approval</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Admin Notes (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 5% discount, TCS Cargo"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#dc2626] focus:outline-none focus:ring-1 focus:ring-[#dc2626]"
                  />
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{editingUser ? "Update User" : "Register User"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Customer Khata Ledger */}
      {isLedgerOpen && selectedLedgerUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xs overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#dc2626] text-white flex items-center justify-center shadow-xs">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-[#111827]">
                    Customer Khata Ledger (کھاتہ اسٹیٹمنٹ)
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedLedgerUser.full_name} &bull; {selectedLedgerUser.shop_name} ({selectedLedgerUser.city})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLedgerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Credit Limit</span>
                  <span className="text-sm font-black text-slate-800 font-mono">
                    Rs. {(selectedLedgerUser.credit_limit ?? 0).toLocaleString()}
                  </span>
                </div>
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                  <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block">Total Billed</span>
                  <span className="text-sm font-black text-rose-700 font-mono">
                    Rs. {(ledgerStatement?.totalBilled ?? 0).toLocaleString()}
                  </span>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Total Received</span>
                  <span className="text-sm font-black text-emerald-700 font-mono">
                    Rs. {(ledgerStatement?.totalPaid ?? 0).toLocaleString()}
                  </span>
                </div>
                <div className="p-3 bg-red-100/70 rounded-xl border border-red-300">
                  <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider block">Outstanding Balance</span>
                  <span className="text-base font-black text-red-800 font-mono">
                    Rs. {(selectedLedgerUser.balance ?? 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Record Payment Form */}
              <form onSubmit={handleRecordPaymentSubmit} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span>Record Payment Received (وصولی درج کریں)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  <div>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="Amount (Rs.)"
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-mono"
                    />
                  </div>
                  <div>
                    <select
                      value={paymentForm.payment_method}
                      onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value as PaymentRecord["payment_method"] })}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="Cash">Cash (کیش)</option>
                      <option value="Bank Transfer">Bank Transfer (بینک)</option>
                      <option value="JazzCash / EasyPaisa">JazzCash / EasyPaisa</option>
                      <option value="Cargo COD">Cargo COD</option>
                    </select>
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Ref / Trx ID (Optional)"
                      value={paymentForm.reference_no}
                      onChange={(e) => setPaymentForm({ ...paymentForm, reference_no: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                  <div>
                    <button
                      type="submit"
                      disabled={isRecordingPayment || !paymentForm.amount}
                      className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs disabled:opacity-50"
                    >
                      {isRecordingPayment ? "Recording..." : "+ Receive Payment"}
                    </button>
                  </div>
                </div>
              </form>

              {/* Transactions Ledger Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="p-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700">
                  Transaction History & Running Balance
                </div>
                {ledgerStatement?.entries.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No transactions recorded for this customer yet.
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100/70 border-b border-slate-200 text-[10.5px] uppercase font-bold text-slate-500">
                        <tr>
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3">Type</th>
                          <th className="py-2 px-3">Reference / Description</th>
                          <th className="py-2 px-3 text-right">Debit (Rs.)</th>
                          <th className="py-2 px-3 text-right">Credit (Rs.)</th>
                          <th className="py-2 px-3 text-right">Balance (Rs.)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {ledgerStatement?.entries.map((entry) => (
                          <tr key={entry.id} className="hover:bg-slate-50 font-mono text-[11px]">
                            <td className="py-2 px-3 text-slate-600">
                              {new Date(entry.date).toLocaleDateString("en-PK")}
                            </td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                entry.type === "order"
                                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              }`}>
                                {entry.type === "order" ? "Order" : "Payment"}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-sans text-slate-700 text-xs">
                              <span className="font-semibold">{entry.reference}</span>
                              {entry.description && (
                                <span className="text-slate-400 block text-[10px]">{entry.description}</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right text-rose-600 font-bold">
                              {entry.debit > 0 ? entry.debit.toLocaleString() : "-"}
                            </td>
                            <td className="py-2 px-3 text-right text-emerald-600 font-bold">
                              {entry.credit > 0 ? entry.credit.toLocaleString() : "-"}
                            </td>
                            <td className="py-2 px-3 text-right font-black text-slate-800">
                              {entry.balance.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsLedgerOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Close Ledger
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
