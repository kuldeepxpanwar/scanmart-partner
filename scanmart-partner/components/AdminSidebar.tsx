"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  ShieldCheck, 
  Users, 
  CreditCard, 
  Activity, 
  Settings, 
  LogOut, 
  Globe,
  BarChart3
} from "lucide-react";

const adminMenuItems = [
  { name: "Master Control", icon: ShieldCheck, path: "/admin" },
  { name: "All Partners", icon: Users, path: "/admin/partners" },
  { name: "Subscriptions", icon: CreditCard, path: "/admin/subscriptions" },
  { name: "Platform Health", icon: Activity, path: "/admin/health" },
  { name: "Global Analytics", icon: BarChart3, path: "/admin/global-stats" },
  { name: "System Settings", icon: Settings, path: "/admin/settings" },
];

export const AdminSidebar = () => {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-72 bg-[#050505] border-r border-white/5 flex flex-col hidden lg:flex z-50">
      
      {/* Admin Branding */}
      <div className="h-24 flex items-center px-8 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-xl">
            <Globe className="text-black w-5 h-5" />
          </div>
          <div>
            <span className="text-lg font-black tracking-tighter text-white uppercase italic">
              ScanMart<span className="text-blue-500">.HQ</span>
            </span>
            <p className="text-[10px] text-blue-500 font-bold tracking-[0.2em] uppercase">Super Admin</p>
          </div>
        </div>
      </div>

      {/* Menu Links */}
      <nav className="flex-1 px-4 space-y-1">
        {adminMenuItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link key={item.path} href={item.path}>
              <div className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group ${
                isActive 
                  ? "bg-white text-black shadow-xl shadow-white/5" 
                  : "text-slate-500 hover:bg-white/5 hover:text-white"
              }`}>
                <item.icon size={20} className={isActive ? "text-black" : "group-hover:text-blue-500"} />
                <span className="font-bold text-sm tracking-tight">{item.name}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="p-6 border-t border-white/5">
        <div className="bg-blue-600/10 border border-blue-500/20 rounded-2xl p-4 mb-4">
            <p className="text-[10px] text-blue-400 font-bold uppercase mb-1">Server Status</p>
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-white font-medium">Global Nodes: Optimal</span>
            </div>
        </div>
        <button className="flex items-center gap-3 w-full px-5 py-3 text-slate-500 hover:text-red-500 transition-all">
          <LogOut size={20} />
          <span className="font-bold text-sm">Exit HQ</span>
        </button>
      </div>
    </aside>
  );
};