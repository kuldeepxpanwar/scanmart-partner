"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  Search,
  Plus,
  Upload,
  Trash2,
  Edit3,
  Loader2,
  Image as ImageIcon,
  Download,
  AlertTriangle,
  TrendingDown,
  DollarSign,
  ArrowRightLeft,
  Store,
  XCircle,
  FileText,
  FileSpreadsheet,
  Archive,
  RotateCcw,
  ScanBarcode,
  Info,
  Calendar, // 🔥 New Icon for Date
  Truck // 🔥 New Icon for Supplier
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// --- Types ---
interface InventoryItem {
  id: string;
  name: string;
  price: number;
  mrp: number;
  stock: number;
  category: string;
  barcode?: string;
  image: string | null;
  supplier_id: string | null;
  buying_price: number;
  gst_rate: number;
  created_at: string;
  last_sold_at: string | null;
  shop_id: string | null;
  is_active: boolean;
  sales_count?: number;
}

interface StoreType {
  id: string;
  name: string;
  location: string;
}

interface SupplierType {
  id: string;
  name: string;
}

interface TransferRequest {
  id: string;
  source_store_id: string;
  dest_store_id: string;
  product_id: string;
  quantity: number;
  status: 'pending' | 'completed' | 'cancelled';
  transfer_date: string;
  product_name?: string;
  source_store_name?: string;
  dest_store_name?: string;
}

// GST Constants
const GST_SLABS = [
  { value: 0, label: "0% - Exempt (Milk/Bread)" },
  { value: 5, label: "5% - Essentials (Sugar/Tea)" },
  { value: 12, label: "12% - Standard (Processed Food)" },
  { value: 18, label: "18% - Standard+ (Electronics/Soaps)" },
  { value: 28, label: "28% - Luxury (Cars/Soda)" },
  { value: 40, label: "40% - Sin Goods" },
];

export default function InventoryPage() {
  const [products, setProducts] = useState<InventoryItem[]>([]);
  const [stores, setStores] = useState<StoreType[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierType[]>([]); // 🔥 Suppliers State
  const [transfers, setTransfers] = useState<TransferRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // 🔥 Active Store State (For Filtering)
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null);

  // Toggle to show Archived (Deleted) items
  const [showArchived, setShowArchived] = useState(false);

  // Modals States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isTransferListOpen, setIsTransferListOpen] = useState(false);

  // Dropdown State
  const [isReportMenuOpen, setIsReportMenuOpen] = useState(false);

  // 🔥 Custom Confirm Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    confirmColor?: string;
    onConfirm: () => void;
  }>({
    open: false, title: "", message: "", onConfirm: () => { },
  });
  const showConfirm = (title: string, message: string, onConfirm: () => void, confirmLabel = "Confirm", confirmColor = "bg-red-600 hover:bg-red-500") =>
    setConfirmDialog({ open: true, title, message, onConfirm, confirmLabel, confirmColor });
  const closeConfirm = () => setConfirmDialog(prev => ({ ...prev, open: false }));

  // 🔥 Report Date Filter State
  const [reportDateRange, setReportDateRange] = useState({ start: "", end: "" });

  // Form States
  const [newItem, setNewItem] = useState({
    name: "",
    price: "",
    mrp: "",
    stock: "",
    category: "General",
    barcode: "",
    image: "",
    supplier_id: "", // 🔥 Supplier ID in Form
    buying_price: "",
    gst_rate: "18",
  });
  const [editItem, setEditItem] = useState<any>(null);

  // Transfer Form State
  const [transferData, setTransferData] = useState({
    dest_store_id: "",
    product_id: "",
    quantity: ""
  });

  // --- Filter/Sort States ---
  const [filterType, setFilterType] = useState<"all" | "top_selling" | "most_profitable" | "dead_stock" | "low_stock">("all");

  // --- 🔄 INITIALIZATION ---
  useEffect(() => {
    // 1. Check LocalStorage for Active Store
    const storedId = typeof window !== 'undefined' ? localStorage.getItem("active_store_id") : null;

    if (storedId) {
      setActiveStoreId(storedId);
    } else {
      fetchStoresFirst();
    }

    // 🔥 Fetch Suppliers on Load
    fetchSuppliers();
  }, []);

  // Reload data whenever activeStoreId or showArchived changes
  useEffect(() => {
    if (activeStoreId) {
      fetchData();
      fetchStoresList();
    }
  }, [activeStoreId, showArchived]);

  const fetchStoresFirst = async () => {
    const { data } = await supabase.from("stores").select("*").limit(1);
    if (data && data.length > 0) {
      setActiveStoreId(data[0].id);
      localStorage.setItem("active_store_id", data[0].id);
    }
  };

  const fetchStoresList = async () => {
    const { data } = await supabase.from("stores").select("*");
    if (data) setStores(data);
  };

  // 🔥 Fetch Suppliers Function
  const fetchSuppliers = async () => {
    const { data } = await supabase.from("suppliers").select("id, name");
    if (data) setSuppliers(data);
  };

  // --- 📡 DATA FETCHING (Filtered by Store) ---
  const fetchData = async () => {
    if (!activeStoreId) return;
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // Filter Inventory by 'store_id'
    let query = supabase
      .from("inventory")
      .select(`*, mrp`)
      .eq("store_id", activeStoreId)
      .order("id", { ascending: false });

    if (showArchived) {
      query = query.eq("is_active", false);
    } else {
      query = query.eq("is_active", true);
    }

    const { data: invData, error } = await query;
    if (error) console.error("Inventory Fetch Error:", error);
    if (invData) setProducts(invData);

    // Fetch Transfers relevant to this store
    const { data: transData } = await supabase
      .from("inventory_transfers")
      .select(`*`)
      .or(`source_store_id.eq.${activeStoreId},dest_store_id.eq.${activeStoreId}`)
      .order("transfer_date", { ascending: false });

    if (transData) setTransfers(transData as any);

    setLoading(false);
  };

  // --- 🔴 SOFT DELETE FUNCTION (Custom Dialog) ---
  const handleDeleteItem = (id: string) => {
    showConfirm(
      "Archive Product?",
      "This product will be archived and hidden from inventory. You can restore it anytime.",
      async () => {
        closeConfirm();
        setProducts(prev => prev.filter(item => item.id !== id));
        const { error } = await supabase.from("inventory").update({ is_active: false }).eq("id", id);
        if (error) { alert("Archive failed: " + error.message); fetchData(); }
      },
      "Archive",
      "bg-red-600 hover:bg-red-500"
    );
  };

  // --- 🟢 RESTORE (UN-ARCHIVE, Custom Dialog) ---
  const handleRestoreItem = (id: string) => {
    showConfirm(
      "Restore Product?",
      "This product will be brought back to active inventory.",
      async () => {
        closeConfirm();
        setProducts(prev => prev.filter(item => item.id !== id));
        const { error } = await supabase.from("inventory").update({ is_active: true }).eq("id", id);
        if (error) { alert("Restore failed: " + error.message); fetchData(); }
      },
      "Restore",
      "bg-green-600 hover:bg-green-500"
    );
  };

  // --- 🟢 ADD PRODUCT (Fixed for Multi-Store) ---
  const handleAddItem = async () => {
    if (!newItem.name || !newItem.price) return alert("Name & Price required!");
    if (!activeStoreId) return alert("No active store selected!");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("inventory").insert([
      {
        name: newItem.name,
        price: Number(newItem.price),
        mrp: Number(newItem.mrp) || Number(newItem.price),
        buying_price: Number(newItem.buying_price) || 0,
        gst_rate: Number(newItem.gst_rate) || 18,
        stock: Number(newItem.stock) || 0,
        category: newItem.category,
        barcode: newItem.barcode || null,
        image: newItem.image || null,
        supplier_id: newItem.supplier_id || null, // 🔥 Save Supplier
        store_id: activeStoreId,
        last_sold_at: null, // 🔥 BUG FIX: New products have no sales history
        is_active: true
      },
    ]);
    if (error) alert(error.message);
    else {
      setIsAddOpen(false);
      resetForm();
      fetchData();
    }
  };

  const resetForm = () => {
    setNewItem({
      name: "", price: "", mrp: "", stock: "", category: "General",
      barcode: "", image: "", supplier_id: "", buying_price: "", gst_rate: "18",
    });
  };

  // --- 🔵 EDIT PRODUCT ---
  const handleUpdateItem = async () => {
    if (!editItem || !editItem.id) return;
    const { error } = await supabase
      .from("inventory")
      .update({
        name: editItem.name,
        price: Number(editItem.price),
        mrp: Number(editItem.mrp) || 0,
        buying_price: Number(editItem.buying_price) || 0,
        stock: Number(editItem.stock),
        category: editItem.category,
        gst_rate: Number(editItem.gst_rate),
        barcode: editItem.barcode || null,
        image: editItem.image || null,
        supplier_id: editItem.supplier_id || null, // 🔥 Update Supplier
      })
      .eq("id", editItem.id);

    if (error) alert("Update Failed: " + error.message);
    else {
      setIsEditOpen(false);
      setEditItem(null);
      fetchData();
      alert("✅ Updated!");
    }
  };

  // --- 🟡 BULK IMPORT (Fixed for Multi-Store) ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!activeStoreId) return alert("Please select a store first.");

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const rows = text.split("\n").slice(1);

      const newProducts = rows
        .map((row) => {
          const cols = row.split(",");
          if (cols.length < 2) return null;

          const name = cols[0]?.trim();
          const category = cols[1]?.trim() || "General";
          const barcode = cols[2]?.trim() || null;
          const mrp = Number(cols[3]?.trim()) || 0;
          const price = Number(cols[4]?.trim()) || 0;
          const buying_price = Number(cols[5]?.trim()) || 0;
          const stock = Number(cols[6]?.trim()) || 0;
          const gst_rate = Number(cols[7]?.trim()) || 0;
          const image = cols[8]?.trim() || "";

          if (name && price) {
            return {
              name, price, mrp: mrp || price, buying_price, stock, category, gst_rate, image, barcode,
              store_id: activeStoreId,
              last_sold_at: null, // 🔥 BUG FIX: Duplicate also gets fresh start (no history)
              is_active: true
            };
          }
        })
        .filter(Boolean);

      if (newProducts.length > 0) {
        const { error } = await supabase.from("inventory").insert(newProducts);
        if (error) alert(error.message);
        else {
          alert(`✅ ${newProducts.length} Items Imported!`);
          setIsImportOpen(false);
          fetchData();
        }
      }
    };
    reader.readAsText(file);
  };

  // --- 🚛 TRANSFER LOGIC ---
  const handleTransferRequest = async () => {
    if (!activeStoreId || !transferData.dest_store_id) return alert("Stores invalid");

    const qty = Number(transferData.quantity);
    const product = products.find(p => p.id === transferData.product_id);
    if (!product || product.stock < qty) return alert("Insufficient Stock in current store!");

    const { error } = await supabase.from("inventory_transfers").insert([{
      source_store_id: activeStoreId,
      dest_store_id: transferData.dest_store_id,
      product_id: transferData.product_id,
      quantity: qty,
      status: 'pending'
    }]);

    if (error) alert("Transfer Failed: " + error.message);
    else {
      alert("✅ Transfer Request Sent!");
      setIsTransferOpen(false);
      fetchData();
    }
  };


  // --- 📥 EXPORT LOGIC (Updated with Date Range) ---
  const handleExport = (type: 'csv' | 'pdf' | 'low_stock' | 'stock_value') => {
    // 1. Get Base Data
    let dataToExport = [...filteredProducts];
    let title = "Inventory Report";

    // 🔥 2. Apply Date Filter (if selected)
    if (reportDateRange.start && reportDateRange.end) {
      const startDate = new Date(reportDateRange.start);
      const endDate = new Date(reportDateRange.end);
      endDate.setHours(23, 59, 59); // Include full end day

      dataToExport = dataToExport.filter(item => {
        const itemDate = new Date(item.created_at);
        return itemDate >= startDate && itemDate <= endDate;
      });
      title += ` (${reportDateRange.start} to ${reportDateRange.end})`;
    }

    if (type === 'low_stock') {
      dataToExport = products.filter(p => p.stock < 10);
      title = "Low Stock Alert Report";
    }

    if (type === 'csv' || type === 'stock_value') {
      const headers = type === 'stock_value'
        ? "Name,Stock,Buying Price,Total Value (Locked Cash)\n"
        : "Name,Category,Barcode,Price,Stock,GST,Status\n";

      const csvContent = "data:text/csv;charset=utf-8," + headers +
        dataToExport.map(p => {
          if (type === 'stock_value') {
            return `${p.name},${p.stock},${p.buying_price},${p.stock * p.buying_price}`;
          }
          return `${p.name},${p.category},${p.barcode || '-'},${p.price},${p.stock},${p.gst_rate}%,${p.stock < 10 ? 'Low' : 'OK'}`;
        }).join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `ScanMart_${title}.csv`);
      document.body.appendChild(link);
      link.click();

    } else {
      const doc = new jsPDF();
      doc.text(`ScanMart - ${title}`, 14, 20);
      doc.text(`Store ID: ${activeStoreId?.slice(0, 8)}`, 14, 28);

      const tableData = dataToExport.map(p => [
        p.name,
        p.category,
        p.stock.toString(),
        `Rs.${p.price}`,
        `${p.gst_rate}%`,
        p.stock < 10 ? "LOW" : "OK"
      ]);

      autoTable(doc, {
        head: [['Item Name', 'Category', 'Stock', 'Price', 'GST', 'Status']],
        body: tableData,
        startY: 35,
      });
      doc.save(`ScanMart_${title}.pdf`);
    }
    setIsReportMenuOpen(false);
  };


  // --- 🔢 FILTERING & SORTING LOGIC ---
  const getProcessedProducts = () => {
    let filtered = products.filter((p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.barcode?.includes(searchTerm)
    );

    const now = new Date();

    switch (filterType) {
      case "low_stock": return filtered.filter(p => p.stock < 10);
      case "dead_stock": return filtered.filter(p => {
        if (!p.last_sold_at) return false;
        const lastSold = new Date(p.last_sold_at);
        const diffDays = Math.ceil((now.getTime() - lastSold.getTime()) / (1000 * 3600 * 24));
        return diffDays > 90;
      });
      case "most_profitable": return filtered.sort((a, b) => (b.price - b.buying_price) - (a.price - a.buying_price));
      case "top_selling": return filtered;
      default: return filtered;
    }
  };

  const filteredProducts = getProcessedProducts();
  const totalStockValue = filteredProducts.reduce((sum, item) => sum + (item.stock * item.buying_price), 0);

  const getAgingStatus = (lastSoldDate: string | null) => {
    if (!lastSoldDate) return { label: "New", color: "text-blue-400" };
    const days = Math.ceil((new Date().getTime() - new Date(lastSoldDate).getTime()) / (1000 * 3600 * 24));
    if (days < 30) return { label: "Fresh", color: "text-green-400" };
    if (days < 90) return { label: "Slow", color: "text-yellow-400" };
    return { label: "Dead Stock", color: "text-red-500 font-black animate-pulse" };
  };


  return (
    <div className="p-4 md:p-8 bg-[#020617] min-h-screen text-white font-sans pb-32">

      {/* 🚀 HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black italic uppercase flex items-center gap-2">
            <Store className="text-blue-500" />
            {showArchived ? <span className="text-red-500">ARCHIVED ITEMS</span> : <>STOCK<span className="text-blue-600">MANAGER</span></>}
          </h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">
            Viewing Store ID: <span className="text-blue-400">{activeStoreId ? activeStoreId.slice(0, 8) + '...' : 'Loading...'}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`px-4 py-3 rounded-xl flex items-center gap-2 font-bold text-xs uppercase transition-all border ${showArchived ? 'bg-red-500 border-red-600 text-white shadow-lg shadow-red-900/20' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700'}`}
          >
            {showArchived ? <><ArrowRightLeft size={16} /> Go Back</> : <><Archive size={16} /> Archives</>}
          </button>

          {!showArchived && (
            <>
              <button onClick={() => setIsTransferListOpen(true)} className="bg-slate-800 px-4 py-3 rounded-xl flex items-center gap-2 border border-slate-700 hover:bg-slate-700 transition-all text-xs font-bold uppercase text-slate-300 hover:text-white">
                <ArrowRightLeft size={16} /> Transfers
              </button>
              <button onClick={() => setIsImportOpen(true)} className="bg-slate-800 px-4 py-3 rounded-xl flex items-center gap-2 border border-slate-700 hover:bg-slate-700 transition-all text-xs font-bold uppercase text-slate-300 hover:text-white">
                <Upload size={16} /> Import
              </button>
              <button onClick={() => setIsAddOpen(true)} className="bg-blue-600 px-4 py-3 rounded-xl flex items-center gap-2 hover:bg-blue-700 transition-all text-xs font-bold uppercase shadow-lg shadow-blue-900/20 text-white">
                <Plus size={16} /> Add Product
              </button>
            </>
          )}
        </div>
      </div>

      {/* 📊 STATS & FILTERS */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        <div className="lg:col-span-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder={showArchived ? "Search deleted items..." : "Search name or barcode..."} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-full bg-slate-900 border border-slate-800 rounded-2xl pl-12 pr-4 outline-none focus:border-blue-500 font-bold text-sm" />
        </div>

        <div className="lg:col-span-3 flex flex-wrap gap-2 items-center justify-end">
          <div className="bg-slate-900 p-1.5 rounded-xl border border-slate-800 flex gap-1">
            <button onClick={() => setFilterType('all')} className={`px-3 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${filterType === 'all' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-white'}`}>All</button>
            <button onClick={() => setFilterType('most_profitable')} className={`px-3 py-2 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center gap-1 ${filterType === 'most_profitable' ? 'bg-green-600 text-white' : 'text-slate-500 hover:text-green-500'}`}><DollarSign size={12} /> Profitable</button>
            <button onClick={() => setFilterType('dead_stock')} className={`px-3 py-2 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center gap-1 ${filterType === 'dead_stock' ? 'bg-red-600 text-white' : 'text-slate-500 hover:text-red-500'}`}><AlertTriangle size={12} /> Dead Stock</button>
            <button onClick={() => setFilterType('low_stock')} className={`px-3 py-2 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center gap-1 ${filterType === 'low_stock' ? 'bg-orange-600 text-white' : 'text-slate-500 hover:text-orange-500'}`}><TrendingDown size={12} /> Low Stock</button>
          </div>

          <div className="relative">
            <button
              onClick={() => setIsReportMenuOpen(!isReportMenuOpen)}
              className="bg-slate-800 px-4 py-3 rounded-xl flex items-center gap-2 border border-slate-700 text-xs font-bold uppercase hover:text-white text-slate-300 transition-colors"
            >
              <Download size={16} /> Report
            </button>

            {isReportMenuOpen && (
              <div className="fixed inset-0 z-40" onClick={() => setIsReportMenuOpen(false)}></div>
            )}

            {isReportMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                {/* 🔥 Date Range Inputs */}
                <div className="p-3 border-b border-slate-800 space-y-2">
                  <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1"><Calendar size={10} /> Date Filter</p>
                  <div className="flex gap-2">
                    <input type="date" className="w-full bg-slate-950 border border-slate-800 rounded text-[10px] text-white p-1"
                      value={reportDateRange.start} onChange={(e) => setReportDateRange({ ...reportDateRange, start: e.target.value })} />
                    <input type="date" className="w-full bg-slate-950 border border-slate-800 rounded text-[10px] text-white p-1"
                      value={reportDateRange.end} onChange={(e) => setReportDateRange({ ...reportDateRange, end: e.target.value })} />
                  </div>
                </div>

                <button onClick={() => handleExport('csv')} className="w-full text-left px-4 py-3 text-xs font-bold hover:bg-slate-800 flex items-center gap-2 text-green-500 transition-colors"><FileSpreadsheet size={14} /> CSV Export</button>
                <button onClick={() => handleExport('pdf')} className="w-full text-left px-4 py-3 text-xs font-bold hover:bg-slate-800 flex items-center gap-2 text-red-500 transition-colors"><FileText size={14} /> PDF Report</button>
                <div className="border-t border-slate-800 my-1"></div>
                <button onClick={() => handleExport('low_stock')} className="w-full text-left px-4 py-3 text-xs font-bold hover:bg-slate-800 text-orange-500 transition-colors">Low Stock PDF</button>
                <button onClick={() => handleExport('stock_value')} className="w-full text-left px-4 py-3 text-xs font-bold hover:bg-slate-800 text-blue-500 transition-colors">Value Report CSV</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 💰 TOTAL VALUE BANNER */}
      <div className={`bg-gradient-to-r p-4 rounded-2xl mb-6 flex justify-between items-center border ${showArchived ? 'from-red-900/40 to-slate-900 border-red-500/30' : 'from-blue-900/40 to-slate-900 border-blue-500/30'}`}>
        <div>
          <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${showArchived ? 'text-red-400' : 'text-blue-400'}`}>
            {showArchived ? 'Archived Inventory Value' : 'Total Locked Value (Assets)'}
          </p>
          <h2 className="text-2xl font-black text-white">₹{totalStockValue.toLocaleString()}</h2>
        </div>
        <div className={`p-3 rounded-full ${showArchived ? 'bg-red-600/20 text-red-400' : 'bg-blue-600/20 text-blue-400'}`}>
          <DollarSign size={24} />
        </div>
      </div>

      {/* 📋 INVENTORY TABLE */}
      <div className={`bg-slate-900 border rounded-[2rem] overflow-hidden shadow-2xl ${showArchived ? 'border-red-900/30' : 'border-slate-800'}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-950 text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-800">
              <tr>
                <th className="p-5">Product Info</th>
                <th className="p-5">Category</th>
                <th className="p-5">Pricing (Margin)</th>
                <th className="p-5">Stock Health</th>
                <th className="p-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-500" size={32} /></td></tr>
              ) : filteredProducts.length === 0 ? (
                <tr><td colSpan={5} className="p-16 text-center">
                  <div className="flex flex-col items-center justify-center gap-4">
                    {filterType === 'dead_stock' ? (
                      <>
                        <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
                          <span className="text-4xl">🎉</span>
                        </div>
                        <p className="text-green-400 font-black text-base uppercase tracking-widest">No Dead Stock!</p>
                        <p className="text-slate-600 text-xs font-bold">All products are selling well.</p>
                      </>
                    ) : filterType === 'low_stock' ? (
                      <>
                        <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
                          <span className="text-4xl">✅</span>
                        </div>
                        <p className="text-green-400 font-black text-base uppercase tracking-widest">All Stocked Up!</p>
                        <p className="text-slate-600 text-xs font-bold">No low stock items right now.</p>
                      </>
                    ) : (
                      <>
                        <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center">
                          <Archive size={40} className="text-slate-600" />
                        </div>
                        <div>
                          <p className="text-white font-black text-base uppercase tracking-widest mb-1">No Products Yet</p>
                          <p className="text-slate-600 text-xs font-bold">Add your first product to start selling.</p>
                        </div>
                        <button
                          onClick={() => setIsAddOpen(true)}
                          className="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95"
                        >
                          <Plus size={14} /> Add First Product
                        </button>
                      </>
                    )}
                  </div>
                </td></tr>
              ) : (
                filteredProducts.map((item) => {
                  const aging = getAgingStatus(item.last_sold_at);
                  const margin = item.price - item.buying_price;

                  return (
                    <tr key={item.id} className="border-b border-slate-800 hover:bg-slate-800/40 transition-all group">
                      <td className="p-5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 relative">
                          {item.image ? <img src={item.image} className={`w-full h-full object-cover ${showArchived ? 'opacity-50 grayscale' : ''}`} /> : <ImageIcon className="text-slate-600" size={20} />}
                          {showArchived && <div className="absolute inset-0 flex items-center justify-center bg-black/40"><Trash2 size={16} className="text-white" /></div>}
                        </div>
                        <div>
                          <p className={`font-bold text-sm ${showArchived ? 'text-slate-400 line-through' : 'text-slate-200'}`}>{item.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className={`text-[10px] font-bold uppercase ${aging.color}`}>{aging.label} • GST {item.gst_rate}%</p>
                            {item.barcode && <span className="text-[9px] text-slate-500 font-mono bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 flex items-center gap-1"><ScanBarcode size={10} /> {item.barcode}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="p-5 text-xs font-bold text-slate-400">{item.category}</td>
                      <td className="p-5 font-mono">
                        {item.mrp > item.price && <div className="text-[10px] text-slate-500 line-through">MRP: ₹{item.mrp}</div>}
                        <div className="text-white font-bold text-sm">Sale: ₹{item.price}</div>
                        {!showArchived && <div className="text-[10px] text-green-500 font-bold">+₹{margin} Profit</div>}
                      </td>
                      <td className="p-5">
                        <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${item.stock < 10 ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>{item.stock} UNITS</span>
                      </td>
                      <td className="p-5 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          {showArchived ? (
                            <button onClick={() => handleRestoreItem(item.id)} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                              <RotateCcw size={14} /> Restore
                            </button>
                          ) : (
                            <>
                              <button onClick={() => { setTransferData({ ...transferData, product_id: item.id }); setIsTransferOpen(true); }} className="p-2 bg-slate-800 hover:bg-purple-600 text-slate-400 hover:text-white rounded-lg transition-all" title="Transfer Stock"><ArrowRightLeft size={14} /></button>
                              <button onClick={() => { setEditItem(item); setIsEditOpen(true); }} className="p-2 bg-slate-800 hover:bg-blue-600 text-slate-400 hover:text-white rounded-lg transition-all"><Edit3 size={14} /></button>
                              <button onClick={() => handleDeleteItem(item.id)} className="p-2 bg-slate-800 hover:bg-red-600 text-slate-400 hover:text-white rounded-lg transition-all"><Trash2 size={14} /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🚛 TRANSFER MODALS (Code retained for brevity - Same as before) */}
      {isTransferOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl w-full max-w-sm shadow-2xl relative">
            <h2 className="text-xl font-bold mb-6 italic text-purple-500 uppercase flex items-center gap-2"><ArrowRightLeft /> Transfer Stock</h2>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Destination Store</label>
                <select className="w-full bg-slate-800 p-3 rounded-xl border border-slate-700 outline-none text-white text-sm" onChange={(e) => setTransferData({ ...transferData, dest_store_id: e.target.value })}>
                  <option value="">Select Store</option>
                  {stores.filter(s => s.id !== activeStoreId).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Quantity</label>
                <input type="number" placeholder="Qty" className="w-full bg-slate-800 p-3 rounded-xl border border-slate-700 outline-none text-white font-bold" onChange={(e) => setTransferData({ ...transferData, quantity: e.target.value })} />
              </div>
              <button onClick={handleTransferRequest} className="w-full bg-purple-600 hover:bg-purple-700 py-4 rounded-2xl font-black mt-2 transition-all text-sm uppercase tracking-widest">SEND REQUEST</button>
              <button onClick={() => setIsTransferOpen(false)} className="w-full text-slate-500 py-2 text-xs font-bold uppercase">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {isTransferListOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2.5rem] w-full max-w-2xl shadow-2xl h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
              <h2 className="text-xl font-black uppercase italic flex items-center gap-2"><ArrowRightLeft className="text-blue-500" /> Transfer History</h2>
              <button onClick={() => setIsTransferListOpen(false)} className="bg-slate-800 p-2 rounded-full hover:bg-slate-700"><XCircle size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
              {transfers.length === 0 ? <p className="text-center text-slate-500 py-10 font-bold uppercase text-xs">No transfers found for this store</p> :
                transfers.map(t => (
                  <div key={t.id} className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800 flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${t.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-green-500/10 text-green-500'}`}>{t.status}</span>
                        <span className="text-slate-400 text-[10px] font-bold uppercase">{new Date(t.transfer_date).toLocaleDateString()}</span>
                      </div>
                      <p className="font-bold text-white text-sm">{t.product_name} <span className="text-slate-500">x{t.quantity}</span></p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] font-bold text-slate-500 uppercase">
                        <span>{t.source_store_name}</span> <ArrowRightLeft size={10} /> <span>{t.dest_store_name}</span>
                      </div>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      )}

      {/* 🔴 ADD MODAL (Updated with Supplier) */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh]">
            <h2 className="text-2xl font-bold mb-6 italic text-blue-500">New <span className="text-white">Product</span></h2>
            <div className="space-y-4">
              <input type="text" placeholder="Product Name" className="w-full bg-slate-800 p-3 rounded-xl border border-slate-700 outline-none focus:border-blue-500 transition-all"
                value={newItem.name || ""}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              />

              <div className="relative">
                <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input type="text" placeholder="Scan or Type Barcode" className="w-full bg-slate-800 p-3 pl-10 rounded-xl border border-slate-700 outline-none focus:border-blue-500 transition-all font-mono"
                  value={newItem.barcode || ""}
                  onChange={(e) => setNewItem({ ...newItem, barcode: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input type="number" placeholder="MRP" className="w-full bg-slate-800 p-3 rounded-xl border border-slate-700 outline-none" value={newItem.mrp} onChange={e => setNewItem({ ...newItem, mrp: e.target.value })} />
                <input type="number" placeholder="Price" className="w-full bg-slate-800 p-3 rounded-xl border border-slate-700 outline-none" value={newItem.price} onChange={e => setNewItem({ ...newItem, price: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input type="number" placeholder="Buy Price" className="w-full bg-slate-800 p-3 rounded-xl border border-slate-700 outline-none" value={newItem.buying_price} onChange={e => setNewItem({ ...newItem, buying_price: e.target.value })} />
                <input type="number" placeholder="Stock" className="w-full bg-slate-800 p-3 rounded-xl border border-slate-700 outline-none" value={newItem.stock} onChange={e => setNewItem({ ...newItem, stock: e.target.value })} />
              </div>

              {/* 🔥 Supplier & GST Dropdown */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">GST Rate</label>
                  <select className="w-full bg-slate-800 p-3 rounded-xl border border-slate-700 outline-none text-white cursor-pointer" value={newItem.gst_rate} onChange={(e) => setNewItem({ ...newItem, gst_rate: e.target.value })}>
                    {GST_SLABS.map(slab => <option key={slab.value} value={slab.value}>{slab.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block flex items-center gap-1"><Truck size={10} /> Supplier</label>
                  <select className="w-full bg-slate-800 p-3 rounded-xl border border-slate-700 outline-none text-white cursor-pointer" value={newItem.supplier_id || ""} onChange={(e) => setNewItem({ ...newItem, supplier_id: e.target.value })}>
                    <option value="">None / Self</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <button onClick={handleAddItem} className="w-full bg-blue-600 hover:bg-blue-700 py-4 rounded-2xl font-black mt-2 transition-all">SAVE PRODUCT</button>
              <button onClick={() => setIsAddOpen(false)} className="w-full text-slate-500 py-2">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* 🟡 IMPORT MODAL */}
      {isImportOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-slate-900 border border-slate-800 p-10 rounded-[2.5rem] w-full max-w-lg text-center shadow-2xl relative">
            <button onClick={() => setIsImportOpen(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white"><XCircle /></button>
            <Upload size={50} className="mx-auto text-blue-500 mb-6" />
            <h2 className="text-2xl font-bold mb-2">Bulk Import</h2>
            <p className="text-slate-500 text-xs mb-6">Select .csv file to upload multiple items</p>
            <div className="text-left bg-slate-950 p-4 rounded-xl border border-slate-800 mb-6">
              <h4 className="text-[10px] font-bold uppercase text-slate-400 mb-2 flex items-center gap-1"><Info size={12} /> Required CSV Format</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-[10px] text-slate-400">
                  <thead className="text-white border-b border-slate-800">
                    <tr><th className="py-1 pr-2">Name</th><th className="py-1 pr-2">Category</th><th className="py-1 pr-2">Barcode</th><th className="py-1 pr-2">MRP</th><th className="py-1 pr-2">Price</th><th className="py-1 pr-2">BuyPrice</th><th className="py-1 pr-2">Stock</th><th className="py-1">GST</th></tr>
                  </thead>
                  <tbody><tr><td className="py-1">Parle G</td><td>Biscuits</td><td>890...</td><td>10</td><td>10</td><td>8</td><td>100</td><td>18</td></tr></tbody>
                </table>
              </div>
            </div>
            <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" id="csv-upload" />
            <label htmlFor="csv-upload" className="block w-full bg-blue-600 hover:bg-blue-700 py-4 rounded-2xl font-black cursor-pointer transition-all">CHOOSE FILE</label>
          </div>
        </div>
      )}

      {/* 🔵 EDIT MODAL (Updated with Supplier) */}
      {isEditOpen && editItem && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh]">
            <h2 className="text-2xl font-bold mb-6 italic text-yellow-500">Edit <span className="text-white">Product</span></h2>
            <div className="space-y-4">
              <input type="text" className="w-full bg-slate-800 p-3 rounded-xl border border-slate-700 outline-none" value={editItem.name || ""} onChange={(e) => setEditItem({ ...editItem, name: e.target.value })} />
              <div className="relative">
                <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input type="text" placeholder="Barcode" className="w-full bg-slate-800 p-3 pl-10 rounded-xl border border-slate-700 outline-none font-mono" value={editItem.barcode || ""} onChange={(e) => setEditItem({ ...editItem, barcode: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" placeholder="MRP" className="w-full bg-slate-800 p-3 rounded-xl border border-slate-700 outline-none" value={editItem.mrp || ""} onChange={(e) => setEditItem({ ...editItem, mrp: e.target.value })} />
                <input type="number" placeholder="Offer Price" className="w-full bg-slate-800 p-3 rounded-xl border border-blue-500/30 outline-none" value={editItem.price || ""} onChange={(e) => setEditItem({ ...editItem, price: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" placeholder="Buying Price" className="w-full bg-slate-800 p-3 rounded-xl border border-slate-700 outline-none" value={editItem.buying_price || ""} onChange={(e) => setEditItem({ ...editItem, buying_price: e.target.value })} />
                <select className="w-full bg-slate-800 p-3 rounded-xl border border-slate-700 outline-none text-white cursor-pointer" value={editItem.gst_rate || "18"} onChange={(e) => setEditItem({ ...editItem, gst_rate: e.target.value })}>
                  {GST_SLABS.map(slab => <option key={slab.value} value={slab.value}>{slab.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" placeholder="Stock" className="w-full bg-slate-800 p-3 rounded-xl border border-slate-700 outline-none" value={editItem.stock || ""} onChange={(e) => setEditItem({ ...editItem, stock: e.target.value })} />

                {/* 🔥 Supplier Edit Dropdown */}
                <select className="w-full bg-slate-800 p-3 rounded-xl border border-slate-700 outline-none text-white cursor-pointer" value={editItem.supplier_id || ""} onChange={(e) => setEditItem({ ...editItem, supplier_id: e.target.value })}>
                  <option value="">No Supplier</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <button onClick={handleUpdateItem} className="w-full bg-yellow-600 hover:bg-yellow-700 py-4 rounded-2xl font-black mt-2 transition-all">UPDATE NOW</button>
              <button onClick={() => setIsEditOpen(false)} className="w-full text-slate-500 py-2">Cancel</button>
            </div>
          </div>
        </div>
      )}
      {/* 🔥 CUSTOM CONFIRM DIALOG */}
      {confirmDialog.open && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 p-8 rounded-3xl w-full max-w-sm shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-5">
              <AlertTriangle size={28} className="text-red-400" />
            </div>
            <h3 className="text-xl font-black text-white mb-2">{confirmDialog.title}</h3>
            <p className="text-slate-400 text-sm mb-7 leading-relaxed">{confirmDialog.message}</p>
            <div className="flex gap-3">
              <button
                onClick={closeConfirm}
                className="flex-1 bg-slate-800 hover:bg-slate-700 py-3 rounded-2xl font-black text-sm text-slate-300 uppercase tracking-widest transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className={`flex-1 ${confirmDialog.confirmColor || 'bg-red-600 hover:bg-red-500'} py-3 rounded-2xl font-black text-sm text-white uppercase tracking-widest transition-all active:scale-95`}
              >
                {confirmDialog.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRM DIALOG */}
      {confirmDialog.open && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 p-8 rounded-3xl w-full max-w-sm shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-5">
              <AlertTriangle size={28} className="text-red-400" />
            </div>
            <h3 className="text-xl font-black text-white mb-2">{confirmDialog.title}</h3>
            <p className="text-slate-400 text-sm mb-7 leading-relaxed">{confirmDialog.message}</p>
            <div className="flex gap-3">
              <button onClick={closeConfirm} className="flex-1 bg-slate-800 hover:bg-slate-700 py-3 rounded-2xl font-black text-sm text-slate-300 uppercase tracking-widest transition-all">
                Cancel
              </button>
              <button onClick={confirmDialog.onConfirm} className={`flex-1 ${confirmDialog.confirmColor || 'bg-red-600 hover:bg-red-500'} py-3 rounded-2xl font-black text-sm text-white uppercase tracking-widest transition-all active:scale-95`}>
                {confirmDialog.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
