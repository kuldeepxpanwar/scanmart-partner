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
    const match = inventoryList.find(p => p.name.toLowerCase() === newItem.product_name.toLowerCase());
    const { data, error } = await supabase.from("grn_items").insert({
      grn_id: activeSession.id,
      store_id: activeStoreId,
      product_name: newItem.product_name,
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
    else { setItems(prev => prev.map(i => i.id === item.id ? item : i)); setExpandedItem(null); toast.success("Item updated!"); }
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
        if (!productId) {
          const { data: np } = await supabase.from("inventory").insert({
            name: item.product_name, stock: totalQty, mrp: item.mrp,
            price: item.mrp, buying_price: item.rate,
            gst_rate: item.gst_rate, category: item.category,
            hsn_code: item.hsn_code, store_id: activeStoreId,
            is_active: true, last_sold_at: null
          }).select("id").single();
          productId = np?.id; newCount++;
        } else {
          const existing = inventoryList.find(p => p.id === productId);
          await supabase.from("inventory").update({
            stock: (existing?.stock || 0) + totalQty,
            buying_price: item.rate, mrp: item.mrp
          }).eq("id", productId);
          updCount++;
        }
        if (productId && item.batch_no && item.expiry_date) {
          await supabase.from("inventory_batches").insert({
            product_id: productId, store_id: activeStoreId,
            batch_number: item.batch_no, expiry_date: item.expiry_date,
            quantity: totalQty, buying_price: item.rate
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
