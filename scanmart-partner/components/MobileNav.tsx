"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingBag, Users, Settings, TrendingUp } from "lucide-react";

const navItems = [
  { name: "Home", icon: LayoutDashboard, path: "/dashboard" },
  { name: "Stock", icon: ShoppingBag, path: "/dashboard/inventory" },
  { name: "Data", icon: TrendingUp, path: "/dashboard/analytics" }, // <-- Naya Link
  { name: "Users", icon: Users, path: "/dashboard/customers" },     // <-- Naya Link
];

export const MobileNav = () => {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full bg-slate-900/80 backdrop-blur-lg border-t border-slate-800 px-6 py-3 z-[100]">
      <div className="flex justify-between items-center">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link key={item.path} href={item.path} className="flex flex-col items-center gap-1">
              <div className={`p-2 rounded-xl transition-all ${
                isActive ? "bg-blue-600 text-white shadow-lg shadow-blue-500/40" : "text-slate-500"
              }`}>
                <item.icon size={20} />
              </div>
              <span className={`text-[10px] font-medium ${isActive ? "text-blue-500" : "text-slate-500"}`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};