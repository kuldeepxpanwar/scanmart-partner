"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  LayoutDashboard, Package, BarChart3, Users, Settings,
  Truck, LogOut, Zap, ShoppingCart, ScanBarcode, Shield,
  RefreshCcw, RotateCcw, FileText, Sparkles, ChevronRight, ChevronLeft, Menu,
  ClipboardCheck, BookLock, FileSpreadsheet, Briefcase
} from "lucide-react";
import { useApp } from "@/lib/AppContext";
import AppSwitcher from "@/components/AppSwitcher";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useApp();
  const [userRole, setUserRole] = useState<string | null>(null);

  // Auto-collapse on billing page, expand on others
  const isBillingPage = pathname === "/dashboard/sales";
  const [collapsed, setCollapsed] = useState(isBillingPage);

  // Sync collapse state when route changes
  useEffect(() => {
    setCollapsed(isBillingPage);
  }, [isBillingPage]);

  // --- 🔐 ROLE CHECK LOGIC ---
  useEffect(() => {
    const checkRole = async () => {
      if (typeof window !== 'undefined') {
        const legacyLocal = localStorage.getItem("active_staff_id");
        if (legacyLocal) {
          sessionStorage.setItem("active_staff_id", legacyLocal);
          localStorage.removeItem("active_staff_id");
        }
      }
      const storedStaffId = typeof window !== 'undefined' ? sessionStorage.getItem("active_staff_id") : null;
      if (storedStaffId) {
        const cachedRole = sessionStorage.getItem("active_staff_role");
        if (cachedRole) { setUserRole(cachedRole); return; }
        const { data } = await supabase.from("staff").select("role").eq("id", storedStaffId).single();
        if (data) { setUserRole(data.role); sessionStorage.setItem("active_staff_role", data.role); }
      } else {
        setUserRole("staff");
      }
    };
    checkRole();
  }, [pathname]);

  const handleSwitchUser = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem("active_staff_id");
      sessionStorage.removeItem("active_staff_role");
      window.location.reload();
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem("active_staff_id");
        localStorage.removeItem("active_staff_id");
      }
      router.push("/login");
      router.refresh();
    }
  };

  const allNavItems = [
    { label: t('dashboard'), icon: <LayoutDashboard size={20} />, href: "/dashboard", roles: ["admin", "manager", "staff"] },
    { label: t('pos_terminal'), icon: <ShoppingCart size={20} />, href: "/dashboard/sales", roles: ["admin", "manager", "staff"] },
    { label: "Returns", icon: <RotateCcw size={20} />, href: "/dashboard/returns", roles: ["admin", "manager", "staff"] },
    { label: "H1 Register", icon: <BookLock size={20} />, href: "/dashboard/h1-register", roles: ["admin", "manager"] },
    { label: t('inventory'), icon: <Package size={20} />, href: "/dashboard/inventory", roles: ["admin", "manager"] },
    { label: "GRN Audit", icon: <ClipboardCheck size={20} />, href: "/dashboard/grn", roles: ["admin", "manager"] },
    { label: t('supplier'), icon: <Truck size={20} />, href: "/dashboard/suppliers", roles: ["admin", "manager"] },
    { label: t('analytics'), icon: <BarChart3 size={20} />, href: "/dashboard/analytics", roles: ["admin", "manager"] },
    { label: t('customer'), icon: <Users size={20} />, href: "/dashboard/customers", roles: ["admin", "manager"] },
    { label: "Doctors", icon: <Briefcase size={20} />, href: "/dashboard/doctors", roles: ["admin", "manager"] },
    { label: "Team Access", icon: <Shield size={20} />, href: "/dashboard/staff", roles: ["admin"] },
    { label: "Sticker Studio", icon: <ScanBarcode size={20} />, href: "/dashboard/stickers", roles: ["admin", "manager", "staff"] },
    { label: "GST Reports", icon: <FileSpreadsheet size={20} />, href: "/dashboard/gst", roles: ["admin", "manager"] },
    { label: "Z-Report", icon: <FileText size={20} />, href: "/dashboard/zreport", roles: ["admin", "manager"] },
    { label: "Onboarding", icon: <Sparkles size={20} />, href: "/dashboard/onboarding", roles: ["admin"] },
    { label: t('settings'), icon: <Settings size={20} />, href: "/dashboard/settings", roles: ["admin"] },
  ];

  const filteredNavItems = allNavItems.filter(item =>
    userRole ? item.roles.includes(userRole) : item.roles.includes("staff")
  );

  return (
    <aside
      className={`relative flex flex-col h-screen sticky top-0 z-40 bg-[#020617] border-r border-slate-800 transition-all duration-300 ease-in-out ${collapsed ? "w-[64px]" : "w-64"}`}
    >
      {/* --- Logo --- */}
      <div className={`flex items-center h-[72px] flex-shrink-0 ${collapsed ? "justify-center px-2" : "gap-3 px-6"}`}>
        <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-500/20 flex-shrink-0">
          <Zap size={20} className="text-white fill-white" />
        </div>
        {!collapsed && (
          <span className="text-lg font-bold text-white tracking-tight whitespace-nowrap overflow-hidden">
            {t('app_name')}<span className="text-blue-500">.Dash</span>
          </span>
        )}
      </div>

      {/* --- Role Tag --- */}
      {!collapsed && (
        <div className="px-6 mb-3">
          <div className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-md w-fit ${userRole === 'admin' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-blue-500/10 text-blue-500'}`}>
            {userRole || "..."} Mode
          </div>
        </div>
      )}

      {/* --- Collapse Toggle Button --- */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-[76px] z-50 bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-blue-600 hover:border-blue-600 w-6 h-6 rounded-full flex items-center justify-center transition-all shadow-md"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      {/* --- Nav Links --- */}
      <nav className="flex-1 space-y-1 px-2 overflow-y-auto overflow-x-hidden custom-scrollbar">
        {filteredNavItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative ${collapsed ? "justify-center" : ""
                } ${isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                }`}
            >
              <span className={`flex-shrink-0 ${isActive ? "text-white" : "group-hover:text-blue-400 transition-colors"}`}>
                {item.icon}
              </span>
              {!collapsed && (
                <span className="font-medium text-sm whitespace-nowrap">{item.label}</span>
              )}
              {isActive && !collapsed && (
                <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full animate-pulse flex-shrink-0" />
              )}
              {/* Tooltip when collapsed */}
              {collapsed && (
                <div className="absolute left-14 bg-slate-900 border border-slate-700 text-white text-xs font-bold px-3 py-2 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl">
                  {item.label}
                  <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-slate-900 border-l border-b border-slate-700 rotate-45" />
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* --- Theme/Lang Switcher --- */}
      {!collapsed && (
        <div className="px-3 py-2 border-t border-slate-800">
          <AppSwitcher />
        </div>
      )}

      {/* --- Footer --- */}
      <div className={`border-t border-slate-800 space-y-1 p-2 flex-shrink-0`}>
        {/* Switch User */}
        <button
          onClick={handleSwitchUser}
          title={collapsed ? "Switch User" : undefined}
          className={`flex items-center gap-3 px-3 py-3 w-full text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-xl transition-all group relative ${collapsed ? "justify-center" : ""}`}
        >
          <RefreshCcw size={20} className="group-hover:rotate-180 transition-transform duration-500 flex-shrink-0" />
          {!collapsed && <span className="font-medium text-sm">Switch User</span>}
          {collapsed && (
            <div className="absolute left-14 bg-slate-900 border border-slate-700 text-white text-xs font-bold px-3 py-2 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl">
              Switch User
            </div>
          )}
        </button>

        {/* Sign Out */}
        <button
          onClick={handleLogout}
          title={collapsed ? "Sign Out" : undefined}
          className={`flex items-center gap-3 px-3 py-3 w-full text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all group relative ${collapsed ? "justify-center" : ""}`}
        >
          <LogOut size={20} className="group-hover:-translate-x-1 transition-transform flex-shrink-0" />
          {!collapsed && <span className="font-medium text-sm">Sign Out Shop</span>}
          {collapsed && (
            <div className="absolute left-14 bg-slate-900 border border-slate-700 text-white text-xs font-bold px-3 py-2 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl">
              Sign Out Shop
            </div>
          )}
        </button>
      </div>
    </aside>
  );
}