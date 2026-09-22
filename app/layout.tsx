import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";
import CartDrawer from "@/components/CartDrawer";
import InstallPwaPrompt from "@/components/InstallPwaPrompt";
import MobileBottomNav from "@/components/MobileBottomNav";
import { CartProvider } from "@/context/CartContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const viewport: Viewport = {
  themeColor: "#dc2626",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "Zubair Mobile | Mobile Spare Parts & LCD Unit Hub",
  description:
    "Wholesale, Technician & Retail mobile spare parts, LCD touch screens, OCA glass, charging boards, batteries, and repair tools. Shop No. B16, Chand Plaza, Garjakhi Darwaza, Gujranwala, Pakistan. WhatsApp: 03458032600.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Zubair Mobile",
  },
  keywords: [
    "Zubair Mobile",
    "Mobile Spare Parts Gujranwala",
    "LCD Black Unit",
    "Vivo LCD",
    "Samsung LCD",
    "Oppo LCD",
    "Charging Flex",
    "Chand Plaza Garjakhi Darwaza",
    "Mobile repairing tools Pakistan",
    "Mobile wholesale Pakistan",
    "Technician rates",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ur" className={inter.variable}>
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="font-sans antialiased bg-surface text-charcoal min-h-screen flex flex-col pb-16 md:pb-0">
        <CartProvider>
          <Header />
          <CartDrawer />
          <main className="flex-1 w-full">{children}</main>
          <Footer />
          <FloatingWhatsApp />
          <InstallPwaPrompt />
          <MobileBottomNav />
        </CartProvider>
      </body>
    </html>
  );
}
