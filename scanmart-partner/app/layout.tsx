import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";  // <--- YE LINE SABSE ZAROORI HAI (Iske bina design nahi aayega)

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ScanMart Partner",
  description: "Autonomous Retail Ecosystem",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}