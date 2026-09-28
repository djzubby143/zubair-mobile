"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShoppingCart, User, Package, Activity } from "lucide-react"; // Ensure lucide-react is installed

export default function MobileBottomNav() {
  const pathname = usePathname();

  // Hide on admin routes
  if (pathname?.startsWith("/admin")) return null;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-5px_10px_rgba(0,0,0,0.05)] pb-safe">
      <div className="flex justify-around items-center h-16 px-2">
        
        {/* Status */}
        <Link href="/status" className="flex flex-col items-center justify-center w-full text-gray-500 hover:text-blue-600">
          <Activity size={20} className={pathname === "/status" ? "text-blue-600" : ""} />
          <span className="text-[10px] mt-1 font-medium">Status</span>
        </Link>

        {/* Home */}
        <Link href="/" className="flex flex-col items-center justify-center w-full text-gray-500 hover:text-blue-600">
          <Home size={20} className={pathname === "/" ? "text-blue-600" : ""} />
          <span className="text-[10px] mt-1 font-medium">Home</span>
        </Link>

        {/* Floating Cart Button */}
        <div className="relative -top-5 flex justify-center w-full">
          <Link href="/cart" className="flex flex-col items-center justify-center">
            <div className="bg-blue-600 text-white p-3.5 rounded-full border-4 border-white shadow-md relative">
              <ShoppingCart size={24} />
              {/* Optional Cart Badge */}
              <span className="absolute -top-1 -right-1 bg-white text-blue-600 text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-full border border-blue-600">
                0
              </span>
            </div>
            <span className="text-[10px] mt-1 font-medium text-gray-700">Cart</span>
          </Link>
        </div>

        {/* Orders */}
        <Link href="/orders" className="flex flex-col items-center justify-center w-full text-gray-500 hover:text-blue-600">
          <Package size={20} className={pathname === "/orders" ? "text-blue-600" : ""} />
          <span className="text-[10px] mt-1 font-medium">Orders</span>
        </Link>

        {/* Profile */}
        <Link href="/profile" className="flex flex-col items-center justify-center w-full text-gray-500 hover:text-blue-600">
          <User size={20} className={pathname === "/profile" ? "text-blue-600" : ""} />
          <span className="text-[10px] mt-1 font-medium">Profile</span>
        </Link>

      </div>
    </div>
  );
}