import React from "react";
import Link from "next/link";
import { Phone, MessageCircle, MapPin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#111827] text-white mt-12 border-t-2 border-[#dc2626]">
      {/* Centered Columns with Official Brand Logo */}
      <div className="max-w-4xl mx-auto px-4 py-12 text-center space-y-8">
        {/* Brand Logo in Footer */}
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="h-16 w-16 bg-white p-1 rounded-xl shadow-md border border-slate-700 flex items-center justify-center overflow-hidden">
            <img
              src="/logo.jpg"
              alt="Zubair Mobile Repair Services"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <span className="font-black text-xl tracking-tight text-white">
              ZUBAIR <span className="text-[#dc2626]">MOBILE</span>
            </span>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mt-0.5">
              REPAIR SERVICES & SPARE PARTS
            </p>
          </div>
        </div>

        {/* Quick Links */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#dc2626]">
            QUICK LINKS
          </h4>
          <ul className="space-y-1.5 text-xs text-slate-300 font-medium">
            <li>
              <Link href="/" className="hover:underline hover:text-white">
                • Home / Catalog
              </Link>
            </li>
            <li>
              <Link href="/cart" className="hover:underline hover:text-white">
                • My Shopping Cart
              </Link>
            </li>
            <li>
              <Link href="/login" className="hover:underline hover:text-white">
                • Admin Portal
              </Link>
            </li>
          </ul>
        </div>

        {/* Contact Us */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#dc2626]">
            CONTACT US
          </h4>
          <div className="flex flex-col items-center justify-center space-y-2 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-white" />
              <a href="tel:03458032600" className="hover:underline hover:text-white font-medium">
                03458032600
              </a>
            </div>
            <div className="flex items-center gap-2">
              <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
              <a
                href="https://wa.me/923458032600"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline text-[#25D366] hover:text-emerald-400 font-semibold"
              >
                WhatsApp: 03458032600
              </a>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-1">
              <MapPin className="w-3.5 h-3.5 text-[#dc2626]" />
              <span>Shop No. B16, Chand Plaza, Garjakhi Darwaza, Gujranwala</span>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright Bar */}
      <div className="border-t border-slate-800 py-4 text-center text-[11px] text-slate-500">
        <p>&copy; {new Date().getFullYear()} Zubair Mobile Repair Services & Parts. All rights reserved.</p>
      </div>
    </footer>
  );
}
