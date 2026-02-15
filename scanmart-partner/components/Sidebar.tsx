"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  LayoutDashboard, 
  Package, 
  BarChart3, 
  Users, 
  Settings, 
  Truck,
  LogOut,
  Zap,
  ShoppingCart,
  ScanBarcode,
  Shield,
  RefreshCcw 
} from "lucide-react";
// 🔥 NEW IMPORT
import StoreSwitcher from "@/components/StoreSwitcher"; 

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);

  // --- 🔐 ROLE CHECK LOGIC ---
  useEffect(() => {
    const checkRole = async () => {
      // Legacy cleanup
      if (typeof window !== 'undefined') {
        const legacyLocal = localStorage.getItem("active_staff_id");
        if (legacyLocal) {
          sessionStorage.setItem("active_staff_id", legacyLocal);
          localStorage.removeItem("active_staff_id");
        }
      }

      const storedStaffId = typeof window !== 'undefined' ? sessionStorage.getItem("active_staff_id") : null;
      
      if (storedStaffId) {
        const { data } = await supabase
          .from("staff")
          .select("role")
          .eq("id", storedStaffId)
          .single();
        
        if (data) setUserRole(data.role);
      } else {
        setUserRole("staff");
      }
    };
    checkRole();
  }, [pathname]);

  // 🔄 Switch User Function
  const handleSwitchUser = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem("active_staff_id"); 
      window.location.reload(); 
    }
  };

  // 🚪 Log Out Function
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Logout Error:", error.message);
    } else {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem("active_staff_id");
        localStorage.removeItem("active_staff_id"); 
      }
      router.push("/login");
      router.refresh(); 
    }
  };

  // --- 📋 NAVIGATION LOGIC ---
  const allNavItems = [
    { label: "Overview", icon: <LayoutDashboard size={20} />, href: "/dashboard", roles: ["admin", "manager", "staff"] },
    { label: "Billing (Sales)", icon: <ShoppingCart size={20} />, href: "/dashboard/sales", roles: ["admin", "manager", "staff"] },
    { label: "Inventory", icon: <Package size={20} />, href: "/dashboard/inventory", roles: ["admin", "manager"] },
    { label: "Suppliers", icon: <Truck size={20} />, href: "/dashboard/suppliers", roles: ["admin", "manager"] },
    { label: "Analytics", icon: <BarChart3 size={20} />, href: "/dashboard/analytics", roles: ["admin", "manager"] },
    { label: "Customers", icon: <Users size={20} />, href: "/dashboard/customers", roles: ["admin", "manager"] },
    { label: "Team Access", icon: <Shield size={20} />, href: "/dashboard/staff", roles: ["admin"] },
    { label: "Sticker Studio", icon: <ScanBarcode size={20} />, href: "/dashboard/stickers", roles: ["admin", "manager"] },
    { label: "Settings", icon: <Settings size={20} />, href: "/dashboard/settings", roles: ["admin"] },
  ];

  const filteredNavItems = allNavItems.filter(item => 
    userRole ? item.roles.includes(userRole) : item.roles.includes("staff")
  );

  return (
    <aside className="w-64 bg-[#020617] border-r border-slate-800 flex flex-col h-screen sticky top-0 z-40">
      {/* --- Logo Section --- */}
      <div className="p-6 flex items-center gap-3">
        <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-500/20">
          <Zap size={22} className="text-white fill-white" />
        </div>
        <span className="text-xl font-bold text-white tracking-tight">
          ScanMart<span className="text-blue-500">.Dash</span>
        </span>
      </div>

      {/* --- User Role Tag --- */}
      <div className="px-6 mb-4">
        <div className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-md w-fit ${userRole === 'admin' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-blue-500/10 text-blue-500'}`}>
          {userRole || "Checking..."} Mode
        </div>
      </div>

      {/* 🔥 NEW: Store Switcher Added Here */}
      <div className="px-4 mb-4">
         <StoreSwitcher />
      </div>

      {/* --- Navigation Links --- */}
      <nav className="flex-1 space-y-1 px-4 overflow-y-auto custom-scrollbar">
        {filteredNavItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                isActive 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" 
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
              }`}
            >
              <span className={`${isActive ? "text-white" : "group-hover:text-blue-400 transition-colors"}`}>
                {item.icon}
              </span>
              <span className="font-medium text-sm">{item.label}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* --- Footer: Actions --- */}
      <div className="p-4 border-t border-slate-800 space-y-2">
        
        {/* 🔄 Switch User Button */}
        <button 
          onClick={handleSwitchUser}
          className="flex items-center gap-3 px-4 py-3 w-full text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-xl transition-all group"
        >
          <RefreshCcw size={20} className="group-hover:rotate-180 transition-transform duration-500" />
          <span className="font-medium text-sm">Switch User</span>
        </button>

        {/* 🚪 Log Out Button */}
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 w-full text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all group"
        >
          <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium text-sm">Sign Out Shop</span>
        </button>

      </div>
    </aside>
  );
}