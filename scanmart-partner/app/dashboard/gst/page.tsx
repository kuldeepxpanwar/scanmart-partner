"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useApp } from "@/lib/AppContext";
import { 
  FileSpreadsheet, Download, Filter, Loader2, Calendar as CalendarIcon, 
  FileText, Briefcase, Users, LayoutDashboard, Receipt 
} from "lucide-react";

export default function GSTReportPage() {
  const { t } = useApp();
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sales, setSales] = useState<any[]>([]);
  const [saleItems, setSaleItems] = useState<any[]>([]);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  useEffect(() => {
    const storedId = typeof window !== 'undefined' ? localStorage.getItem("active_store_id") : null;
    if (storedId) {
      setActiveStoreId(storedId);
    } else {
      fetchStoresFirst();
    }
  }, []);

  useEffect(() => {
    if (activeStoreId) {
      fetchData();
    }
  }, [activeStoreId, selectedMonth, selectedYear]);

  const fetchStoresFirst = async () => {
    const { data } = await supabase.from("stores").select("id").limit(1);
    if (data && data.length > 0) setActiveStoreId(data[0].id);
  };

  const fetchData = async () => {
    if (!activeStoreId) return;
    setLoading(true);

    const startDate = new Date(selectedYear, selectedMonth, 1).toISOString();
    const endDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59).toISOString();

    const { data: salesData, error: salesError } = await supabase
      .from("sales")
      .select(`
        id, created_at, total_amount, payment_method, customer_id, total_gst,
        customers ( id, name, gstin, phone )
      `)
      .eq("store_id", activeStoreId)
      .gte("created_at", startDate)
      .lte("created_at", endDate);

    if (salesData) {
      setSales(salesData);
      const saleIds = salesData.map(s => s.id);
      
      if (saleIds.length > 0) {
        const { data: itemsData } = await supabase
          .from("sale_items")
          .select(`
            id, sale_id, quantity, price_at_sale,
            inventory ( id, name, hsn_code, gst_rate )
          `)
          .in("sale_id", saleIds);
        setSaleItems(itemsData || []);
      } else {
        setSaleItems([]);
      }
    }
    setLoading(false);
  };

  // --- GST CALCULATIONS ---
  const getGstSummary = () => {
    let b2bTotal = 0;
    let b2cTotal = 0;
    let totalTax = 0;
    
    // HSN Summary Map
    const hsnMap: any = {};

    sales.forEach(sale => {
      const isB2B = sale.customers && sale.customers.gstin && sale.customers.gstin.trim() !== "";
      if (isB2B) {
        b2bTotal += Number(sale.total_amount);
      } else {
        b2cTotal += Number(sale.total_amount);
      }
      totalTax += Number(sale.total_gst || 0);

      const items = saleItems.filter(si => si.sale_id === sale.id);
      items.forEach(item => {
        const hsn = item.inventory?.hsn_code || "UNKNOWN";
        const gstRate = item.inventory?.gst_rate || 0;
        const qty = item.quantity;
        const totalVal = qty * item.price_at_sale;
        
        // Back calculate taxable value
        const taxableVal = totalVal / (1 + (gstRate / 100));
        const taxAmt = totalVal - taxableVal;

        if (!hsnMap[hsn]) {
          hsnMap[hsn] = { qty: 0, taxable: 0, tax: 0, rate: gstRate };
        }
        hsnMap[hsn].qty += qty;
        hsnMap[hsn].taxable += taxableVal;
        hsnMap[hsn].tax += taxAmt;
      });
    });

    return { b2bTotal, b2cTotal, totalTax, hsnMap };
  };

  const gstData = getGstSummary();

  // --- CSV EXPORT LOGIC ---
  const exportGSTR1 = () => {
    if (sales.length === 0) return alert("No sales data to export.");

    let csv = "GSTIN/UIN of Recipient,Receiver Name,Invoice Number,Invoice Date,Invoice Value,Place Of Supply,Reverse Charge,Invoice Type,Rate,Taxable Value,Integrated Tax Amount,Central Tax Amount,State/UT Tax Amount,Cess Amount\n";

    sales.forEach(sale => {
      const isB2B = sale.customers && sale.customers.gstin && sale.customers.gstin.trim() !== "";
      const gstin = isB2B ? sale.customers.gstin : "";
      const name = sale.customers ? sale.customers.name : "Cash Sale";
      const invNo = sale.id.slice(0, 8).toUpperCase();
      const invDate = new Date(sale.created_at).toLocaleDateString('en-GB');
      const invVal = Number(sale.total_amount).toFixed(2);
      const pos = "Local"; // Assumption for simple retail

      const items = saleItems.filter(si => si.sale_id === sale.id);
      
      // Group by GST Rate for the invoice
      const rateGroups: any = {};
      items.forEach(item => {
        const rate = item.inventory?.gst_rate || 0;
        const val = item.quantity * item.price_at_sale;
        const taxVal = val / (1 + (rate / 100));
        const tax = val - taxVal;
        if (!rateGroups[rate]) rateGroups[rate] = { taxable: 0, tax: 0 };
        rateGroups[rate].taxable += taxVal;
        rateGroups[rate].tax += tax;
      });

      Object.keys(rateGroups).forEach(rate => {
        const taxable = rateGroups[rate].taxable.toFixed(2);
        const cgst = (rateGroups[rate].tax / 2).toFixed(2);
        const sgst = (rateGroups[rate].tax / 2).toFixed(2);
        csv += `${gstin},${name},${invNo},${invDate},${invVal},${pos},N,Regular,${rate},${taxable},0,${cgst},${sgst},0\n`;
      });
    });

    downloadCSV(csv, `GSTR1_${months[selectedMonth]}_${selectedYear}.csv`);
  };

  const exportHSN = () => {
    let csv = "HSN,Description,UQC,Total Quantity,Total Value,Taxable Value,Integrated Tax Amount,Central Tax Amount,State/UT Tax Amount,Cess Amount\n";
    Object.keys(gstData.hsnMap).forEach(hsn => {
      const data = gstData.hsnMap[hsn];
      const cgst = (data.tax / 2).toFixed(2);
      const sgst = (data.tax / 2).toFixed(2);
      const totalVal = (data.taxable + data.tax).toFixed(2);
      csv += `${hsn},Goods,NOS,${data.qty},${totalVal},${data.taxable.toFixed(2)},0,${cgst},${sgst},0\n`;
    });
    downloadCSV(csv, `GSTR_HSN_${months[selectedMonth]}_${selectedYear}.csv`);
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrency = (amt: number) => `₹${amt.toFixed(2)}`;

  return (
    <div className="p-4 md:p-8 space-y-6 min-h-screen bg-[#020617] text-white font-sans pb-32">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#020617]/95 backdrop-blur-md py-4 border-b border-slate-800/50 sticky top-0 z-30">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-3 uppercase italic">
            <FileSpreadsheet className="text-emerald-500" size={28} /> GST <span className="text-emerald-500">Filing Output</span>
          </h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">CA & Tally Ready Reports</p>
        </div>

        <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 p-2 rounded-2xl">
          <CalendarIcon size={16} className="text-slate-500 ml-2" />
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="bg-transparent text-white text-sm font-bold outline-none cursor-pointer p-1"
          >
            {months.map((m, i) => <option key={i} value={i} className="bg-slate-900">{m}</option>)}
          </select>
          <span className="text-slate-700">/</span>
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-transparent text-white text-sm font-bold outline-none cursor-pointer p-1 mr-2"
          >
            {years.map((y) => <option key={y} value={y} className="bg-slate-900">{y}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-32"><Loader2 className="animate-spin text-emerald-500" size={40} /></div>
      ) : (
        <div className="space-y-6">
          
          {/* CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-[2rem] hover:border-emerald-500/30 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-emerald-500/10 rounded-2xl"><Briefcase className="text-emerald-500" size={20} /></div>
                <p className="text-xs font-black uppercase text-slate-400 tracking-widest">B2B Sales (Registered)</p>
              </div>
              <h2 className="text-3xl font-black text-white">{formatCurrency(gstData.b2bTotal)}</h2>
              <p className="text-[10px] text-slate-500 mt-2">GSTIN Provided</p>
            </div>

            <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-[2rem] hover:border-blue-500/30 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-blue-500/10 rounded-2xl"><Users className="text-blue-500" size={20} /></div>
                <p className="text-xs font-black uppercase text-slate-400 tracking-widest">B2C Sales (Consumers)</p>
              </div>
              <h2 className="text-3xl font-black text-white">{formatCurrency(gstData.b2cTotal)}</h2>
              <p className="text-[10px] text-slate-500 mt-2">Unregistered Customers</p>
            </div>

            <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-[2rem] hover:border-orange-500/30 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-orange-500/10 rounded-2xl"><Receipt className="text-orange-500" size={20} /></div>
                <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Total Output Tax</p>
              </div>
              <h2 className="text-3xl font-black text-orange-400">{formatCurrency(gstData.totalTax)}</h2>
              <p className="text-[10px] text-slate-500 mt-2">CGST + SGST Combined</p>
            </div>
          </div>

          {/* EXPORTS */}
          <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6">
            <h3 className="text-lg font-black uppercase italic mb-6">📥 Download Reports</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                onClick={exportGSTR1}
                className="bg-[#1a237e] hover:bg-blue-800 border border-blue-600 p-5 rounded-2xl flex items-center justify-between transition-all active:scale-95 group"
              >
                <div className="text-left">
                  <p className="font-black text-lg text-white mb-1">GSTR-1 (B2B/B2C)</p>
                  <p className="text-[10px] text-blue-300 font-bold uppercase tracking-widest">Item-wise GST Breakdown</p>
                </div>
                <Download size={24} className="text-blue-400 group-hover:text-white" />
              </button>

              <button 
                onClick={exportHSN}
                className="bg-emerald-950/50 hover:bg-emerald-900 border border-emerald-800 p-5 rounded-2xl flex items-center justify-between transition-all active:scale-95 group"
              >
                <div className="text-left">
                  <p className="font-black text-lg text-white mb-1">HSN Summary (GSTR-3B)</p>
                  <p className="text-[10px] text-emerald-400/70 font-bold uppercase tracking-widest">Category-wise Tax Output</p>
                </div>
                <Download size={24} className="text-emerald-500 group-hover:text-white" />
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
