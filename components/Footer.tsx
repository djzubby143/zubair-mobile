import React from "react";
import Link from "next/link";
import { Phone, MessageCircle, MapPin, ChevronRight } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-slate-950 text-white mt-12 border-t-4 border-red-600 shadow-[0_-10px_40px_rgba(220,38,38,0.05)]">
      {/* Top Section: Brand, Links, Contact (Grid Layout) */}
      <div className="max-w-7xl mx-auto px-4 py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-16">
          
          {/* Column 1: Brand Info */}
          <div className="space-y-5">
            <div className="flex items-center space-x-3">
              <div className="h-14 w-14 bg-white p-1 rounded-lg shadow-md flex items-center justify-center overflow-hidden">
                <img
                  src="/logo.jpg"
                  alt="Zubair Mobile Repair Services"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <span className="font-black text-2xl tracking-tight text-white">
                  ZUBAIR <span className="text-red-600">MOBILE</span>
                </span>
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                  Repair & Spare Parts
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Your trusted wholesale and retail partner for premium mobile spare parts, tools, and professional repair services.
            </p>
            <div className="flex items-start gap-2.5 text-sm text-slate-300 pt-2">
              <MapPin className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <span>Shop No. B16, Chand Plaza, Garjakhi Darwaza, Gujranwala</span>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="space-y-5">
            <h4 className="text-sm font-bold uppercase tracking-wider text-white border-l-2 border-red-600 pl-3">
              Quick Links
            </h4>
            <ul className="space-y-3 text-sm text-slate-300 font-medium">
              <li>
                <Link href="/" className="group flex items-center hover:text-red-500 transition-colors">
                  <ChevronRight className="w-4 h-4 mr-1 text-slate-600 group-hover:text-red-500 transition-colors" />
                  Home / Catalog
                </Link>
              </li>
              <li>
                <Link href="/cart" className="group flex items-center hover:text-red-500 transition-colors">
                  <ChevronRight className="w-4 h-4 mr-1 text-slate-600 group-hover:text-red-500 transition-colors" />
                  My Shopping Cart
                </Link>
              </li>
              <li>
                <Link href="/login" className="group flex items-center hover:text-red-500 transition-colors">
                  <ChevronRight className="w-4 h-4 mr-1 text-slate-600 group-hover:text-red-500 transition-colors" />
                  Admin Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Contact Us */}
          <div className="space-y-5">
            <h4 className="text-sm font-bold uppercase tracking-wider text-white border-l-2 border-red-600 pl-3">
              Get in Touch
            </h4>
            <div className="space-y-4">
              <a href="tel:03458032600" className="flex items-center gap-3 p-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-red-600/50 hover:bg-slate-800/50 transition-all group">
                <div className="bg-slate-800 p-2 rounded-md group-hover:bg-red-600/20 transition-colors">
                  <Phone className="w-5 h-5 text-white group-hover:text-red-500" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">Call Us</p>
                  <p className="font-semibold text-white tracking-wide">0345 8032600</p>
                </div>
              </a>

              <a href="https://wa.me/923458032600" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-[#25D366]/50 hover:bg-slate-800/50 transition-all group">
                <div className="bg-slate-800 p-2 rounded-md group-hover:bg-[#25D366]/20 transition-colors">
                  <MessageCircle className="w-5 h-5 text-[#25D366]" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">WhatsApp Support</p>
                  <p className="font-semibold text-[#25D366] tracking-wide">0345 8032600</p>
                </div>
              </a>
            </div>
          </div>

        </div>
      </div>

      {/* SEO Popular Search Tags Section */}
      <div className="bg-slate-900 py-10 px-4 sm:px-6 border-y border-slate-800">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                <span>Popular Searches & Wholesale Keywords</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                مقبول ترین موبائل پارٹس، ماڈلز اور ہول سیل ریٹس پاکستان
              </p>
            </div>
            <span className="text-[10px] text-red-400 uppercase tracking-widest bg-red-950/30 px-3 py-1.5 rounded-md border border-red-900/50 font-bold">
              SEO Directory
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Column 1: Popular Models & LCD Units */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
                <span>Top Screens & LCDs</span>
                <span className="text-[10px] text-slate-500">ڈسپلے یونٹس</span>
              </h4>
              <div className="flex flex-wrap gap-2">
                {[
                  "Vivo Y20 LCD Unit", "Vivo Y21 Display", "Vivo Y33s Screen", "Vivo Y91 Y93 Y95",
                  "Samsung A12 Display", "Samsung A32 AMOLED", "Samsung A52 Unit", "Infinix Hot 10 Play",
                  "Infinix Hot 11 12", "Infinix Note 11 12", "Tecno Spark 6 7 8", "Tecno Spark 10 20",
                  "Tecno Camon 18 19", "Oppo A16 LCD", "Oppo A54 Display", "Oppo F17 F19 Pro",
                  "Redmi Note 10 11", "Redmi 9C 10C Unit", "iPhone X 11 12 OLED", "Realme C21 C35",
                ].map((tag) => (
                  <Link key={tag} href={`/?q=${encodeURIComponent(tag)}`} className="text-[11px] px-3 py-1.5 rounded bg-slate-950 hover:bg-red-600 text-slate-400 hover:text-white border border-slate-800 hover:border-red-600 transition-all">
                    {tag}
                  </Link>
                ))}
              </div>
            </div>

            {/* Column 2: Spare Parts Categories & Tools */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
                <span>Spare Parts & Tools</span>
                <span className="text-[10px] text-slate-500">پارٹس و ٹولز</span>
              </h4>
              <div className="flex flex-wrap gap-2">
                {[
                  "Touch Screen Digitizer", "OCA Outer Glass", "Charging Flex Port PCB", "Mobile Original Batteries",
                  "Back Glass Body Housing", "Camera Lens Replacement", "Ringer Buzzer Speaker", "Soldering Station 936",
                  "SMD Hot Air Gun", "Mobile Repair Microscope", "OCA Lamination Machine", "Sunshine Relife Tools",
                  "Mechanic Multimeter", "B7000 Frame Glue", "UV Glue Curing Lamp", "IC & Power Chips",
                ].map((tag) => (
                  <Link key={tag} href={`/?q=${encodeURIComponent(tag)}`} className="text-[11px] px-3 py-1.5 rounded bg-slate-950 hover:bg-red-600 text-slate-400 hover:text-white border border-slate-800 hover:border-red-600 transition-all">
                    {tag}
                  </Link>
                ))}
              </div>
            </div>

            {/* Column 3: Wholesale Market & Delivery */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
                <span>Wholesale & Delivery</span>
                <span className="text-[10px] text-slate-500">مارکیٹ و کارگو</span>
              </h4>
              <div className="flex flex-wrap gap-2">
                {[
                  "Mobile Spare Parts Gujranwala", "Chand Plaza Garjakhi Darwaza", "Hall Road Lahore Rates",
                  "Wholesale Mobile LCD Pakistan", "Cash On Delivery COD Parts", "Daewoo Express Cargo Dispatch",
                  "TCS Nationwide Spare Delivery", "Mobile LCD Dealer Gujranwala", "Mobile Technician Wholesale Hub",
                  "Faisalabad Mobile Market Parts", "Rawalpindi Mobile Spare Parts", "Karachi Saddar Market Rates",
                ].map((tag) => (
                  <Link key={tag} href={`/?q=${encodeURIComponent(tag)}`} className="text-[11px] px-3 py-1.5 rounded bg-slate-950 hover:bg-red-600 text-slate-400 hover:text-white border border-slate-800 hover:border-red-600 transition-all">
                    {tag}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright Bar */}
      <div className="bg-slate-950 py-5 text-center text-xs text-slate-500 font-medium">
        <p>&copy; {new Date().getFullYear()} Zubair Mobile Repair Services & Parts. All rights reserved.</p>
      </div>
      {/* Copyright Bar */}
      <div className="bg-slate-950 py-5 text-center text-xs text-slate-500 font-medium">
        <p suppressHydrationWarning>&copy; {new Date().getFullYear()} Zubair Mobile Repair Services & Parts. All rights reserved.</p>
      </div>
    </footer>
  );
}