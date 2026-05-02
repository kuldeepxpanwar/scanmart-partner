"use client";
import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import {
  ClipboardCheck, Plus, Upload, CheckCircle, XCircle, Edit3,
  Trash2, Loader2, Package, ChevronDown, ChevronUp, AlertTriangle,
  FileSpreadsheet, Save, ArrowRight, RotateCcw, Eye
} from "lucide-react";

type GRNSession = {
  id: string; store_id: string; supplier_name: string; invoice_no: string;
  invoice_date: string; status: string; notes: string;
  total_items: number; total_value: number; created_at: string; finalized_at: string;
};
type GRNItem = {
  id: string; grn_id: string; product_name: string; matched_product_id: string | null;
  is_new_product: boolean; category: string; hsn_code: string; batch_no: string;
  expiry_date: string; qty: number; qty_free: number; mrp: number; rate: number;
  gst_rate: number; status: string; review_note: string;
};

const CATS = ["Tablet","Capsule","Syrup","Injection","Cream","Drops","Sachet","Pharmacy","General"];

export default function GRNPage() {
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<GRNSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "create" | "audit">("list");
  const [activeSession, setActiveSession] = useState<GRNSession | null>(null);
  const [items, setItems] = useState<GRNItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<GRNItem | null>(null);

  // New Session Form
  const [form, setForm] = useState({ supplier_name: "", invoice_no: "", invoice_date: "", notes: "" });

  // Add Item Form
  const [newItem, setNewItem] = useState({
    product_name: "", category: "Pharmacy", hsn_code: "3004",
    batch_no: "", expiry_date: "", qty: "", qty_free: "0",
    mrp: "", rate: "", gst_rate: "5"
  });

  useEffect(() => {
    const id = localStorage.getItem("active_store_id");
    if (id) { setActiveStoreId(id); fetchSessions(id); fetchInventory(id); }
  }, []);

  const fetchSessions = async (storeId: string) => {
    setLoading(true);
    const { data } = await supabase.from("grn_sessions")
      .select("*").eq("store_id", storeId)
      .order("created_at", { ascending: false });
    setSessions(data || []);
    setLoading(false);
  };

  const fetchInventory = async (storeId: string) => {
    const { data } = await supabase.from("inventory")
      .select("id, name, stock, buying_price")
      .eq("store_id", storeId).eq("is_active", true);
    setInventoryList(data || []);
  };

  const fetchItems = async (grnId: string) => {
    setItemsLoading(true);
    const { data } = await supabase.from("grn_items")
      .select("*").eq("grn_id", grnId).order("created_at");
    setItems(data || []);
    setItemsLoading(false);
  };

  const parseExpiry = (raw: string) => {
    const p = (raw || "").trim().split("/");
    if (p.length === 2) {
      const m = p[0].padStart(2, "0");
      const y = p[1].length === 2 ? `20${p[1]}` : p[1];
      return `${y}-${m}-01`;
    }
    return raw;
  };

  const autoCategory = (name: string) => {
    const n = name.toUpperCase();
    if (n.includes("TAB")) return "Tablet";
    if (n.includes("CAP")) return "Capsule";
    if (n.includes("SYP") || n.includes("SYRUP")) return "Syrup";
    if (n.includes("INJ")) return "Injection";
    if (n.includes("GEL") || n.includes("CREAM") || n.includes("OINT")) return "Cream";
    if (n.includes("DROP") || n.includes("EYE") || n.includes("EAR")) return "Drops";
    return "Pharmacy";
  };

  const handleCreateSession = async () => {
    if (!activeStoreId) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("grn_sessions").insert({
      store_id: activeStoreId,
      supplier_name: form.supplier_name,
      invoice_no: form.invoice_no,
      invoice_date: form.invoice_date || null,
      notes: form.notes,
      status: "draft",
      created_by: user?.id
    }).select().single();
    if (error) { toast.error(error.message); }
    else {
      toast.success("GRN Draft created!");
      setActiveSession(data);
      setItems([]);
      setView("audit");
      fetchSessions(activeStoreId);
    }
    setSaving(false);
  };

  const handleOpenAudit = async (session: GRNSession) => {
    setActiveSession(session);
    await fetchItems(session.id);
    setView("audit");
  };

  const handleAddItem = async () => {
    if (!activeSession || !newItem.product_name) return toast.error("Product name required!");
    
    const variantLabel = ((newItem as any)._variant_label || '').trim().toUpperCase();
    const finalName = variantLabel
      ? `${newItem.product_name.trim()}-${variantLabel}`
      : newItem.product_name.trim();

    const match = inventoryList.find(p => p.name.toLowerCase() === finalName.toLowerCase());
    const { data, error } = await supabase.from("grn_items").insert({
      grn_id: activeSession.id,
      store_id: activeStoreId,
      product_name: finalName,
      matched_product_id: match?.id || null,
      is_new_product: !match,
      category: newItem.category,
      hsn_code: newItem.hsn_code,
      batch_no: newItem.batch_no,
      expiry_date: newItem.expiry_date ? parseExpiry(newItem.expiry_date) : null,
      qty: Number(newItem.qty) || 0,
      qty_free: Number(newItem.qty_free) || 0,
      mrp: Number(newItem.mrp) || 0,
      rate: Number(newItem.rate) || 0,
      gst_rate: Number(newItem.gst_rate) || 5,
      status: "pending"
    }).select().single();
    if (error) toast.error(error.message);
    else {
      setItems(prev => [...prev, data]);
      setNewItem({ product_name: "", category: "Pharmacy", hsn_code: "3004", batch_no: "", expiry_date: "", qty: "", qty_free: "0", mrp: "", rate: "", gst_rate: "5" });
      toast.success("Item added to GRN!");
    }
  };

  const handleUpdateItem = async (item: GRNItem) => {
    const match = inventoryList.find(p => p.name.toLowerCase() === item.product_name.toLowerCase());
    const { error } = await supabase.from("grn_items").update({
      product_name: item.product_name,
      matched_product_id: match?.id || null,
      is_new_product: !match,
      category: item.category,
      hsn_code: item.hsn_code,
      batch_no: item.batch_no,
      expiry_date: item.expiry_date,
      qty: Number(item.qty),
      qty_free: Number(item.qty_free),
      mrp: Number(item.mrp),
      rate: Number(item.rate),
      gst_rate: Number(item.gst_rate),
      status: item.status,
      review_note: item.review_note
    }).eq("id", item.id);
    if (error) toast.error(error.message);
    else { setItems(prev => prev.map(i => i.id === item.id ? item : i)); setExpandedItem(null); setEditItem(null); toast.success("Item updated!"); }
  };

  const handleDeleteItem = async (id: string) => {
    await supabase.from("grn_items").delete().eq("id", id);
    setItems(prev => prev.filter(i => i.id !== id));
    toast.success("Item removed");
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeSession) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter(l => l.trim()).slice(1);
      let added = 0;
      for (const line of lines) {
        const cols = line.split(",");
        const name = cols[0]?.trim();
        if (!name) continue;
        const qty = Number(cols[2]?.trim()) || 0;
        const qtyFree = Number(cols[3]?.trim()) || 0;
        const rate = Number(cols[7]?.trim()) || 0;
        const mrp = Number(cols[6]?.trim()) || 0;
        const match = inventoryList.find(p => p.name.toLowerCase() === name.toLowerCase());
        await supabase.from("grn_items").insert({
          grn_id: activeSession.id, store_id: activeStoreId,
          product_name: name, matched_product_id: match?.id || null,
          is_new_product: !match, category: autoCategory(name),
          hsn_code: cols[1]?.trim() || "3004",
          batch_no: cols[4]?.trim() || "",
          expiry_date: cols[5]?.trim() ? parseExpiry(cols[5].trim()) : null,
          qty, qty_free: qtyFree, mrp, rate,
          gst_rate: (Number(cols[9]?.trim()) || 0) + (Number(cols[10]?.trim()) || 0),
          status: "pending"
        });
        added++;
      }
      await fetchItems(activeSession.id);
      toast.success(`${added} items imported into GRN!`);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleFinalizeGRN = async () => {
    if (!activeSession || !activeStoreId) return;
    const approvedItems = items.filter(i => i.status !== "rejected");
    if (approvedItems.length === 0) return toast.error("No items to finalize!");
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let newCount = 0, updCount = 0;
      for (const item of approvedItems) {
        const totalQty = (Number(item.qty) || 0) + (Number(item.qty_free) || 0);
        let productId = item.matched_product_id;
        const landedCost = Number(item.qty_free) > 0 ? (Number(item.qty) * Number(item.rate)) / totalQty : Number(item.rate);
        if (!productId) {
          const { data: np } = await supabase.from("inventory").insert({
            name: item.product_name, stock: totalQty, mrp: item.mrp,
            price: item.mrp, buying_price: landedCost,
            gst_rate: item.gst_rate, category: item.category,
            hsn_code: item.hsn_code, store_id: activeStoreId,
            is_active: true, last_sold_at: null
          }).select("id").single();
          productId = np?.id; newCount++;
        } else {
          const existing = inventoryList.find(p => p.id === productId);
          await supabase.from("inventory").update({
            stock: (existing?.stock || 0) + totalQty,
            buying_price: landedCost, mrp: item.mrp
          }).eq("id", productId);
          updCount++;
        }
        if (productId && item.batch_no && item.expiry_date) {
          await supabase.from("inventory_batches").insert({
            product_id: productId, store_id: activeStoreId,
            batch_number: item.batch_no, expiry_date: item.expiry_date,
            quantity: totalQty, buying_price: landedCost
          });
        }
      }
      await supabase.from("grn_sessions").update({
        status: "finalized", finalized_at: new Date().toISOString(),
        finalized_by: user?.id, total_items: approvedItems.length,
        total_value: approvedItems.reduce((s, i) => s + ((Number(i.qty) + Number(i.qty_free)) * Number(i.rate)), 0)
      }).eq("id", activeSession.id);
      toast.success(`GRN Finalized! ${newCount} new + ${updCount} updated products.`);
      setActiveSession(prev => prev ? { ...prev, status: "finalized" } : prev);
      fetchInventory(activeStoreId);
      fetchSessions(activeStoreId);
    } catch (err: any) { toast.error(err.message); }
    setSaving(false);
  };

  const handleCancelGRN = async () => {
    if (!activeSession || !activeStoreId) return;
    await supabase.from("grn_sessions").update({ status: "cancelled" }).eq("id", activeSession.id);
    toast.success("GRN cancelled");
    setView("list");
    fetchSessions(activeStoreId);
  };

  const statusBadge = (status: string) => {
    if (status === "finalized") return "bg-green-500/20 text-green-400 border border-green-500/30";
    if (status === "cancelled") return "bg-red-500/20 text-red-400 border border-red-500/30";
    return "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30";
  };

  // ─────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-8 bg-[#020617] min-h-screen text-white font-sans pb-32">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          {view !== "list" && (
            <button onClick={() => setView("list")} className="bg-slate-800 p-2 rounded-xl border border-slate-700 hover:bg-slate-700 transition-all">
              <RotateCcw size={16} />
            </button>
          )}
          <div>
            <h1 className="text-3xl font-black italic uppercase flex items-center gap-2">
              <ClipboardCheck className="text-green-500" /> GRN <span className="text-green-600">AUDIT</span>
            </h1>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">
              {view === "list" ? "Goods Receipt Notes — Staging before Inventory" : view === "create" ? "New GRN Session" : `Auditing: ${activeSession?.invoice_no || "Draft"}`}
            </p>
          </div>
        </div>
        {view === "list" && (
          <button onClick={() => setView("create")} className="bg-green-600 hover:bg-green-500 px-5 py-3 rounded-xl font-black text-sm uppercase tracking-widest flex items-center gap-2 transition-all">
            <Plus size={16} /> New GRN
          </button>
        )}
      </div>

      {/* ── LIST VIEW ── */}
      {view === "list" && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-green-500" size={32} /></div>
          ) : sessions.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-16 text-center">
              <ClipboardCheck className="mx-auto text-slate-600 mb-4" size={48} />
              <p className="text-slate-400 font-bold text-lg">No GRN sessions yet</p>
              <p className="text-slate-600 text-sm mt-1">Create a new GRN to start auditing your stock</p>
              <button onClick={() => setView("create")} className="mt-6 bg-green-600 hover:bg-green-500 px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all">
                + New GRN
              </button>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-950 border-b border-slate-800">
                  <tr>
                    <th className="text-left px-5 py-4 text-[10px] font-black uppercase text-slate-500">Supplier / Invoice</th>
                    <th className="text-left px-5 py-4 text-[10px] font-black uppercase text-slate-500">Date</th>
                    <th className="text-center px-5 py-4 text-[10px] font-black uppercase text-slate-500">Items</th>
                    <th className="text-center px-5 py-4 text-[10px] font-black uppercase text-slate-500">Value</th>
                    <th className="text-center px-5 py-4 text-[10px] font-black uppercase text-slate-500">Status</th>
                    <th className="text-right px-5 py-4 text-[10px] font-black uppercase text-slate-500">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map(s => (
                    <tr key={s.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-all">
                      <td className="px-5 py-4">
                        <p className="font-bold text-white">{s.supplier_name || "—"}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{s.invoice_no || "No Invoice #"}</p>
                      </td>
                      <td className="px-5 py-4 text-slate-400 text-xs font-bold">
                        {s.invoice_date ? new Date(s.invoice_date).toLocaleDateString("en-IN") : new Date(s.created_at).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-5 py-4 text-center font-black text-white">{s.total_items || "—"}</td>
                      <td className="px-5 py-4 text-center font-black text-green-400">
                        {s.total_value ? `₹${Number(s.total_value).toLocaleString()}` : "—"}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase ${statusBadge(s.status)}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        {s.status === "draft" ? (
                          <button onClick={() => handleOpenAudit(s)} className="bg-green-600 hover:bg-green-500 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ml-auto">
                            <Edit3 size={11} /> Audit
                          </button>
                        ) : (
                          <button onClick={() => handleOpenAudit(s)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-black uppercase px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ml-auto">
                            <Eye size={11} /> View
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── CREATE VIEW ── */}
      {view === "create" && (
        <div className="max-w-lg mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-4">
          <h2 className="text-lg font-black uppercase text-green-400 flex items-center gap-2"><Plus size={18} /> New GRN Session</h2>
          <div>
            <label className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Supplier Name</label>
            <input type="text" placeholder="e.g. Ashish Agencies" className="w-full bg-slate-800 p-3 rounded-xl border border-slate-700 outline-none focus:border-green-500 text-white font-bold"
              value={form.supplier_name} onChange={e => setForm({ ...form, supplier_name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Invoice No.</label>
              <input type="text" placeholder="e.g. INV-2024-001" className="w-full bg-slate-800 p-3 rounded-xl border border-slate-700 outline-none focus:border-green-500 text-white font-mono"
                value={form.invoice_no} onChange={e => setForm({ ...form, invoice_no: e.target.value })} />
            </div>
            <div>
              <label className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Invoice Date</label>
              <input type="date" className="w-full bg-slate-800 p-3 rounded-xl border border-slate-700 outline-none focus:border-green-500 text-white"
                value={form.invoice_date} onChange={e => setForm({ ...form, invoice_date: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Notes (optional)</label>
            <textarea placeholder="Any notes about this delivery..." className="w-full bg-slate-800 p-3 rounded-xl border border-slate-700 outline-none focus:border-green-500 text-white resize-none h-20"
              value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
          <button onClick={handleCreateSession} disabled={saving || !form.supplier_name}
            className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 py-3 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />} Create & Start Audit
          </button>
          <button onClick={() => setView("list")} className="w-full text-slate-500 text-xs font-bold uppercase py-2 hover:text-white transition-all">Cancel</button>
        </div>
      )}

      {/* ── AUDIT VIEW ── */}
      {view === "audit" && activeSession && (
        <div className="space-y-6">
          {/* Session Info Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap justify-between items-center gap-4">
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase">Supplier</p>
              <p className="font-black text-white">{activeSession.supplier_name || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase">Invoice #</p>
              <p className="font-bold text-slate-300 font-mono">{activeSession.invoice_no || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase">Items</p>
              <p className="font-black text-white">{items.length}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase">Total Value</p>
              <p className="font-black text-green-400">₹{items.reduce((s, i) => s + (Number(i.qty) + Number(i.qty_free)) * Number(i.rate), 0).toLocaleString()}</p>
            </div>
            <span className={`text-[9px] font-black px-3 py-1.5 rounded-full uppercase ${statusBadge(activeSession.status)}`}>{activeSession.status}</span>
          </div>

          {/* CSV Import (only if draft) */}
          {activeSession.status === "draft" && (
            <div className="bg-blue-900/15 border border-blue-500/20 rounded-2xl p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase text-blue-400 mb-0.5">Bulk Import via CSV</p>
                <p className="text-[9px] text-slate-500">Same format as Pharmacy Import CSV</p>
              </div>
              <label className="bg-blue-600 hover:bg-blue-500 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 cursor-pointer transition-all">
                <Upload size={14} /> Import CSV
                <input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
              </label>
            </div>
          )}

          {/* Items Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
              <p className="text-[10px] font-black uppercase text-slate-500">{items.length} Line Items — Review Before Finalizing</p>
              {activeSession.status === "draft" && (
                <span className="text-[9px] text-yellow-400 font-bold">⚠️ Not yet in Inventory</span>
              )}
            </div>
            {itemsLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="animate-spin text-green-500" size={24} /></div>
            ) : items.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-sm font-bold">No items yet — add manually or import CSV</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-950 text-slate-500 font-bold uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left">Product</th>
                      <th className="px-4 py-3 text-left">Batch / Expiry</th>
                      <th className="px-4 py-3 text-center">Qty+Free</th>
                      <th className="px-4 py-3 text-right">Rate / MRP</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      {activeSession.status === "draft" && <th className="px-4 py-3 text-center">Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => (
                      <React.Fragment key={item.id}>
                      <tr className={`border-b border-slate-800/50 hover:bg-slate-800/20 ${item.status === "rejected" ? "opacity-40" : ""}`}>
                        <td className="px-4 py-3">
                          <p className="font-bold text-white">{item.product_name}</p>
                          <p className="text-[9px] text-slate-500">
                            {item.is_new_product ? <span className="text-blue-400 font-bold">NEW</span> : <span className="text-green-400 font-bold">MATCH</span>}
                            {" · "}{item.category} · GST {item.gst_rate}%
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-mono text-slate-300">{item.batch_no || "—"}</p>
                          <p className="text-[9px] text-slate-500">{item.expiry_date ? new Date(item.expiry_date).toLocaleDateString("en-IN") : "—"}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <p className="font-black text-white">{Number(item.qty) + Number(item.qty_free)}</p>
                          <p className="text-[9px] text-slate-500">{item.qty}+{item.qty_free} free</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="font-bold text-white">PTR: ₹{item.rate}</p>
                          <p className="text-[9px] text-green-400 font-bold tracking-widest mt-0.5">
                            LANDED: ₹{((Number(item.qty) * Number(item.rate)) / (Number(item.qty) + Number(item.qty_free)) || Number(item.rate)).toFixed(2)}
                          </p>
                          {Number(item.mrp) > 0 && (
                            <p className="text-[9px] text-orange-300 font-bold mt-0.5 border-t border-slate-700 pt-0.5 inline-block">
                              MARGIN: {(((Number(item.mrp) - ((Number(item.qty) * Number(item.rate)) / (Number(item.qty) + Number(item.qty_free)) || Number(item.rate))) / Number(item.mrp)) * 100).toFixed(1)}%
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-[9px] font-black px-2 py-1 rounded-full uppercase border ${
                            item.status === "rejected" ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-green-500/20 text-green-400 border-green-500/30"
                          }`}>{item.status}</span>
                        </td>
                        {activeSession.status === "draft" && (
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => handleUpdateItem({ ...item, status: item.status === "rejected" ? "pending" : "rejected" })}
                                className={`p-1.5 rounded-lg text-[9px] font-black transition-all ${item.status === "rejected" ? "bg-green-500/20 text-green-400 hover:bg-green-500/40" : "bg-red-500/10 text-red-400 hover:bg-red-500/30"}`}>
                                {item.status === "rejected" ? <CheckCircle size={12} /> : <XCircle size={12} />}
                              </button>
                              <button onClick={() => setEditItem(item)} className="p-1.5 bg-slate-800 hover:bg-blue-500/20 text-slate-500 hover:text-blue-400 rounded-lg transition-all">
                                <Edit3 size={12} />
                              </button>
                              <button onClick={() => handleDeleteItem(item.id)} className="p-1.5 bg-slate-800 hover:bg-red-500/20 text-slate-500 hover:text-red-400 rounded-lg transition-all">
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                      {editItem?.id === item.id && (
                        <tr className="bg-slate-900 border-b border-slate-800">
                          <td colSpan={6} className="p-4 border-l-4 border-blue-500">
                            <div className="flex flex-col gap-3">
                              <p className="text-[10px] font-black uppercase text-blue-400">Edit Line Item</p>
                              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                                <div className="col-span-2">
                                  <label className="text-[9px] font-bold uppercase text-slate-500 block mb-1">Product Name</label>
                                  <input type="text" className="w-full bg-slate-800 p-2 rounded-lg border border-slate-700 outline-none focus:border-blue-500 text-white text-xs"
                                    value={editItem.product_name} onChange={e => setEditItem({ ...editItem, product_name: e.target.value })} />
                                </div>
                                <div>
                                  <label className="text-[9px] font-bold uppercase text-slate-500 block mb-1">Batch No.</label>
                                  <input type="text" className="w-full bg-slate-800 p-2 rounded-lg border border-slate-700 outline-none focus:border-blue-500 text-white text-xs font-mono"
                                    value={editItem.batch_no} onChange={e => setEditItem({ ...editItem, batch_no: e.target.value })} />
                                </div>
                                <div>
                                  <label className="text-[9px] font-bold uppercase text-slate-500 block mb-1">Expiry (YYYY-MM-DD)</label>
                                  <input type="text" placeholder="YYYY-MM-DD" className="w-full bg-slate-800 p-2 rounded-lg border border-slate-700 outline-none focus:border-blue-500 text-white text-xs font-mono"
                                    value={editItem.expiry_date || ""} onChange={e => setEditItem({ ...editItem, expiry_date: e.target.value })} />
                                </div>
                                <div>
                                  <label className="text-[9px] font-bold uppercase text-slate-500 block mb-1">Qty</label>
                                  <input type="number" className="w-full bg-slate-800 p-2 rounded-lg border border-slate-700 outline-none focus:border-blue-500 text-white text-xs text-center"
                                    value={editItem.qty} onChange={e => setEditItem({ ...editItem, qty: Number(e.target.value) })} />
                                </div>
                                <div>
                                  <label className="text-[9px] font-bold uppercase text-slate-500 block mb-1">Free Qty</label>
                                  <input type="number" className="w-full bg-slate-800 p-2 rounded-lg border border-slate-700 outline-none focus:border-blue-500 text-white text-xs text-center"
                                    value={editItem.qty_free} onChange={e => setEditItem({ ...editItem, qty_free: Number(e.target.value) })} />
                                </div>
                                <div>
                                  <label className="text-[9px] font-bold uppercase text-slate-500 block mb-1">PTR/Rate (₹)</label>
                                  <input type="number" className="w-full bg-slate-800 p-2 rounded-lg border border-slate-700 outline-none focus:border-blue-500 text-white text-xs text-center"
                                    value={editItem.rate} onChange={e => setEditItem({ ...editItem, rate: Number(e.target.value) })} />
                                </div>
                                <div>
                                  <label className="text-[9px] font-bold uppercase text-slate-500 block mb-1">MRP (₹)</label>
                                  <input type="number" className="w-full bg-slate-800 p-2 rounded-lg border border-slate-700 outline-none focus:border-blue-500 text-white text-xs text-center"
                                    value={editItem.mrp} onChange={e => setEditItem({ ...editItem, mrp: Number(e.target.value) })} />
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                <button onClick={() => handleUpdateItem(editItem)} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-[10px] font-black uppercase text-white transition-all flex items-center gap-1">
                                  <Save size={12} /> Save Changes
                                </button>
                                <button onClick={() => setEditItem(null)} className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-[10px] font-black uppercase text-slate-400 hover:text-white transition-all">
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Manual Add Item (draft only) */}
          {activeSession.status === "draft" && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <p className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1"><Plus size={12} /> Add Item Manually</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="md:col-span-2">
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <label className="text-[9px] font-bold uppercase text-blue-400 mb-1 block">Base Name (Generic)</label>
                      <input type="text" placeholder="e.g. LENACEF CAP 10" className="w-full bg-slate-800 p-2.5 rounded-xl border border-blue-500/30 outline-none focus:border-blue-500 text-white font-bold text-sm placeholder-slate-600"
                        value={newItem.product_name} onChange={e => setNewItem({ ...newItem, product_name: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold uppercase text-orange-400 mb-1 block">Size / Variant</label>
                      <input type="text" placeholder="30 GM" className="w-28 bg-slate-800 p-2.5 rounded-xl border border-orange-500/40 outline-none focus:border-orange-500 font-bold text-orange-300 placeholder-slate-600 text-center text-sm"
                        value={(newItem as any)._variant_label || ''} onChange={(e) => setNewItem({ ...newItem, _variant_label: e.target.value } as any)} />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-bold uppercase text-slate-500 block mb-1">Category</label>
                  <select className="w-full bg-slate-800 p-2.5 rounded-xl border border-slate-700 outline-none text-white text-sm" value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })}>
                    {CATS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold uppercase text-slate-500 block mb-1">HSN</label>
                  <input type="text" className="w-full bg-slate-800 p-2.5 rounded-xl border border-slate-700 outline-none focus:border-green-500 text-white font-mono text-sm"
                    value={newItem.hsn_code} onChange={e => setNewItem({ ...newItem, hsn_code: e.target.value })} />
                </div>
                <div>
                  <label className="text-[9px] font-bold uppercase text-slate-500 block mb-1">Batch No.</label>
                  <input type="text" placeholder="e.g. XF564" className="w-full bg-slate-800 p-2.5 rounded-xl border border-slate-700 outline-none focus:border-green-500 text-white font-mono text-sm"
                    value={newItem.batch_no} onChange={e => setNewItem({ ...newItem, batch_no: e.target.value })} />
                </div>
                <div>
                  <label className="text-[9px] font-bold uppercase text-slate-500 block mb-1">Expiry (MM/YY)</label>
                  <input type="text" placeholder="08/27" className="w-full bg-slate-800 p-2.5 rounded-xl border border-slate-700 outline-none focus:border-green-500 text-white font-mono text-sm"
                    value={newItem.expiry_date} onChange={e => setNewItem({ ...newItem, expiry_date: e.target.value })} />
                </div>
                <div>
                  <label className="text-[9px] font-bold uppercase text-slate-500 block mb-1">Qty</label>
                  <input type="number" placeholder="0" className="w-full bg-slate-800 p-2.5 rounded-xl border border-slate-700 outline-none focus:border-green-500 text-white font-bold text-center text-sm"
                    value={newItem.qty} onChange={e => setNewItem({ ...newItem, qty: e.target.value })} />
                </div>
                <div>
                  <label className="text-[9px] font-bold uppercase text-slate-500 block mb-1">Free</label>
                  <input type="number" placeholder="0" className="w-full bg-slate-800 p-2.5 rounded-xl border border-slate-700 outline-none focus:border-green-500 text-white font-bold text-center text-sm"
                    value={newItem.qty_free} onChange={e => setNewItem({ ...newItem, qty_free: e.target.value })} />
                </div>
                <div>
                  <label className="text-[9px] font-bold uppercase text-slate-500 block mb-1">MRP (₹)</label>
                  <input type="number" placeholder="0" className="w-full bg-slate-800 p-2.5 rounded-xl border border-slate-700 outline-none focus:border-green-500 text-white font-bold text-center text-sm"
                    value={newItem.mrp} onChange={e => setNewItem({ ...newItem, mrp: e.target.value })} />
                </div>
                <div>
                  <label className="text-[9px] font-bold uppercase text-slate-500 block mb-1">Rate/PTR (₹)</label>
                  <input type="number" placeholder="0" className="w-full bg-slate-800 p-2.5 rounded-xl border border-slate-700 outline-none focus:border-green-500 text-white font-bold text-center text-sm"
                    value={newItem.rate} onChange={e => setNewItem({ ...newItem, rate: e.target.value })} />
                </div>
                <div>
                  <label className="text-[9px] font-bold uppercase text-slate-500 block mb-1">GST %</label>
                  <input type="number" placeholder="5" className="w-full bg-slate-800 p-2.5 rounded-xl border border-slate-700 outline-none focus:border-green-500 text-white font-bold text-center text-sm"
                    value={newItem.gst_rate} onChange={e => setNewItem({ ...newItem, gst_rate: e.target.value })} />
                </div>
              </div>
              <button onClick={handleAddItem} className="bg-slate-700 hover:bg-green-700 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all">
                <Plus size={14} /> Add Item
              </button>
            </div>
          )}

          {/* Finalize / Cancel */}
          {activeSession.status === "draft" && (
            <div className="flex gap-3">
              <button onClick={handleFinalizeGRN} disabled={saving || items.filter(i => i.status !== "rejected").length === 0}
                className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-40 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all text-sm">
                {saving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                Finalize GRN → Push to Inventory
              </button>
              <button onClick={handleCancelGRN} className="bg-slate-800 hover:bg-red-900/40 border border-slate-700 hover:border-red-500/30 px-5 py-4 rounded-2xl font-black text-xs uppercase text-slate-400 hover:text-red-400 transition-all">
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
