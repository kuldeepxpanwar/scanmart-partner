"use client";
import React from "react";
import { Zap, Linkedin, Instagram, Github } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="bg-slate-900 border-t border-slate-800 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6">

        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">

          {/* Brand Column */}
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Zap className="text-white w-5 h-5 fill-current" />
              </div>
              {/* FIXED: Brand name updated to ScanMart */}
              <span className="text-xl font-bold text-white">
                Scan<span className="text-blue-500">Mart</span>
              </span>
            </div>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              India's modern pharmacy POS system — fast billing, batch & expiry tracking, GST invoicing, and inventory management in one dashboard.
            </p>
            <a
              href="/login"
              className="inline-block px-5 py-2.5 bg-blue-600 hover:bg-blue-700 transition text-white text-sm font-bold rounded-xl"
            >
              Open Dashboard →
            </a>
          </div>

          {/* Product Links — only links that actually exist */}
          <div>
            <h3 className="text-white font-semibold mb-6">Product</h3>
            <ul className="space-y-4 text-sm text-slate-400">
              {[
                { label: "Billing (POS)", href: "/dashboard/sales" },
                { label: "Inventory", href: "/dashboard/inventory" },
                { label: "Analytics", href: "/dashboard/analytics" },
                { label: "Customers", href: "/dashboard/customers" },
                { label: "Team Access", href: "/dashboard/staff" },
              ].map((item) => (
                <li key={item.label}>
                  <a href={item.href} className="hover:text-blue-400 transition-colors">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-white font-semibold mb-6">Company</h3>
            <ul className="space-y-4 text-sm text-slate-400">
              {["About Us", "Contact", "Blog"].map((item) => (
                <li key={item}>
                  <a href="#contact" className="hover:text-blue-400 transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-white font-semibold mb-6">Legal</h3>
            <ul className="space-y-4 text-sm text-slate-400">
              {["Privacy Policy", "Terms of Service"].map((item) => (
                <li key={item}>
                  <span className="text-slate-600 cursor-default">{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-slate-600 text-xs mt-4">Coming soon</p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          {/* FIXED: Year updated to 2026 */}
          <div className="text-slate-500 text-sm">
            © 2026 ScanMart. All rights reserved.
          </div>

          <div className="flex gap-6">
            <a href="https://github.com/kuldeepxpanwar" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-white transition-colors">
              <Github className="w-5 h-5" />
            </a>
            <a href="https://www.linkedin.com/in/kuldeepxpanwar/" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-white transition-colors">
              <Linkedin className="w-5 h-5" />
            </a>
            <a href="https://www.instagram.com/kuldeepxpanwar" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-white transition-colors">
              <Instagram className="w-5 h-5" />
            </a>
          </div>
        </div>

      </div>
    </footer>
  );
};