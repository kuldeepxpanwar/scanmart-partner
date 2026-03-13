"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Barcode from "react-barcode";
import {
  Search, Printer, Plus, Minus, X, ScanBarcode,
  Store, Scale, ToggleLeft, ToggleRight, Tag, Layers
} from "lucide-react";

type PrintMode = "sticker" | "shelf";
type ShelfTemplate = "regular" | "sale" | "bogo" | "new";
type LabelSize = "small" | "large";

export default function StickerPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [printQueue, setPrintQueue] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null);
  const [showPrice, setShowPrice] = useState(true);
  const [storeName, setStoreName] = useState("SCANMART");

  const [weightMode, setWeightMode] = useState(false);
  const [weightModal, setWeightModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [weightInput, setWeightInput] = useState("");

  const [printMode, setPrintMode] = useState<PrintMode>("sticker");
  const [shelfTemplate, setShelfTemplate] = useState<ShelfTemplate>("regular");
  const [labelSize, setLabelSize] = useState<LabelSize>("small");

  useEffect(() => {
    const storedId = typeof window !== "undefined" ? localStorage.getItem("active_store_id") : null;
    if (storedId) { setActiveStoreId(storedId); fetchStoreName(storedId); }
    else fetchFirstStore();
  }, []);

  useEffect(() => {
    if (activeStoreId) { fetchInventory(); setPrintQueue([]); }
  }, [activeStoreId]);

  const fetchFirstStore = async () => {
    const { data } = await supabase.from("stores").select("id, name").limit(1);
    if (data?.[0]) { setActiveStoreId(data[0].id); setStoreName(data[0].name.toUpperCase()); localStorage.setItem("active_store_id", data[0].id); }
  };
  const fetchStoreName = async (id: string) => {
    const { data } = await supabase.from("stores").select("name").eq("id", id).single();
    if (data) setStoreName(data.name.toUpperCase());
  };
  const fetchInventory = async () => {
    if (!activeStoreId) return;
    setLoading(true);
    const { data } = await supabase.from("inventory").select("id,name,price,mrp,barcode,stock").eq("store_id", activeStoreId).gt("stock", 0).eq("is_active", true);
    if (data) setProducts(data);
    setLoading(false);
  };

  const addToQueue = (product: any) => {
    if (weightMode) { setSelectedProduct(product); setWeightInput(""); setWeightModal(true); return; }
    setPrintQueue(prev => {
      const exists = prev.find(i => i.id === product.id);
      if (exists) return prev.map(i => i.id === product.id ? { ...i, copies: i.copies + 1 } : i);
      return [...prev, { ...product, copies: 1, barcodeValue: product.barcode || product.id.slice(0, 8).toUpperCase() }];
    });
  };
  const addWeightItem = () => {
    const grams = parseFloat(weightInput);
    if (!selectedProduct || isNaN(grams) || grams <= 0) return;
    const calcPrice = ((grams / 1000) * selectedProduct.price).toFixed(2);
    setPrintQueue(prev => [...prev, {
      ...selectedProduct,
      id: selectedProduct.id + "-" + Date.now(),
      price: calcPrice, weightGrams: grams, isWeightItem: true,
      copies: 1, barcodeValue: selectedProduct.barcode || selectedProduct.id.slice(0, 8).toUpperCase(),
      displayName: `${selectedProduct.name} (${grams}g)`,
    }]);
    setWeightModal(false); setSelectedProduct(null); setWeightInput("");
  };
  const updateCopies = (id: string, delta: number) =>
    setPrintQueue(prev => prev.map(i => i.id === id ? { ...i, copies: Math.max(1, i.copies + delta) } : i));
  const removeFromQueue = (id: string) =>
    setPrintQueue(prev => prev.filter(i => i.id !== id));
  const handlePrint = () => { if (!printQueue.length) { alert("Select items first!"); return; } window.print(); };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const totalLabels = printQueue.reduce((a, i) => a + i.copies, 0);

  // ─── LABEL RENDERERS ────────────────────────────────────────────

  // Shelf label — used in both preview and print
  const ShelfLabel = ({ item, forPrint }: { item: any; forPrint?: boolean }) => {
    const mrp = item.mrp ? parseFloat(item.mrp) : 0;
    const price = parseFloat(item.price);
    const savings = mrp > price ? mrp - price : 0;
    const name = item.displayName || item.name;
    const bW = forPrint ? 0.9 : 0.8;
    const bH = forPrint ? (labelSize === "large" ? 45 : 35) : 28;
    const bigFont = labelSize === "large" ? 22 : 18;

    if (shelfTemplate === "sale") return (
      <div style={{ background: "#FFF3E0", border: "2px solid #e53935", padding: 8, display: "flex", gap: 8, alignItems: "center", minHeight: labelSize === "large" ? 130 : 100, borderRadius: forPrint ? 0 : 6 }}>
        <div style={{ background: "white", padding: 4, borderRadius: 4, flexShrink: 0 }}>
          <Barcode value={item.barcodeValue} width={bW} height={bH} fontSize={7} displayValue={false} />
        </div>
        <div style={{ flex: 1 }}>
          <span style={{ background: "#e53935", color: "white", fontSize: 10, fontWeight: 900, padding: "1px 6px", borderRadius: 4, display: "inline-block", marginBottom: 3 }}>🔥 SALE</span>
          <p style={{ fontWeight: 900, fontSize: labelSize === "large" ? 13 : 10, lineHeight: 1.2, color: "#111", marginBottom: 3 }}>{name}</p>
          {mrp > 0 && <p style={{ fontSize: 9, color: "#999", textDecoration: "line-through" }}>MRP ₹{mrp.toFixed(0)}</p>}
          <p style={{ fontSize: 8, color: "#555", marginBottom: 1 }}>Smart Price</p>
          <p style={{ fontSize: bigFont, fontWeight: 900, color: "#b71c1c", lineHeight: 1 }}>₹{price.toFixed(0)}</p>
          {savings > 0 && <p style={{ fontSize: 8, color: "#e53935", marginTop: 2, fontWeight: 700 }}>You save ₹{savings.toFixed(0)}</p>}
        </div>
        <p style={{ writingMode: "vertical-rl", fontSize: 7, fontWeight: 900, color: "#e53935", letterSpacing: "0.1em", textTransform: "uppercase" }}>{storeName}</p>
      </div>
    );

    if (shelfTemplate === "bogo") return (
      <div style={{ background: "#E3F2FD", border: "2px solid #1565C0", padding: 8, minHeight: labelSize === "large" ? 130 : 100, borderRadius: forPrint ? 0 : 6 }}>
        <div style={{ display: "flex", gap: 6 }}>
          <div style={{ flexShrink: 0 }}>
            <Barcode value={item.barcodeValue} width={bW} height={bH} fontSize={7} displayValue={false} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 7, fontWeight: 900, color: "#888", textTransform: "uppercase", marginBottom: 2 }}>{storeName}</p>
            <p style={{ fontWeight: 900, fontSize: labelSize === "large" ? 12 : 10, lineHeight: 1.2, color: "#1A237E", marginBottom: 4 }}>{name}</p>
            <div style={{ background: "#1565C0", color: "white", fontWeight: 900, fontSize: labelSize === "large" ? 12 : 10, padding: "4px 8px", borderRadius: 4, display: "inline-block", marginBottom: 4, lineHeight: 1.3 }}>
              BUY 1<br /><span style={{ fontSize: labelSize === "large" ? 16 : 13 }}>GET 1 FREE</span>
            </div>
            <p style={{ fontSize: bigFont, fontWeight: 900, color: "#1565C0", lineHeight: 1 }}>₹{price.toFixed(0)}</p>
            <p style={{ fontSize: 7, color: "#666", marginTop: 1 }}>MRP ₹{mrp > 0 ? mrp.toFixed(0) : price.toFixed(0)} each</p>
          </div>
        </div>
      </div>
    );

    if (shelfTemplate === "new") return (
      <div style={{ background: "#E8F5E9", border: "2px solid #1A237E", padding: 8, display: "flex", gap: 8, alignItems: "center", minHeight: labelSize === "large" ? 130 : 100, borderRadius: forPrint ? 0 : 6 }}>
        <div style={{ flexShrink: 0 }}>
          <Barcode value={item.barcodeValue} width={bW} height={bH} fontSize={7} displayValue={false} />
        </div>
        <div style={{ flex: 1 }}>
          <span style={{ background: "#1A237E", color: "white", fontSize: 8, fontWeight: 900, padding: "1px 6px", borderRadius: 10, display: "inline-block", marginBottom: 3 }}>✨ New Arrival</span>
          <p style={{ fontWeight: 900, fontSize: labelSize === "large" ? 13 : 10, lineHeight: 1.2, color: "#111", marginBottom: 3 }}>{name}</p>
          {mrp > 0 && <p style={{ fontSize: 9, color: "#999", textDecoration: "line-through" }}>MRP ₹{mrp.toFixed(0)}</p>}
          <p style={{ fontSize: 8, fontWeight: 700, color: "#555", marginBottom: 1 }}>Smart Price</p>
          <p style={{ fontSize: bigFont, fontWeight: 900, color: "#1A237E", lineHeight: 1 }}>₹{price.toFixed(0)}</p>
          <p style={{ fontSize: 7, color: "#888", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.1em" }}>{storeName}</p>
        </div>
      </div>
    );

    // regular (default)
    return (
      <div style={{ background: "#FFFDE7", border: "2px solid #FDD835", padding: 8, display: "flex", gap: 8, alignItems: "center", minHeight: labelSize === "large" ? 130 : 100, borderRadius: forPrint ? 0 : 6 }}>
        <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
          {savings > 0 && <div style={{ background: "#e53935", color: "white", fontWeight: 900, fontSize: 9, padding: "1px 5px", borderRadius: 3, marginBottom: 3 }}>SAVE ₹{savings.toFixed(0)}</div>}
          <Barcode value={item.barcodeValue} width={bW} height={bH} fontSize={7} displayValue={false} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 7, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em", color: "#333", marginBottom: 2 }}>{storeName}</p>
          <p style={{ fontWeight: 900, fontSize: labelSize === "large" ? 13 : 10, lineHeight: 1.2, marginBottom: 3, color: "#000" }}>{name}</p>
          {mrp > 0 && <p style={{ fontSize: 9, color: "#666", textDecoration: "line-through" }}>MRP ₹{mrp.toFixed(0)}</p>}
          <p style={{ fontSize: 8, fontWeight: 700, color: "#333", marginBottom: 1 }}>Smart Price</p>
          <p style={{ fontSize: bigFont, fontWeight: 900, color: "#1b5e20", lineHeight: 1 }}>₹{price.toFixed(0)}</p>
        </div>
      </div>
    );
  };

  // Sticker label
  const StickerLabel = ({ item, forPrint }: { item: any; forPrint?: boolean }) => {
    const name = item.displayName || item.name;
    const bH = forPrint ? (labelSize === "large" ? 45 : 35) : 30;
    const bW = forPrint ? 1.2 : 1.0;
    return (
      <div style={{ textAlign: "center", padding: "6px 4px", border: "1px solid #ccc", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "white" }}>
        <p style={{ fontSize: 7, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em", color: "#666", marginBottom: 2 }}>{storeName}</p>
        <p style={{ fontWeight: 900, fontSize: 10, lineHeight: 1.2, marginBottom: 2, maxWidth: "100%", wordBreak: "break-word" }}>{name}</p>
        {item.isWeightItem && <p style={{ fontSize: 7, color: "#888", marginBottom: 1 }}>{item.weightGrams}g</p>}
        <Barcode value={item.barcodeValue} width={bW} height={bH} fontSize={8} displayValue={true} />
        {showPrice && <p style={{ fontWeight: 900, fontSize: 14, marginTop: 2 }}>₹{item.price}</p>}
      </div>
    );
  };

  const templateOptions: { value: ShelfTemplate; label: string; color: string }[] = [
    { value: "regular", label: "🏷️ Regular", color: "#F59E0B" },
    { value: "sale", label: "🔥 Sale", color: "#EF4444" },
    { value: "bogo", label: "🎁 Buy 1 Get 1", color: "#3B82F6" },
    { value: "new", label: "✨ New Arrival", color: "#06B6D4" },
  ];

  const isShelf = printMode === "shelf";

  return (
    <div className="flex h-screen bg-[#020617] text-white overflow-hidden font-sans">

      {/* ── LEFT ────────────────────────────────────────────── */}
      <div className="w-1/3 border-r border-slate-800 flex flex-col no-print">
        <div className="p-5 border-b border-slate-800">
          <h1 className="text-2xl font-black flex items-center gap-2 italic">
            <ScanBarcode className="text-blue-500" /> Sticker <span className="text-slate-500">Studio</span>
          </h1>

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <button onClick={() => setPrintMode(m => m === "sticker" ? "shelf" : "sticker")}
              className={`flex items-center gap-1 text-[9px] font-bold uppercase px-2 py-1 rounded transition-all border ${isShelf ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" : "bg-slate-800 text-slate-500 border-slate-700"}`}>
              <Tag size={10} /> {isShelf ? "Shelf Label" : "Sticker"}
            </button>
            <button onClick={() => setLabelSize(s => s === "small" ? "large" : "small")}
              className="flex items-center gap-1 text-[9px] font-bold uppercase px-2 py-1 rounded bg-slate-800 text-slate-400 border border-slate-700">
              <Layers size={10} /> {labelSize === "large" ? "Large" : "Small"}
            </button>
            <button onClick={() => setWeightMode(w => !w)}
              className={`flex items-center gap-1 text-[9px] font-bold uppercase px-2 py-1 rounded transition-all border ${weightMode ? "bg-orange-500/20 text-orange-400 border-orange-500/30" : "bg-slate-800 text-slate-500 border-slate-700"}`}>
              <Scale size={10} /> {weightMode ? <ToggleRight size={12} /> : <ToggleLeft size={12} />} Weight
            </button>
            <div className="flex items-center gap-1 text-[9px] font-bold text-blue-400 uppercase bg-blue-500/10 px-2 py-1 rounded">
              <Store size={10} /> {activeStoreId ? "Active" : "..."}
            </div>
          </div>

          {isShelf && (
            <div className="mt-3">
              <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">Template</p>
              <div className="grid grid-cols-2 gap-1">
                {templateOptions.map(t => (
                  <button key={t.value} onClick={() => setShelfTemplate(t.value)}
                    style={{ borderColor: shelfTemplate === t.value ? t.color : "#334155", background: shelfTemplate === t.value ? t.color + "22" : "#0f172a", color: shelfTemplate === t.value ? t.color : "#94a3b8" }}
                    className="text-[10px] font-bold py-1.5 px-2 rounded text-left border transition-all">
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {weightMode && <p className="text-[10px] text-orange-400 mt-2 bg-orange-500/10 px-2 py-1 rounded">⚖️ Weight Mode ON</p>}

          <div className="mt-3 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
            <input type="text" placeholder="Search inventory..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-9 text-sm outline-none focus:border-blue-500"
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading
            ? <p className="text-center text-slate-500 text-xs mt-8">Loading...</p>
            : filteredProducts.length === 0
              ? <p className="text-center text-slate-600 text-xs mt-10">No items found.</p>
              : filteredProducts.map(p => (
                <div key={p.id} onClick={() => addToQueue(p)}
                  className="flex justify-between items-center p-3 bg-slate-900/50 border border-slate-800 rounded-xl cursor-pointer hover:border-blue-500 transition-all group">
                  <div>
                    <p className="font-bold text-sm text-slate-200 leading-tight">{p.name}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      ₹{p.price}
                      {p.mrp && p.mrp > p.price && <span className="ml-1 line-through text-slate-600">MRP ₹{p.mrp}</span>}
                    </p>
                  </div>
                  <button className="bg-slate-800 p-2 rounded-lg text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shrink-0 ml-2">
                    <Plus size={15} />
                  </button>
                </div>
              ))}
        </div>
      </div>

      {/* ── RIGHT: QUEUE ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-slate-950 no-print">
        <div className="p-5 border-b border-slate-800 flex justify-between items-center gap-3">
          <div>
            <h2 className="text-xl font-bold">Print Queue</h2>
            <p className="text-xs text-slate-500">{totalLabels} labels total</p>
          </div>
          <div className="flex gap-3 items-center flex-wrap justify-end">
            {!isShelf && (
              <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
                <input type="checkbox" checked={showPrice} onChange={e => setShowPrice(e.target.checked)} className="accent-blue-500" /> Price
              </label>
            )}
            <input type="text" value={storeName} onChange={e => setStoreName(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs outline-none w-28 uppercase font-bold" placeholder="Store Name" />
            <button onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shrink-0">
              <Printer size={16} /> PRINT
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 gap-4 content-start">
          {printQueue.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center text-slate-600 mt-20">
              <ScanBarcode size={48} className="mb-3 opacity-40" />
              <p className="text-sm">Select products from the left</p>
            </div>
          )}
          {printQueue.map(item => (
            <div key={item.id} className="bg-white rounded-xl relative group overflow-hidden">
              <button onClick={() => removeFromQueue(item.id)}
                className="absolute top-1.5 right-1.5 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow z-10">
                <X size={11} />
              </button>
              <div className="p-3">
                {isShelf ? <ShelfLabel item={item} /> : <StickerLabel item={item} />}
              </div>
              <div className="flex justify-center items-center gap-3 py-2 bg-gray-100 border-t border-gray-200">
                <button onClick={() => updateCopies(item.id, -1)} className="p-1 hover:bg-gray-200 rounded text-black"><Minus size={13} /></button>
                <span className="font-bold text-sm w-6 text-center text-black">{item.copies}</span>
                <button onClick={() => updateCopies(item.id, 1)} className="p-1 hover:bg-gray-200 rounded text-black"><Plus size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── PRINT AREA ──────────────────────────────────────────── */}
      {/* Uses visibility trick: on print, body descendants hidden except this */}
      <div className="scanmart-print-root">
        {isShelf ? (
          <div style={{
            display: "grid",
            gridTemplateColumns: labelSize === "large" ? "1fr" : "1fr 1fr",
            gap: 0, padding: 4,
          }}>
            {printQueue.flatMap(item =>
              Array(item.copies).fill(null).map((_, idx) => (
                <div key={`${item.id}-${idx}`} style={{ padding: 3 }}>
                  <ShelfLabel item={item} forPrint />
                </div>
              ))
            )}
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: labelSize === "large" ? "1fr 1fr" : "1fr 1fr 1fr",
            gap: 3, padding: 4,
          }}>
            {printQueue.flatMap(item =>
              Array(item.copies).fill(null).map((_, idx) => (
                <StickerLabel key={`${item.id}-${idx}`} item={item} forPrint />
              ))
            )}
          </div>
        )}
      </div>

      <style jsx global>{`
        .scanmart-print-root { display: none; }
        @media print {
          body * { visibility: hidden !important; }
          .scanmart-print-root { visibility: visible !important; display: block !important; position: fixed !important; top: 0; left: 0; width: 100%; background: white; z-index: 99999; }
          .scanmart-print-root * { visibility: visible !important; }
          @page { margin: 0.4cm; size: auto; }
        }
      `}</style>

      {/* ── WEIGHT MODAL ─────────────────────────────────────────── */}
      {weightModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999]" onClick={() => setWeightModal(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-80 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-black mb-1">⚖️ Enter Weight</h3>
            <p className="text-xs text-slate-400 mb-4">{selectedProduct.name} — ₹{selectedProduct.price}/kg</p>
            <input type="number" placeholder="Weight in grams (e.g. 500)"
              value={weightInput} onChange={e => setWeightInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addWeightItem()} autoFocus
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-blue-500 text-lg font-bold" />
            {weightInput && parseFloat(weightInput) > 0 && (
              <div className="mt-3 bg-blue-600/20 border border-blue-500/30 rounded-lg p-3 text-center">
                <p className="text-xs text-slate-400">Calculated Price</p>
                <p className="text-2xl font-black">₹{((parseFloat(weightInput) / 1000) * selectedProduct.price).toFixed(2)}</p>
                <p className="text-[10px] text-slate-500">{weightInput}g × ₹{selectedProduct.price}/kg</p>
              </div>
            )}
            <div className="flex gap-3 mt-4">
              <button onClick={() => setWeightModal(false)} className="flex-1 bg-slate-700 py-3 rounded-xl font-bold hover:bg-slate-600 transition-all">Cancel</button>
              <button onClick={addWeightItem} disabled={!weightInput || parseFloat(weightInput) <= 0}
                className="flex-1 bg-blue-600 py-3 rounded-xl font-bold hover:bg-blue-500 transition-all disabled:opacity-40">Add Label</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}