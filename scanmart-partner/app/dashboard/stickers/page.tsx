"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Barcode from "react-barcode";
import {
  Search, Printer, Plus, Minus, X, ScanBarcode,
  Store, Scale, ToggleLeft, ToggleRight, Tag, Layers, ShoppingBag
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

  // Settings
  const [showPrice, setShowPrice] = useState(true);
  const [storeName, setStoreName] = useState("SCANMART");

  // Weight Mode
  const [weightMode, setWeightMode] = useState(false);
  const [weightModal, setWeightModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [weightInput, setWeightInput] = useState("");

  // Print configuration
  const [printMode, setPrintMode] = useState<PrintMode>("sticker");
  const [shelfTemplate, setShelfTemplate] = useState<ShelfTemplate>("regular");
  const [labelSize, setLabelSize] = useState<LabelSize>("small");

  // ─── INIT ──────────────────────────────────────────────────────
  useEffect(() => {
    const storedId = typeof window !== "undefined" ? localStorage.getItem("active_store_id") : null;
    if (storedId) {
      setActiveStoreId(storedId);
      fetchStoreName(storedId);
    } else {
      fetchFirstStore();
    }
  }, []);

  useEffect(() => {
    if (activeStoreId) {
      fetchInventory();
      setPrintQueue([]);
    }
  }, [activeStoreId]);

  const fetchFirstStore = async () => {
    const { data } = await supabase.from("stores").select("id, name").limit(1);
    if (data && data.length > 0) {
      setActiveStoreId(data[0].id);
      setStoreName(data[0].name.toUpperCase());
      localStorage.setItem("active_store_id", data[0].id);
    }
  };

  const fetchStoreName = async (id: string) => {
    const { data } = await supabase.from("stores").select("name").eq("id", id).single();
    if (data) setStoreName(data.name.toUpperCase());
  };

  const fetchInventory = async () => {
    if (!activeStoreId) return;
    setLoading(true);
    const { data } = await supabase
      .from("inventory")
      .select("id, name, price, mrp, barcode, stock, category")
      .eq("store_id", activeStoreId)
      .gt("stock", 0)
      .eq("is_active", true);
    if (data) setProducts(data);
    setLoading(false);
  };

  // ─── QUEUE MANAGEMENT ──────────────────────────────────────────
  const addToQueue = (product: any) => {
    if (weightMode) {
      setSelectedProduct(product);
      setWeightInput("");
      setWeightModal(true);
      return;
    }
    setPrintQueue((prev) => {
      const exists = prev.find((item) => item.id === product.id);
      if (exists) {
        return prev.map((item) => item.id === product.id ? { ...item, copies: item.copies + 1 } : item);
      }
      const barcodeValue = product.barcode || product.id.slice(0, 8).toUpperCase();
      return [...prev, { ...product, copies: 1, barcodeValue }];
    });
  };

  const addWeightItem = () => {
    const grams = parseFloat(weightInput);
    if (!selectedProduct || isNaN(grams) || grams <= 0) return;
    const calculatedPrice = ((grams / 1000) * selectedProduct.price).toFixed(2);
    const barcodeValue = selectedProduct.barcode || selectedProduct.id.slice(0, 8).toUpperCase();
    setPrintQueue(prev => [...prev, {
      ...selectedProduct,
      id: selectedProduct.id + "-" + Date.now(),
      price: calculatedPrice,
      weightGrams: grams,
      isWeightItem: true,
      copies: 1,
      barcodeValue,
      displayName: `${selectedProduct.name} (${grams}g)`,
    }]);
    setWeightModal(false);
    setSelectedProduct(null);
    setWeightInput("");
  };

  const updateCopies = (id: string, delta: number) => {
    setPrintQueue((prev) => prev.map((item) =>
      item.id === id ? { ...item, copies: Math.max(1, item.copies + delta) } : item
    ));
  };

  const removeFromQueue = (id: string) => {
    setPrintQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const handlePrint = () => {
    if (printQueue.length === 0) return alert("Select items first!");
    window.print();
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ─── SHELF LABEL RENDERER ───────────────────────────────────────
  const ShelfLabelCard = ({ item, forPrint = false }: { item: any; forPrint?: boolean }) => {
    const mrp = item.mrp ? parseFloat(item.mrp) : 0;
    const price = parseFloat(item.price);
    const savings = mrp > price ? (mrp - price) : 0;
    const displayName = item.isWeightItem ? item.displayName : item.name;

    const baseStyle: React.CSSProperties = forPrint
      ? { pageBreakInside: "avoid", breakInside: "avoid" }
      : {};

    // ── REGULAR ────────────────────────────────────────────────────
    if (shelfTemplate === "regular") return (
      <div style={{ ...baseStyle, background: "#FFFDE7", border: "2px solid #FDD835", borderRadius: forPrint ? 0 : "8px", padding: "10px", display: "flex", gap: "10px", alignItems: "center", minHeight: labelSize === "large" ? "150px" : "110px" }}>
        <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
          {savings > 0 && (
            <div style={{ background: "#e53935", color: "white", fontWeight: 900, fontSize: "11px", padding: "2px 6px", borderRadius: "4px", marginBottom: "4px" }}>
              SAVE ₹{savings.toFixed(0)}
            </div>
          )}
          <Barcode value={item.barcodeValue} width={1.1} height={labelSize === "large" ? 55 : 40} fontSize={8} displayValue={true} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: "8px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.15em", color: "#888", marginBottom: "2px" }}>{storeName}</p>
          <p style={{ fontWeight: 900, fontSize: labelSize === "large" ? "15px" : "12px", lineHeight: "1.2", marginBottom: "4px" }}>{displayName}</p>
          {mrp > 0 && <p style={{ fontSize: "10px", color: "#999", textDecoration: "line-through", marginBottom: "1px" }}>MRP ₹{mrp.toFixed(0)}</p>}
          <p style={{ fontSize: "9px", fontWeight: 700, color: "#555", marginBottom: "1px" }}>Smart Price</p>
          <p style={{ fontSize: labelSize === "large" ? "32px" : "24px", fontWeight: 900, color: "#1b5e20", lineHeight: 1 }}>₹{price.toFixed(0)}</p>
        </div>
      </div>
    );

    // ── SALE ───────────────────────────────────────────────────────
    if (shelfTemplate === "sale") return (
      <div style={{ ...baseStyle, background: "#B71C1C", border: "none", borderRadius: forPrint ? 0 : "8px", padding: "10px", display: "flex", gap: "10px", alignItems: "center", minHeight: labelSize === "large" ? "150px" : "110px", color: "white" }}>
        <div style={{ flexShrink: 0, background: "white", padding: "4px", borderRadius: "4px" }}>
          <Barcode value={item.barcodeValue} width={1.1} height={labelSize === "large" ? 50 : 35} fontSize={7} displayValue={true} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ background: "#FF6F00", color: "white", fontWeight: 900, fontSize: labelSize === "large" ? "20px" : "14px", padding: "2px 8px", borderRadius: "4px", display: "inline-block", marginBottom: "4px" }}>
            🔥 SALE
          </div>
          <p style={{ fontWeight: 900, fontSize: labelSize === "large" ? "14px" : "11px", lineHeight: "1.2", marginBottom: "4px", color: "#FFE082" }}>{displayName}</p>
          {mrp > 0 && <p style={{ fontSize: "10px", color: "#FFCDD2", textDecoration: "line-through" }}>₹{mrp.toFixed(0)}</p>}
          <p style={{ fontSize: labelSize === "large" ? "30px" : "22px", fontWeight: 900, color: "#FFEB3B", lineHeight: 1 }}>₹{price.toFixed(0)}</p>
          {savings > 0 && <p style={{ fontSize: "9px", color: "#FFCDD2", marginTop: "2px" }}>You save ₹{savings.toFixed(0)}</p>}
        </div>
        <div style={{ flexShrink: 0, writingMode: "vertical-rl", fontSize: "8px", fontWeight: 900, color: "#EF9A9A", letterSpacing: "0.1em", textTransform: "uppercase" }}>{storeName}</div>
      </div>
    );

    // ── BOGO (Buy 1 Get 1 at Half Price) ───────────────────────────
    if (shelfTemplate === "bogo") return (
      <div style={{ ...baseStyle, background: "#E3F2FD", border: "2px solid #1565C0", borderRadius: forPrint ? 0 : "8px", padding: "8px", minHeight: labelSize === "large" ? "150px" : "110px" }}>
        <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
          <div style={{ flexShrink: 0 }}>
            <Barcode value={item.barcodeValue} width={1.1} height={labelSize === "large" ? 50 : 35} fontSize={7} displayValue={false} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: "7px", fontWeight: 900, textTransform: "uppercase", color: "#888", marginBottom: "1px" }}>{storeName}</p>
            <p style={{ fontWeight: 900, fontSize: labelSize === "large" ? "13px" : "10px", lineHeight: "1.2", marginBottom: "4px", color: "#1A237E" }}>{displayName}</p>
            <div style={{ background: "#1565C0", color: "white", fontWeight: 900, fontSize: labelSize === "large" ? "13px" : "10px", padding: "3px 8px", borderRadius: "4px", display: "inline-block", marginBottom: "4px", lineHeight: 1.3 }}>
              BUY 1 GET 1<br/>
              <span style={{ fontSize: labelSize === "large" ? "18px" : "14px" }}>@ HALF PRICE</span>
            </div>
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: "7px", color: "#666" }}>1st item</p>
                <p style={{ fontSize: labelSize === "large" ? "20px" : "16px", fontWeight: 900, color: "#1565C0" }}>₹{price.toFixed(0)}</p>
              </div>
              <span style={{ fontSize: "16px", color: "#aaa" }}>+</span>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: "7px", color: "#666" }}>2nd item</p>
                <p style={{ fontSize: labelSize === "large" ? "20px" : "16px", fontWeight: 900, color: "#e53935" }}>₹{(price / 2).toFixed(0)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );

    // ── NEW ARRIVAL ──────────────────────────────────────────────
    return (
      <div style={{ ...baseStyle, background: "#1A237E", border: "none", borderRadius: forPrint ? 0 : "8px", padding: "10px", display: "flex", gap: "10px", alignItems: "center", minHeight: labelSize === "large" ? "150px" : "110px", color: "white" }}>
        <div style={{ flexShrink: 0, background: "white", padding: "4px", borderRadius: "4px" }}>
          <Barcode value={item.barcodeValue} width={1.1} height={labelSize === "large" ? 50 : 35} fontSize={7} displayValue={true} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ background: "#00BCD4", color: "white", fontWeight: 900, fontSize: "9px", padding: "1px 6px", borderRadius: "10px", display: "inline-block", marginBottom: "3px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            ✨ New Arrival
          </div>
          <p style={{ fontWeight: 900, fontSize: labelSize === "large" ? "14px" : "11px", lineHeight: "1.2", marginBottom: "4px", color: "#E3F2FD" }}>{displayName}</p>
          {mrp > 0 && <p style={{ fontSize: "9px", color: "#90CAF9", textDecoration: "line-through" }}>MRP ₹{mrp.toFixed(0)}</p>}
          <p style={{ fontSize: labelSize === "large" ? "28px" : "22px", fontWeight: 900, color: "#4FC3F7", lineHeight: 1 }}>₹{price.toFixed(0)}</p>
          <p style={{ fontSize: "7px", color: "#90CAF9", marginTop: "2px", textTransform: "uppercase", letterSpacing: "0.1em" }}>{storeName}</p>
        </div>
      </div>
    );
  };

  // ─── STICKER LABEL RENDERER ─────────────────────────────────────
  const StickerCard = ({ item, forPrint = false }: { item: any; forPrint?: boolean }) => {
    const displayName = item.isWeightItem ? item.displayName : item.name;
    const h = labelSize === "large" ? 55 : 40;
    return (
      <div style={{ textAlign: "center", padding: "8px", border: "1px solid #ccc", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: forPrint ? (labelSize === "large" ? "200px" : "160px") : undefined }}>
        <p style={{ fontSize: "8px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.15em", color: "#666", marginBottom: "2px" }}>{storeName}</p>
        <p style={{ fontWeight: 900, fontSize: "12px", lineHeight: "1.2", marginBottom: "4px" }}>{displayName}</p>
        {item.isWeightItem && <p style={{ fontSize: "8px", color: "#888" }}>{item.weightGrams}g</p>}
        <Barcode value={item.barcodeValue} width={1.5} height={h} fontSize={12} displayValue={true} />
        {showPrice && <p style={{ fontWeight: 900, fontSize: "18px", marginTop: "2px" }}>₹{item.price}</p>}
      </div>
    );
  };

  const templateOptions: { value: ShelfTemplate; label: string; color: string }[] = [
    { value: "regular", label: "🏷️ Regular", color: "#F59E0B" },
    { value: "sale", label: "🔥 Sale", color: "#EF4444" },
    { value: "bogo", label: "2️⃣ Buy 1 Get ½", color: "#3B82F6" },
    { value: "new", label: "✨ New Arrival", color: "#06B6D4" },
  ];

  const isShelf = printMode === "shelf";

  return (
    <div className="flex h-screen bg-[#020617] text-white overflow-hidden font-sans">

      {/* ── LEFT: PRODUCT LIST ─────────────────────────────────────── */}
      <div className="w-1/3 border-r border-slate-800 flex flex-col no-print">
        <div className="p-5 border-b border-slate-800">
          <h1 className="text-2xl font-black flex items-center gap-2 italic">
            <ScanBarcode className="text-blue-500" /> Sticker <span className="text-slate-500">Studio</span>
          </h1>

          {/* Mode + Store row */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {/* Print Mode */}
            <button
              onClick={() => setPrintMode(m => m === "sticker" ? "shelf" : "sticker")}
              className={`flex items-center gap-1 text-[9px] font-bold uppercase px-2 py-1 rounded transition-all ${isShelf ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" : "bg-slate-800 text-slate-500 border border-slate-700"}`}
            >
              <Tag size={10} /> {isShelf ? "Shelf Label" : "Sticker"}
            </button>

            {/* Label Size */}
            <button
              onClick={() => setLabelSize(s => s === "small" ? "large" : "small")}
              className="flex items-center gap-1 text-[9px] font-bold uppercase px-2 py-1 rounded bg-slate-800 text-slate-400 border border-slate-700"
            >
              <Layers size={10} /> {labelSize === "large" ? "Large" : "Small"}
            </button>

            {/* Weight Mode */}
            <button
              onClick={() => setWeightMode(w => !w)}
              className={`flex items-center gap-1 text-[9px] font-bold uppercase px-2 py-1 rounded transition-all ${weightMode ? "bg-orange-500/20 text-orange-400 border border-orange-500/30" : "bg-slate-800 text-slate-500 border border-slate-700"}`}
            >
              <Scale size={10} /> {weightMode ? <ToggleRight size={12} /> : <ToggleLeft size={12} />} Weight
            </button>

            {/* Store */}
            <div className="flex items-center gap-1 text-[9px] font-bold text-blue-400 uppercase bg-blue-500/10 px-2 py-1 rounded">
              <Store size={10} /> {activeStoreId ? "Store Active" : "Loading..."}
            </div>
          </div>

          {/* Template picker (only in shelf mode) */}
          {isShelf && (
            <div className="mt-3">
              <p className="text-[9px] text-slate-500 uppercase mb-1 font-bold">Template</p>
              <div className="grid grid-cols-2 gap-1">
                {templateOptions.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setShelfTemplate(t.value)}
                    className={`text-[10px] font-bold py-1.5 px-2 rounded text-left transition-all ${shelfTemplate === t.value ? "ring-2 ring-offset-1 ring-offset-slate-900 text-white" : "bg-slate-800 text-slate-400"}`}
                    style={{ background: shelfTemplate === t.value ? t.color + "33" : undefined, borderColor: shelfTemplate === t.value ? t.color : undefined, borderWidth: "1px", color: shelfTemplate === t.value ? t.color : undefined }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Status hints */}
          {weightMode && <p className="text-[10px] text-orange-400 mt-2 bg-orange-500/10 px-2 py-1 rounded">⚖️ Weight Mode ON — Click product to enter grams</p>}

          {/* Search */}
          <div className="mt-3 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              type="text" placeholder="Search Inventory..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-10 text-sm outline-none focus:border-blue-500"
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? <p className="text-center text-slate-500 text-xs">Loading...</p> :
            filteredProducts.length === 0 ? <p className="text-center text-slate-600 text-xs mt-10">No items found.</p> :
              filteredProducts.map((product) => (
                <div key={product.id} onClick={() => addToQueue(product)}
                  className="flex justify-between items-center p-3 bg-slate-900/50 border border-slate-800 rounded-xl cursor-pointer hover:border-blue-500 transition-all group">
                  <div>
                    <p className="font-bold text-sm text-slate-200">{product.name}</p>
                    <p className="text-[10px] text-slate-500">
                      ₹{product.price}
                      {product.mrp && <span className="ml-1 line-through text-slate-600">MRP ₹{product.mrp}</span>}
                    </p>
                  </div>
                  <button className="bg-slate-800 p-2 rounded-lg text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <Plus size={16} />
                  </button>
                </div>
              ))}
        </div>
      </div>

      {/* ── RIGHT: PRINT QUEUE ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-slate-950 no-print">
        <div className="p-5 border-b border-slate-800 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">Print Queue</h2>
            <p className="text-xs text-slate-500">{printQueue.reduce((a, i) => a + i.copies, 0)} labels total</p>
          </div>
          <div className="flex gap-3 items-center">
            {printMode === "sticker" && (
              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                <input type="checkbox" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} className="accent-blue-500" /> Show Price
              </label>
            )}
            <input
              type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs outline-none w-28 uppercase font-bold" placeholder="Store Name"
            />
            <button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl font-bold flex items-center gap-2 transition-all">
              <Printer size={16} /> PRINT
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 gap-4 content-start">
          {printQueue.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center text-slate-600 mt-20">
              <ScanBarcode size={48} className="mb-4 opacity-50" />
              <p>Select items from left to add labels</p>
            </div>
          )}
          {printQueue.map((item) => (
            <div key={item.id} className="bg-white rounded-xl relative group overflow-hidden">
              <button onClick={() => removeFromQueue(item.id)}
                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg z-10">
                <X size={12} />
              </button>

              {/* Preview */}
              <div className="p-3">
                {isShelf
                  ? <ShelfLabelCard item={item} />
                  : <StickerCard item={item} />
                }
              </div>

              {/* Copies control */}
              <div className="flex justify-center items-center gap-3 py-2 bg-gray-100 border-t border-gray-200">
                <button onClick={() => updateCopies(item.id, -1)} className="p-1 hover:bg-gray-200 rounded"><Minus size={14} /></button>
                <span className="font-bold text-sm w-6 text-center text-black">{item.copies}</span>
                <button onClick={() => updateCopies(item.id, 1)} className="p-1 hover:bg-gray-200 rounded"><Plus size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── PRINT AREA (screen pe hide, print pe show) ──────────────── */}
      <div className="scanmart-print-area" style={{ display: "none" }}>
        {isShelf ? (
          <div style={{
            display: "grid",
            gridTemplateColumns: labelSize === "large" ? "1fr" : "1fr 1fr",
            gap: "0",
            padding: "8px",
            background: "white",
          }}>
            {printQueue.flatMap(item =>
              Array(item.copies).fill(item).map((_, idx) => (
                <div key={`shelf-${item.id}-${idx}`} style={{ padding: "4px" }}>
                  <ShelfLabelCard item={item} forPrint />
                </div>
              ))
            )}
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: labelSize === "large" ? "1fr 1fr" : "1fr 1fr 1fr",
            gap: "4px",
            padding: "8px",
            background: "white",
          }}>
            {printQueue.flatMap(item =>
              Array(item.copies).fill(item).map((_, idx) => (
                <StickerCard key={`sticker-${item.id}-${idx}`} item={item} forPrint />
              ))
            )}
          </div>
        )}
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body > * { display: none !important; }
          .scanmart-print-area { display: block !important; }
          body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { margin: 0.5cm; size: auto; }
        }
      `}</style>

      {/* ── WEIGHT MODAL ────────────────────────────────────────────── */}
      {weightModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999]" onClick={() => setWeightModal(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-80 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-black text-white mb-1">⚖️ Enter Weight</h3>
            <p className="text-xs text-slate-400 mb-4">{selectedProduct.name} — ₹{selectedProduct.price}/kg</p>
            <input
              type="number" placeholder="Weight in grams (e.g. 1295)"
              value={weightInput} onChange={e => setWeightInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addWeightItem()} autoFocus
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-blue-500 text-lg font-bold"
            />
            {weightInput && parseFloat(weightInput) > 0 && (
              <div className="mt-3 bg-blue-600/20 border border-blue-500/30 rounded-lg p-3 text-center">
                <p className="text-xs text-slate-400">Calculated Price</p>
                <p className="text-2xl font-black text-white">₹{((parseFloat(weightInput) / 1000) * selectedProduct.price).toFixed(2)}</p>
                <p className="text-[10px] text-slate-500">{weightInput}g × ₹{selectedProduct.price}/kg</p>
              </div>
            )}
            <div className="flex gap-3 mt-4">
              <button onClick={() => setWeightModal(false)} className="flex-1 bg-slate-700 text-white py-3 rounded-xl font-bold hover:bg-slate-600 transition-all">Cancel</button>
              <button onClick={addWeightItem} disabled={!weightInput || parseFloat(weightInput) <= 0}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-500 transition-all disabled:opacity-40">
                Add Label
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}