"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Bell,
  Check,
  CheckCheck,
  ShoppingBag,
  AlertTriangle,
  Truck,
  UserPlus,
  MessageCircle,
  ExternalLink,
  X,
} from "lucide-react";
import { AppNotification } from "@/lib/types";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  buildWhatsAppNotificationUrl,
} from "@/lib/notifications";

interface NotificationDropdownProps {
  recipientType?: "admin" | "customer";
  recipientId?: string;
  className?: string;
}

export default function NotificationDropdown({
  recipientType = "customer",
  recipientId,
  className = "",
}: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadNotifs = async () => {
    try {
      const data = await getNotifications(recipientType, recipientId);
      setNotifications(data);
    } catch {}
  };

  useEffect(() => {
    loadNotifs();

    const handleUpdate = () => loadNotifs();
    window.addEventListener("zubair_notifications_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener("zubair_notifications_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [recipientType, recipientId]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const filtered = notifications.filter((n) => (activeTab === "unread" ? !n.is_read : true));

  const handleMarkAsRead = async (id: string) => {
    await markNotificationAsRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const handleMarkAll = async () => {
    await markAllNotificationsAsRead(recipientType);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "new_order":
      case "order_confirmed":
      case "order_packed":
        return <ShoppingBag className="w-4 h-4 text-emerald-600" />;
      case "order_dispatched":
      case "order_delivered":
        return <Truck className="w-4 h-4 text-purple-600" />;
      case "low_stock":
      case "payment_pending":
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case "customer_registration":
      case "account_approved":
        return <UserPlus className="w-4 h-4 text-blue-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-4 h-4 px-1 text-[10px] font-black text-white bg-[#dc2626] rounded-full animate-pulse shadow-xs">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="p-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#dc2626]/10 text-[#dc2626] rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAll}
                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Mark read</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-100 bg-white px-3 pt-2 text-xs">
            <button
              onClick={() => setActiveTab("all")}
              className={`pb-2 px-2.5 font-bold border-b-2 transition-colors ${
                activeTab === "all"
                  ? "border-[#dc2626] text-[#dc2626]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setActiveTab("unread")}
              className={`pb-2 px-2.5 font-bold border-b-2 transition-colors ${
                activeTab === "unread"
                  ? "border-[#dc2626] text-[#dc2626]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                <Bell className="w-8 h-8 mx-auto mb-2 text-slate-200" />
                <span>No notifications in this view</span>
              </div>
            ) : (
              filtered.map((item) => (
                <div
                  key={item.id}
                  className={`p-3.5 flex items-start gap-3 transition-colors ${
                    !item.is_read ? "bg-red-50/20 hover:bg-red-50/40" : "bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="p-2 rounded-xl bg-slate-100 shrink-0 mt-0.5">
                    {getIcon(item.type)}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-slate-800 truncate">
                        {item.title}
                      </h4>
                      {!item.is_read && (
                        <button
                          type="button"
                          onClick={() => handleMarkAsRead(item.id)}
                          className="shrink-0 p-1 text-slate-400 hover:text-emerald-600"
                          title="Mark as read"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-600 leading-snug line-clamp-2">
                      {item.message}
                    </p>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-slate-400">
                        {new Date(item.created_at).toLocaleTimeString("en-PK", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>

                      <div className="flex items-center gap-2">
                        {item.whatsapp_text && (
                          <a
                            href={buildWhatsAppNotificationUrl("03458032600", item.whatsapp_text)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-bold text-emerald-600 hover:underline flex items-center gap-0.5"
                          >
                            <MessageCircle className="w-3 h-3" />
                            <span>WhatsApp</span>
                          </a>
                        )}

                        {item.link_url && (
                          <Link
                            href={item.link_url}
                            onClick={() => {
                              handleMarkAsRead(item.id);
                              setIsOpen(false);
                            }}
                            className="text-[10px] font-bold text-[#dc2626] hover:underline flex items-center gap-0.5"
                          >
                            <span>Open</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
