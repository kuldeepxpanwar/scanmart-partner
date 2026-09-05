import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ScanMart — Pharmacy POS & Billing Software",
    short_name: "ScanMart",
    description:
      "Fast pharmacy billing, batch & expiry tracking, GST invoicing, and inventory management for Indian medical stores.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#2563eb",
    orientation: "portrait-primary",
    categories: ["business", "medical", "productivity"],
    icons: [
      {
        src: "/favicon.ico",
        sizes: "64x64",
        type: "image/x-icon",
      },
    ],
  };
}
