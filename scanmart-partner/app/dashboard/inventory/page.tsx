"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
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
  Calendar,
  Truck,
  PackagePlus,
  ShieldAlert
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Paginator from "@/components/Paginator";
import DateRangePicker from "@/components/ui/DateRangePicker";
import { useApp } from "@/lib/AppContext";

const INV_PAGE_SIZE = 20;

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
  discount_percent: number; // 🔥 Product-level discount
  created_at: string;
  last_sold_at: string | null;
  shop_id: string | null;
  is_active: boolean;
  sales_count?: number;
  // 💊 Multi-unit fields
  pack_size?: number;
  strip_size?: number;
  sell_unit?: string;
}

// 💊 Category-based packaging defaults
const CATEGORY_PACKAGING: Record<string, { pack_size: number; strip_size: number; sell_unit: string }> = {
  'Tablet': { pack_size: 10, strip_size: 10, sell_unit: 'strip' },
  'Capsule': { pack_size: 10, strip_size: 10, sell_unit: 'strip' },
  'Syrup': { pack_size: 1, strip_size: 1, sell_unit: 'piece' },
  'Injection': { pack_size: 1, strip_size: 1, sell_unit: 'piece' },
  'Ointment': { pack_size: 1, strip_size: 1, sell_unit: 'piece' },
  'Cream': { pack_size: 1, strip_size: 1, sell_unit: 'piece' },
  'Drops': { pack_size: 1, strip_size: 1, sell_unit: 'piece' },
  'Sachet': { pack_size: 1, strip_size: 10, sell_unit: 'strip' },
  'Pharmacy': { pack_size: 10, strip_size: 10, sell_unit: 'strip' },
  'General': { pack_size: 1, strip_size: 1, sell_unit: 'piece' },
};

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

interface BatchItem {
  id: string;
  product_id: string;
  store_id: string;
  batch_number: string;
  expiry_date: string;
  quantity: number;
  buying_price: number;
  created_at: string;
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
  const { t } = useApp();
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

  // 🗓️ BATCH TRACKING STATE
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [batchProduct, setBatchProduct] = useState<InventoryItem | null>(null);
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [newBatch, setNewBatch] = useState({ batch_number: '', expiry_date: '', quantity: '', buying_price: '' });
  const [batchSaving, setBatchSaving] = useState(false);

  // 💊 Pharmacy Import State
  const [importMode, setImportMode] = useState<'basic' | 'pharmacy'>('basic');
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importSupplierName, setImportSupplierName] = useState('');
  const [isImporting, setIsImporting] = useState(false);

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
  // 🔥 Report Date Filter State — now using DateRange object
  const [reportDateRange, setReportDateRange] = useState<{ from: Date | null; to: Date | null }>({ from: null, to: null });

  // Form States
  const [newItem, setNewItem] = useState({
    name: "",
    price: "",
    mrp: "",
    stock: "",
    category: "General",
    barcode: "",
    image: "",
    supplier_id: "",
    buying_price: "",
    gst_rate: "18",
    discount_percent: "0", // 🔥 Discount field
    // 💊 Multi-unit packaging
    pack_size: "1",
    strip_size: "1",
    sell_unit: "piece",
    stock_boxes: "", // User enters boxes, we convert to tablets
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
  const [deadStockSort, setDeadStockSort] = useState<"none" | "high_value" | "low_value">("none"); // 🔥 Dead stock sub-filter
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

  // Reset page on search or filter change
  useEffect(() => { setCurrentPage(1); }, [searchTerm, filterType, showArchived]);

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
    const storeId = localStorage.getItem("active_store_id");
    const query = supabase.from("suppliers").select("id, name");
    const { data } = storeId ? await query.eq("store_id", storeId) : await query;
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
        if (error) { toast.error("Archive failed: " + error.message); fetchData(); }
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
        if (error) { toast.error("Restore failed: " + error.message); fetchData(); }
      },
      "Restore",
      "bg-green-600 hover:bg-green-500"
    );
  };

  // --- 🟢 ADD PRODUCT (Fixed for Multi-Store + Multi-Unit) ---
  const handleAddItem = async () => {
    if (!newItem.name || !newItem.price) return alert("Name & Price required!");
    if (!activeStoreId) return alert("No active store selected!");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 💊 Calculate total stock in tablets (smallest unit)
    const packSize = Number(newItem.pack_size) || 1;
    const stripSize = Number(newItem.strip_size) || 1;
    const stockBoxes = Number(newItem.stock_boxes) || 0;
    const manualStock = Number(newItem.stock) || 0;
    // If user entered boxes, convert to tablets. Otherwise use manual stock.
    const totalStock = stockBoxes > 0 ? stockBoxes * packSize * stripSize : manualStock;

    const { error } = await supabase.from("inventory").insert([
      {
        name: newItem.name,
        price: Number(newItem.price),
        mrp: Number(newItem.mrp) || Number(newItem.price),
        buying_price: Number(newItem.buying_price) || 0,
        gst_rate: Number(newItem.gst_rate) || 18,
        stock: totalStock,
        category: newItem.category,
        barcode: newItem.barcode || null,
        image: newItem.image || null,
        supplier_id: newItem.supplier_id || null,
        store_id: activeStoreId,
        last_sold_at: null,
        is_active: true,
        // 💊 Multi-unit fields
        pack_size: packSize,
        strip_size: stripSize,
        sell_unit: newItem.sell_unit || 'piece',
      },
    ]);
    if (error) toast.error(error.message);
    else {
      setIsAddOpen(false);
      resetForm();
      fetchData();
      toast.success(`Product added! Stock: ${totalStock} units`);
    }
  };

  const resetForm = () => {
    setNewItem({
      name: "", price: "", mrp: "", stock: "", category: "General",
      barcode: "", image: "", supplier_id: "", buying_price: "", gst_rate: "18",
      discount_percent: "0",
      pack_size: "1", strip_size: "1", sell_unit: "piece", stock_boxes: "",
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
        discount_percent: Number(editItem.discount_percent) || 0,
        barcode: editItem.barcode || null,
        image: editItem.image || null,
        supplier_id: editItem.supplier_id || null,
        // 💊 Multi-unit fields
        pack_size: Number(editItem.pack_size) || 1,
        strip_size: Number(editItem.strip_size) || 1,
        sell_unit: editItem.sell_unit || 'piece',
      })
      .eq("id", editItem.id);

    if (error) toast.error("Update failed: " + error.message);
    else {
      setIsEditOpen(false);
      setEditItem(null);
      fetchData();
      toast.success("Product updated!");
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
          toast.success(`${newProducts.length} items imported!`);
          setIsImportOpen(false);
          fetchData();
        }
      }
    };
    reader.readAsText(file);
  };

  // --- 💊 PHARMACY CSV IMPORT ---
  const parseExpiry = (raw: string): string => {
    const clean = (raw || '').trim();
    if (!clean) return '';
    const parts = clean.split('/');
    if (parts.length === 2) {
      const month = parts[0].padStart(2, '0');
      const year = parts[1].length === 2 ? `20${parts[1]}` : parts[1];
      return `${year}-${month}-01`;
    }
    return clean;
  };

  const handlePharmacyFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeStoreId) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) { toast.error('CSV empty or header only'); return; }
      const rows = lines.slice(1).map(line => {
        const cols = line.split(',');
        const qty = Number(cols[2]?.trim()) || 0;
        const qtyFree = Number(cols[3]?.trim()) || 0;
        const totalStock = qty + qtyFree;
        const rate = Number(cols[7]?.trim()) || 0;
        const effectiveCost = totalStock > 0 ? Math.round((qty * rate / totalStock) * 100) / 100 : rate;
        const sgst = Number(cols[9]?.trim()) || 0;
        const cgst = Number(cols[10]?.trim()) || 0;
        return {
          product_name: cols[0]?.trim() || '',
          hsn: cols[1]?.trim() || '3004',
          qty, qty_free: qtyFree, total_stock: totalStock,
          batch_no: cols[4]?.trim() || '',
          expiry_raw: cols[5]?.trim() || '',
          expiry_date: parseExpiry(cols[5]?.trim() || ''),
          mrp: Number(cols[6]?.trim()) || 0,
          rate, effective_cost: effectiveCost,
          discount: Number(cols[8]?.trim()) || 0,
          gst_rate: sgst + cgst,
          supplier_name: cols[11]?.trim() || '',
        };
      }).filter(r => r.product_name && r.total_stock > 0);
      if (rows.length === 0) { toast.error('No valid rows found. Check CSV format.'); return; }
      setImportPreview(rows);
      if (rows[0]?.supplier_name) setImportSupplierName(rows[0].supplier_name);
    };
    reader.readAsText(file);
  };

  const handleConfirmPharmacyImport = async () => {
    if (!activeStoreId || importPreview.length === 0) return;
    setIsImporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let supplierId: string | null = null;
      if (importSupplierName.trim()) {
        const { data: existing } = await supabase.from('suppliers').select('id')
          .eq('name', importSupplierName.trim()).eq('store_id', activeStoreId).maybeSingle();
        if (existing) {
          supplierId = existing.id;
        } else {
          const { data: ns } = await supabase.from('suppliers')
            .insert({ name: importSupplierName.trim(), store_id: activeStoreId, owner_id: user?.id })
            .select('id').single();
          supplierId = ns?.id || null;
        }
      }
      let newCount = 0, updateCount = 0;
      for (const row of importPreview) {
        const { data: existingProd } = await supabase.from('inventory').select('id, stock')
          .eq('name', row.product_name).eq('store_id', activeStoreId).eq('is_active', true).maybeSingle();
        let productId = '';
        if (existingProd) {
          await supabase.from('inventory').update({
            stock: existingProd.stock + row.total_stock,
            buying_price: row.effective_cost, mrp: row.mrp, price: row.mrp,
            ...(supplierId ? { supplier_id: supplierId } : {}),
          }).eq('id', existingProd.id);
          productId = existingProd.id; updateCount++;
        } else {
          const { data: np } = await supabase.from('inventory').insert({
            name: row.product_name, stock: row.total_stock,
            mrp: row.mrp, price: row.mrp, buying_price: row.effective_cost,
            gst_rate: row.gst_rate || 5, category: 'Pharmacy',
            store_id: activeStoreId, supplier_id: supplierId, is_active: true, last_sold_at: null,
          }).select('id').single();
          productId = np?.id || ''; newCount++;
        }
        if (productId && row.batch_no && row.expiry_date) {
          await supabase.from('inventory_batches').insert({
            product_id: productId, store_id: activeStoreId,
            batch_number: row.batch_no, expiry_date: row.expiry_date,
            quantity: row.total_stock, buying_price: row.effective_cost,
          });
        }
      }
      toast.success(`✅ ${newCount} new + ${updateCount} updated!`);
      setImportPreview([]); setImportSupplierName('');
      setIsImportOpen(false); fetchData(); fetchSuppliers();
    } catch (err: any) {
      toast.error('Import failed: ' + (err.message || 'Unknown error'));
    } finally { setIsImporting(false); }
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

    if (error) toast.error("Transfer failed: " + error.message);
    else {
      toast.success("Transfer request sent!");
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
    if (reportDateRange.from) {
      const startDate = new Date(reportDateRange.from);
      startDate.setHours(0, 0, 0, 0);
      const endDate = reportDateRange.to ? new Date(reportDateRange.to) : new Date();
      endDate.setHours(23, 59, 59, 999); // Include full end day

      dataToExport = dataToExport.filter(item => {
        const itemDate = new Date(item.created_at);
        return itemDate >= startDate && itemDate <= endDate;
      });
      const fmtDate = (d: Date) => `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`;
      title += ` (${fmtDate(startDate)} to ${fmtDate(endDate)})`;
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
      case "dead_stock": {
        let dead = filtered.filter(p => {
          if (!p.last_sold_at) return false;
          const lastSold = new Date(p.last_sold_at);
          const diffDays = Math.ceil((now.getTime() - lastSold.getTime()) / (1000 * 3600 * 24));
          return diffDays > 90;
        });
        // 🔥 High/Low value sub-filter
        if (deadStockSort === "high_value") dead = dead.sort((a, b) => (b.stock * b.buying_price) - (a.stock * a.buying_price));
        if (deadStockSort === "low_value") dead = dead.sort((a, b) => (a.stock * a.buying_price) - (b.stock * b.buying_price));
        return dead;
      }
      case "most_profitable": return filtered.sort((a, b) => (b.price - b.buying_price) - (a.price - a.buying_price));
      case "top_selling": return filtered;
      default: return filtered;
    }
  };

  const filteredProducts = getProcessedProducts();
  const totalStockValue = filteredProducts.reduce((sum, item) => sum + (item.stock * item.buying_price), 0);
  // Paginated slice
  const pagedProducts = filteredProducts.slice(
    (currentPage - 1) * INV_PAGE_SIZE,
    currentPage * INV_PAGE_SIZE
  );

  const getAgingStatus = (lastSoldDate: string | null) => {
    if (!lastSoldDate) return { label: "New", color: "text-blue-400" };
    const days = Math.ceil((new Date().getTime() - new Date(lastSoldDate).getTime()) / (1000 * 3600 * 24));
    if (days < 30) return { label: "Fresh", color: "text-green-400" };
    if (days < 90) return { label: "Slow", color: "text-yellow-400" };
    return { label: "Dead Stock", color: "text-red-500 font-black animate-pulse" };
  };

  // 🗓️ BATCH FUNCTIONS
  const getExpiryStatus = (expiryDate: string) => {
    const today = new Date();
    const exp = new Date(expiryDate);
    const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 3600 * 24));
    if (diffDays < 0) return { label: 'Expired', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: '🔴' };
    if (diffDays <= 30) return { label: `${diffDays}d left`, color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: '🟡' };
    return { label: `${diffDays}d left`, color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: '🟢' };
  };

  const openBatchManager = async (product: InventoryItem) => {
    setBatchProduct(product);
    setIsBatchOpen(true);
    setBatchLoading(true);
    const { data } = await supabase
      .from('inventory_batches')
      .select('*')
      .eq('product_id', product.id)
      .eq('store_id', activeStoreId)
      .order('expiry_date', { ascending: true });
    setBatches(data || []);
    setBatchLoading(false);
  };

  const handleAddBatch = async () => {
    if (!newBatch.batch_number || !newBatch.expiry_date || !newBatch.quantity) {
      alert('Batch number, expiry date aur quantity required hai!');
      return;
    }
    setBatchSaving(true);
    const { data, error } = await supabase.from('inventory_batches').insert({
      product_id: batchProduct?.id,
      store_id: activeStoreId,
      batch_number: newBatch.batch_number,
      expiry_date: newBatch.expiry_date,
      quantity: Number(newBatch.quantity),
      buying_price: Number(newBatch.buying_price) || 0,
    }).select().single();
    if (error) { alert('Error: ' + error.message); }
    else { setBatches(prev => [...prev, data].sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime())); }
    setNewBatch({ batch_number: '', expiry_date: '', quantity: '', buying_price: '' });
    setBatchSaving(false);
  };

  const handleDeleteBatch = async (batchId: string) => {
    await supabase.from('inventory_batches').delete().eq('id', batchId);
    setBatches(prev => prev.filter(b => b.id !== batchId));
  };


  return (
    <div className="p-4 md:p-8 bg-[#020617] min-h-screen text-white font-sans pb-32">

      {/* 🚀 HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black italic uppercase flex items-center gap-2">
            <Store className="text-blue-500" />
            {showArchived ? <span className="text-red-500">{t('archive')}</span> : <>{t('inventory')}<span className="text-blue-600">MANAGER</span></>}
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
                <Upload size={16} /> {t('import_csv')}
              </button>
              <button onClick={() => setIsAddOpen(true)} className="bg-blue-600 px-4 py-3 rounded-xl flex items-center gap-2 hover:bg-blue-700 transition-all text-xs font-bold uppercase shadow-lg shadow-blue-900/20 text-white">
                <Plus size={16} /> {t('add_product')}
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
            <button onClick={() => { setFilterType('dead_stock'); setDeadStockSort('none'); }} className={`px-3 py-2 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center gap-1 ${filterType === 'dead_stock' ? 'bg-red-600 text-white' : 'text-slate-500 hover:text-red-500'}`}><AlertTriangle size={12} /> Dead Stock</button>
            <button onClick={() => setFilterType('low_stock')} className={`px-3 py-2 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center gap-1 ${filterType === 'low_stock' ? 'bg-orange-600 text-white' : 'text-slate-500 hover:text-orange-500'}`}><TrendingDown size={12} /> Low Stock</button>
          </div>

          {/* 🔥 Dead Stock High/Low Value Sub-Filter */}
          {filterType === 'dead_stock' && (
            <div className="bg-red-950/40 border border-red-800/40 p-1 rounded-lg flex gap-1">
              <span className="text-[9px] font-bold text-red-400 uppercase px-2 flex items-center">Sort by Value:</span>
              <button onClick={() => setDeadStockSort('none')} className={`px-2 py-1 rounded text-[9px] font-bold uppercase transition-all ${deadStockSort === 'none' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-white'}`}>Default</button>
              <button onClick={() => setDeadStockSort('high_value')} className={`px-2 py-1 rounded text-[9px] font-bold uppercase transition-all ${deadStockSort === 'high_value' ? 'bg-red-600 text-white' : 'text-red-400 hover:text-white'}`}>↑ High Value</button>
              <button onClick={() => setDeadStockSort('low_value')} className={`px-2 py-1 rounded text-[9px] font-bold uppercase transition-all ${deadStockSort === 'low_value' ? 'bg-orange-600 text-white' : 'text-orange-400 hover:text-white'}`}>↓ Low Value</button>
            </div>
          )}

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
              <div className="absolute right-0 top-full mt-2 w-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100">
                {/* 🔥 Custom DateRangePicker */}
                <div className="p-3 border-b border-slate-800">
                  <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1 mb-2"><Calendar size={10} /> Date Filter</p>
                  <DateRangePicker
                    value={reportDateRange}
                    onChange={setReportDateRange}
                    placeholder="All dates"
                    className="w-full"
                  />
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
                <th className="p-5">{t('product_name')}</th>
                <th className="p-5">{t('category')}</th>
                <th className="p-5">{t('price')} (Margin)</th>
                <th className="p-5">{t('stock')}</th>
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
                pagedProducts.map((item) => {
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
                        {(() => {
                          const ps = Number(item.pack_size) || 1;
                          const ss = Number(item.strip_size) || 1;
                          const isTablet = ps > 1 || ss > 1;
                          const strips = isTablet ? Math.floor(item.stock / ss) : item.stock;
                          const loose = isTablet ? item.stock % ss : 0;
                          const label = isTablet
                            ? `${strips}s${loose > 0 ? `+${loose}t` : ''}`
                            : `${item.stock}`;
                          return <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${item.stock < 10 ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>{label} {isTablet ? 'strips' : 'UNITS'}</span>;
                        })()}
                      </td>
                      <td className="p-5 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          {showArchived ? (
                            <button onClick={() => handleRestoreItem(item.id)} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                              <RotateCcw size={14} /> Restore
                            </button>
                          ) : (
                            <>
                              <button onClick={() => openBatchManager(item)} className="p-2 bg-slate-800 hover:bg-orange-600 text-slate-400 hover:text-orange-300 rounded-lg transition-all" title="Manage Batches"><PackagePlus size={14} /></button>
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
        {/* Paginator */}
        <div className="px-6 py-4 border-t border-slate-800">
          <Paginator
            currentPage={currentPage}
            totalItems={filteredProducts.length}
            pageSize={INV_PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {/* 🗓️ BATCH MANAGER MODAL */}
      {isBatchOpen && batchProduct && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-[2rem] w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-black uppercase italic flex items-center gap-2 text-orange-400">
                  <PackagePlus size={20} /> Batch Manager
                </h2>
                <p className="text-slate-400 text-xs font-bold mt-0.5">{batchProduct.name}</p>
              </div>
              <button onClick={() => setIsBatchOpen(false)} className="bg-slate-800 p-2 rounded-full hover:bg-slate-700"><XCircle size={20} /></button>
            </div>

            {/* Existing Batches */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              <p className="text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-3">Existing Batches (FEFO Order — First Expiry First Out)</p>
              {batchLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin text-orange-500" size={28} /></div>
              ) : batches.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm font-bold">No batches yet — add one below 👇</div>
              ) : (
                batches.map(batch => {
                  const expStatus = getExpiryStatus(batch.expiry_date);
                  return (
                    <div key={batch.id} className={`flex justify-between items-center p-4 rounded-xl border ${expStatus.color} bg-opacity-10`}>
                      <div>
                        <p className="font-bold text-sm text-white">{expStatus.icon} {batch.batch_number}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Expiry: <span className="font-bold">{new Date(batch.expiry_date).toLocaleDateString('en-IN')}</span>
                          &nbsp;•&nbsp; Qty: <span className="font-bold">{batch.quantity}</span>
                          &nbsp;•&nbsp; Buy: ₹{batch.buying_price}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-black px-2 py-1 rounded-full border ${expStatus.color}`}>{expStatus.label}</span>
                        <button onClick={() => handleDeleteBatch(batch.id)} className="p-1.5 bg-red-500/10 hover:bg-red-500/30 text-red-400 rounded-lg transition-all"><Trash2 size={12} /></button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Add New Batch Form */}
            <div className="p-6 border-t border-slate-800 bg-slate-950/50 rounded-b-[2rem]">
              <p className="text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-3 flex items-center gap-1"><ShieldAlert size={12} /> Add New Batch</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold uppercase text-slate-500">Batch Number</label>
                  <input type="text" placeholder="e.g. BATCH-A23" value={newBatch.batch_number}
                    onChange={e => setNewBatch({ ...newBatch, batch_number: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm font-bold outline-none focus:border-orange-500 mt-1" />
                </div>
                <div>
                  <label className="text-[9px] font-bold uppercase text-slate-500">Expiry Date</label>
                  <input type="date" value={newBatch.expiry_date}
                    onChange={e => setNewBatch({ ...newBatch, expiry_date: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm font-bold outline-none focus:border-orange-500 mt-1 text-white" />
                </div>
                <div>
                  <label className="text-[9px] font-bold uppercase text-slate-500">Quantity</label>
                  <input type="number" placeholder="e.g. 50" value={newBatch.quantity}
                    onChange={e => setNewBatch({ ...newBatch, quantity: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm font-bold outline-none focus:border-orange-500 mt-1" />
                </div>
                <div>
                  <label className="text-[9px] font-bold uppercase text-slate-500">Buying Price (₹)</label>
                  <input type="number" placeholder="e.g. 45" value={newBatch.buying_price}
                    onChange={e => setNewBatch({ ...newBatch, buying_price: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm font-bold outline-none focus:border-orange-500 mt-1" />
                </div>
              </div>
              <button onClick={handleAddBatch} disabled={batchSaving}
                className="w-full mt-4 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 py-3 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95">
                {batchSaving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Add Batch
              </button>
            </div>
          </div>
        </div>
      )}

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

              {/* 💊 Category + Packaging Auto-Defaults */}
              <div>
                <label className="text-[10px] font-bold uppercase text-purple-400 mb-1 block">📦 Category (auto-sets packaging)</label>
                <select className="w-full bg-slate-800 p-3 rounded-xl border border-slate-700 outline-none text-white cursor-pointer"
                  value={newItem.category}
                  onChange={(e) => {
                    const cat = e.target.value;
                    const defaults = CATEGORY_PACKAGING[cat] || CATEGORY_PACKAGING['General'];
                    setNewItem({
                      ...newItem,
                      category: cat,
                      pack_size: String(defaults.pack_size),
                      strip_size: String(defaults.strip_size),
                      sell_unit: defaults.sell_unit,
                    });
                  }}
                >
                  {Object.keys(CATEGORY_PACKAGING).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* 💊 Packaging: Pack Size + Strip Size */}
              {(Number(newItem.pack_size) > 1 || Number(newItem.strip_size) > 1 || newItem.category === 'Tablet' || newItem.category === 'Capsule' || newItem.category === 'Pharmacy') && (
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 space-y-2">
                  <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">📦 Packaging Details</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase">Strips/Box</label>
                      <input type="number" min="1" className="w-full bg-slate-800 p-2 rounded-lg border border-slate-700 text-white font-bold text-center outline-none focus:border-purple-500"
                        value={newItem.pack_size}
                        onChange={(e) => setNewItem({ ...newItem, pack_size: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase">Tabs/Strip</label>
                      <input type="number" min="1" className="w-full bg-slate-800 p-2 rounded-lg border border-slate-700 text-white font-bold text-center outline-none focus:border-purple-500"
                        value={newItem.strip_size}
                        onChange={(e) => setNewItem({ ...newItem, strip_size: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase">Sell As</label>
                      <select className="w-full bg-slate-800 p-2 rounded-lg border border-slate-700 text-white font-bold outline-none focus:border-purple-500 cursor-pointer"
                        value={newItem.sell_unit}
                        onChange={(e) => setNewItem({ ...newItem, sell_unit: e.target.value })}
                      >
                        <option value="box">📦 Box</option>
                        <option value="strip">💊 Strip</option>
                        <option value="tablet">💉 Tablet</option>
                      </select>
                    </div>
                  </div>
                  {/* 💊 Boxes input → auto-convert */}
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase">Boxes in Stock</label>
                    <div className="flex items-center gap-2">
                      <input type="number" min="0" placeholder="e.g. 2"
                        className="w-24 bg-slate-800 p-2 rounded-lg border border-purple-500/30 text-purple-400 font-bold text-center outline-none focus:border-purple-500"
                        value={newItem.stock_boxes}
                        onChange={(e) => {
                          const boxes = Number(e.target.value) || 0;
                          const total = boxes * (Number(newItem.pack_size) || 1) * (Number(newItem.strip_size) || 1);
                          setNewItem({ ...newItem, stock_boxes: e.target.value, stock: String(total) });
                        }}
                      />
                      <span className="text-[10px] text-slate-400 font-bold">
                        = {Number(newItem.stock) || 0} tablets total
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <input type="number" placeholder="MRP (per strip)" className="w-full bg-slate-800 p-3 rounded-xl border border-slate-700 outline-none" value={newItem.mrp} onChange={e => setNewItem({ ...newItem, mrp: e.target.value })} />
                <input type="number" placeholder="Price (per strip)" className="w-full bg-slate-800 p-3 rounded-xl border border-slate-700 outline-none" value={newItem.price} onChange={e => setNewItem({ ...newItem, price: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input type="number" placeholder="Buy Price" className="w-full bg-slate-800 p-3 rounded-xl border border-slate-700 outline-none" value={newItem.buying_price} onChange={e => setNewItem({ ...newItem, buying_price: e.target.value })} />
                {/* Only show manual stock if packaging section is hidden */}
                {!(Number(newItem.pack_size) > 1 || Number(newItem.strip_size) > 1 || newItem.category === 'Tablet' || newItem.category === 'Capsule' || newItem.category === 'Pharmacy') && (
                  <input type="number" placeholder="Stock" className="w-full bg-slate-800 p-3 rounded-xl border border-slate-700 outline-none" value={newItem.stock} onChange={e => setNewItem({ ...newItem, stock: e.target.value })} />
                )}
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

              {/* 🔥 Discount Field */}
              <div className="relative">
                <label className="text-[10px] font-bold uppercase text-orange-400 mb-1 block flex items-center gap-1">% Discount (Optional)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number" min="0" max="100" placeholder="0"
                    className="w-32 bg-slate-800 p-3 rounded-xl border border-orange-500/30 outline-none focus:border-orange-500 text-orange-400 font-bold text-center"
                    value={newItem.discount_percent}
                    onChange={e => setNewItem({ ...newItem, discount_percent: e.target.value })}
                  />
                  <span className="text-slate-400 text-sm font-bold">% OFF</span>
                  {Number(newItem.discount_percent) > 0 && newItem.price && (
                    <span className="text-green-400 text-xs font-bold">
                      → Sale: ₹{Math.round(Number(newItem.price) * (1 - Number(newItem.discount_percent) / 100))}
                    </span>
                  )}
                </div>
              </div>

              <button onClick={handleAddItem} className="w-full bg-blue-600 hover:bg-blue-700 py-4 rounded-2xl font-black mt-2 transition-all">SAVE PRODUCT</button>
              <button onClick={() => setIsAddOpen(false)} className="w-full text-slate-500 py-2">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* \ud83d\udfe1 IMPORT MODAL — Basic + Pharmacy */}
      {isImportOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-start justify-center z-[100] p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-[2rem] w-full max-w-3xl shadow-2xl my-8">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-slate-800">
              <h2 className="text-xl font-black uppercase italic flex items-center gap-2 text-blue-400">
                <Upload size={20} /> Bulk Import
              </h2>
              <button onClick={() => { setIsImportOpen(false); setImportPreview([]); setImportSupplierName(''); }}
                className="bg-slate-800 p-2 rounded-full hover:bg-slate-700"><XCircle size={20} /></button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-4 border-b border-slate-800 bg-slate-950/40">
              <button onClick={() => { setImportMode('basic'); setImportPreview([]); }}
                className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${importMode === 'basic' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
                📦 Basic CSV
              </button>
              <button onClick={() => { setImportMode('pharmacy'); setImportPreview([]); }}
                className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${importMode === 'pharmacy' ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
                💊 Pharmacy Bill CSV
              </button>
            </div>

            <div className="p-6">
              {/* BASIC MODE */}
              {importMode === 'basic' && (
                <div className="text-center space-y-6">
                  <div className="text-left bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <h4 className="text-[10px] font-bold uppercase text-slate-400 mb-2 flex items-center gap-1"><Info size={12} /> Basic CSV Format</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[10px] text-slate-400">
                        <thead className="text-white border-b border-slate-800">
                          <tr><th className="py-1 pr-2">Name</th><th className="py-1 pr-2">Category</th><th className="py-1 pr-2">Barcode</th><th className="py-1 pr-2">MRP</th><th className="py-1 pr-2">Price</th><th className="py-1 pr-2">BuyPrice</th><th className="py-1 pr-2">Stock</th><th className="py-1">GST</th></tr>
                        </thead>
                        <tbody><tr><td className="py-1">Paracetamol</td><td>Pharmacy</td><td>-</td><td>10</td><td>10</td><td>6</td><td>100</td><td>5</td></tr></tbody>
                      </table>
                    </div>
                  </div>
                  <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" id="csv-basic-upload" />
                  <label htmlFor="csv-basic-upload" className="block w-full bg-blue-600 hover:bg-blue-700 py-4 rounded-2xl font-black cursor-pointer transition-all text-sm uppercase tracking-widest">
                    📂 Choose Basic CSV File
                  </label>
                </div>
              )}

              {/* PHARMACY MODE */}
              {importMode === 'pharmacy' && (
                <div className="space-y-5">
                  {/* Format Guide */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-green-900/40">
                    <h4 className="text-[10px] font-bold uppercase text-green-400 mb-3 flex items-center gap-1">
                      <Info size={12} /> Pharmacy CSV Format (Gemini se banao ya distributor se lo)
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[9px] text-slate-400">
                        <thead className="text-green-400 border-b border-slate-800">
                          <tr>
                            {['product_name','hsn','qty','qty_free','batch_no','expiry','mrp','rate','discount','sgst','cgst','supplier_name'].map(h => (
                              <th key={h} className="py-1 pr-2 text-left font-bold">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="text-slate-500">
                            <td className="py-1 pr-2">LEGITEM-100 TAB 10</td>
                            <td className="pr-2">3004</td><td className="pr-2">30</td><td className="pr-2">30</td>
                            <td className="pr-2">SPI251924</td><td className="pr-2">5/27</td>
                            <td className="pr-2">70.31</td><td className="pr-2">53.91</td>
                            <td className="pr-2">3</td><td className="pr-2">2.5</td><td className="pr-2">2.5</td>
                            <td>Parshuram Pharma</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <p className="text-[9px] text-slate-500 mt-2">💡 Tip: Bill ki photo Gemini ko do → "Convert to Excel/CSV" bolo → Download karo → Upload karo</p>
                  </div>

                  {/* Upload Button (show only if no preview) */}
                  {importPreview.length === 0 && (
                    <>
                      <input type="file" accept=".csv" onChange={handlePharmacyFileUpload} className="hidden" id="csv-pharma-upload" />
                      <label htmlFor="csv-pharma-upload" className="block w-full bg-green-600 hover:bg-green-700 py-4 rounded-2xl font-black cursor-pointer transition-all text-center text-sm uppercase tracking-widest">
                        💊 Choose Pharmacy Bill CSV
                      </label>
                    </>
                  )}

                  {/* PREVIEW TABLE */}
                  {importPreview.length > 0 && (
                    <div className="space-y-4">
                      {/* Supplier Row */}
                      <div className="flex items-center gap-3 bg-slate-800 p-3 rounded-xl border border-slate-700">
                        <Truck size={16} className="text-green-400 shrink-0" />
                        <span className="text-[10px] font-bold uppercase text-slate-400">Supplier:</span>
                        <input
                          type="text" value={importSupplierName}
                          onChange={e => setImportSupplierName(e.target.value)}
                          placeholder="Supplier name (auto-saved)"
                          className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm font-bold outline-none focus:border-green-500"
                        />
                        <span className="text-[9px] text-green-400 font-bold uppercase">Auto-Save ✅</span>
                      </div>

                      {/* Stats */}
                      <div className="flex gap-3">
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 flex-1 text-center">
                          <p className="text-2xl font-black text-blue-400">{importPreview.length}</p>
                          <p className="text-[9px] font-bold uppercase text-slate-500">Items</p>
                        </div>
                        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 flex-1 text-center">
                          <p className="text-2xl font-black text-green-400">{importPreview.reduce((s, r) => s + r.total_stock, 0)}</p>
                          <p className="text-[9px] font-bold uppercase text-slate-500">Total Stock</p>
                        </div>
                        <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 flex-1 text-center">
                          <p className="text-2xl font-black text-orange-400">₹{importPreview.reduce((s, r) => s + (r.qty * r.rate), 0).toFixed(0)}</p>
                          <p className="text-[9px] font-bold uppercase text-slate-500">Bill Amount</p>
                        </div>
                      </div>

                      {/* 🔍 BILL AUDIT SUMMARY */}
                      {(() => {
                        // --- Audit Calculations ---
                        const billSubtotal = importPreview.reduce((s, r) => s + (r.qty * r.rate), 0);
                        const billGstTotal = importPreview.reduce((s, r) => {
                          const lineBase = r.qty * r.rate * (1 - (r.discount || 0) / 100);
                          return s + (lineBase * (r.gst_rate || 0) / 100);
                        }, 0);
                        const billGrandTotal = importPreview.reduce((s, r) => {
                          const lineBase = r.qty * r.rate * (1 - (r.discount || 0) / 100);
                          return s + lineBase + (lineBase * (r.gst_rate || 0) / 100);
                        }, 0);
                        const freeGoodsValue = importPreview.reduce((s, r) => s + (r.qty_free * r.rate), 0);

                        // Duplicate check
                        const nameCount: Record<string, number> = {};
                        importPreview.forEach(r => { nameCount[r.product_name] = (nameCount[r.product_name] || 0) + 1; });
                        const duplicates = Object.entries(nameCount).filter(([, c]) => c > 1);

                        // Rate comparison with existing inventory
                        const rateFlags = importPreview.map(r => {
                          const existing = products.find(p => p.name === r.product_name && p.is_active);
                          if (!existing) return { ...r, flag: 'new', oldRate: 0, diff: 0 };
                          const diff = r.rate - existing.buying_price;
                          const pctDiff = existing.buying_price > 0 ? Math.abs(diff / existing.buying_price) * 100 : 0;
                          if (pctDiff > 10) return { ...r, flag: 'high_diff', oldRate: existing.buying_price, diff, pctDiff };
                          if (pctDiff > 0) return { ...r, flag: 'minor_diff', oldRate: existing.buying_price, diff, pctDiff };
                          return { ...r, flag: 'ok', oldRate: existing.buying_price, diff: 0, pctDiff: 0 };
                        });
                        const highDiffItems = rateFlags.filter(r => r.flag === 'high_diff');
                        const newItems = rateFlags.filter(r => r.flag === 'new');

                        // Line-level math check: rate × qty after discount + GST
                        const lineErrors = importPreview.map((r, i) => {
                          const base = r.qty * r.rate;
                          const afterDisc = base * (1 - (r.discount || 0) / 100);
                          const withGst = afterDisc + (afterDisc * (r.gst_rate || 0) / 100);
                          return { idx: i + 1, name: r.product_name, base, afterDisc, withGst, effective: r.effective_cost * r.total_stock };
                        });

                        const issueCount = highDiffItems.length + duplicates.length;
                        const auditStatus = issueCount > 0 ? 'warning' : 'clean';

                        return (
                          <div className={`rounded-xl border p-4 space-y-3 ${auditStatus === 'clean' ? 'bg-green-500/5 border-green-500/20' : 'bg-yellow-500/5 border-yellow-500/20'}`}>
                            <div className="flex items-center justify-between">
                              <h4 className={`text-[11px] font-black uppercase tracking-widest flex items-center gap-2 ${auditStatus === 'clean' ? 'text-green-400' : 'text-yellow-400'}`}>
                                <ShieldAlert size={14} /> Bill Audit Report
                              </h4>
                              <span className={`text-[9px] font-black px-2 py-1 rounded-full ${auditStatus === 'clean' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                {auditStatus === 'clean' ? '✅ ALL CLEAR' : `⚠️ ${issueCount} FLAG${issueCount > 1 ? 'S' : ''}`}
                              </span>
                            </div>

                            {/* Bill Totals Breakdown */}
                            <div className="grid grid-cols-4 gap-2 text-center">
                              <div className="bg-slate-800/60 rounded-lg p-2">
                                <p className="text-[9px] text-slate-500 font-bold uppercase">Subtotal</p>
                                <p className="text-sm font-black text-white">₹{billSubtotal.toFixed(0)}</p>
                              </div>
                              <div className="bg-slate-800/60 rounded-lg p-2">
                                <p className="text-[9px] text-slate-500 font-bold uppercase">GST</p>
                                <p className="text-sm font-black text-blue-400">+₹{billGstTotal.toFixed(0)}</p>
                              </div>
                              <div className="bg-slate-800/60 rounded-lg p-2">
                                <p className="text-[9px] text-slate-500 font-bold uppercase">Grand Total</p>
                                <p className="text-sm font-black text-green-400">₹{billGrandTotal.toFixed(0)}</p>
                              </div>
                              <div className="bg-slate-800/60 rounded-lg p-2">
                                <p className="text-[9px] text-slate-500 font-bold uppercase">Free Goods</p>
                                <p className="text-sm font-black text-purple-400">₹{freeGoodsValue.toFixed(0)}</p>
                              </div>
                            </div>

                            {/* Flags */}
                            <div className="space-y-1.5">
                              {/* Rate Mismatch */}
                              {highDiffItems.length > 0 && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2.5">
                                  <p className="text-[10px] font-black text-red-400 uppercase mb-1">❌ Rate Mismatch ({highDiffItems.length} items — &gt;10% difference vs last purchase)</p>
                                  {highDiffItems.map((item, i) => (
                                    <p key={i} className="text-[9px] text-red-300 ml-3">
                                      • {item.product_name}: Old ₹{item.oldRate} → New ₹{item.rate}
                                      <span className={`font-black ml-1 ${item.diff > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                        ({item.diff > 0 ? '↑' : '↓'}{item.pctDiff?.toFixed(0)}%)
                                      </span>
                                    </p>
                                  ))}
                                </div>
                              )}

                              {/* Duplicates */}
                              {duplicates.length > 0 && (
                                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2.5">
                                  <p className="text-[10px] font-black text-yellow-400 uppercase mb-1">⚠️ Duplicate Products ({duplicates.length} items appear multiple times)</p>
                                  {duplicates.map(([name, count], i) => (
                                    <p key={i} className="text-[9px] text-yellow-300 ml-3">• {name} — appears {count}× in bill</p>
                                  ))}
                                </div>
                              )}

                              {/* New Products */}
                              {newItems.length > 0 && (
                                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2.5">
                                  <p className="text-[10px] font-black text-blue-400 uppercase">ℹ️ {newItems.length} New Product{newItems.length > 1 ? 's' : ''} (not in current inventory)</p>
                                </div>
                              )}

                              {/* All Good */}
                              {highDiffItems.length === 0 && duplicates.length === 0 && (
                                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2.5">
                                  <p className="text-[10px] font-black text-green-400 uppercase">✅ No rate mismatches • No duplicates • Bill looks clean!</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Preview Table */}
                      <div className="overflow-x-auto rounded-xl border border-slate-800 max-h-72 overflow-y-auto">
                        <table className="w-full text-[10px]">
                          <thead className="bg-slate-950 text-slate-400 font-bold uppercase sticky top-0">
                            <tr>
                              <th className="px-3 py-2 text-left">Product</th>
                              <th className="px-3 py-2 text-center">Qty</th>
                              <th className="px-3 py-2 text-center">Free</th>
                              <th className="px-3 py-2 text-center font-black text-green-400">+Stock</th>
                              <th className="px-3 py-2 text-left">Batch</th>
                              <th className="px-3 py-2 text-left">Expiry</th>
                              <th className="px-3 py-2 text-right">MRP</th>
                              <th className="px-3 py-2 text-right">Eff.Cost</th>
                            </tr>
                          </thead>
                          <tbody>
                            {importPreview.map((row, i) => {
                              const existing = products.find(p => p.name === row.product_name && p.is_active);
                              const rateDiff = existing ? Math.abs(row.rate - existing.buying_price) / (existing.buying_price || 1) * 100 : 0;
                              const isHighDiff = existing && rateDiff > 10;
                              const isNew = !existing;
                              return (
                              <tr key={i} className={`border-t border-slate-800 hover:bg-slate-800/30 ${isHighDiff ? 'bg-red-500/10' : ''}`}>
                                <td className="px-3 py-2 font-bold text-white max-w-[180px] truncate">
                                  {row.product_name}
                                  {isNew && <span className="ml-1 text-[8px] bg-blue-500/20 text-blue-400 font-black px-1 rounded">NEW</span>}
                                  {isHighDiff && <span className="ml-1 text-[8px] bg-red-500/20 text-red-400 font-black px-1 rounded">⚠ RATE</span>}
                                </td>
                                <td className="px-3 py-2 text-center text-slate-400">{row.qty}</td>
                                <td className="px-3 py-2 text-center text-green-400 font-bold">+{row.qty_free}</td>
                                <td className="px-3 py-2 text-center font-black text-green-300">{row.total_stock}</td>
                                <td className="px-3 py-2 text-slate-400 font-mono">{row.batch_no || '-'}</td>
                                <td className="px-3 py-2 text-orange-400">{row.expiry_raw || '-'}</td>
                                <td className="px-3 py-2 text-right text-white">₹{row.mrp}</td>
                                <td className={`px-3 py-2 text-right font-bold ${isHighDiff ? 'text-red-400' : 'text-blue-400'}`}>
                                  ₹{row.effective_cost}
                                  {isHighDiff && <div className="text-[8px] text-red-300">was ₹{existing!.buying_price}</div>}
                                </td>
                              </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3">
                        <button onClick={() => { setImportPreview([]); setImportSupplierName(''); }}
                          className="flex-1 bg-slate-800 hover:bg-slate-700 py-3 rounded-xl font-black text-xs uppercase transition-all text-slate-400">
                          ← Re-upload
                        </button>
                        <button onClick={handleConfirmPharmacyImport} disabled={isImporting}
                          className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 py-3 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95">
                          {isImporting ? <Loader2 size={16} className="animate-spin" /> : <PackagePlus size={16} />}
                          {isImporting ? 'Importing...' : `✅ Import All ${importPreview.length} Items`}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
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
              {/* 🔥 Discount Field in Edit */}
              <div className="relative">
                <label className="text-[10px] font-bold uppercase text-orange-400 mb-1 block">% Discount (Optional)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number" min="0" max="100" placeholder="0"
                    className="w-32 bg-slate-800 p-3 rounded-xl border border-orange-500/30 outline-none focus:border-orange-500 text-orange-400 font-bold text-center"
                    value={editItem.discount_percent || "0"}
                    onChange={e => setEditItem({ ...editItem, discount_percent: e.target.value })}
                  />
                  <span className="text-slate-400 text-sm font-bold">% OFF</span>
                  {Number(editItem.discount_percent) > 0 && editItem.price && (
                    <span className="text-green-400 text-xs font-bold">
                      → Sale: ₹{Math.round(Number(editItem.price) * (1 - Number(editItem.discount_percent) / 100))}
                    </span>
                  )}
                </div>
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
