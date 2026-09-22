"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Lock,
  Mail,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  User,
  MessageCircle,
  PhoneCall,
  MapPin,
  X,
  UserPlus,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password.trim()) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    setLoading(true);

    try {
      const loginId = email.trim();

      // 1. Try Supabase Auth (for Admin e.g. zubair.sattar@gmail.com)
      if (loginId.includes("@")) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: loginId,
          password: password,
        });

        if (!error && data.session) {
          router.push("/admin");
          return;
        }
      }

      // 2. Try Customers Directory in Supabase (by username or phone or email)
      try {
        const { data: customerData } = await supabase
          .from("customers")
          .select("*")
          .or(`username.ilike.${loginId},phone.eq.${loginId}`)
          .eq("password", password.trim())
          .maybeSingle();

        if (customerData) {
          if (customerData.status === "inactive") {
            setErrorMessage(
              "Your account is currently inactive. Please contact Zubair Mobile on WhatsApp: 0345-8032600."
            );
            setLoading(false);
            return;
          }

          // Check local or role or notes override for pricing_tier
          let resolvedTier: string = customerData.pricing_tier;
          if (!resolvedTier) {
            const local = typeof window !== "undefined" ? localStorage.getItem("zubair_mobile_customers") : null;
            if (local) {
              try {
                const arr = JSON.parse(local);
                const match = arr.find((u: { username?: string; pricing_tier?: string }) => u.username?.toLowerCase() === customerData.username?.toLowerCase());
                if (match?.pricing_tier) resolvedTier = match.pricing_tier;
              } catch {}
            }
          }
          if (!resolvedTier && customerData.role && ["technician", "wholesale", "retail"].includes(customerData.role)) {
            resolvedTier = customerData.role;
          }
          if (!resolvedTier && customerData.notes && customerData.notes.includes("tier:")) {
            const m = customerData.notes.match(/tier:(wholesale|technician|retail)/);
            if (m) resolvedTier = m[1];
          }

          const finalSession = {
            ...customerData,
            pricing_tier: resolvedTier || "wholesale",
          };

          // Save customer session
          if (typeof window !== "undefined") {
            localStorage.setItem("zubair_customer_user", JSON.stringify(finalSession));
            window.dispatchEvent(new Event("storage"));
          }
          router.push("/");
          return;
        }
      } catch (custErr) {
        console.warn("Supabase customer lookup notice:", custErr);
      }

      // 3. Fallback: check cached/local customers
      if (typeof window !== "undefined") {
        const local = localStorage.getItem("zubair_mobile_customers");
        if (local) {
          try {
            const list = JSON.parse(local);
            const found = list.find(
              (c: { username: string; phone: string; password: string; status: string }) =>
                (c.username.toLowerCase() === loginId.toLowerCase() || c.phone === loginId) &&
                c.password === password.trim()
            );

            if (found) {
              if (found.status === "inactive") {
                setErrorMessage(
                  "Your account is currently inactive. Please contact Zubair Mobile on WhatsApp: 0345-8032600."
                );
                setLoading(false);
                return;
              }
              localStorage.setItem("zubair_customer_user", JSON.stringify(found));
              router.push("/");
              return;
            }
          } catch {}
        }
      }

      setErrorMessage("Invalid User ID / Email or Password. Please check your credentials.");
    } catch (err: unknown) {
      console.error("Login error:", err);
      setErrorMessage("An unexpected error occurred during login. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-secondary transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Storefront</span>
        </Link>

        {/* Card Container */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 sm:p-8 space-y-6">
          {/* Header with Official Logo */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center mx-auto shadow-xs">
              <img src="/logo.jpg" alt="Zubair Mobile Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-2xl font-black text-[#111827] tracking-tight">
              ZUBAIR <span className="text-[#dc2626]">MOBILE</span>
            </h1>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              REPAIR SERVICES • ADMIN PORTAL
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            {/* Email Field */}
            <div className="space-y-1">
              <label className="font-bold text-charcoal block">User ID, Phone, or Email Address</label>
              <div className="relative">
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. alimobile, 03001234567, or email"
                  required
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-slate-200 bg-surface text-charcoal focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#dc2626] text-xs transition-all font-medium"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <label className="font-bold text-charcoal block">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-9 pr-10 py-2.5 rounded-lg border border-slate-200 bg-surface text-charcoal focus:bg-white focus:outline-none focus:ring-2 focus:ring-secondary text-xs transition-all"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-charcoal p-1"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary hover:bg-slate-800 disabled:opacity-60 text-white font-bold text-sm shadow-md transition-all"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-white" />
                    <span>Sign In to Portal</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Register / Sign Up Section */}
          <div className="pt-4 border-t border-slate-100 text-center space-y-2">
            <p className="text-xs text-slate-600">
              Naya Account Register karwana chahte hain?
            </p>
            <button
              type="button"
              onClick={() => setShowRegisterModal(true)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#dc2626] hover:text-[#b91c1c] hover:underline"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register / Sign Up Karein</span>
            </button>
          </div>

          {/* Footer Note */}
          <div className="pt-2 text-center">
            <p className="text-[10px] text-slate-400">
              Zubair Mobile Parts & Repair Services • Chand Plaza, Gujranwala
            </p>
          </div>
        </div>
      </div>

      {/* Registration Info WhatsApp Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Top Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#dc2626] text-white flex items-center justify-center shadow-xs">
                  <img src="/logo.jpg" alt="Logo" className="w-full h-full object-contain rounded-xl" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-[#111827]">
                    Account Registration
                  </h3>
                  <p className="text-[10.5px] text-slate-400 font-medium">
                    Zubair Mobile B2B Portal
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRegisterModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-[#25D366]/10 text-[#25D366] flex items-center justify-center mx-auto shadow-2xs">
                <MessageCircle className="w-7 h-7" />
              </div>

              <div className="space-y-1.5">
                <h4 className="text-base sm:text-lg font-black text-[#111827]">
                  Register k liay Zubair Mobile se rabta karein
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                  Tamam technicians aur shopkeepers ko wholesale ID aur Password manual check k baad issue kiya jata hai. Naya account banwane k liay foran WhatsApp par rabta karein:
                </p>
              </div>

              {/* WhatsApp Details Box */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-3.5 text-center space-y-1">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 block">
                  Official Contact & WhatsApp
                </span>
                <a
                  href="https://wa.me/923458032600"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lg font-black text-[#25D366] hover:underline flex items-center justify-center gap-1.5"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>0345-8032600</span>
                </a>
                <div className="text-[11px] text-slate-500 flex items-center justify-center gap-1 pt-1">
                  <MapPin className="w-3.5 h-3.5 text-[#dc2626] shrink-0" />
                  <span>Shop No. B16, Chand Plaza, Garjakhi Darwaza, Gujranwala</span>
                </div>
              </div>

              {/* Direct WhatsApp Action Button */}
              <a
                href="https://wa.me/923458032600?text=Assalam-o-Alaikum%20Zubair%20Mobile!%20Mujhe%20apna%20wholesale%20account%20register%20karwana%20hai.%20Mera%20Naam:%20...%20Shop%20Naam:%20...%20City:%20..."
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-black text-xs shadow-md transition-all uppercase tracking-wider"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp par Rabta Karein (0345-8032600)</span>
              </a>

              <button
                type="button"
                onClick={() => setShowRegisterModal(false)}
                className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors block mx-auto pt-1"
              >
                Cancel / Wapis Jayein
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
