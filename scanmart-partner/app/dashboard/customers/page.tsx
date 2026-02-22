"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Users, Search, X, History, Calendar, Crown,
  Loader2, Phone, Megaphone, Gift, Share2, ArrowUpRight,
  ShoppingBag, Download, TrendingUp, TrendingDown, FileText, FileSpreadsheet
} from "lucide-react";
import Paginator from "@/components/Paginator";

const CUST_PAGE_SIZE = 12;

// 📝 Marketing Templates
const OFFER_TEMPLATES = [
  { id: 1, title: "🎉 Festive Sale", text: "Namaste {name}! ScanMart par dhamakedaar sale shuru ho gayi hai. Aaj hi aayein aur best deals payein!" },
  { id: 2, title: "📉 Clearance Offer", text: "Hello {name}, Stock clearance sale! Flat 20% off on selected items. Jaldi aaiye, stock limited hai." },
  { id: 3, title: "❤️ We Miss You", text: "Namaste {name}, Bohot din se aap dikhe nahi! Aapke liye ek special gift wait kar raha hai store pe." },
];

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // 🔥 Active Store State (For Data Isolation)
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null);

  // 📊 Filters & Sorting
  const [showVIPOnly, setShowVIPOnly] = useState(false);
  const [vipCount, setVipCount] = useState(10);
  const [stats, setStats] = useState({ total: 0, newThisWeek: 0, growth: 0 });

  // 📥 Export State
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [exportType, setExportType] = useState<'csv' | 'pdf'>('csv');

  // 📜 History Modal
  const [selectedHistory, setSelectedHistory] = useState<any[] | null>(null);
  const [fetchingHistory, setFetchingHistory] = useState(false);

  // 📢 Marketing Modal
  const [marketingModalOpen, setMarketingModalOpen] = useState(false);
  const [selectedForPromo, setSelectedForPromo] = useState<any[]>([]);
  // 🔥 BUG FIX 7: Track which template is selected
  const [selectedTemplate, setSelectedTemplate] = useState(OFFER_TEMPLATES[0]);
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // --- 🔄 INITIALIZATION ---
  useEffect(() => {
    // 1. Check LocalStorage for Active Store
    const storedId = typeof window !== 'undefined' ? localStorage.getItem("active_store_id") : null;
    if (storedId) {
      setActiveStoreId(storedId);
    } else {
      fetchStoresFirst();
    }
  }, []);

  // Reload data whenever activeStoreId changes
  useEffect(() => {
    if (activeStoreId) {
      fetchCustomers();
    }
  }, [activeStoreId]);

  // Reset page on search or VIP filter change
  useEffect(() => { setCurrentPage(1); }, [searchTerm, showVIPOnly, vipCount]);

  const fetchStoresFirst = async () => {
    const { data } = await supabase.from("stores").select("id").limit(1);
    if (data && data.length > 0) {
      setActiveStoreId(data[0].id);
    }
  };

  // --- 📡 FETCH CUSTOMERS (Filtered by Store) ---
  const fetchCustomers = async () => {
    if (!activeStoreId) return;
    setLoading(true);

    // 🔥 FIX: Filter by store_id so stores don't see each other's customers
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("store_id", activeStoreId)
      .order("total_spent", { ascending: false });

    if (error) {
      console.error("Error fetching customers:", error);
    } else {
      setCustomers(data || []);
      calculateGrowth(data || []);
    }
    setLoading(false);
  };

  const calculateGrowth = (data: any[]) => {
    const now = new Date();
    const lastWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    const twoWeeksAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14);

    const newThisWeek = data.filter(c => new Date(c.created_at) > lastWeek).length;
    const newLastWeek = data.filter(c => new Date(c.created_at) > twoWeeksAgo && new Date(c.created_at) <= lastWeek).length;

    let growth = 0;
    if (newLastWeek > 0) {
      growth = ((newThisWeek - newLastWeek) / newLastWeek) * 100;
    } else if (newThisWeek > 0) {
      growth = 100;
    }
    setStats({ total: data.length, newThisWeek, growth });
  };

  // --- 📜 PURCHASE HISTORY (FIXED) ---
  const viewHistory = async (customer: any) => {
    setFetchingHistory(true);
    setSelectedHistory([]);
    console.log("Fetching history for:", customer.name);

    // 🔥 BUG FIX: Corrected the query relation to ensure items show up
    const { data, error } = await supabase
      .from("sales")
      .select(`
        id, created_at, total_amount, payment_method, 
        sale_items (
            quantity, 
            price_at_sale,
            inventory!fk_product ( name ) 
        )
      `)
      .eq("customer_id", customer.id)
      .eq("store_id", activeStoreId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("🔴 History Error:", JSON.stringify(error, null, 2));
      alert("History load failed. Check console for details.");
    } else {
      console.log("✅ History Loaded:", data);
      setSelectedHistory(data || []);
    }
    setFetchingHistory(false);
  };

  // --- 📥 EXPORT LOGIC (CSV + PDF) ---
  const handleExport = (rangeType: '1day' | '1week' | '1month' | 'custom') => {
    const now = new Date();
    let startDate = new Date();

    if (rangeType === '1day') startDate.setDate(now.getDate() - 1);
    if (rangeType === '1week') startDate.setDate(now.getDate() - 7);
    if (rangeType === '1month') startDate.setMonth(now.getMonth() - 1);
    if (rangeType === 'custom') {
      if (!dateRange.start || !dateRange.end) return alert("Select dates first");
      startDate = new Date(dateRange.start);
      now.setTime(new Date(dateRange.end).getTime());
    }

    const exportData = customers.filter(c => new Date(c.created_at) >= startDate && new Date(c.created_at) <= now);

    if (exportData.length === 0) return alert("No data found for selected range");

    if (exportType === 'csv') {
      // 🟢 Generate CSV
      const csvContent = "data:text/csv;charset=utf-8,"
        + "Name,Phone,Total Spent,Joined Date\n"
        + exportData.map(c => `${c.name},${c.phone},${c.total_spent},${new Date(c.created_at).toLocaleDateString()}`).join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `ScanMart_Customers_${rangeType}.csv`);
      document.body.appendChild(link);
      link.click();
    } else {
      // 🔴 Generate PDF
      const doc = new jsPDF();

      // Add Title
      doc.setFontSize(18);
      doc.text("ScanMart Customer Report", 14, 22);

      doc.setFontSize(11);
      doc.text(`Store ID: ${activeStoreId?.slice(0, 8)}`, 14, 30);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 36);
      doc.text(`Range: ${rangeType.toUpperCase()}`, 14, 42);

      // Generate Table
      const tableBody = exportData.map(c => [
        c.name,
        c.phone || "N/A",
        `Rs. ${Number(c.total_spent).toFixed(2)}`,
        new Date(c.created_at).toLocaleDateString()
      ]);

      autoTable(doc, {
        head: [['Name', 'Phone', 'Total Spent', 'Joined Date']],
        body: tableBody,
        startY: 50,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] }, // Blue Header
      });

      doc.save(`ScanMart_Customers_${rangeType}.pdf`);
    }

    setExportModalOpen(false);
  };

  // --- 🚀 MARKETING LOGIC ---
  const openMarketingModal = (initialCustomer: any = null) => {
    if (initialCustomer) {
      setSelectedForPromo([initialCustomer]);
    } else {
      setSelectedForPromo(filteredCustomers);
    }
    setMarketingModalOpen(true);
  };

  const sendWhatsApp = (phone: string, text: string) => {
    const url = `https://wa.me/91${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  let filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone?.includes(searchTerm)
  );

  if (showVIPOnly) {
    filteredCustomers = filteredCustomers.slice(0, vipCount);
  }

  // Paginate
  const pagedCustomers = filteredCustomers.slice(
    (currentPage - 1) * CUST_PAGE_SIZE,
    currentPage * CUST_PAGE_SIZE
  );

  const formatCurrency = (amount: any) => Number(amount || 0).toFixed(2);

  return (
    <div className="p-4 md:p-8 space-y-6 min-h-screen bg-[#020617] text-white font-sans pb-32">

      {/* 📊 HEADER */}
      <div className="flex flex-col gap-6 sticky top-0 z-30 bg-[#020617]/95 backdrop-blur-md py-4 border-b border-slate-800/50">

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-3 uppercase italic">
              <Users className="text-blue-500" size={28} /> Customer <span className="text-blue-500">Elite</span>
            </h1>
            <div className="flex gap-4 mt-2">
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                Total: <span className="text-white">{stats.total}</span>
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 ${stats.growth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {stats.growth >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {Math.abs(stats.growth).toFixed(0)}% Growth
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs font-bold outline-none focus:border-blue-500 transition-all"
              />
            </div>

            <button onClick={() => setExportModalOpen(true)} className="bg-slate-800 p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 transition-all">
              <Download size={18} />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/50 p-2 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowVIPOnly(!showVIPOnly)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${showVIPOnly ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)]' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
            >
              <Crown size={14} /> VIP Mode
            </button>

            {showVIPOnly && (
              <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Top:</span>
                <input
                  type="number" value={vipCount} onChange={(e) => setVipCount(Number(e.target.value))}
                  className="w-12 bg-transparent text-white font-bold text-xs outline-none text-center border-b border-slate-700 focus:border-amber-500"
                />
              </div>
            )}
          </div>

          <button
            onClick={() => openMarketingModal(null)}
            className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-purple-900/20 active:scale-95 transition-all"
          >
            <Megaphone size={14} /> Send Offer to {showVIPOnly ? `Top ${vipCount}` : 'All'}
          </button>
        </div>
      </div>

      {/* 🚀 CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-20 flex justify-center"><Loader2 className="animate-spin text-blue-500" size={40} /></div>
        ) : filteredCustomers.length === 0 ? (
          <div className="col-span-full py-20 flex flex-col items-center justify-center gap-5">
            <div className="w-28 h-28 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
              <Users size={48} className="text-slate-700" />
            </div>
            <div className="text-center">
              <p className="text-white font-black text-lg uppercase tracking-widest mb-2">
                {searchTerm ? 'No Results Found' : 'No Customers Yet'}
              </p>
              <p className="text-slate-600 text-sm font-bold">
                {searchTerm
                  ? `No customers match "${searchTerm}"`
                  : 'Customers appear automatically when you complete a sale with a phone number.'}
              </p>
            </div>
            {!searchTerm && (
              <a
                href="/dashboard/sales"
                className="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 text-white transition-all active:scale-95"
              >
                <ShoppingBag size={14} /> Start a New Sale
              </a>
            )}
          </div>
        ) : (
          pagedCustomers.map((c, index) => (
            <div key={c.id} className={`relative p-5 rounded-[2rem] border transition-all flex flex-col justify-between group overflow-hidden ${index < 3 && showVIPOnly ? 'bg-amber-900/10 border-amber-500/30' : 'bg-slate-900/40 border-slate-800 hover:border-blue-500/30'}`}>

              {index < 10 && showVIPOnly && (
                <div className="absolute top-0 right-0 bg-slate-800 px-3 py-1.5 rounded-bl-2xl border-l border-b border-slate-700 text-[10px] font-black text-slate-400">
                  #{index + 1}
                </div>
              )}

              <div className="flex items-center gap-4 mb-5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center font-black text-lg text-slate-300 shadow-inner">
                  {c.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-white text-base truncate w-40">{c.name}</h3>
                  <p className="text-slate-500 text-xs font-medium flex items-center gap-1"><Phone size={10} /> {c.phone || "No Phone"}</p>
                </div>
              </div>

              <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800/50 mb-4 flex justify-between items-center">
                <div>
                  <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">Total Spent</p>
                  <p className={`font-black text-xl ${index < 3 && showVIPOnly ? 'text-amber-500' : 'text-white'}`}>₹{formatCurrency(c.total_spent)}</p>
                </div>
                <ShoppingBag className="text-slate-700" size={20} />
              </div>

              <div className="flex gap-2 mt-auto">
                <button onClick={() => openMarketingModal(c)} className="flex-1 bg-purple-600/10 hover:bg-purple-600 text-purple-400 hover:text-white border border-purple-500/20 py-3 rounded-xl flex items-center justify-center gap-2 transition-all">
                  <Megaphone size={16} />
                </button>
                <button onClick={() => viewHistory(c)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-xl flex items-center justify-center gap-2 transition-all border border-slate-700/50">
                  <History size={16} />
                </button>
                <button
                  onClick={() => router.push(`/dashboard/sales?customerId=${c.id}`)}
                  className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 active:scale-95 transition-all"
                >
                  New Bill <ArrowUpRight size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      <Paginator
        currentPage={currentPage}
        totalItems={filteredCustomers.length}
        pageSize={CUST_PAGE_SIZE}
        onPageChange={setCurrentPage}
        className="px-2"
      />

      {/* 📥 EXPORT MODAL */}
      <AnimatePresence>
        {exportModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] w-full max-w-sm relative">
              <button onClick={() => setExportModalOpen(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={18} /></button>
              <h2 className="text-lg font-black text-white uppercase italic mb-4 flex items-center gap-2"><Download size={18} className="text-blue-500" /> Export Data</h2>

              {/* Format Selector */}
              <div className="flex bg-slate-950 p-1.5 rounded-xl mb-4 border border-slate-800">
                <button onClick={() => setExportType('csv')} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase flex items-center justify-center gap-2 ${exportType === 'csv' ? 'bg-green-600 text-white' : 'text-slate-500 hover:text-white'}`}>
                  <FileSpreadsheet size={14} /> CSV
                </button>
                <button onClick={() => setExportType('pdf')} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase flex items-center justify-center gap-2 ${exportType === 'pdf' ? 'bg-red-600 text-white' : 'text-slate-500 hover:text-white'}`}>
                  <FileText size={14} /> PDF
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                <button onClick={() => handleExport('1day')} className="bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-300 py-3 rounded-xl text-xs font-bold transition-all">1 Day</button>
                <button onClick={() => handleExport('1week')} className="bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-300 py-3 rounded-xl text-xs font-bold transition-all">1 Week</button>
                <button onClick={() => handleExport('1month')} className="bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-300 py-3 rounded-xl text-xs font-bold transition-all">1 Month</button>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 mb-4">
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-2">Custom Range</p>
                <div className="flex gap-2">
                  <input type="date" className="bg-slate-900 text-white text-xs p-2 rounded-lg w-full outline-none" onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} />
                  <input type="date" className="bg-slate-900 text-white text-xs p-2 rounded-lg w-full outline-none" onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} />
                </div>
              </div>
              <button onClick={() => handleExport('custom')} className={`w-full py-3 rounded-xl font-bold text-sm uppercase ${exportType === 'csv' ? 'bg-green-600' : 'bg-red-600'}`}>
                Download {exportType.toUpperCase()}
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* 📢 MARKETING & HISTORY MODALS */}
      <AnimatePresence>
        {marketingModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 p-6 rounded-[2.5rem] w-full max-w-lg shadow-2xl relative flex flex-col max-h-[85vh]"
            >
              <button onClick={() => setMarketingModalOpen(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white bg-slate-800 p-2 rounded-full"><X size={18} /></button>

              <h2 className="text-xl font-black italic mb-1 text-white uppercase flex items-center gap-2">
                <Megaphone className="text-purple-500" /> Promotion <span className="text-purple-500">Hub</span>
              </h2>
              <p className="text-slate-500 text-xs mb-4 font-bold uppercase tracking-widest">
                Sending to: <span className="text-white">{selectedForPromo.length} Customers</span>
              </p>

              <div className="mb-4 space-y-2">
                <p className="text-[10px] text-slate-400 font-bold uppercase">1. Choose Message</p>
                <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                  {OFFER_TEMPLATES.map(t => (
                    // 🔥 BUG FIX: highlight selected template + update state on click
                    <div
                      key={t.id}
                      onClick={() => setSelectedTemplate(t)}
                      className={`min-w-[200px] border p-3 rounded-xl cursor-pointer transition-all ${selectedTemplate.id === t.id
                        ? 'bg-purple-900/40 border-purple-500 shadow-lg shadow-purple-900/20'
                        : 'bg-slate-950 border-slate-800 hover:border-purple-500'
                        }`}
                    >
                      <p className="font-bold text-xs text-slate-200 mb-1">{t.title}</p>
                      <p className="text-[10px] text-slate-500 line-clamp-2">{t.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col">
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-2">2. Click 'Send' next to each customer</p>
                <div className="overflow-y-auto pr-2 space-y-2 custom-scrollbar flex-1 bg-slate-950/50 p-2 rounded-xl border border-slate-800">
                  {selectedForPromo.map((c, idx) => (
                    <div key={c.id} className="flex justify-between items-center bg-slate-900 p-3 rounded-xl border border-slate-800/50">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-500">#{idx + 1}</span>
                        <div>
                          <p className="text-sm font-bold text-white">{c.name}</p>
                          <p className="text-[10px] text-slate-500">{c.phone}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => sendWhatsApp(c.phone, selectedTemplate.text.replace("{name}", c.name))}
                        className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase flex items-center gap-1 transition-all"
                      >
                        Send <Share2 size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedHistory && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 p-6 rounded-[2.5rem] w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
                <h2 className="text-xl font-black flex items-center gap-2 italic uppercase">
                  <History className="text-blue-500" size={20} /> Purchase <span className="text-white">History</span>
                </h2>
                <button onClick={() => setSelectedHistory(null)} className="bg-slate-800 p-2 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white transition-all"><X size={18} /></button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                {fetchingHistory ? (
                  <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-500" /></div>
                ) : selectedHistory.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 font-bold uppercase text-xs tracking-widest">No purchase history found in this store.</div>
                ) : (
                  selectedHistory.map((sale: any) => (
                    <div key={sale.id} className="bg-slate-950/50 border border-slate-800 p-4 rounded-2xl">
                      <div className="flex justify-between mb-3 border-b border-slate-800/50 pb-2">
                        <span className="text-[10px] text-slate-500 flex items-center gap-1 font-bold uppercase"><Calendar size={10} /> {new Date(sale.created_at).toLocaleDateString()}</span>
                        <span className="text-sm font-black text-white">₹{formatCurrency(sale.total_amount)}</span>
                      </div>
                      <div className="space-y-1">
                        {sale.sale_items && sale.sale_items.length > 0 ? (
                          sale.sale_items.map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-xs">
                              <span className="text-slate-400 font-medium">
                                {item.inventory?.name || "Unknown Item"}
                                <span className="text-slate-600 text-[10px] ml-1">x{item.quantity}</span>
                              </span>
                              <span className="text-slate-300 font-bold">₹{formatCurrency(item.price_at_sale * item.quantity)}</span>
                            </div>
                          ))
                        ) : (
                          <span className="text-xs text-red-500 italic">Items detail missing</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}