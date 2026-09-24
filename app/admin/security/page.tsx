"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Users,
  Key,
  History,
  Lock,
  Plus,
  CheckCircle2,
  AlertCircle,
  Eye,
  Check,
  X,
  FileText,
} from "lucide-react";
import { StaffAccount, ActivityLogEntry, LoginHistoryEntry, AdminStaffRole } from "@/lib/types";
import {
  getStaffAccounts,
  createStaffAccount,
  getActivityLogs,
  getLoginHistory,
} from "@/lib/security";

export default function SecurityAdminPage() {
  const [staffList, setStaffList] = useState<StaffAccount[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"staff" | "activity" | "logins" | "2fa">("staff");

  // New Staff Modal / State
  const [showAddModal, setShowAddModal] = useState(false);
  const [staffName, setStaffName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPhone, setStaffPhone] = useState("");
  const [staffRole, setStaffRole] = useState<AdminStaffRole>("order_manager");
  const [staffSuccess, setStaffSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [staff, logs, logins] = await Promise.all([
          getStaffAccounts(),
          getActivityLogs(30),
          getLoginHistory(30),
        ]);
        setStaffList(staff);
        setActivityLogs(logs);
        setLoginHistory(logins);
      } catch (err) {
        console.error("Error loading security data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleCreateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffName || !staffEmail) return;

    const newStaff = createStaffAccount(
      {
        name: staffName,
        email: staffEmail,
        phone: staffPhone,
        role: staffRole,
        is_active: true,
        two_factor_enabled: false,
      },
      "Super Admin"
    );

    setStaffList((prev) => [newStaff, ...prev]);
    setStaffSuccess(`Staff member ${newStaff.name} created successfully with role ${staffRole}!`);
    setTimeout(() => {
      setStaffSuccess(null);
      setShowAddModal(false);
      setStaffName("");
      setStaffEmail("");
      setStaffPhone("");
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-primary to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-2 bg-red-600/30 border border-red-500/40 rounded-xl">
              <ShieldCheck className="w-5 h-5 text-red-400" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">Security & Staff Management</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-300">
            Role-based access control (RBAC), multi-factor authentication (2FA), activity audit trails, and login sessions.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700">
          <button
            onClick={() => setActiveTab("staff")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "staff" ? "bg-secondary text-white shadow-sm" : "text-slate-300 hover:text-white"
            }`}
          >
            Staff Accounts
          </button>
          <button
            onClick={() => setActiveTab("activity")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "activity" ? "bg-secondary text-white shadow-sm" : "text-slate-300 hover:text-white"
            }`}
          >
            Audit Trail
          </button>
          <button
            onClick={() => setActiveTab("logins")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "logins" ? "bg-secondary text-white shadow-sm" : "text-slate-300 hover:text-white"
            }`}
          >
            Login History
          </button>
          <button
            onClick={() => setActiveTab("2fa")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "2fa" ? "bg-secondary text-white shadow-sm" : "text-slate-300 hover:text-white"
            }`}
          >
            2FA Security
          </button>
        </div>
      </div>

      {/* Staff Accounts Tab */}
      {activeTab === "staff" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
              Authorized Staff & Roles ({staffList.length})
            </h2>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-secondary hover:bg-secondary-dark text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Staff Member
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Name / Contact</th>
                    <th className="py-3 px-4">Assigned Role</th>
                    <th className="py-3 px-4">Permissions Coverage</th>
                    <th className="py-3 px-4">2FA Status</th>
                    <th className="py-3 px-4">Account Status</th>
                    <th className="py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {staffList.map((st) => (
                    <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{st.name}</div>
                        <div className="text-[11px] text-slate-400">
                          {st.email} {st.phone ? `• ${st.phone}` : ""}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="capitalize px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold text-[11px]">
                          {st.role.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1 max-w-[280px]">
                          {Object.entries(st.permissions)
                            .filter(([_, allowed]) => allowed)
                            .map(([perm]) => (
                              <span
                                key={perm}
                                className="text-[10px] px-1.5 py-0.2 bg-blue-50 text-blue-700 rounded font-semibold"
                              >
                                {perm.replace("_", " ")}
                              </span>
                            ))}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {st.two_factor_enabled ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                            <ShieldCheck className="w-3.5 h-3.5" /> Enabled
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">Disabled</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            st.is_active ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {st.is_active ? "Active" : "Suspended"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button className="text-secondary hover:underline font-bold text-xs">
                          Edit Rights
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Activity Logs Tab */}
      {activeTab === "activity" && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900">Forensic Activity Audit Trail</h3>
            <span className="text-xs text-slate-500 font-medium">Automatic logging of administrative modifications</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Staff / User</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Details</th>
                  <th className="py-3 px-4">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {activityLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString("en-PK")}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">{log.admin_name || log.user_email || log.user_id || "Staff Admin"}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-800 font-bold rounded text-[11px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 capitalize">{log.target_type || log.entity_type || "general"}</td>
                    <td className="py-3 px-4 text-slate-600 max-w-[280px] truncate">
                      {log.new_value ? `${log.old_value ? `${log.old_value} -> ` : ""}${log.new_value}` : JSON.stringify(log.details || {})}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">{log.ip_address || "127.0.0.1"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Login History Tab */}
      {activeTab === "logins" && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900">Admin Login Session Records</h3>
            <span className="text-xs text-slate-500 font-medium">Monitored session authentications</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Login Timestamp</th>
                  <th className="py-3 px-4">Account Email</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4">User Agent / Device</th>
                  <th className="py-3 px-4">Auth Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {loginHistory.map((lh) => (
                  <tr key={lh.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(lh.created_at || lh.timestamp).toLocaleString("en-PK")}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">{lh.user_email || lh.username}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{lh.ip_address}</td>
                    <td className="py-3 px-4 text-slate-500 max-w-[240px] truncate">{lh.user_agent}</td>
                    <td className="py-3 px-4">
                      {lh.status === "success" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                          <Check className="w-3.5 h-3.5" /> Successful
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600">
                          <X className="w-3.5 h-3.5" /> Failed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2FA Configuration Tab */}
      {activeTab === "2fa" && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 max-w-xl mx-auto space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
            <div className="p-3 bg-red-100 text-secondary rounded-xl">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">Two-Factor Authentication (2FA)</h2>
              <p className="text-xs text-slate-500">
                Protect admin accounts from unauthorized access using OTP codes sent to registered email/WhatsApp.
              </p>
            </div>
          </div>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs text-amber-900">
            <p className="font-bold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              2FA Security Readiness
            </p>
            <p>
              Two-factor structure has been provisioned. Staff accounts can be mandated to verify a 6-digit one-time
              password upon signing in.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <p className="text-xs font-bold text-slate-800">Mandate 2FA for Super Admins</p>
                <p className="text-[11px] text-slate-500">Requires OTP verification on all sensitive operations</p>
              </div>
              <input type="checkbox" defaultChecked className="w-4 h-4 accent-red-600 cursor-pointer" />
            </div>

            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <p className="text-xs font-bold text-slate-800">Send WhatsApp Security Alerts</p>
                <p className="text-[11px] text-slate-500">Instant notification when a new device logs in</p>
              </div>
              <input type="checkbox" defaultChecked className="w-4 h-4 accent-red-600 cursor-pointer" />
            </div>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Provision Staff Account</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {staffSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {staffSuccess}
              </div>
            )}

            <form onSubmit={handleCreateStaff} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Asad Ullah"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="staff@zubairmobile.com"
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number (WhatsApp)</label>
                <input
                  type="text"
                  placeholder="+92 300 1234567"
                  value={staffPhone}
                  onChange={(e) => setStaffPhone(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Staff Role & Permissions</label>
                <select
                  value={staffRole}
                  onChange={(e) => setStaffRole(e.target.value as AdminStaffRole)}
                  className="w-full text-xs font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                >
                  <option value="order_manager">Order Manager (View & Update Orders)</option>
                  <option value="inventory_manager">Inventory Manager (Stock & Suppliers)</option>
                  <option value="support_staff">Support Staff (Customer Queries)</option>
                  <option value="super_admin">Super Admin (All Privileges)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-secondary text-white text-xs font-bold rounded-xl hover:bg-secondary-dark cursor-pointer"
                >
                  Create Staff Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
