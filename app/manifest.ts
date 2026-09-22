import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Zubair Mobile - Spare Parts Wholesale",
    short_name: "Zubair Mobile",
    description: "Pakistan's #1 Mobile Spare Parts & Accessories Wholesale Portal - Chand Plaza, Gujranwala",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#dc2626",
    orientation: "portrait",
    categories: ["shopping", "business"],
    lang: "ur-PK",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
