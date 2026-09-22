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

      {/* SEO Popular Search Tags Section */}
      <div className="border-t border-slate-800 bg-[#0d131f] py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#dc2626]" />
                <span>POPULAR SEARCHES & WHOLESALE KEYWORDS</span>
              </h3>
              <p className="text-[11px] text-slate-400 font-urdu mt-0.5">
                مقبول ترین موبائل پارٹس، ماڈلز اور ہول سیل ریٹس پاکستان
              </p>
            </div>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700">
              SEO Quick Links
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {/* Column 1: Popular Models & LCD Units */}
            <div className="space-y-2.5">
              <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Top Mobile Screens & LCDs</span>
                <span className="text-[9.5px] text-slate-400 font-urdu">ڈسپلے یونٹس</span>
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Vivo Y20 LCD Unit",
                  "Vivo Y21 Display",
                  "Vivo Y33s Screen",
                  "Vivo Y91 Y93 Y95",
                  "Samsung A12 Display",
                  "Samsung A32 AMOLED",
                  "Samsung A52 Unit",
                  "Infinix Hot 10 Play",
                  "Infinix Hot 11 12",
                  "Infinix Note 11 12",
                  "Tecno Spark 6 7 8",
                  "Tecno Spark 10 20",
                  "Tecno Camon 18 19",
                  "Oppo A16 LCD",
                  "Oppo A54 Display",
                  "Oppo F17 F19 Pro",
                  "Redmi Note 10 11",
                  "Redmi 9C 10C Unit",
                  "iPhone X 11 12 OLED",
                  "Realme C21 C35",
                ].map((tag) => (
                  <Link
                    key={tag}
                    href={`/?q=${encodeURIComponent(tag)}`}
                    className="text-[10.5px] px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-[#dc2626] text-slate-300 hover:text-white border border-slate-700/60 hover:border-[#dc2626] transition-colors"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            </div>

            {/* Column 2: Spare Parts Categories & Tools */}
            <div className="space-y-2.5">
              <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Spare Parts & Repairing Tools</span>
                <span className="text-[9.5px] text-slate-400 font-urdu">پارٹس و ٹولز</span>
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Touch Screen Digitizer",
                  "OCA Outer Glass",
                  "Charging Flex Port PCB",
                  "Mobile Original Batteries",
                  "Back Glass Body Housing",
                  "Camera Lens Replacement",
                  "Ringer Buzzer Speaker",
                  "Soldering Station 936",
                  "SMD Hot Air Gun",
                  "Mobile Repair Microscope",
                  "OCA Lamination Machine",
                  "Sunshine Relife Tools",
                  "Mechanic Multimeter",
                  "B7000 Frame Glue",
                  "UV Glue Curing Lamp",
                  "IC & Power Chips",
                ].map((tag) => (
                  <Link
                    key={tag}
                    href={`/?q=${encodeURIComponent(tag)}`}
                    className="text-[10.5px] px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-[#dc2626] text-slate-300 hover:text-white border border-slate-700/60 hover:border-[#dc2626] transition-colors"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            </div>

            {/* Column 3: Wholesale Market & Nationwide Delivery */}
            <div className="space-y-2.5">
              <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Wholesale Hubs & Delivery</span>
                <span className="text-[9.5px] text-slate-400 font-urdu">مارکیٹ و کارگو</span>
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Mobile Spare Parts Gujranwala",
                  "Chand Plaza Garjakhi Darwaza",
                  "Hall Road Lahore Rates",
                  "Wholesale Mobile LCD Pakistan",
                  "Cash On Delivery COD Parts",
                  "Daewoo Express Cargo Dispatch",
                  "TCS Nationwide Spare Delivery",
                  "Mobile LCD Dealer Gujranwala",
                  "Mobile Technician Wholesale Hub",
                  "Faisalabad Mobile Market Parts",
                  "Rawalpindi Mobile Spare Parts",
                  "Karachi Saddar Market Rates",
                ].map((tag) => (
                  <Link
                    key={tag}
                    href={`/?q=${encodeURIComponent(tag)}`}
                    className="text-[10.5px] px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-[#dc2626] text-slate-300 hover:text-white border border-slate-700/60 hover:border-[#dc2626] transition-colors"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
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
