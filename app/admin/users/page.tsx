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
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export interface CustomerUser {
  id: string;
  username: string;
  password: string;
  full_name: string;
  shop_name: string;
  phone: string;
  city: string;
  address: string;
  role: string;
  status: "active" | "inactive";
  pricing_tier?: "retail" | "technician" | "wholesale"; // "retail", "technician", or "wholesale"
  notes?: string | null;
  created_at?: string;
}

// Initial demo fallback data if table is not yet migrated in Supabase
const INITIAL_DEMO_USERS: CustomerUser[] = [
  {
    id: "demo-1",
    username: "alimobile",
    password: "Ali@Mobile123",
    full_name: "Muhammad Ali",
    shop_name: "Ali Mobile Repair Center",
    phone: "03001234567",
    city: "Gujranwala",
    address: "Shop No. 4, Mobile Market, Gondlanwala Road",
    role: "customer",
    status: "active",
    pricing_tier: "wholesale",
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
    city: "Lahore",
    address: "Hall Road, Shop 19, Basement Plaza",
    role: "customer",
    status: "active",
    pricing_tier: "technician",
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
    city: "Sialkot",
    address: "Kutchery Road, Near City Hospital",
    role: "customer",
    status: "inactive",
    pricing_tier: "retail",
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

  // UI state for password visibility per user
  const [visiblePasswords, setVisiblePasswords] = useState<{ [id: string]: boolean }>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<CustomerUser | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [showSqlAlert, setShowSqlAlert] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    full_name: "",
    shop_name: "",
    phone: "",
    city: "Gujranwala",
    address: "",
    role: "customer",
    status: "active" as "active" | "inactive",
    pricing_tier: "wholesale" as "retail" | "technician" | "wholesale",
    notes: "",
  });
  const [showModalPassword, setShowModalPassword] = useState(false);

  // Load Users from Supabase
  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Supabase customers query warning (table may need schema run):", error.message);
        setShowSqlAlert(true);
        // Fallback to local storage or demo data
        const local = localStorage.getItem("zubair_mobile_customers");
        if (local) {
          try {
            setUsers(JSON.parse(local));
          } catch {
            setUsers(INITIAL_DEMO_USERS);
          }
        } else {
          setUsers(INITIAL_DEMO_USERS);
          localStorage.setItem("zubair_mobile_customers", JSON.stringify(INITIAL_DEMO_USERS));
        }
      } else if (data && data.length > 0) {
        setUsers(data);
        setShowSqlAlert(false);
        localStorage.setItem("zubair_mobile_customers", JSON.stringify(data));
      } else {
        // Table exists but is empty
        const local = localStorage.getItem("zubair_mobile_customers");
        if (local) {
          try {
            setUsers(JSON.parse(local));
          } catch {
            setUsers(INITIAL_DEMO_USERS);
          }
        } else {
          setUsers(INITIAL_DEMO_USERS);
        }
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
      city: "Gujranwala",
      address: "",
      role: "customer",
      status: "active",
      pricing_tier: "wholesale",
      notes: "",
    });
    setModalError(null);
    setShowModalPassword(true);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (user: CustomerUser) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: user.password,
      full_name: user.full_name,
      shop_name: user.shop_name,
      phone: user.phone,
      city: user.city,
      address: user.address,
      role: user.role || "customer",
      status: user.status,
      pricing_tier: user.pricing_tier || "wholesale",
      notes: user.notes || "",
    });
    setModalError(null);
    setShowModalPassword(false);
    setIsModalOpen(true);
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
      const payload = {
        username: formData.username.trim().toLowerCase(),
        password: formData.password.trim(),
        full_name: formData.full_name.trim(),
        shop_name: formData.shop_name.trim(),
        phone: formData.phone.trim(),
        city: formData.city.trim(),
        address: formData.address.trim(),
        role: formData.role,
        status: formData.status,
        pricing_tier: formData.pricing_tier || "wholesale",
        notes: formData.notes.trim() || null,
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

        // If updated user is the currently logged-in customer, update their session
        const currentStored = localStorage.getItem("zubair_customer_user");
        if (currentStored) {
          try {
            const parsed = JSON.parse(currentStored);
            if (parsed.id === editingUser.id || parsed.username?.toLowerCase() === payload.username) {
              const updatedSession = { ...parsed, pricing_tier: payload.pricing_tier };
              localStorage.setItem("zubair_customer_user", JSON.stringify(updatedSession));
              window.dispatchEvent(new Event("storage"));
            }
          } catch {}
        }
      } else {
        // Insert in Supabase
        const newRecord: CustomerUser = {
          id: `cust-${Date.now()}`,
          ...payload,
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
    const currentTier = user.pricing_tier || "wholesale";
    const nextTier = cycleMap[currentTier] || "wholesale";
    const updatedList = users.map((u) => (u.id === user.id ? { ...u, pricing_tier: nextTier } : u));
    setUsers(updatedList);
    localStorage.setItem("zubair_mobile_customers", JSON.stringify(updatedList));

    // Update session if user is logged in
    const currentStored = localStorage.getItem("zubair_customer_user");
    if (currentStored) {
      try {
        const parsed = JSON.parse(currentStored);
        if (parsed.id === user.id || parsed.username?.toLowerCase() === user.username.toLowerCase()) {
          const updatedSession = { ...parsed, pricing_tier: nextTier };
          localStorage.setItem("zubair_customer_user", JSON.stringify(updatedSession));
          window.dispatchEvent(new Event("storage"));
        }
      } catch {}
    }

    try {
      await supabase.from("customers").update({ pricing_tier: nextTier }).eq("id", user.id);
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

    const updatedList = users.filter((u) => u.id !== id);
    setUsers(updatedList);
    localStorage.setItem("zubair_mobile_customers", JSON.stringify(updatedList));

    try {
      await supabase.from("customers").delete().eq("id", id);
    } catch (err) {
      console.warn("Delete customer error:", err);
    }
  };

  // Copy Login Credentials
  const handleCopyCredentials = (user: CustomerUser) => {
    const text = `Zubair Mobile Login:\nUser ID: ${user.username}\nPassword: ${user.password}\nPortal: http://localhost:3000/login`;
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
      `🔑 *Password:* ${user.password}`,
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
    const matchesSearch =
      u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.shop_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone.includes(searchQuery) ||
      u.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.address.toLowerCase().includes(searchQuery.toLowerCase());

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
                  <th className="py-3.5 px-4">Login ID / Username</th>
                  <th className="py-3.5 px-4">Password</th>
                  <th className="py-3.5 px-4">Phone & City</th>
                  <th className="py-3.5 px-4">Pricing Tier / ریٹ</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredUsers.map((user) => {
                  const isPassVisible = visiblePasswords[user.id] || false;
                  const isCopied = copiedId === user.id;
                  const isRetail = user.pricing_tier === "retail";

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
                            <span className="text-[10px] text-slate-400 block truncate max-w-xs mt-0.5">
                              {user.address}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Col 2: Login ID */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-mono text-[11px] font-bold text-slate-800">
                            <KeyRound className="w-3 h-3 text-[#dc2626]" />
                            {user.username}
                          </span>
                          {user.notes && (
                            <span className="text-[10px] text-slate-400 block italic truncate max-w-[150px]">
                              Note: {user.notes}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Col 3: Password */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-200 min-w-[90px] text-center">
                            {isPassVisible ? user.password : "••••••••"}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(user.id)}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                            title={isPassVisible ? "Hide password" : "Show password"}
                          >
                            {isPassVisible ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyCredentials(user)}
                            className="p-1 rounded text-slate-400 hover:text-[#dc2626] hover:bg-slate-100"
                            title="Copy ID & Password"
                          >
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Col 4: Phone & City */}
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

                      {/* Col 5: Pricing Tier (Wholesale vs Technician vs Retail) */}
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
                          title={`Current: ${user.pricing_tier || "wholesale"}. Click to cycle: Wholesale -> Technician -> Retail`}
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

                      {/* Col 6: Status */}
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(user)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors ${
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
                      </td>

                      {/* Col 6: Quick Actions */}
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

              {/* Row 3: Phone & City */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Phone / WhatsApp Number <span className="text-red-500">*</span>
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
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#dc2626] focus:outline-none focus:ring-1 focus:ring-[#dc2626] resize-none"
                />
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
                        For bulk shopkeepers. Shows lowest wholesale trade price.
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
                        For mobile repair technicians. Shows discounted technician rate.
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
                        For walk-in consumers. Shows public retail selling price.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Row 5: Status & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    <option value="active">Active (Can place wholesale orders)</option>
                    <option value="inactive">Inactive / Paused</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Admin Notes (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 5% discount dealer, TCS Cargo"
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
    </div>
  );
}
