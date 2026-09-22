import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";
import CartDrawer from "@/components/CartDrawer";
import { CartProvider } from "@/context/CartContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Zubair Mobile | Mobile Spare Parts & LCD Unit Hub",
  description:
    "Wholesale and retail mobile spare parts, LCD touch screens, OCA glass, charging boards, batteries, and repair tools. Shop No. B16, Chand Plaza, Garjakhi Darwaza, Gujranwala, Pakistan. WhatsApp: 03458032600.",
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
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased bg-surface text-charcoal min-h-screen flex flex-col">
        <CartProvider>
          <Header />
          <CartDrawer />
          <main className="flex-1 w-full">{children}</main>
          <Footer />
          <FloatingWhatsApp />
        </CartProvider>
      </body>
    </html>
  );
}
