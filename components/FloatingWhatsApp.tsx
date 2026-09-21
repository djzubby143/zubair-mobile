"use client";

import React, { useState } from "react";
import { MessageCircle } from "lucide-react";

export default function FloatingWhatsApp() {
  const [isHovered, setIsHovered] = useState(false);
  const phoneNumber = "923458032600";
  const defaultMessage = encodeURIComponent(
    "Hello Zubair Mobile! I would like to inquire about mobile spare parts."
  );
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${defaultMessage}`;

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Tooltip badge */}
      <div
        className={`hidden sm:flex items-center gap-2 bg-white text-charcoal shadow-lg border border-slate-200 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 transform ${
          isHovered
            ? "opacity-100 translate-x-0 pointer-events-auto"
            : "opacity-0 translate-x-2 pointer-events-none"
        }`}
      >
        <span className="w-2 h-2 rounded-full bg-whatsapp animate-pulse" />
        <span>Chat with us on WhatsApp</span>
      </div>

      {/* Button link */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="relative group flex items-center justify-center w-14 h-14 rounded-full bg-whatsapp hover:bg-whatsapp-hover text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-4 focus:ring-whatsapp/30"
        aria-label="Contact Zubair Mobile on WhatsApp 03458032600"
      >
        {/* Subtle pulsing animation ring */}
        <span className="absolute -inset-1 rounded-full bg-whatsapp opacity-40 group-hover:opacity-75 animate-ping -z-10" />

        {/* WhatsApp Icon */}
        <MessageCircle className="w-7 h-7" />
      </a>
    </div>
  );
}
