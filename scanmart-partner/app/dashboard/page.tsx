"use client";
import React, { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  TrendingUp, Users, Package, ShoppingBag,
  ArrowUpRight, Zap, Loader2, Calendar, IndianRupee,
  Wallet, ShieldCheck, Lock
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ForgotPinModal from "@/components/ForgotPinModal";

export default function DashboardHome() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(true);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [showForgotPin, setShowForgotPin] = useState(false);
  const [loginShopId, setLoginShopId] = useState<string | null>(null);

  // 🔒 PIN Lockout State
  const [pinAttempts, setPinAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [lockoutCountdown, setLockoutCountdown] = useState(0);
  const PIN_MAX_ATTEMPTS = 5;
  const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes

  // Restore lockout state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("dash_lockout_until");
    if (stored) {
      const until = Number(stored);
      if (Date.now() < until) setLockoutUntil(until);
      else localStorage.removeItem("dash_lockout_until");
    }
  }, []);

  // Countdown timer when locked out
  useEffect(() => {
    if (!lockoutUntil) return;
    const interval = setInterval(() => {
      const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockoutUntil(null); setPinAttempts(0);
        localStorage.removeItem("dash_lockout_until");
        clearInterval(interval);
      } else setLockoutCountdown(remaining);
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutUntil]);

  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentStaffId, setCurrentStaffId] = useState<string | null>(null);
  const [staffName, setStaffName] = useState("");

  const [stats, setStats] = useState({
    totalRevenue: 0, totalOrders: 0, lowStockCount: 0,
    totalCustomers: 0, todaySales: 0, mySalesToday: 0,
    myOrdersCount: 0, cashInHand: 0,
  });
  const [recentSales, setRecentSales] = useState<any[]>([]);

  useEffect(() => { checkActiveSession(); }, []);

  // ─── Session restore ────────────────────────────────────────
  const checkActiveSession = async () => {
    setLoading(true);
    const storedStaffId = typeof window !== "undefined"
      ? sessionStorage.getItem("active_staff_id") : null;

    if (storedStaffId) {
      const { data } = await supabase
        .from("staff")
        .select("*")
        .eq("id", storedStaffId)
        .eq("is_active", true)
        .single();

      if (data) {
        setUserRole(data.role);
        setCurrentStaffId(data.id);
        setStaffName(data.name || "");
        setIsLocked(false);
        fetchDashboardData(data.role, data.id, data.shop_id);
      } else {
        sessionStorage.removeItem("active_staff_id");
        setIsLocked(true);
      }
    } else {
      setIsLocked(true);
    }
    setLoading(false);
  };

  // ─── PIN unlock (with brute-force lockout) ──────────────────
  const handleUnlock = async () => {
    // Check if locked out
    if (lockoutUntil && Date.now() < lockoutUntil) {
      return setPinError(`🔒 Too many attempts. Try again in ${lockoutCountdown}s`);
    }
    if (pin.length < 4) return setPinError("PIN must be 4–6 digits");
    setPinError("");
    setLoading(true);

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      setPinError("Session expired. Log In again.");
      sessionStorage.clear();
      window.location.href = "/login";
      return;
    }

    const currentShopOwnerId = authData.user.id;
    setLoginShopId(currentShopOwnerId);

    const { data } = await supabase
      .from("staff")
      .select("*")
      .eq("pin_code", pin)
      .eq("is_active", true)
      .eq("shop_id", currentShopOwnerId)
      .maybeSingle();

    if (data) {
      // ✅ Success: reset lockout
      setPinAttempts(0);
      localStorage.removeItem("dash_lockout_until");
      sessionStorage.setItem("active_staff_id", data.id);
      setUserRole(data.role);
      setCurrentStaffId(data.id);
      setStaffName(data.name || "");
      setIsLocked(false);
      setPin("");
      fetchDashboardData(data.role, data.id, data.shop_id);
    } else {
      // ❌ Failed attempt
      const newAttempts = pinAttempts + 1;
      setPinAttempts(newAttempts);
      const remaining = PIN_MAX_ATTEMPTS - newAttempts;
      if (newAttempts >= PIN_MAX_ATTEMPTS) {
        const until = Date.now() + LOCKOUT_DURATION_MS;
        setLockoutUntil(until);
        localStorage.setItem("dash_lockout_until", String(until));
        setPinError(`🔒 Locked for 30 minutes after ${PIN_MAX_ATTEMPTS} failed attempts`);
      } else {
        setPinError(`❌ Invalid PIN — ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining`);
      }
      setPin("");
      inputRef.current?.focus();
    }
    setLoading(false);
  };

  // ─── Main data fetch ────────────────────────────────────────
  // FIX: Use active_store_id from localStorage (set by StoreSwitcher).
  //      This is the same pattern used by all other pages (sales, analytics, inventory).
  //      Previously tried stores.owner_id lookup which failed due to RLS → returning ₹0.
  const fetchDashboardData = async (role: string, staffId: string, shopId: string) => {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayISO = todayStart.toISOString();

      // ── Get storeId from localStorage (canonical source set by StoreSwitcher) ──
      const storeId = (typeof window !== "undefined"
        ? localStorage.getItem("active_store_id")
        : null) || shopId;

      console.log("[Dashboard] shopId:", shopId, "→ storeId:", storeId, "| role:", role);

      // ── Low stock ────────────────────────────────────────────
      const { count: lowStockCount } = await supabase
        .from("inventory")
        .select("id", { count: "exact", head: true })
        .eq("store_id", storeId)
        .lt("stock", 5);

      // ── Customer count (use store_id — same as customers page) ──
      const { count: totalCustomers } = await supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("store_id", storeId);

      // ── Recent transactions ──────────────────────────────────
      let salesQ = supabase
        .from("sales")
        .select("id, total_amount, payment_method, created_at, staff_id, customers(name)")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false });

      if (role === "staff") {
        salesQ = salesQ.eq("staff_id", staffId).limit(10);
      } else {
        salesQ = salesQ.limit(10);
      }
      const { data: salesData, error: salesErr } = await salesQ;
      if (salesErr) console.error("[Dashboard] sales err:", salesErr.message);

      // ── Admin/Manager totals ─────────────────────────────────
      let totalRev = 0, totalOrd = 0, todayRev = 0;
      if (role === "admin" || role === "manager") {
        const { data: allSales, error: allSalesErr } = await supabase
          .from("sales")
          .select("total_amount, created_at")
          .eq("store_id", storeId);

        if (allSalesErr) console.error("[Dashboard] allSales err:", allSalesErr.message);
        console.log("[Dashboard] allSales:", allSales?.length, "for store:", storeId);

        if (allSales) {
          totalRev = allSales.reduce((s: number, r: any) => s + Number(r.total_amount || 0), 0);
          totalOrd = allSales.length;
          todayRev = allSales
            .filter((r: any) => new Date(r.created_at) >= todayStart)
            .reduce((s: number, r: any) => s + Number(r.total_amount || 0), 0);
        }
      }

      // ── Staff personal stats ────────────────────────────────
      let myToday = 0, myCount = 0, myCash = 0;
      if (staffId) {
        const { data: mySales } = await supabase
          .from("sales")
          .select("total_amount, payment_method, created_at")
          .eq("staff_id", staffId)
          .eq("store_id", storeId)
          .gte("created_at", todayISO);

        if (mySales) {
          myToday = mySales.reduce((s: number, r: any) => s + Number(r.total_amount || 0), 0);
          myCount = mySales.length;
          myCash = mySales.filter((r: any) => r.payment_method === "cash")
            .reduce((s: number, r: any) => s + Number(r.total_amount || 0), 0);
        }
      }

      setStats({
        totalRevenue: totalRev,
        totalOrders: totalOrd,
        lowStockCount: lowStockCount || 0,
        totalCustomers: totalCustomers || 0,
        todaySales: todayRev,
        mySalesToday: myToday,
        myOrdersCount: myCount,
        cashInHand: myCash,
      });

      if (salesData) setRecentSales(salesData);

    } catch (err) {
      console.error("[Dashboard] fetch error:", err);
    }
  };

  // ─── Stat cards config ──────────────────────────────────────
  const getStickers = () => {
    const isAdmin = userRole === "admin" || userRole === "manager";
    if (isAdmin) {
      return [
        { label: "Total Revenue", value: `₹${stats.totalRevenue.toLocaleString()}`, icon: <IndianRupee size={24} />, color: "bg-blue-500", trend: `+₹${stats.todaySales} Today` },
        { label: "Total Orders", value: stats.totalOrders.toString(), icon: <ShoppingBag size={24} />, color: "bg-purple-500", trend: "Lifetime" },
        { label: "Low Stock Alert", value: stats.lowStockCount.toString(), icon: <Package size={24} />, color: "bg-red-500", trend: stats.lowStockCount > 0 ? "Action Needed" : "All Good" },
        { label: "Total Customers", value: stats.totalCustomers.toString(), icon: <Users size={24} />, color: "bg-emerald-500", trend: "Registered" },
      ];
    }
    return [
      { label: "My Sales Today", value: `₹${stats.mySalesToday.toLocaleString()}`, icon: <TrendingUp size={24} />, color: "bg-blue-500", trend: "Performance" },
      { label: "Bills Generated", value: stats.myOrdersCount.toString(), icon: <ShoppingBag size={24} />, color: "bg-purple-500", trend: "Today" },
      { label: "Cash in Drawer", value: `₹${stats.cashInHand.toLocaleString()}`, icon: <Wallet size={24} />, color: "bg-emerald-500", trend: "Verify Now" },
      { label: "Low Stock Alert", value: stats.lowStockCount.toString(), icon: <Package size={24} />, color: "bg-red-500", trend: "Check Inventory" },
    ];
  };

  if (loading) {
    return <div className="h-[70vh] flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={40} /></div>;
  }

  // ─── Lock screen ─────────────────────────────────────────────
  if (isLocked) {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#020617] flex items-center justify-center text-white p-4">
        <div className="bg-slate-900 p-8 rounded-[2rem] w-full max-w-sm border border-slate-800 shadow-2xl text-center">
          <div className="bg-blue-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 border border-blue-500/20">
            <Lock size={32} className="text-blue-500" />
          </div>
          <h2 className="text-xl font-black uppercase tracking-wider mb-2">Shop Locked</h2>
          <p className="text-slate-500 text-xs mb-6 uppercase font-bold tracking-widest">Enter Your PIN To Access Dashboard</p>

          <div className="flex justify-center gap-2 mb-6">
            {[0, 1, 2, 3, 4, 5].map(i => (
              <div key={i} className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${pin.length > i ? "bg-blue-500 scale-125 shadow-lg shadow-blue-500/50" : "bg-slate-800"}`} />
            ))}
          </div>

          <input
            ref={inputRef}
            type="password" inputMode="numeric" autoFocus maxLength={6}
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, ""))}
            onKeyDown={e => e.key === "Enter" && handleUnlock()}
            className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-center text-2xl font-black tracking-[1rem] outline-none focus:border-blue-500 transition-all mb-4 text-white placeholder-slate-800"
            placeholder="••••"
          />

          {pinError && <p className="text-red-500 text-xs font-bold mb-4 animate-pulse bg-red-500/10 py-2 rounded-lg border border-red-500/20">{pinError}</p>}

          <button onClick={handleUnlock} className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-2xl font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-blue-900/20">
            Unlock Shop
          </button>

          <button
            onClick={() => setShowForgotPin(true)}
            className="mt-4 text-slate-500 hover:text-blue-400 text-xs font-bold uppercase tracking-widest transition-all block w-full"
          >
            Forgot PIN?
          </button>
        </div>
        <ForgotPinModal isOpen={showForgotPin} onClose={() => setShowForgotPin(false)} shopId={loginShopId} />
      </div>
    );
  }

  const stickers = getStickers();
  const isAdmin = userRole === "admin" || userRole === "manager";

  // ─── Main dashboard ─────────────────────────────────────────
  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter uppercase">
            {staffName
              ? <><span>👋 Welcome, </span><span className="text-blue-500">{staffName}!</span></>
              : <>Dashboard <span className="text-blue-500">Overview</span></>
            }
          </h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
            <Calendar size={14} /> {new Date().toDateString()} •{" "}
            <span className={`px-2 py-0.5 rounded text-[10px] ${isAdmin ? "bg-yellow-500/10 text-yellow-500" : "bg-green-500/10 text-green-500"}`}>
              {userRole === "admin" ? "Master Admin" : userRole?.toUpperCase()} View
            </span>
          </p>
        </div>
        {!isAdmin && (
          <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl flex items-center gap-2">
            <ShieldCheck size={16} className="text-green-500" />
            <span className="text-xs font-bold text-slate-400">Restricted Mode Active</span>
          </div>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stickers.map((s, i) => (
          <div key={i} className="group relative bg-slate-900/50 border border-slate-800 p-6 rounded-[2.5rem] overflow-hidden hover:border-blue-500 transition-all hover:scale-[1.02] shadow-xl">
            <div className={`absolute -right-4 -top-4 w-24 h-24 ${s.color} opacity-10 blur-3xl group-hover:opacity-20 transition-all`}></div>
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-2xl ${s.color} text-white shadow-lg shadow-black/40`}>{s.icon}</div>
              <span className={`text-[10px] font-black px-3 py-1 rounded-full border border-slate-700 ${s.color === "bg-red-500" ? "text-red-400 bg-red-900/20" : "text-slate-300 bg-slate-800"}`}>{s.trend}</span>
            </div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">{s.label}</p>
            <h2 className="text-3xl font-black italic tracking-tighter text-white">{s.value}</h2>
          </div>
        ))}
      </div>

      {/* Charts & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {isAdmin ? (
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-8 rounded-[3rem] min-h-[400px] flex flex-col justify-between shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black italic uppercase tracking-widest flex items-center gap-2"><TrendingUp className="text-blue-500" /> Sales <span className="text-white">Trend</span></h3>
              <div className="bg-slate-950 px-4 py-2 rounded-xl border border-slate-800"><span className="text-[10px] font-bold text-slate-400">LIVE DATA</span></div>
            </div>
            <div className="flex-1 w-full bg-slate-950/50 rounded-[2rem] border border-dashed border-slate-800 flex items-end justify-around p-6 gap-2 relative overflow-hidden group">
              <div className="absolute inset-0 bg-blue-500/5 blur-3xl group-hover:bg-blue-500/10 transition-all"></div>
              {[35, 60, 45, 80, 55, 90, 70].map((h, i) => (
                <div key={i} className="w-full relative group/bar">
                  <div className="bg-gradient-to-t from-blue-900 to-blue-500 rounded-t-lg w-full absolute bottom-0 transition-all duration-1000 group-hover/bar:to-blue-400" style={{ height: `${h}%` }}></div>
                </div>
              ))}
            </div>
            <p className="text-center text-[10px] text-slate-500 mt-4 font-bold uppercase tracking-widest">Weekly Performance Overview</p>
          </div>
        ) : (
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-8 rounded-[3rem] min-h-[400px] flex flex-col justify-center items-center text-center shadow-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-purple-900/20"></div>
            <div className="relative z-10">
              <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-700">
                <Zap size={40} className="text-yellow-400 fill-yellow-400 animate-pulse" />
              </div>
              <h3 className="text-2xl font-black italic uppercase text-white mb-2">Great Job Today!</h3>
              <p className="text-slate-400 text-sm max-w-md mx-auto">
                You have processed <span className="text-white font-bold">{stats.myOrdersCount} bills</span> so far. Keep the momentum going!
              </p>
            </div>
          </div>
        )}

        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-[3rem] flex flex-col justify-between shadow-2xl shadow-blue-900/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
          <div>
            <div className="bg-white/20 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-md"><Zap size={32} fill="white" className="text-white" /></div>
            <h3 className="text-3xl font-black italic uppercase leading-none mb-2 text-white">Quick<br />Billing</h3>
            <p className="text-blue-100 text-xs font-medium opacity-80 leading-relaxed max-w-[200px]">Create new invoices instantly. Fast, secure, and printer-friendly.</p>
          </div>
          <Link href="/dashboard/sales">
            <button className="bg-white text-blue-700 w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-100 transition-all active:scale-95 shadow-xl flex items-center justify-center gap-2">
              Start Selling <ArrowUpRight size={16} />
            </button>
          </Link>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-xl">
        <h3 className="text-xl font-black italic uppercase tracking-widest mb-6 flex items-center gap-2">
          {isAdmin ? "Recent" : "My Recent"} <span className="text-blue-500">Transactions</span>
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-800">
                <th className="pb-4 pl-4">ID</th>
                <th className="pb-4">Customer</th>
                <th className="pb-4">Amount</th>
                <th className="pb-4">Method</th>
                <th className="pb-4 text-right pr-4">Time</th>
              </tr>
            </thead>
            <tbody className="text-sm font-bold text-slate-300">
              {recentSales.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-slate-500 italic">No sales found today.</td></tr>
              ) : (
                recentSales.map(sale => (
                  <tr key={sale.id} className="border-b border-slate-800/50 hover:bg-slate-800/50 transition-all group">
                    <td className="py-4 pl-4 font-mono text-xs text-blue-400 group-hover:text-blue-300">#{sale.id.slice(0, 6)}</td>
                    <td className="py-4">{(sale.customers as any)?.name || "Guest"}</td>
                    <td className="py-4 text-white">₹{sale.total_amount}</td>
                    <td className="py-4"><span className="bg-slate-950 border border-slate-800 px-3 py-1 rounded-lg text-[10px] uppercase">{sale.payment_method}</span></td>
                    <td className="py-4 text-right pr-4 text-xs text-slate-500">
                      {new Date(sale.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}