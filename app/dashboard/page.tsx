"use client";
import React, { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
    TrendingUp, Users, Package, ShoppingBag,
    ArrowUpRight, Zap, Loader2, Calendar, IndianRupee,
    Wallet, ShieldCheck, Lock, AlertTriangle
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
    const LOCKOUT_DURATION_MS = 30 * 60 * 1000;

    useEffect(() => {
        const stored = localStorage.getItem("dash_lockout_until");
        if (stored) {
            const until = Number(stored);
            if (Date.now() < until) setLockoutUntil(until);
            else localStorage.removeItem("dash_lockout_until");
        }
    }, []);

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
            const newAttempts = pinAttempts + 1;
            setPinAttempts(newAttempts);
            const remaining = PIN_MAX_ATTEMPTS - newAttempts;
            if (newAttempts >= PIN_MAX_ATTEMPTS) {
                const until = Date.now() + LOCKOUT_DURATION_MS;
                setLockoutUntil(until);
                localStorage.setItem("dash_lockout_until", String(until));
                setPinError(`🔒 Locked for 30 minutes after ${PIN_MAX_ATTEMPTS} failed attempts`);
            } else {
                setPinError(`❌ Invalid PIN — ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining`);
            }
            setPin("");
            inputRef.current?.focus();
        }
        setLoading(false);
    };

    // ─── Main data fetch ─────────────────────────────────────────
    // FIX: Uses active_store_id from localStorage for ALL queries (revenue, orders,
    // customers). Low stock now correctly uses store_id (not shop_id/owner_id).
    const fetchDashboardData = async (role: string, staffId: string, shopId: string) => {
        try {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);

            // Use active_store_id from StoreSwitcher (same pattern as all other pages)
            const activeStoreId = typeof window !== "undefined"
                ? localStorage.getItem("active_store_id") : null;

            // ── Revenue + Orders ────────────────────────────────────
            let salesQuery = supabase
                .from("sales")
                .select("id, total_amount, payment_method, created_at, staff_id");

            if (activeStoreId) salesQuery = salesQuery.eq("store_id", activeStoreId);

            const { data: allSales } = await salesQuery;
            const totalRevenue = (allSales || []).reduce((s, r) => s + Number(r.total_amount || 0), 0);
            const totalOrders = (allSales || []).length;

            // Today's sales
            const todaySalesArr = (allSales || []).filter(s =>
                new Date(s.created_at) >= todayStart
            );
            const todaySales = todaySalesArr.reduce((s, r) => s + Number(r.total_amount || 0), 0);
            const cashInHand = todaySalesArr
                .filter(s => s.payment_method === "cash")
                .reduce((s, r) => s + Number(r.total_amount || 0), 0);

            // My sales today (staff role)
            const mySalesToday = todaySalesArr
                .filter(s => s.staff_id === staffId)
                .reduce((s, r) => s + Number(r.total_amount || 0), 0);
            const myOrdersCount = todaySalesArr.filter(s => s.staff_id === staffId).length;

            // ── LOW STOCK FIX ───────────────────────────────────────
            // Previously used shop_id (owner ID) — wrong! inventory.shop_id doesn't exist.
            // Fixed: use store_id. Threshold: stock < 10.
            let inventoryQuery = supabase
                .from("inventory")
                .select("id, stock")
                .eq("is_active", true)
                .lt("stock", 10);  // low stock threshold

            if (activeStoreId) {
                inventoryQuery = inventoryQuery.eq("store_id", activeStoreId);
            }

            const { data: lowStockItems } = await inventoryQuery;
            const lowStockCount = (lowStockItems || []).length;

            // ── Customers ────────────────────────────────────────────
            let custQuery = supabase.from("customers").select("id", { count: "exact", head: true });
            if (activeStoreId) custQuery = custQuery.eq("store_id", activeStoreId);
            const { count: totalCustomers } = await custQuery;

            // ── Recent Sales ─────────────────────────────────────────
            let recentQuery = supabase
                .from("sales")
                .select("id, total_amount, payment_method, created_at, customer:customer_id(name, phone), staff:staff_id(name)")
                .order("created_at", { ascending: false })
                .limit(5);
            if (activeStoreId) recentQuery = recentQuery.eq("store_id", activeStoreId);
            const { data: recentData } = await recentQuery;

            setStats({
                totalRevenue: Number(totalRevenue.toFixed(2)),
                totalOrders,
                lowStockCount,
                totalCustomers: totalCustomers || 0,
                todaySales: Number(todaySales.toFixed(2)),
                mySalesToday: Number(mySalesToday.toFixed(2)),
                myOrdersCount,
                cashInHand: Number(cashInHand.toFixed(2)),
            });
            setRecentSales(recentData || []);

        } catch (err) {
            console.error("[Dashboard] fetchDashboardData error:", err);
        }
    };

    // ─── Lock screen ─────────────────────────────────────────────
    if (loading) return (
        <div className="flex items-center justify-center h-screen bg-[#020617]">
            <Loader2 className="animate-spin text-blue-500" size={36} />
        </div>
    );

    if (isLocked) return (
        <div className="flex items-center justify-center min-h-screen bg-[#020617] p-6">
            <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-4">
                        <Lock className="text-blue-400" size={28} />
                    </div>
                    <h1 className="text-2xl font-black text-white">Enter PIN</h1>
                    <p className="text-slate-500 text-sm mt-1">Identify yourself to access the dashboard</p>
                </div>

                <div className="space-y-4">
                    <input
                        ref={inputRef}
                        type="password"
                        inputMode="numeric"
                        maxLength={6}
                        autoFocus
                        placeholder="••••••"
                        value={pin}
                        onChange={e => setPin(e.target.value.replace(/\D/g, ""))}
                        onKeyDown={e => e.key === "Enter" && handleUnlock()}
                        className="w-full bg-slate-800 border border-slate-700 p-4 rounded-2xl text-white text-center text-2xl tracking-[0.5em] font-mono outline-none focus:border-blue-500 transition-all"
                    />

                    {pinError && (
                        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                            <AlertTriangle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                            <p className="text-red-400 text-xs font-bold">{pinError}</p>
                        </div>
                    )}

                    <button
                        onClick={handleUnlock}
                        disabled={loading || (!!lockoutUntil && Date.now() < lockoutUntil)}
                        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-4 rounded-2xl font-black uppercase text-sm tracking-widest flex items-center justify-center gap-2 transition-all"
                    >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <><ShieldCheck size={18} /> Unlock Dashboard</>}
                    </button>

                    <button onClick={() => setShowForgotPin(true)} className="w-full text-slate-600 hover:text-slate-400 text-xs font-bold py-2 transition-colors">
                        Forgot PIN?
                    </button>
                </div>
            </div>
            {showForgotPin && <ForgotPinModal onClose={() => setShowForgotPin(false)} />}
        </div>
    );

    // ─── Dashboard Content ────────────────────────────────────────
    const dayName = new Date().toLocaleDateString("en-IN", { weekday: "long" });
    const dateFull = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();

    return (
        <div className="p-6 bg-[#020617] min-h-screen text-white font-sans">
            {/* Greeting */}
            <div className="mb-8">
                <div className="flex items-center gap-2 text-xs text-slate-500 font-bold uppercase tracking-widest mb-2">
                    <Calendar size={12} />
                    <span>{dayName} — {dateFull}</span>
                    {userRole === "admin" && (
                        <span className="ml-2 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-[9px] font-black px-2 py-0.5 rounded-full">MASTER ADMIN VIEW</span>
                    )}
                </div>
                <h1 className="text-4xl font-black tracking-tight">
                    👋 Welcome, <span className="text-blue-400">{staffName || "SHOP OWNER"}!</span>
                </h1>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <KpiCard
                    label="Total Revenue"
                    value={`₹${stats.totalRevenue.toLocaleString()}`}
                    sub={`+₹${stats.todaySales.toLocaleString()} Today`}
                    icon={<IndianRupee size={20} className="text-blue-400" />}
                    bg="bg-blue-500/10"
                />
                <KpiCard
                    label="Total Orders"
                    value={String(stats.totalOrders)}
                    sub="Lifetime"
                    icon={<ShoppingBag size={20} className="text-purple-400" />}
                    bg="bg-purple-500/10"
                />
                <KpiCard
                    label="Low Stock Alert"
                    value={String(stats.lowStockCount)}
                    sub={stats.lowStockCount === 0 ? "All Good" : `${stats.lowStockCount} Items need restock`}
                    icon={<Package size={20} className={stats.lowStockCount > 0 ? "text-red-400" : "text-green-400"} />}
                    bg={stats.lowStockCount > 0 ? "bg-red-500/10" : "bg-green-500/10"}
                    alert={stats.lowStockCount > 0}
                />
                <KpiCard
                    label="Total Customers"
                    value={String(stats.totalCustomers)}
                    sub="Registered"
                    icon={<Users size={20} className="text-amber-400" />}
                    bg="bg-amber-500/10"
                />
            </div>

            {/* Staff-facing extra stats (non-admin) */}
            {userRole !== "admin" && (
                <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-[2rem] text-center">
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">My Sales Today</p>
                        <p className="text-3xl font-black text-green-400">₹{stats.mySalesToday.toLocaleString()}</p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-[2rem] text-center">
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">My Orders</p>
                        <p className="text-3xl font-black text-blue-400">{stats.myOrdersCount}</p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-[2rem] text-center">
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Cash in Hand</p>
                        <p className="text-3xl font-black text-amber-400">₹{stats.cashInHand.toLocaleString()}</p>
                    </div>
                </div>
            )}

            {/* Quick Actions + Recent Sales */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Quick Billing */}
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] p-8 flex flex-col justify-between shadow-2xl shadow-blue-900/40">
                    <div>
                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
                            <Zap size={24} className="text-white" />
                        </div>
                        <h2 className="text-2xl font-black italic uppercase text-white leading-tight">Quick<br />Billing</h2>
                        <p className="text-blue-200 text-xs mt-2">Create new invoices instantly. Fast, secure, and printer-friendly.</p>
                    </div>
                    <Link href="/dashboard/sales" className="mt-6 flex items-center justify-center gap-2 bg-white text-blue-700 font-black text-xs uppercase tracking-widest py-3.5 rounded-2xl hover:bg-blue-50 transition-all">
                        Start Selling <ArrowUpRight size={14} />
                    </Link>
                </div>

                {/* Recent Sales */}
                <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-[2rem] p-6">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-base font-black flex items-center gap-2"><TrendingUp size={16} className="text-green-500" /> Recent Sales</h2>
                        <Link href="/dashboard/analytics" className="text-[10px] text-blue-400 font-black uppercase tracking-widest hover:text-blue-300 transition-colors">
                            View All →
                        </Link>
                    </div>
                    {recentSales.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-32 gap-2">
                            <ShoppingBag size={32} className="text-slate-700" />
                            <p className="text-slate-600 text-sm font-bold">No sales yet today</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {recentSales.map((sale) => (
                                <div key={sale.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-2xl hover:bg-slate-800 transition-colors">
                                    <div>
                                        <p className="text-sm font-bold text-white">{(sale.customer as any)?.name || "Guest"}</p>
                                        <p className="text-[10px] text-slate-500">
                                            {new Date(sale.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} •
                                            <span className="capitalize ml-1">{sale.payment_method}</span>
                                        </p>
                                    </div>
                                    <span className="text-green-400 font-black text-sm">₹{Number(sale.total_amount).toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function KpiCard({ label, value, sub, icon, bg, alert }: {
    label: string; value: string; sub: string;
    icon: React.ReactNode; bg: string; alert?: boolean;
}) {
    return (
        <div className={`p-5 rounded-[2rem] border transition-all ${alert ? "border-red-500/30 bg-red-500/5" : "border-slate-800 bg-slate-900 hover:border-slate-700"}`}>
            <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-4`}>{icon}</div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">{label}</p>
            <p className={`text-2xl font-black ${alert ? "text-red-400" : "text-white"}`}>{value}</p>
            <p className={`text-xs mt-1 font-bold ${alert ? "text-red-400" : "text-slate-500"}`}>{sub}</p>
        </div>
    );
}
