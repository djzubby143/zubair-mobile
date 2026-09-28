import Link from 'next/link';
import { User, ShoppingCart, LogIn } from 'lucide-react';
import AdvancedSearchBar from './AdvancedSearchBar';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between px-4 py-3 max-w-7xl mx-auto gap-4 md:gap-8">
        
        {/* Left: Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <img src="/logo.jpg" alt="Zubair Mobile Logo" className="w-10 h-10 md:w-12 md:h-12 rounded object-contain" />
        </Link>

        {/* Middle: Search Bar */}
        <div className="flex-1 max-w-3xl hidden sm:block">
          <AdvancedSearchBar />
        </div>

        {/* Right: Socials & Actions */}
        <div className="flex items-center gap-4 sm:gap-5 flex-shrink-0">
          
          {/* Social Icons (Hidden on very small mobile to save space) */}
          <div className="hidden lg:flex items-center gap-3 border-r border-gray-200 pr-5">
            {/* WhatsApp */}
            <a href="https://wa.me/923458032600" className="hover:scale-110 transition-transform text-[#25D366]">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
            </a>
            {/* YouTube */}
            <a href="#" className="hover:scale-110 transition-transform text-[#FF0000]">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
            </a>
            {/* TikTok */}
            <a href="#" className="hover:scale-110 transition-transform text-black">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.01.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 2.78-1.15 5.54-3.33 7.37-1.84 1.54-4.29 2.22-6.65 1.77-2.66-.52-5.11-2.45-6.07-5.01-.98-2.61-.63-5.69 1.11-7.89 1.75-2.22 4.67-3.32 7.42-2.82v4.06c-1.39-.41-2.96-.33-4.23.44-1.28.78-2.07 2.3-1.89 3.8.17 1.48 1.17 2.82 2.56 3.3 1.42.5 3.05.27 4.25-.63 1.12-.85 1.73-2.27 1.71-3.69-.02-3.17-.01-6.35-.01-9.52l.01-14.01z"/></svg>
            </a>
            {/* Instagram */}
            <a href="#" className="hover:scale-110 transition-transform text-[#E1306C]">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.16c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.64.07-4.85.07s-3.58-.01-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92-.06-1.27-.07-1.64-.07-4.85s.01-3.58.07-4.85C2.38 3.85 3.9 2.3 7.15 2.15c1.27-.06 1.65-.07 4.85-.07m0-2.16C8.74 0 8.33.01 7.05.07 2.76.26.26 2.77.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.19 4.28 2.69 6.79 6.98 6.98 1.28.06 1.69.07 4.95.07s3.67-.01 4.95-.07c4.28-.19 6.79-2.69 6.98-6.98.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.19-4.28-2.69-6.79-6.98-6.98-1.28-.06-1.69-.07-4.95-.07zM12 5.84A6.16 6.16 0 1018.16 12 6.16 6.16 0 0012 5.84zm0 10.16A4 4 0 1116 12a4 4 0 01-4 4zm5.22-9.4a1.08 1.08 0 11-2.16 0 1.08 1.08 0 012.16 0z"/></svg>
            </a>
            {/* Facebook */}
            <a href="#" className="hover:scale-110 transition-transform text-[#1877F2]">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </a>
          </div>

          {/* Login / Profile */}
          <Link href="/login" className="flex items-center gap-1.5 text-slate-700 hover:text-red-600 font-semibold">
            <LogIn className="w-5 h-5" />
            <span className="hidden sm:inline">Login</span>
          </Link>

          {/* Cart */}
          <Link href="/cart" className="relative flex items-center text-slate-700 hover:text-red-600">
            <ShoppingCart className="w-6 h-6" />
            <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center border border-white">
              0
            </span>
          </Link>
        </div>
      </div>

      {/* Mobile Search - Rendered Below on Small Screens */}
      <div className="block sm:hidden px-4 pb-3 w-full">
         <AdvancedSearchBar />
      </div>
    </header>
  );
}