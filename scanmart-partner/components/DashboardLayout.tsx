"use client";
import React, { useState } from "react";
import { 
  Home, Package, ShoppingCart, Users, Settings, 
  Bell, Menu, Search, Plus, UserCircle 
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SubscriptionHeader from "./SubscriptionHeader"; // जो हमने पहले बनाया था

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { name: "Home", href: "/dashboard", icon: <Home size={22} /> },
    { name: "Inventory", href: "/dashboard/inventory", icon: <Package size={22} /> },
    { name: "Sales", href: "/dashboard/sales", icon: <ShoppingCart size={22} /> },
    { name: "Customers", href: "/dashboard/customers", icon: <Users size={22} /> },
    { name: "Settings", href: "/dashboard/settings", icon: <Settings size={22} /> },
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans">
      
      {/* 🖥️ DESKTOP SIDEBAR (Visible only on md+) */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-64 bg-slate-900 border-r border-slate-800 flex-col p-6 z-50">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="bg-blue-600 p-2 rounded-xl italic font-black text-xl">SM</div>
          <span className="text-xl font-black italic tracking-tighter">SCAN<span className="text-blue-500">MART</span></span>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} 
              className={`flex items-center gap-4 px-4 py-4 rounded-2xl font-bold transition-all ${pathname === item.href ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              {item.icon} {item.name}
            </Link>
          ))}
        </nav>
      </aside>

      {/* 📱 MOBILE TOP BAR */}
      <header className="md:hidden sticky top-0 bg-[#020617]/80 backdrop-blur-xl border-b border-slate-800 px-6 py-4 flex justify-between items-center z-[60]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-black italic text-xs">SM</div>
          <h1 className="text-lg font-black italic tracking-tighter uppercase">Scan<span className="text-blue-500">Mart</span></h1>
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <Search size={20} />
          <Bell size={20} />
          <UserCircle size={24} className="text-blue-500" />
        </div>
      </header>

      {/* 🚀 MAIN CONTENT AREA */}
      <main className="md:ml-64 pb-24 md:pb-8 p-6">
        {/* Subscription Alert (Smart logic) */}
        <SubscriptionHeader /> 

        {/* Page Content */}
        <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
          {children}
        </div>
      </main>

      {/* 📱 MOBILE BOTTOM NAVIGATION (Smooth & Floating) */}
      <nav className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] bg-slate-900/90 backdrop-blur-2xl border border-slate-800 h-18 rounded-[2rem] px-6 flex justify-between items-center z-[70] shadow-2xl shadow-black">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className="relative group">
              <div className={`flex flex-col items-center gap-1 transition-all duration-300 ${isActive ? '-translate-y-2 scale-110' : 'text-slate-500'}`}>
                <div className={`p-2 rounded-2xl ${isActive ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/40' : ''}`}>
                  {item.icon}
                </div>
                {isActive && <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">.</span>}
              </div>
            </Link>
          );
        })}
        
        {/* Quick Action Button (Floating Plus) */}
        <button className="absolute -top-10 left-1/2 -translate-x-1/2 bg-blue-600 p-4 rounded-full shadow-2xl shadow-blue-600/50 border-4 border-[#020617] active:scale-90 transition-all">
          <Plus size={24} className="text-white" />
        </button>
      </nav>

    </div>
  );
}