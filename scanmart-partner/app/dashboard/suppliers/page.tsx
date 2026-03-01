"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  Search, Plus, Truck, Phone, MapPin, Trash2, Loader2, X,
  Edit3, Mail, MessageCircle, Building2, CheckCircle2,
  BookOpen, IndianRupee, ArrowDownCircle, ArrowUpCircle, AlertCircle
} from "lucide-react";

interface Supplier {
  id: string;
  name: string;
  contact_person?: string;
  phone: string;
  email?: string;
  address?: string;
  gstin?: string;
  category: string;
  status: string;
}

interface CreditTx {
  id: string;
  type: "credit" | "payment";
  amount: number;
  note?: string;
  date: string;
  created_at: string;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null);

  // Supplier balances map: supplier_id -> outstanding balance
  const [balances, setBalances] = useState<Record<string, number>>({});

  // Add/Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const initialFormState = {
    id: "", name: "", contact_person: "", phone: "", email: "",
    address: "", gstin: "", category: "General", status: "Active"
  };
  const [formData, setFormData] = useState(initialFormState);

  // Khata (Credit Ledger) Modal
  const [isKhataOpen, setIsKhataOpen] = useState(false);
  const [khataSupplier, setKhataSupplier] = useState<Supplier | null>(null);
  const [transactions, setTransactions] = useState<CreditTx[]>([]);
  const [khataLoading, setKhataLoading] = useState(false);
  const [txSaving, setTxSaving] = useState(false);
  const [txForm, setTxForm] = useState({ type: "credit", amount: "", note: "", date: new Date().toISOString().split("T")[0] });

  useEffect(() => {
    const storeId = typeof window !== "undefined" ? localStorage.getItem("active_store_id") : null;
    setActiveStoreId(storeId);
    fetchSuppliers(storeId);
  }, []);

  const fetchSuppliers = async (storeId?: string | null) => {
    setLoading(true);
    const { data } = await supabase.from("suppliers").select("*").order("id", { ascending: false });
    if (data) {
      setSuppliers(data);
      fetchAllBalances(data, storeId);
    }
    setLoading(false);
  };

  // Fetch outstanding balance for each supplier
  const fetchAllBalances = async (supplierList: Supplier[], storeId?: string | null) => {
    if (!supplierList.length) return;
    const ids = supplierList.map((s) => s.id);
    const { data } = await supabase
      .from("supplier_credit_transactions")
      .select("supplier_id, type, amount")
      .in("supplier_id", ids);

    const map: Record<string, number> = {};
    (data || []).forEach((tx: any) => {
      if (!map[tx.supplier_id]) map[tx.supplier_id] = 0;
      if (tx.type === "credit") map[tx.supplier_id] += Number(tx.amount);
      else map[tx.supplier_id] -= Number(tx.amount);
    });
    setBalances(map);
  };

  // ─── Supplier CRUD ───────────────────────────────────────────
  const handleSubmit = async () => {
    if (!formData.name || !formData.phone) return alert("Name aur Phone required hai!");
    setSubmitLoading(true);
    try {
      const payload = {
        name: formData.name, contact_person: formData.contact_person,
        phone: formData.phone, email: formData.email, address: formData.address,
        gstin: formData.gstin, category: formData.category, status: formData.status
      };
      if (isEditing && formData.id) {
        const { error } = await supabase.from("suppliers").update(payload).eq("id", formData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("suppliers").insert([payload]);
        if (error) throw error;
      }
      setIsModalOpen(false);
      fetchSuppliers(activeStoreId);
      setFormData(initialFormState);
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supplier delete karein? Sare credit transactions bhi delete ho jayenge!")) return;
    await supabase.from("suppliers").delete().eq("id", id);
    fetchSuppliers(activeStoreId);
  };

  // ─── Khata (Credit Ledger) ───────────────────────────────────
  const openKhata = async (supplier: Supplier) => {
    setKhataSupplier(supplier);
    setIsKhataOpen(true);
    setKhataLoading(true);
    const { data } = await supabase
      .from("supplier_credit_transactions")
      .select("*")
      .eq("supplier_id", supplier.id)
      .order("date", { ascending: false });
    setTransactions(data || []);
    setKhataLoading(false);
  };

  const handleAddTransaction = async () => {
    if (!txForm.amount || Number(txForm.amount) <= 0) return alert("Valid amount enter karein!");
    setTxSaving(true);
    const { data, error } = await supabase.from("supplier_credit_transactions").insert({
      supplier_id: khataSupplier?.id,
      store_id: activeStoreId,
      type: txForm.type,
      amount: Number(txForm.amount),
      note: txForm.note,
      date: txForm.date,
    }).select().single();
    if (error) { alert("Error: " + error.message); }
    else {
      setTransactions(prev => [data, ...prev]);
      // Update balance
      setBalances(prev => ({
        ...prev,
        [khataSupplier!.id]: (prev[khataSupplier!.id] || 0) + (txForm.type === "credit" ? Number(txForm.amount) : -Number(txForm.amount))
      }));
      setTxForm({ type: "credit", amount: "", note: "", date: new Date().toISOString().split("T")[0] });
    }
    setTxSaving(false);
  };

  const handleDeleteTx = async (txId: string, type: string, amount: number) => {
    await supabase.from("supplier_credit_transactions").delete().eq("id", txId);
    setTransactions(prev => prev.filter(t => t.id !== txId));
    setBalances(prev => ({
      ...prev,
      [khataSupplier!.id]: (prev[khataSupplier!.id] || 0) - (type === "credit" ? amount : -amount)
    }));
  };

  // Running balance for ledger view (reverse: oldest first for running total)
  const runningBalance = () => {
    const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let bal = 0;
    return sorted.map(tx => {
      bal += tx.type === "credit" ? Number(tx.amount) : -Number(tx.amount);
      return { ...tx, running: bal };
    }).reverse();
  };

  const khataBalance = khataSupplier ? (balances[khataSupplier.id] || 0) : 0;
  const totalOutstanding = Object.values(balances).filter(b => b > 0).reduce((s, b) => s + b, 0);

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.phone.includes(searchTerm) ||
    s.gstin?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const inputCls = "w-full bg-slate-800 p-3 rounded-xl border border-slate-700 outline-none focus:border-blue-500 text-white font-medium";

  return (
    <div className="p-4 md:p-8 bg-[#020617] min-h-screen text-white font-sans pb-32">

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-black italic">Supplier <span className="text-blue-500">Network</span></h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded text-xs font-bold">{suppliers.length} Partners</span>
            <span className="bg-green-500/10 text-green-400 px-2 py-0.5 rounded text-xs font-bold">
              {suppliers.filter(s => s.status === "Active").length} Active
            </span>
            {totalOutstanding > 0 && (
              <span className="bg-red-500/10 text-red-400 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1">
                <AlertCircle size={10} /> ₹{totalOutstanding.toLocaleString("en-IN")} Outstanding
              </span>
            )}
          </div>
        </div>
        <button onClick={() => { setFormData(initialFormState); setIsEditing(false); setIsModalOpen(true); }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl flex items-center gap-2 transition-all font-bold shadow-lg shadow-blue-900/20">
          <Plus size={18} /> Add Supplier
        </button>
      </div>

      {/* Search */}
      <div className="mb-6 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input type="text" placeholder="Search by name, phone, GSTIN..."
          value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-3.5 pl-12 text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all" />
      </div>

      {/* Suppliers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full text-center py-20"><Loader2 className="animate-spin mx-auto text-blue-500" size={36} /></div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="col-span-full text-center py-20 text-slate-500">No suppliers found. Add one!</div>
        ) : (
          filteredSuppliers.map((supplier) => {
            const bal = balances[supplier.id] || 0;
            return (
              <div key={supplier.id} className="bg-slate-900 border border-slate-800 p-5 rounded-[2rem] hover:border-blue-500/40 transition-all group relative flex flex-col">

                {/* Top Row */}
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${supplier.status === "Active" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
                    {supplier.status}
                  </span>
                  <div className="flex gap-1.5">
                    <button onClick={() => openKhata(supplier)}
                      className="p-2 bg-slate-800 rounded-lg text-orange-400 hover:bg-orange-600 hover:text-white transition-all" title="Khata / Credit Ledger">
                      <BookOpen size={15} />
                    </button>
                    <button onClick={() => { setFormData({ id: supplier.id, name: supplier.name || "", contact_person: supplier.contact_person || "", phone: supplier.phone || "", email: supplier.email || "", address: supplier.address || "", gstin: supplier.gstin || "", category: supplier.category || "General", status: supplier.status || "Active" }); setIsEditing(true); setIsModalOpen(true); }}
                      className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:bg-blue-600 hover:text-white transition-all">
                      <Edit3 size={15} />
                    </button>
                    <button onClick={() => handleDelete(supplier.id)}
                      className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:bg-red-600 hover:text-white transition-all">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-slate-800 border border-slate-700 rounded-2xl flex items-center justify-center text-blue-500 shrink-0">
                    <Building2 size={24} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white leading-tight">{supplier.name}</h3>
                    <p className="text-[11px] text-blue-400 font-bold">{supplier.category}</p>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-400 mb-4 flex-1">
                  {supplier.contact_person && (
                    <div className="flex items-center gap-2"><Truck size={12} className="text-slate-500" /><span>{supplier.contact_person}</span></div>
                  )}
                  {supplier.gstin && (
                    <div className="flex items-center gap-2"><CheckCircle2 size={12} className="text-slate-500" /><span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-[10px]">GST: {supplier.gstin}</span></div>
                  )}
                  {supplier.email && (
                    <div className="flex items-center gap-2 truncate"><Mail size={12} className="text-slate-500" /><span className="truncate">{supplier.email}</span></div>
                  )}
                  {supplier.address && (
                    <div className="flex items-start gap-2"><MapPin size={12} className="text-slate-500 mt-0.5 shrink-0" /><span className="line-clamp-2 text-[11px]">{supplier.address}</span></div>
                  )}
                </div>

                {/* Outstanding Balance */}
                <div
                  onClick={() => openKhata(supplier)}
                  className={`cursor-pointer rounded-2xl px-4 py-3 mb-3 flex items-center justify-between border transition-all
                    ${bal > 0 ? "bg-red-500/10 border-red-500/30 hover:border-red-500/60" :
                      bal < 0 ? "bg-green-500/10 border-green-500/30" :
                        "bg-slate-800/60 border-slate-700"}`}>
                  <div className="flex items-center gap-2">
                    <IndianRupee size={14} className={bal > 0 ? "text-red-400" : bal < 0 ? "text-green-400" : "text-slate-400"} />
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                      {bal > 0 ? "Outstanding" : bal < 0 ? "Advance Paid" : "Clear ✓"}
                    </span>
                  </div>
                  <span className={`text-lg font-black ${bal > 0 ? "text-red-400" : bal < 0 ? "text-green-400" : "text-slate-500"}`}>
                    ₹{Math.abs(bal).toLocaleString("en-IN")}
                  </span>
                </div>

                {/* Footer Actions */}
                <div className="grid grid-cols-2 gap-2 mt-auto">
                  <a href={`tel:${supplier.phone}`}
                    className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 py-2.5 rounded-xl text-xs font-bold transition-all">
                    <Phone size={13} className="text-green-500" /> Call
                  </a>
                  <a href={`https://wa.me/91${supplier.phone}`} target="_blank"
                    className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 py-2.5 rounded-xl text-xs font-bold transition-all">
                    <MessageCircle size={13} className="text-blue-400" /> WhatsApp
                  </a>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ════ ADD / EDIT SUPPLIER MODAL ════ */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem] w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white bg-slate-800 p-2 rounded-full"><X size={18} /></button>
            <h2 className="text-2xl font-black italic mb-1 text-blue-500">{isEditing ? "Edit" : "New"} <span className="text-white">Partner</span></h2>
            <p className="text-slate-500 text-xs mb-6">Supplier details accurately bharein.</p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Company Name *</label>
                  <input className={inputCls} placeholder="e.g. Haldiram Dist." value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Contact Person</label>
                  <input className={inputCls} placeholder="e.g. Ramesh Bhai" value={formData.contact_person} onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Phone *</label>
                  <input className={inputCls} type="tel" placeholder="98765..." value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Email</label>
                  <input className={inputCls} type="email" placeholder="supplier@mail.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Category</label>
                  <select className={inputCls + " cursor-pointer"} value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                    <option>General</option><option>Grocery/FMCG</option><option>Electronics</option>
                    <option>Packaging</option><option>Logistics</option><option>Wholesaler</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Status</label>
                  <select className={inputCls + " cursor-pointer"} value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                    <option value="Active">Active</option><option value="Inactive">Inactive</option><option value="Blacklisted">Blacklisted</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">GSTIN</label>
                <input className={inputCls + " font-mono uppercase"} placeholder="22AAAAA0000A1Z5" value={formData.gstin} onChange={(e) => setFormData({ ...formData, gstin: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Address</label>
                <textarea className={inputCls + " resize-none"} rows={2} placeholder="Shop No, Street, City..." value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
              </div>
              <button onClick={handleSubmit} disabled={submitLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 py-4 rounded-2xl font-black text-white transition-all uppercase tracking-wider mt-2">
                {submitLoading ? <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Saving...</span> : isEditing ? "Update Supplier" : "Save Supplier"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════ KHATA / CREDIT LEDGER MODAL ════ */}
      {isKhataOpen && khataSupplier && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-[2rem] w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-slate-800 shrink-0">
              <div>
                <h2 className="text-lg font-black uppercase italic flex items-center gap-2 text-orange-400">
                  <BookOpen size={18} /> Credit Khata
                </h2>
                <p className="text-slate-400 text-xs font-bold mt-0.5">{khataSupplier.name}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className={`text-right px-4 py-2 rounded-xl border ${khataBalance > 0 ? "bg-red-500/10 border-red-500/30" : khataBalance < 0 ? "bg-green-500/10 border-green-500/30" : "bg-slate-800 border-slate-700"}`}>
                  <p className="text-[9px] font-black uppercase text-slate-500">Outstanding</p>
                  <p className={`text-xl font-black ${khataBalance > 0 ? "text-red-400" : khataBalance < 0 ? "text-green-400" : "text-slate-400"}`}>
                    ₹{Math.abs(khataBalance).toLocaleString("en-IN")}
                  </p>
                </div>
                <button onClick={() => setIsKhataOpen(false)} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-all"><X size={18} /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Add Transaction Form */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
                <p className="text-xs font-black uppercase text-slate-400 mb-4 tracking-widest">New Entry</p>

                {/* Type Toggle */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <button onClick={() => setTxForm({ ...txForm, type: "credit" })}
                    className={`py-3 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2 transition-all border
                      ${txForm.type === "credit" ? "bg-red-500/20 border-red-500 text-red-400" : "bg-slate-800 border-slate-700 text-slate-400 hover:border-red-500/50"}`}>
                    <ArrowDownCircle size={14} /> Udhar Liya (Credit)
                  </button>
                  <button onClick={() => setTxForm({ ...txForm, type: "payment" })}
                    className={`py-3 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2 transition-all border
                      ${txForm.type === "payment" ? "bg-green-500/20 border-green-500 text-green-400" : "bg-slate-800 border-slate-700 text-slate-400 hover:border-green-500/50"}`}>
                    <ArrowUpCircle size={14} /> Payment Diya
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Amount (₹) *</label>
                    <input type="number" placeholder="0.00" className={inputCls} value={txForm.amount}
                      onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Date</label>
                    <input type="date" className={inputCls} value={txForm.date}
                      onChange={(e) => setTxForm({ ...txForm, date: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1 mb-4">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Note (Optional)</label>
                  <input type="text" placeholder="e.g. Invoice #1234, Haldiram snacks stock" className={inputCls} value={txForm.note}
                    onChange={(e) => setTxForm({ ...txForm, note: e.target.value })} />
                </div>

                <button onClick={handleAddTransaction} disabled={txSaving}
                  className={`w-full py-3 rounded-xl font-black uppercase text-sm transition-all flex items-center justify-center gap-2
                    ${txForm.type === "credit" ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"} text-white`}>
                  {txSaving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : txForm.type === "credit" ? "➕ Add Credit Entry" : "✅ Record Payment"}
                </button>
              </div>

              {/* Transaction History */}
              <div>
                <p className="text-xs font-black uppercase text-slate-400 mb-3 tracking-widest">Ledger History</p>
                {khataLoading ? (
                  <div className="text-center py-10"><Loader2 className="animate-spin mx-auto text-orange-400" size={28} /></div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 text-sm">Koi transaction nahi. Pehli entry add karein!</div>
                ) : (
                  <div className="space-y-2">
                    {runningBalance().map((tx) => (
                      <div key={tx.id}
                        className={`flex items-center justify-between p-4 rounded-xl border transition-all group
                          ${tx.type === "credit" ? "bg-red-500/5 border-red-500/20" : "bg-green-500/5 border-green-500/20"}`}>
                        <div className="flex items-center gap-3">
                          {tx.type === "credit"
                            ? <ArrowDownCircle size={16} className="text-red-400 shrink-0" />
                            : <ArrowUpCircle size={16} className="text-green-400 shrink-0" />}
                          <div>
                            <p className="text-sm font-bold text-white">{tx.note || (tx.type === "credit" ? "Credit Entry" : "Payment")}</p>
                            <p className="text-[10px] text-slate-500">{new Date(tx.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className={`font-black text-sm ${tx.type === "credit" ? "text-red-400" : "text-green-400"}`}>
                              {tx.type === "credit" ? "+" : "-"}₹{Number(tx.amount).toLocaleString("en-IN")}
                            </p>
                            <p className={`text-[10px] font-bold ${(tx as any).running > 0 ? "text-red-300/70" : "text-green-300/70"}`}>
                              Bal: ₹{Math.abs((tx as any).running).toLocaleString("en-IN")}
                            </p>
                          </div>
                          <button onClick={() => handleDeleteTx(tx.id, tx.type, tx.amount)}
                            className="p-1.5 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-500/10">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}