"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
    FileText, Calendar, IndianRupee, ShoppingBag,
    Wallet, CreditCard, TrendingUp, Package,
    Loader2, Download, Printer, CheckCircle, Users, RotateCcw
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ZReportData {
    date: string;
    storeName: string;
    totalSales: number;
    totalOrders: number;
    cashSales: number;
    upiSales: number;
    cardSales: number;
    totalProfit: number;
    totalGST: number;
    totalDiscount: number;
    topItems: { name: string; qty: number; revenue: number }[];
    staffSummary: { name: string; orders: number; revenue: number }[];
    openingTime: string;
    closingTime: string;
    totalCustomers: number;
}

export default function ZReportPage() {
    const [reportDate, setReportDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState<ZReportData | null>(null);
    const [activeStoreId, setActiveStoreId] = useState<string | null>(null);
    const [storeName, setStoreName] = useState("Your Store");

    useEffect(() => {
        const storedId = typeof window !== "undefined" ? localStorage.getItem("active_store_id") : null;
        if (storedId) {
            setActiveStoreId(storedId);
            fetchStoreName(storedId);
        } else {
            supabase.from("stores").select("id, name").limit(1).then(({ data }) => {
                if (data?.[0]) { setActiveStoreId(data[0].id); setStoreName(data[0].name || "Your Store"); }
            });
        }
    }, []);

    const fetchStoreName = async (storeId: string) => {
        const { data } = await supabase.from("stores").select("name").eq("id", storeId).single();
        if (data?.name) setStoreName(data.name);
    };

    const generateReport = async () => {
        if (!activeStoreId) return;
        setLoading(true);

        try {
            const dayStart = new Date(reportDate);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(reportDate);
            dayEnd.setHours(23, 59, 59, 999);

            // ── Fetch all sales for the day ──
            const { data: sales } = await supabase
                .from("sales")
                .select("id, total_amount, payment_method, total_profit, total_gst, total_savings, created_at, staff_id, staff:staff(name), customer_id")
                .eq("store_id", activeStoreId)
                .gte("created_at", dayStart.toISOString())
                .lte("created_at", dayEnd.toISOString())
                .order("created_at", { ascending: true });

            if (!sales || sales.length === 0) {
                setReport({
                    date: reportDate,
                    storeName,
                    totalSales: 0, totalOrders: 0, cashSales: 0,
                    upiSales: 0, cardSales: 0, totalProfit: 0,
                    totalGST: 0, totalDiscount: 0, topItems: [],
                    staffSummary: [], openingTime: "—", closingTime: "—",
                    totalCustomers: 0,
                });
                setLoading(false);
                return;
            }

            // ── Fetch sale_items for top products ──
            const saleIds = sales.map((s: any) => s.id);
            const { data: saleItems } = await supabase
                .from("sale_items")
                .select("quantity, price_at_sale, product_id, inventory!fk_product(name)")
                .in("sale_id", saleIds);

            // Aggregate top items
            const itemMap: Record<string, { name: string; qty: number; revenue: number }> = {};
            (saleItems || []).forEach((item: any) => {
                const name = item.inventory?.name || "Unknown";
                if (!itemMap[item.product_id]) itemMap[item.product_id] = { name, qty: 0, revenue: 0 };
                itemMap[item.product_id].qty += item.quantity;
                itemMap[item.product_id].revenue += item.quantity * item.price_at_sale;
            });
            const topItems = Object.values(itemMap)
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 5);

            // Aggregate staff
            const staffMap: Record<string, { name: string; orders: number; revenue: number }> = {};
            sales.forEach((s: any) => {
                const sName = (s.staff as any)?.name || "Unknown";
                const sid = s.staff_id || "unknown";
                if (!staffMap[sid]) staffMap[sid] = { name: sName, orders: 0, revenue: 0 };
                staffMap[sid].orders += 1;
                staffMap[sid].revenue += Number(s.total_amount || 0);
            });

            // Unique customers
            const uniqueCustomers = new Set(sales.filter((s: any) => s.customer_id).map((s: any) => s.customer_id)).size;

            const totalSales = sales.reduce((sum: number, s: any) => sum + Number(s.total_amount || 0), 0);
            const cashSales = sales.filter((s: any) => s.payment_method === "cash").reduce((sum: number, s: any) => sum + Number(s.total_amount || 0), 0);
            const upiSales = sales.filter((s: any) => s.payment_method === "upi").reduce((sum: number, s: any) => sum + Number(s.total_amount || 0), 0);
            const cardSales = sales.filter((s: any) => s.payment_method === "card").reduce((sum: number, s: any) => sum + Number(s.total_amount || 0), 0);
            const totalProfit = sales.reduce((sum: number, s: any) => sum + Number(s.total_profit || 0), 0);
            const totalGST = sales.reduce((sum: number, s: any) => sum + Number(s.total_gst || 0), 0);
            const totalDiscount = sales.reduce((sum: number, s: any) => sum + Number(s.total_savings || 0), 0);

            setReport({
                date: reportDate,
                storeName,
                totalSales, totalOrders: sales.length,
                cashSales, upiSales, cardSales,
                totalProfit, totalGST, totalDiscount,
                topItems,
                staffSummary: Object.values(staffMap).sort((a, b) => b.revenue - a.revenue),
                openingTime: new Date(sales[0].created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
                closingTime: new Date(sales[sales.length - 1].created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
                totalCustomers: uniqueCustomers,
            });
        } catch (err: any) {
            console.error("Z-Report error:", err.message);
        }
        setLoading(false);
    };

    // ── PDF Export ──
    const downloadPDF = () => {
        if (!report) return;
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text(`Z-REPORT — ${report.storeName}`, 14, 20);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Date: ${new Date(report.date).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}`, 14, 28);
        doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, 14, 34);

        autoTable(doc, {
            startY: 42,
            head: [["Metric", "Value"]],
            body: [
                ["Total Orders", report.totalOrders.toString()],
                ["Total Revenue", `₹${report.totalSales.toFixed(2)}`],
                ["Cash Sales", `₹${report.cashSales.toFixed(2)}`],
                ["UPI Sales", `₹${report.upiSales.toFixed(2)}`],
                ["Card Sales", `₹${report.cardSales.toFixed(2)}`],
                ["Net Profit", `₹${report.totalProfit.toFixed(2)}`],
                ["Total GST Collected", `₹${report.totalGST.toFixed(2)}`],
                ["Total Discounts Given", `₹${report.totalDiscount.toFixed(2)}`],
                ["Unique Customers", report.totalCustomers.toString()],
                ["First Sale", report.openingTime],
                ["Last Sale", report.closingTime],
            ],
            theme: "grid",
            headStyles: { fillColor: [37, 99, 235] },
        });

        if (report.topItems.length > 0) {
            autoTable(doc, {
                startY: (doc as any).lastAutoTable.finalY + 10,
                head: [["Top Products", "Qty Sold", "Revenue"]],
                body: report.topItems.map(i => [i.name, i.qty.toString(), `₹${i.revenue.toFixed(2)}`]),
                theme: "striped",
                headStyles: { fillColor: [16, 185, 129] },
            });
        }

        if (report.staffSummary.length > 0) {
            autoTable(doc, {
                startY: (doc as any).lastAutoTable.finalY + 10,
                head: [["Staff Name", "Bills", "Revenue"]],
                body: report.staffSummary.map(s => [s.name, s.orders.toString(), `₹${s.revenue.toFixed(2)}`]),
                theme: "striped",
                headStyles: { fillColor: [139, 92, 246] },
            });
        }

        doc.save(`Z-Report-${report.date}.pdf`);
    };

    // ═══════════════ RENDER ═══════════════
    return (
        <div className="p-4 md:p-8 min-h-screen bg-[#020617] text-white font-sans pb-20">

            {/* Header */}
            <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-black uppercase italic flex items-center gap-3">
                        <FileText className="text-violet-500" size={28} />
                        Day-End <span className="text-violet-500">Z-Report</span>
                    </h1>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">
                        Daily closing summary — sales, cash, staff performance
                    </p>
                </div>
                {report && report.totalOrders > 0 && (
                    <button
                        onClick={downloadPDF}
                        className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95"
                    >
                        <Download size={16} /> Download PDF
                    </button>
                )}
            </div>

            {/* Date Picker + Generate */}
            <div className="flex gap-3 items-center mb-8 flex-wrap">
                <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="date"
                        value={reportDate}
                        max={new Date().toISOString().split("T")[0]}
                        onChange={(e) => { setReportDate(e.target.value); setReport(null); }}
                        className="bg-slate-900 border border-slate-700 rounded-2xl p-3 pl-11 outline-none focus:border-violet-500 text-white font-bold text-sm transition-all"
                    />
                </div>
                <button
                    onClick={generateReport}
                    disabled={loading}
                    className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 px-8 py-3 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2"
                >
                    {loading ? <Loader2 className="animate-spin" size={16} /> : <TrendingUp size={16} />}
                    {loading ? "Generating..." : "Generate Report"}
                </button>

                {/* Quick date shortcuts */}
                <div className="flex gap-2 flex-wrap">
                    {["Today", "Yesterday"].map((label) => {
                        const d = new Date();
                        if (label === "Yesterday") d.setDate(d.getDate() - 1);
                        const val = d.toISOString().split("T")[0];
                        return (
                            <button key={label} onClick={() => { setReportDate(val); setReport(null); }}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${reportDate === val ? "bg-violet-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"}`}>
                                {label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Empty / loading state */}
            {!report && !loading && (
                <div className="flex flex-col items-center justify-center py-24 gap-5">
                    <div className="w-24 h-24 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
                        <FileText size={40} className="text-slate-700" />
                    </div>
                    <div className="text-center">
                        <p className="text-white font-black text-lg uppercase tracking-widest mb-2">No Report Generated</p>
                        <p className="text-slate-600 text-sm font-bold">Select a date and click "Generate Report"</p>
                    </div>
                </div>
            )}

            {/* Report */}
            {report && (
                <div className="space-y-6 animate-in fade-in duration-500">

                    {/* Store + Date header */}
                    <div className="bg-violet-600/10 border border-violet-500/30 rounded-2xl p-5 flex items-center justify-between">
                        <div>
                            <p className="text-violet-400 font-black text-lg">{report.storeName}</p>
                            <p className="text-slate-400 text-sm font-bold">
                                {new Date(report.date).toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
                            </p>
                            <p className="text-slate-600 text-xs mt-1">
                                First sale: {report.openingTime} · Last sale: {report.closingTime}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-slate-500 text-[10px] uppercase font-bold">Z-Report</p>
                            <p className="text-slate-600 text-xs">Generated {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</p>
                        </div>
                    </div>

                    {report.totalOrders === 0 ? (
                        <div className="py-16 flex flex-col items-center gap-4">
                            <div className="w-20 h-20 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
                                <ShoppingBag size={32} className="text-slate-700" />
                            </div>
                            <p className="text-white font-black text-base uppercase tracking-widest">No Sales on This Day</p>
                            <p className="text-slate-600 text-sm">Try selecting a different date.</p>
                        </div>
                    ) : (
                        <>
                            {/* Key Metrics Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { label: "Total Revenue", value: `₹${report.totalSales.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, icon: <IndianRupee size={20} />, color: "bg-blue-600", glow: "blue" },
                                    { label: "Total Orders", value: report.totalOrders.toString(), icon: <ShoppingBag size={20} />, color: "bg-purple-600", glow: "purple" },
                                    { label: "Net Profit", value: `₹${report.totalProfit > 0 ? report.totalProfit.toFixed(2) : "—"}`, icon: <TrendingUp size={20} />, color: "bg-emerald-600", glow: "emerald" },
                                    { label: "Customers Served", value: report.totalCustomers > 0 ? report.totalCustomers.toString() : `${report.totalOrders}`, icon: <Users size={20} />, color: "bg-orange-600", glow: "orange" },
                                ].map((card) => (
                                    <div key={card.label} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl hover:border-slate-700 transition-all">
                                        <div className={`w-10 h-10 ${card.color} rounded-xl flex items-center justify-center mb-3`}>{card.icon}</div>
                                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">{card.label}</p>
                                        <p className="text-white text-xl font-black">{card.value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Payment Breakdown */}
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                                <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                                    <Wallet size={16} className="text-green-500" /> Payment Breakdown
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {[
                                        { label: "Cash", value: report.cashSales, icon: <Wallet size={18} />, color: "text-green-400", bg: "bg-green-500/10 border-green-500/30" },
                                        { label: "UPI", value: report.upiSales, icon: <CreditCard size={18} />, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30" },
                                        { label: "Card", value: report.cardSales, icon: <CreditCard size={18} />, color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/30" },
                                    ].map((p) => (
                                        <div key={p.label} className={`border ${p.bg} rounded-xl p-4 flex items-center gap-3`}>
                                            <span className={p.color}>{p.icon}</span>
                                            <div>
                                                <p className="text-slate-500 text-[10px] font-black uppercase">{p.label}</p>
                                                <p className={`font-black text-lg ${p.color}`}>₹{p.value.toFixed(2)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 flex gap-6 pt-4 border-t border-slate-800">
                                    <div>
                                        <p className="text-slate-600 text-[10px] uppercase font-bold">GST Collected</p>
                                        <p className="text-yellow-400 font-black">₹{report.totalGST > 0 ? report.totalGST.toFixed(2) : "—"}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-600 text-[10px] uppercase font-bold">Discounts Given</p>
                                        <p className="text-red-400 font-black">₹{report.totalDiscount.toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Top Products + Staff Side by Side */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                {/* Top Products */}
                                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                                        <Package size={16} className="text-blue-500" /> Top Products Today
                                    </h3>
                                    {report.topItems.length === 0 ? (
                                        <p className="text-slate-600 text-sm text-center py-6">No item data available.</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {report.topItems.map((item, i) => (
                                                <div key={i} className="flex items-center gap-3">
                                                    <span className="text-[10px] font-black text-slate-600 w-5">#{i + 1}</span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-white font-bold text-sm truncate">{item.name}</p>
                                                        <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1">
                                                            <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (item.revenue / report.topItems[0].revenue) * 100)}%` }} />
                                                        </div>
                                                    </div>
                                                    <div className="text-right flex-shrink-0">
                                                        <p className="text-white font-black text-sm">₹{item.revenue.toFixed(0)}</p>
                                                        <p className="text-slate-600 text-[10px]">×{item.qty}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Staff Performance */}
                                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                                        <Users size={16} className="text-purple-500" /> Staff Performance
                                    </h3>
                                    {report.staffSummary.length === 0 ? (
                                        <p className="text-slate-600 text-sm text-center py-6">No staff data available.</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {report.staffSummary.map((s, i) => (
                                                <div key={i} className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-xl">
                                                    <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                                        <span className="text-purple-400 font-black text-xs">{s.name.charAt(0).toUpperCase()}</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-white font-bold text-sm truncate">{s.name}</p>
                                                        <p className="text-slate-500 text-[10px]">{s.orders} bills</p>
                                                    </div>
                                                    <p className="text-white font-black text-sm">₹{s.revenue.toFixed(0)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex items-center gap-2 text-slate-600 text-xs font-bold bg-slate-900/50 border border-slate-800 rounded-xl p-3">
                                <CheckCircle size={14} className="text-green-500" />
                                Report complete. Download PDF for records.
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
