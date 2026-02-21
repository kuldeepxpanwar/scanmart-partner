"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";
import { TrendingUp, IndianRupee, Calendar, ShoppingBag, Percent, Wallet, AlertTriangle } from "lucide-react";

// ─────────────────────────────────────────────────────────────
//  NOTE: For Net Profit & GST to show correctly, run this SQL
//  in Supabase SQL Editor ONE TIME:
//
//  ALTER TABLE sales ADD COLUMN IF NOT EXISTS total_profit FLOAT DEFAULT 0;
//  ALTER TABLE sales ADD COLUMN IF NOT EXISTS total_gst FLOAT DEFAULT 0;
//
//  After running SQL, checkout will auto-fill these columns.
// ─────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [stats, setStats] = useState({
    totalRevenue: 0, totalSales: 0, lowStockCount: 0,
    totalProfit: 0, totalTax: 0, totalSavings: 0,
  });
  const [productData, setProductData] = useState<any[]>([]);
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [isMounted, setIsMounted] = useState(false);
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null);
  const [hasProfit, setHasProfit] = useState(false); // flag if columns exist

  useEffect(() => {
    setIsMounted(true);
    const storedId = typeof window !== "undefined" ? localStorage.getItem("active_store_id") : null;
    if (storedId) setActiveStoreId(storedId);
    else fetchFirstStore();
  }, []);

  useEffect(() => {
    if (activeStoreId) fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, activeStoreId]);

  const fetchFirstStore = async () => {
    const { data } = await supabase.from("stores").select("id").limit(1);
    if (data && data.length > 0) setActiveStoreId(data[0].id);
  };

  const fetchAnalytics = async () => {
    if (!activeStoreId) return;
    setLoading(true);
    try {
      const dateLimit = new Date();
      if (filter === "today") dateLimit.setHours(0, 0, 0, 0);
      if (filter === "week") dateLimit.setDate(dateLimit.getDate() - 7);
      if (filter === "month") dateLimit.setMonth(dateLimit.getMonth() - 1);

      // ── Try fetching with profit columns ──────────────────────
      let salesQ = supabase
        .from("sales")
        .select("id, total_amount, total_savings, total_profit, total_gst, created_at")
        .eq("store_id", activeStoreId);
      if (filter !== "all") salesQ = salesQ.gte("created_at", dateLimit.toISOString());

      const { data: rawSales, error: salesErr } = await salesQ;
      let salesData: any[] = rawSales || [];

      // If profit columns don't exist, fall back to basic select
      if (salesErr?.message?.includes("total_profit") || salesErr?.message?.includes("total_gst") || salesErr?.message?.includes("schema cache")) {
        console.warn("[Analytics] Profit columns missing, falling back to basic fetch");
        setHasProfit(false);
        const { data: basicSales } = await supabase
          .from("sales")
          .select("id, total_amount, total_savings, created_at")
          .eq("store_id", activeStoreId)
          .gte("created_at", filter !== "all" ? dateLimit.toISOString() : "2000-01-01");
        salesData = basicSales || [];
      } else {
        setHasProfit(true);
      }

      // ── Inventory ─────────────────────────────────────────────
      const { data: inventoryData } = await supabase
        .from("inventory")
        .select("id, name, stock")
        .eq("store_id", activeStoreId);

      // ── Sum ───────────────────────────────────────────────────
      let revenue = 0, profit = 0, tax = 0, savings = 0;
      (salesData || []).forEach((sale: any) => {
        revenue += Number(sale.total_amount || 0);
        savings += Number(sale.total_savings || 0);
        profit += Number(sale.total_profit || 0);
        tax += Number(sale.total_gst || 0);
      });

      console.log(`[Analytics] Revenue:₹${revenue.toFixed(0)} Profit:₹${profit.toFixed(0)} GST:₹${tax.toFixed(0)} | hasProfit=${hasProfit}`);

      setStats({
        totalRevenue: Number(revenue.toFixed(2)),
        totalSales: (salesData || []).length,
        totalProfit: Number(profit.toFixed(2)),
        totalTax: Number(tax.toFixed(2)),
        totalSavings: Number(savings.toFixed(2)),
        lowStockCount: (inventoryData || []).filter((i: any) => Number(i.stock) < 10).length,
      });

      setProductData(
        (inventoryData || []).slice(0, 8).map((i: any) => ({ name: i.name, stock: i.stock }))
      );

      const dailyMap: Record<string, number> = {};
      (salesData || []).forEach((sale: any) => {
        const day = new Date(sale.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
        dailyMap[day] = (dailyMap[day] || 0) + Number(sale.total_amount || 0);
      });
      setDailyData(Object.entries(dailyMap).map(([date, rev]) => ({ date, revenue: rev })).slice(-10));

    } catch (err) {
      console.error("[Analytics] error:", err);
    } finally {
      setLoading(false);
    }
  };

  const profitMargin = stats.totalRevenue > 0
    ? ((stats.totalProfit / stats.totalRevenue) * 100).toFixed(1) : "0.0";

  if (!isMounted) return null;

  return (
    <div className="p-8 bg-[#020617] min-h-screen text-white font-sans">

      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <TrendingUp className="text-blue-500" size={32} /> PROFIT ANALYTICS
          </h1>
        </div>
        <div className="flex items-center gap-2 bg-slate-900/50 p-2 rounded-2xl border border-slate-800">
          <Calendar size={18} className="text-blue-500 ml-2" />
          <select value={filter} onChange={e => setFilter(e.target.value)} className="bg-transparent outline-none p-1 text-sm font-bold cursor-pointer text-slate-300">
            <option value="all">Lifetime</option>
            <option value="today">Today</option>
            <option value="week">Past 7 Days</option>
            <option value="month">Past 30 Days</option>
          </select>
        </div>
      </div>

      {/* ⚠️ Banner if profit columns missing */}
      {!hasProfit && !loading && (
        <div className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-400 font-bold text-sm">Net Profit & GST require a one-time Supabase setup</p>
            <p className="text-slate-400 text-xs mt-1">Run this in Supabase SQL Editor:</p>
            <code className="text-[11px] text-amber-300 bg-slate-900 px-3 py-1.5 rounded-lg block mt-2 font-mono">
              ALTER TABLE sales ADD COLUMN IF NOT EXISTS total_profit FLOAT DEFAULT 0;<br />
              ALTER TABLE sales ADD COLUMN IF NOT EXISTS total_gst FLOAT DEFAULT 0;
            </code>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-slate-500 font-bold tracking-widest uppercase animate-pulse">Loading Analytics...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <StatCard title="Gross Revenue" val={stats.totalRevenue} color="text-blue-500" label="TOTAL BILLING" icon={<IndianRupee size={12} />} />
            <StatCard title="Net Profit" val={stats.totalProfit} color="text-green-500" label={`MARGIN: ${profitMargin}%`} icon={<Percent size={12} />} dimmed={!hasProfit} />
            <StatCard title="GST Collected" val={stats.totalTax} color="text-amber-500" label="TAX PAYABLE" icon={<Wallet size={12} />} dimmed={!hasProfit} />
            <StatCard title="Customer Savings" val={stats.totalSavings} color="text-purple-400" label="DISCOUNT GIVEN" icon={<ShoppingBag size={12} />} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-slate-900 p-8 rounded-[2rem] border border-slate-800">
              <h2 className="text-xl font-bold mb-6">📦 Stock Levels</h2>
              {productData.length === 0 ? (
                <div className="h-[280px] flex items-center justify-center text-slate-600 text-sm font-bold uppercase">No Inventory</div>
              ) : (
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={productData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{ fill: "#1e293b" }} contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "16px" }} />
                      <Bar dataKey="stock" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="bg-slate-900 p-8 rounded-[2rem] border border-slate-800">
              <h2 className="text-xl font-bold mb-6">📈 Daily Revenue Trend</h2>
              {dailyData.length === 0 ? (
                <div className="h-[280px] flex items-center justify-center text-slate-600 text-sm font-bold uppercase">No Sales Data</div>
              ) : (
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `₹${v}`} />
                      <Tooltip cursor={{ fill: "#1e293b" }} contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "16px" }} formatter={(v: any) => [`₹${Number(v).toFixed(0)}`, "Revenue"]} />
                      <Bar dataKey="revenue" fill="#10b981" radius={[6, 6, 0, 0]} barSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mt-8">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] text-center">
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">Total Orders</p>
              <p className="text-5xl font-black text-blue-500">{stats.totalSales}</p>
            </div>
            <div className="bg-slate-900 border border-red-900/30 p-6 rounded-[2rem] text-center">
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">Low Stock Items</p>
              <p className="text-5xl font-black text-red-500">{stats.lowStockCount}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ title, val, color, label, icon, dimmed }: any) {
  return (
    <div className={`bg-slate-900 border p-6 rounded-[2.5rem] transition-all ${dimmed ? 'border-amber-900/30 opacity-60' : 'border-slate-800 hover:border-slate-700'}`}>
      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">{title}</p>
      <p className={`text-2xl font-black ${color}`}>
        {dimmed ? "—" : `₹${Number(val || 0).toLocaleString()}`}
      </p>
      <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-400 font-bold bg-slate-800 w-fit px-2 py-1 rounded-lg">
        {icon} {dimmed ? "NEEDS SQL SETUP" : label}
      </div>
    </div>
  );
}