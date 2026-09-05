import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/lib/AppContext";

const inter = Inter({ subsets: ["latin"], display: "swap" });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://scanmart.vercel.app";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#020617",
};

export const metadata: Metadata = {
  // ── Core SEO ──────────────────────────────────────────────
  title: {
    default: "ScanMart — Pharmacy POS & Billing Software for Indian Medical Stores",
    template: "%s | ScanMart Pharmacy POS",
  },
  description:
    "ScanMart is a fast, modern pharmacy POS system built for Indian medical stores. Barcode billing, batch & expiry tracking (FEFO), GST invoicing, inventory management, and patient credit — all in one dashboard. Free to start.",
  keywords: [
    "pharmacy billing software",
    "pharmacy POS India",
    "medical store billing app",
    "pharmacy inventory management",
    "GST billing software pharmacy",
    "medicine shop POS",
    "batch expiry tracking",
    "FEFO pharmacy software",
    "drug license billing",
    "H1 drug register",
    "pharmacy barcode billing",
    "medical store software free",
    "ScanMart pharmacy",
    "retail pharmacy app India",
    "chemist shop billing",
  ],
  authors: [{ name: "ScanMart", url: SITE_URL }],
  creator: "ScanMart",
  publisher: "ScanMart",

  // ── Canonical & Alternates ────────────────────────────────
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: "/",
  },

  // ── Open Graph (Facebook, LinkedIn, WhatsApp) ─────────────
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: SITE_URL,
    siteName: "ScanMart",
    title: "ScanMart — Pharmacy POS & Billing Software for Indian Medical Stores",
    description:
      "Fast barcode billing, batch & expiry tracking, GST invoicing, and patient credit management. Built for Indian pharmacies. Free to start.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "ScanMart Pharmacy POS — Billing Dashboard Preview",
      },
    ],
  },

  // ── Twitter Card ──────────────────────────────────────────
  twitter: {
    card: "summary_large_image",
    title: "ScanMart — Pharmacy POS & Billing Software",
    description:
      "India's fastest pharmacy billing system. Barcode scanning, batch tracking, GST, and more.",
    images: ["/og-image.png"],
  },

  // ── Robots ────────────────────────────────────────────────
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // ── Icons & Manifest ──────────────────────────────────────
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.ico",
  },

  // ── Verification (replace with your actual codes) ─────────
  // verification: {
  //   google: "YOUR_GOOGLE_SEARCH_CONSOLE_CODE",
  // },

  // ── App Links ─────────────────────────────────────────────
  category: "business",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preconnect for faster font loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={inter.className}>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}