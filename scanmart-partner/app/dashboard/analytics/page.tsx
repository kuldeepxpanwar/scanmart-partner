"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell
} from "recharts";
import {
  TrendingUp, IndianRupee, Calendar, ShoppingBag, Percent, Wallet,
  AlertTriangle, Package, Users, Trophy, FileText, Tag, Clock, Download
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useApp } from "@/lib/AppContext";

// ─────────────────────────────────────────────────────────────
//  NOTE: For Net Profit & GST to show correctly, run this SQL
//  in Supabase SQL Editor ONE TIME:
//
//  ALTER TABLE sales ADD COLUMN IF NOT EXISTS total_profit FLOAT DEFAULT 0;
//  ALTER TABLE sales ADD COLUMN IF NOT EXISTS total_gst FLOAT DEFAULT 0;
// ─────────────────────────────────────────────────────────────

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export default function AnalyticsPage() {
  const { t } = useApp();
  const [stats, setStats] = useState({
    totalRevenue: 0, totalSales: 0, lowStockCount: 0,
    totalProfit: 0, totalTax: 0, totalSavings: 0,
  });
  const [productData, setProductData] = useState<any[]>([]);
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [staffData, setStaffData] = useState<any[]>([]);
  const [deadStockData, setDeadStockData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("month"); // default: past 30 days
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "products" | "staff" | "gst">("overview");
  const [isMounted, setIsMounted] = useState(false);
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null);
  const [hasProfit, setHasProfit] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
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
      // ── IST timezone fix: midnight in UTC+5:30 ────────────────
      if (filter === "today") {
        // IST = UTC + 5h30m. Compute today's midnight in IST, convert to UTC.
        const now = new Date();
        const istOffsetMs = 5.5 * 60 * 60 * 1000;
        const istNow = new Date(now.getTime() + istOffsetMs);
        // Midnight in IST
        istNow.setUTCHours(0, 0, 0, 0);
        // Convert back to UTC for Supabase query
        dateLimit.setTime(istNow.getTime() - istOffsetMs);
      }
      if (filter === "week") dateLimit.setDate(dateLimit.getDate() - 7);
      if (filter === "month") dateLimit.setMonth(dateLimit.getMonth() - 1);
      if (filter === "quarter") dateLimit.setMonth(dateLimit.getMonth() - 3);

      // ── Sales with profit columns ──────────────────────────────
      let salesQ = supabase
        .from("sales")
        .select("id, total_amount, total_savings, total_profit, total_gst, created_at, staff_id, staff:staff(name)")
        .eq("store_id", activeStoreId);
      if (filter !== "all") salesQ = salesQ.gte("created_at", dateLimit.toISOString());

      const { data: rawSales, error: salesErr } = await salesQ;
      let salesData: any[] = rawSales || [];

      if (salesErr?.message?.includes("total_profit") || salesErr?.message?.includes("schema cache")) {
        setHasProfit(false);
        const { data: basicSales } = await supabase
          .from("sales")
          .select("id, total_amount, total_savings, created_at, staff_id, staff:staff(name)")
          .eq("store_id", activeStoreId)
          .gte("created_at", filter !== "all" ? dateLimit.toISOString() : "2000-01-01");
        salesData = basicSales || [];
      } else {
        setHasProfit(true);
      }

      // ── Sale items for top products ────────────────────────────
      const saleIds = salesData.map((s: any) => s.id);
      let topProdsMap: Record<string, { name: string; qty: number; revenue: number }> = {};
      if (saleIds.length > 0) {
        // Fetch sale_items in batches of 500 to bypass Supabase IN clause limit
        let allSaleItems: any[] = [];
        const batchSize = 500;
        for (let i = 0; i < saleIds.length; i += batchSize) {
          const batch = saleIds.slice(i, i + batchSize);
          const { data: batchItems } = await supabase
            .from("sale_items")
            .select("product_id, quantity, price_at_sale, inventory!fk_product(name, category)")
            .in("sale_id", batch);
          allSaleItems = allSaleItems.concat(batchItems || []);
        }
        const saleItems = allSaleItems;

        (saleItems || []).forEach((item: any) => {
          const name = item.inventory?.name || "Unknown";
          if (!topProdsMap[item.product_id]) topProdsMap[item.product_id] = { name, qty: 0, revenue: 0 };
          topProdsMap[item.product_id].qty += Number(item.quantity || 0);
          topProdsMap[item.product_id].revenue += Number(item.price_at_sale || 0) * Number(item.quantity || 0);
        });

        // ── Category breakdown ────────────────────────────────
        const categoryMap: Record<string, number> = {};
        (saleItems || []).forEach((item: any) => {
          const cat = item.inventory?.category || "General";
          categoryMap[cat] = (categoryMap[cat] || 0) + Number(item.price_at_sale || 0) * Number(item.quantity || 0);
        });
        setCategoryData(Object.entries(categoryMap).map(([name, value]) => ({ name, value: Math.round(value) })).sort((a, b) => b.value - a.value));
      }

      const sortedTop = Object.values(topProdsMap).sort((a, b) => b.qty - a.qty).slice(0, 8);
      setTopProducts(sortedTop);

      // ── Staff performance ─────────────────────────────────────
      const staffMap: Record<string, { name: string; sales: number; revenue: number }> = {};
      salesData.forEach((sale: any) => {
        const staffName = (sale.staff as any)?.name || "Unknown";
        const sid = sale.staff_id || "unknown";
        if (!staffMap[sid]) staffMap[sid] = { name: staffName, sales: 0, revenue: 0 };
        staffMap[sid].sales += 1;
        staffMap[sid].revenue += Number(sale.total_amount || 0);
      });
      setStaffData(Object.values(staffMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5));

      // ── Inventory ─────────────────────────────────────────────
      const { data: inventoryData } = await supabase
        .from("inventory")
        .select("id, name, stock, category, last_sold_at")
        .eq("store_id", activeStoreId)
        .eq("is_active", true);

      // Dead stock: not sold in 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const dead = (inventoryData || []).filter((i: any) => {
        if (!i.last_sold_at) return true;
        return new Date(i.last_sold_at) < thirtyDaysAgo;
      }).slice(0, 8);
      setDeadStockData(dead);

      // ── Totals ────────────────────────────────────────────────
      let revenue = 0, profit = 0, tax = 0, savings = 0;
      salesData.forEach((sale: any) => {
        revenue += Number(sale.total_amount || 0);
        savings += Number(sale.total_savings || 0);
        profit += Number(sale.total_profit || 0);
        tax += Number(sale.total_gst || 0);
      });

      setStats({
        totalRevenue: Number(revenue.toFixed(2)),
        totalSales: salesData.length,
        totalProfit: Number(profit.toFixed(2)),
        totalTax: Number(tax.toFixed(2)),
        totalSavings: Number(savings.toFixed(2)),
        lowStockCount: (inventoryData || []).filter((i: any) => Number(i.stock) < 10).length,
      });

      setProductData((inventoryData || []).slice(0, 8).map((i: any) => ({ name: i.name, stock: i.stock })));

      const dailyMap: Record<string, number> = {};
      salesData.forEach((sale: any) => {
        const day = new Date(sale.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
        dailyMap[day] = (dailyMap[day] || 0) + Number(sale.total_amount || 0);
      });
      setDailyData(Object.entries(dailyMap).map(([date, rev]) => ({ date, revenue: rev })).slice(-12));

    } catch (err) {
      console.error("[Analytics] error:", err);
    } finally {
      setLoading(false);
    }
  };

  // ─── Export: PDF ─────────────────────────────────────────────
  const exportPDF = () => {
    setExporting(true);
    try {
      const doc = new jsPDF();
      const filterLabel: Record<string, string> = {
        today: "Today", week: "Past 7 Days", month: "Past 30 Days", quarter: "Past 90 Days", all: "All Time"
      };
      const now = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

      // Header
      doc.setFillColor(2, 6, 23);
      doc.rect(0, 0, 210, 30, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18); doc.setFont("helvetica", "bold");
      doc.text("ScanMart Analytics Report", 14, 14);
      doc.setFontSize(9); doc.setFont("helvetica", "normal");
      doc.text(`Period: ${filterLabel[filter] || filter}   |   Generated: ${now}`, 14, 22);

      // KPI Summary
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(13); doc.setFont("helvetica", "bold");
      doc.text("Business Summary", 14, 42);
      autoTable(doc, {
        startY: 46,
        head: [["Metric", "Value"]],
        body: [
          ["Gross Revenue", `Rs. ${stats.totalRevenue.toLocaleString()}`],
          ["Total Orders", String(stats.totalSales)],
          ["Avg Order Value", `Rs. ${avgOrderValue}`],
          ["Customer Savings", `Rs. ${stats.totalSavings.toLocaleString()}`],
          ["Net Profit", hasProfit ? `Rs. ${stats.totalProfit.toLocaleString()} (${profitMargin}%)` : "SQL setup required"],
          ["GST Collected", hasProfit ? `Rs. ${stats.totalTax.toLocaleString()}` : "SQL setup required"],
          ["Low Stock Items", String(stats.lowStockCount)],
        ],
        styles: { fontSize: 10 },
        headStyles: { fillColor: [59, 130, 246] },
        alternateRowStyles: { fillColor: [240, 245, 255] },
      });

      // Top Products
      if (topProducts.length > 0) {
        const y = (doc as any).lastAutoTable.finalY + 12;
        doc.setFontSize(13); doc.setFont("helvetica", "bold");
        doc.text("Top Selling Products", 14, y);
        autoTable(doc, {
          startY: y + 4,
          head: [["#", "Product", "Units Sold", "Revenue"]],
          body: topProducts.map((p, i) => [
            String(i + 1), p.name, String(p.qty), `Rs. ${p.revenue.toLocaleString()}`
          ]),
          styles: { fontSize: 9 },
          headStyles: { fillColor: [16, 185, 129] },
        });
      }

      // Staff
      if (staffData.length > 0) {
        const y2 = (doc as any).lastAutoTable.finalY + 12;
        doc.setFontSize(13); doc.setFont("helvetica", "bold");
        doc.text("Staff Performance", 14, y2);
        autoTable(doc, {
          startY: y2 + 4,
          head: [["#", "Staff Name", "Bills", "Revenue Generated"]],
          body: staffData.map((s, i) => [
            String(i + 1), s.name, String(s.sales), `Rs. ${s.revenue.toLocaleString()}`
          ]),
          styles: { fontSize: 9 },
          headStyles: { fillColor: [139, 92, 246] },
        });
      }

      // Daily trend
      if (dailyData.length > 0) {
        const y3 = (doc as any).lastAutoTable.finalY + 12;
        doc.addPage();
        doc.setFontSize(13); doc.setFont("helvetica", "bold");
        doc.text("Daily Revenue Trend", 14, 20);
        autoTable(doc, {
          startY: 24,
          head: [["Date", "Revenue (Rs.)"]],
          body: dailyData.map(d => [d.date, d.revenue.toFixed(2)]),
          styles: { fontSize: 9 },
          headStyles: { fillColor: [245, 158, 11] },
        });
      }

      doc.save(`ScanMart_Analytics_${filter}_${now.replace(/ /g, "_")}.pdf`);
    } catch (e) { console.error("PDF export error", e); }
    setExporting(false);
  };

  // ─── Export: CSV ─────────────────────────────────────────────
  const exportCSV = () => {
    const rows = [
      ["Date", "Revenue (Rs.)"],
      ...dailyData.map(d => [d.date, d.revenue.toFixed(2)]),
      ["", ""],
      ["Metric", "Value"],
      ["Gross Revenue", stats.totalRevenue.toFixed(2)],
      ["Total Orders", stats.totalSales],
      ["Avg Order Value", avgOrderValue],
      ["Customer Savings", stats.totalSavings.toFixed(2)],
      ["Net Profit", hasProfit ? stats.totalProfit.toFixed(2) : "N/A"],
      ["GST Collected", hasProfit ? stats.totalTax.toFixed(2) : "N/A"],
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `ScanMart_Analytics_${filter}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const profitMargin = stats.totalRevenue > 0
    ? ((stats.totalProfit / stats.totalRevenue) * 100).toFixed(1) : "0.0";
  const avgOrderValue = stats.totalSales > 0
    ? (stats.totalRevenue / stats.totalSales).toFixed(0) : "0";

  if (!isMounted) return null;

  const TABS = [
    { id: "overview", label: t('dashboard'), icon: <TrendingUp size={14} /> },
    { id: "products", label: t('inventory'), icon: <Package size={14} /> },
    { id: "staff", label: "Staff", icon: <Users size={14} /> },
    { id: "gst", label: "GST", icon: <FileText size={14} /> },
  ] as const;

  return (
    <div className="p-6 bg-[#020617] min-h-screen text-white font-sans">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <TrendingUp className="text-blue-500" size={30} /> {t('analytics')}
          </h1>
          <p className="text-slate-500 text-xs font-bold mt-1 uppercase tracking-widest">Business Intelligence Dashboard</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Date Filter */}
          <div className="flex items-center gap-2 bg-slate-900/80 p-2 px-4 rounded-2xl border border-slate-800">
            <Calendar size={16} className="text-blue-500" />
            <select value={filter} onChange={e => setFilter(e.target.value)}
              className="bg-transparent outline-none text-sm font-bold cursor-pointer text-slate-300">
              <option value="today">{t('today')}</option>
              <option value="week">{t('this_week')}</option>
              <option value="month">{t('this_month')}</option>
              <option value="quarter">90 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>

          {/* Export Dropdown */}
          <div className="relative group">
            <button
              disabled={exporting || loading}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all">
              <Download size={14} /> {exporting ? "Exporting..." : "Download"}
            </button>
            <div className="absolute right-0 top-full mt-2 w-44 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <button onClick={exportPDF}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold hover:bg-slate-800 text-red-400 transition-colors">
                <FileText size={14} /> Download PDF
              </button>
              <button onClick={exportCSV}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold hover:bg-slate-800 text-green-400 transition-colors">
                <Download size={14} /> Download CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-8 bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800 w-fit">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? "bg-blue-600 text-white shadow-lg shadow-blue-900/50" : "text-slate-500 hover:text-white"
              }`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* SQL Warning */}
      {!hasProfit && !loading && (
        <div className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-400 font-bold text-sm">Net Profit & GST requires one-time Supabase setup</p>
            <code className="text-[11px] text-amber-300 bg-slate-900 px-3 py-1.5 rounded-lg block mt-2 font-mono">
              ALTER TABLE sales ADD COLUMN IF NOT EXISTS total_profit FLOAT DEFAULT 0;<br />
              ALTER TABLE sales ADD COLUMN IF NOT EXISTS total_gst FLOAT DEFAULT 0;
            </code>
          </div>
        </div>
      )}

      {loading ? (
        /* ── Skeleton Loader ── */
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-slate-900 rounded-[2rem] h-32 animate-pulse border border-slate-800" />
          ))}
        </div>
      ) : (
        <>
          {/* ═══════════════ OVERVIEW TAB ═══════════════ */}
          {activeTab === "overview" && (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard title={t('revenue')} val={`₹${stats.totalRevenue.toLocaleString()}`} sub={`${stats.totalSales} orders`} color="text-blue-400" icon={<IndianRupee size={18} />} bg="bg-blue-500/10" />
                <StatCard title={t('profit')} val={hasProfit ? `₹${stats.totalProfit.toLocaleString()}` : "—"} sub={hasProfit ? `${profitMargin}% margin` : "SQL needed"} color="text-green-400" icon={<Percent size={18} />} bg="bg-green-500/10" dimmed={!hasProfit} />
                <StatCard title="Avg Order" val={`₹${avgOrderValue}`} sub="per transaction" color="text-purple-400" icon={<ShoppingBag size={18} />} bg="bg-purple-500/10" />
                <StatCard title="GST" val={hasProfit ? `₹${stats.totalTax.toLocaleString()}` : "—"} sub={hasProfit ? "tax payable" : "SQL needed"} color="text-amber-400" icon={<Wallet size={18} />} bg="bg-amber-500/10" dimmed={!hasProfit} />
              </div>

              {/* Row 2: Stats */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-[2rem] text-center">
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">{t('sales')}</p>
                  <p className="text-4xl font-black text-blue-500">{stats.totalSales}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-[2rem] text-center">
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">{t('savings')}</p>
                  <p className="text-4xl font-black text-purple-400">₹{stats.totalSavings.toLocaleString()}</p>
                </div>
                <div className="bg-slate-900 border border-red-900/30 p-5 rounded-[2rem] text-center">
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">{t('low_stock')}</p>
                  <p className="text-4xl font-black text-red-500">{stats.lowStockCount}</p>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800">
                  <h2 className="text-base font-black mb-5 flex items-center gap-2"><TrendingUp size={16} className="text-green-500" /> Daily Revenue Trend</h2>
                  {dailyData.length === 0 ? (
                    <div className="h-[260px] flex items-center justify-center text-slate-600 text-sm font-bold">No sales data yet</div>
                  ) : (
                    <div className="h-[260px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dailyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                          <XAxis dataKey="date" stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} />
                          <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `₹${v}`} />
                          <Tooltip cursor={{ fill: "#1e293b" }} contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "16px" }} formatter={(v: any) => [`₹${Number(v).toFixed(0)}`, "Revenue"]} />
                          <Bar dataKey="revenue" fill="#10b981" radius={[6, 6, 0, 0]} barSize={28} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                <div className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800">
                  <h2 className="text-base font-black mb-5 flex items-center gap-2"><Tag size={16} className="text-blue-500" /> Revenue by Category</h2>
                  {categoryData.length === 0 ? (
                    <div className="h-[260px] flex items-center justify-center text-slate-600 text-sm font-bold">No category data</div>
                  ) : (
                    <div className="h-[260px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(entry: any) => `${entry.name ?? ''} ${((entry.percent ?? 0) * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                            {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(v: any) => [`₹${Number(v).toLocaleString()}`, "Revenue"]} contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "16px" }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ═══════════════ PRODUCTS TAB ═══════════════ */}
          {activeTab === "products" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Selling Products */}
              <div className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800">
                <h2 className="text-base font-black mb-5 flex items-center gap-2"><Trophy size={16} className="text-yellow-400" /> Top Selling Products</h2>
                {topProducts.length === 0 ? (
                  <div className="py-16 text-center text-slate-600 font-bold">No sales data in this period</div>
                ) : (
                  <div className="space-y-3">
                    {topProducts.map((p, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-2xl">
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${i === 0 ? "bg-yellow-500 text-black" : i === 1 ? "bg-slate-400 text-black" : i === 2 ? "bg-amber-700 text-white" : "bg-slate-700 text-slate-300"}`}>#{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white truncate">{p.name}</p>
                          <p className="text-xs text-slate-500">{p.qty} units sold</p>
                        </div>
                        <span className="text-sm font-black text-green-400">₹{p.revenue.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Dead Stock Alert */}
              <div className="bg-slate-900 p-6 rounded-[2rem] border border-red-900/20">
                <h2 className="text-base font-black mb-5 flex items-center gap-2 text-red-400"><Clock size={16} /> Dead Stock (30+ days)</h2>
                {deadStockData.length === 0 ? (
                  <div className="py-16 text-center text-green-500 font-bold">🎉 No dead stock!</div>
                ) : (
                  <div className="space-y-3">
                    {deadStockData.map((item: any, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-red-950/20 border border-red-900/20 rounded-2xl">
                        <div>
                          <p className="text-sm font-bold text-white">{item.name}</p>
                          <p className="text-xs text-red-400">
                            {item.last_sold_at ? `Last sold: ${new Date(item.last_sold_at).toLocaleDateString("en-IN")}` : "Never sold"}
                          </p>
                        </div>
                        <span className="text-amber-400 font-black text-sm">{item.stock} units</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Stock Levels Chart */}
              <div className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 lg:col-span-2">
                <h2 className="text-base font-black mb-5 flex items-center gap-2"><Package size={16} className="text-blue-500" /> Current Stock Levels</h2>
                {productData.length === 0 ? (
                  <div className="h-52 flex items-center justify-center text-slate-600 font-bold">No inventory data</div>
                ) : (
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={productData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip cursor={{ fill: "#1e293b" }} contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "16px" }} />
                        <Bar dataKey="stock" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={32} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══════════════ STAFF TAB ═══════════════ */}
          {activeTab === "staff" && (
            <div className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 max-w-2xl">
              <h2 className="text-base font-black mb-6 flex items-center gap-2"><Trophy size={16} className="text-yellow-400" /> Staff Performance Leaderboard</h2>
              {staffData.length === 0 ? (
                <div className="py-16 text-center text-slate-600 font-bold">No staff sales data</div>
              ) : (
                <div className="space-y-4">
                  {staffData.map((s, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-2xl">
                      <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black ${i === 0 ? "bg-yellow-500 text-black" : i === 1 ? "bg-slate-400 text-black" : "bg-slate-700 text-slate-300"}`}>#{i + 1}</span>
                      <div className="flex-1">
                        <p className="font-bold text-white">{s.name}</p>
                        <p className="text-xs text-slate-500">{s.sales} bills generated</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-green-400 text-lg">₹{s.revenue.toLocaleString()}</p>
                        <p className="text-xs text-slate-500">total revenue</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══════════════ GST TAB ═══════════════ */}
          {activeTab === "gst" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
              <div className="bg-slate-900 p-6 rounded-[2rem] border border-amber-900/20 space-y-4">
                <h2 className="text-base font-black flex items-center gap-2 text-amber-400"><Wallet size={16} /> GST Summary</h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-4 bg-slate-800/50 rounded-2xl">
                    <div>
                      <p className="text-xs text-slate-500 uppercase font-bold">Output GST (Collected)</p>
                      <p className="text-sm text-slate-400">From customer sales</p>
                    </div>
                    <p className={`text-xl font-black ${hasProfit ? "text-amber-400" : "text-slate-600"}`}>
                      {hasProfit ? `₹${stats.totalTax.toLocaleString()}` : "—"}
                    </p>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-slate-800/50 rounded-2xl">
                    <div>
                      <p className="text-xs text-slate-500 uppercase font-bold">Total Sales</p>
                      <p className="text-sm text-slate-400">Billing count</p>
                    </div>
                    <p className="text-xl font-black text-blue-400">{stats.totalSales}</p>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-slate-800/50 rounded-2xl">
                    <div>
                      <p className="text-xs text-slate-500 uppercase font-bold">Gross Revenue</p>
                      <p className="text-sm text-slate-400">Before expenses</p>
                    </div>
                    <p className="text-xl font-black text-green-400">₹{stats.totalRevenue.toLocaleString()}</p>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-blue-900/20 border border-blue-800/30 rounded-2xl">
                    <div>
                      <p className="text-xs text-blue-400 uppercase font-bold">Net Profit</p>
                      <p className="text-sm text-slate-400">{profitMargin}% margin</p>
                    </div>
                    <p className={`text-xl font-black ${hasProfit ? "text-blue-400" : "text-slate-600"}`}>
                      {hasProfit ? `₹${stats.totalProfit.toLocaleString()}` : "—"}
                    </p>
                  </div>
                </div>
                {!hasProfit && (
                  <p className="text-xs text-amber-400 bg-amber-900/10 p-3 rounded-xl border border-amber-900/20">
                    ⚠️ Run SQL setup to enable GST tracking
                  </p>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ title, val, sub, color, icon, bg, dimmed }: any) {
  return (
    <div className={`p-5 rounded-[2rem] border transition-all ${dimmed ? "border-amber-900/20 opacity-60 bg-slate-900" : "border-slate-800 bg-slate-900 hover:border-slate-700"}`}>
      <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-4 ${color}`}>{icon}</div>
      <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">{title}</p>
      <p className={`text-2xl font-black ${color}`}>{val}</p>
      <p className="text-slate-600 text-xs mt-1 font-bold">{sub}</p>
    </div>
  );
}