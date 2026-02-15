"use client";
import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import Barcode from "react-barcode";
import { Search, Printer, Plus, Minus, X, ScanBarcode, ShoppingBag, Store } from "lucide-react";

export default function StickerPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [printQueue, setPrintQueue] = useState<any[]>([]); // Items selected for printing
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  
  // 🔥 Active Store State (New)
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null);

  // Sticker Settings
  const [showPrice, setShowPrice] = useState(true);
  const [storeName, setStoreName] = useState("SCANMART");

  // --- 🔄 INITIALIZATION ---
  useEffect(() => {
    // 1. Check LocalStorage for Active Store
    const storedId = typeof window !== 'undefined' ? localStorage.getItem("active_store_id") : null;
    
    if (storedId) {
        setActiveStoreId(storedId);
        // Optional: Fetch store name to auto-fill sticker header
        fetchStoreName(storedId);
    } else {
        fetchFirstStore();
    }
  }, []);

  // Reload data whenever activeStoreId changes
  useEffect(() => {
      if(activeStoreId) {
          fetchInventory();
          setPrintQueue([]); // Clear queue when switching stores to avoid mix-up
      }
  }, [activeStoreId]);

  const fetchFirstStore = async () => {
      const { data } = await supabase.from("stores").select("id, name").limit(1);
      if(data && data.length > 0) {
          setActiveStoreId(data[0].id);
          setStoreName(data[0].name.toUpperCase());
          localStorage.setItem("active_store_id", data[0].id);
      }
  };

  const fetchStoreName = async (id: string) => {
      const { data } = await supabase.from("stores").select("name").eq("id", id).single();
      if(data) setStoreName(data.name.toUpperCase());
  };

  // --- 📡 FETCH INVENTORY (Filtered by Store) ---
  const fetchInventory = async () => {
    if(!activeStoreId) return;
    setLoading(true);
    
    const { data } = await supabase
        .from("inventory")
        .select("*")
        .eq("store_id", activeStoreId) // 🔥 Filter by Store ID
        .gt("stock", 0)
        .eq("is_active", true); // Only active items

    if (data) setProducts(data);
    setLoading(false);
  };

  // Add Item to Print Queue
  const addToQueue = (product: any) => {
    setPrintQueue((prev) => {
      const exists = prev.find((item) => item.id === product.id);
      if (exists) {
        return prev.map((item) => item.id === product.id ? { ...item, copies: item.copies + 1 } : item);
      }
      // Generate a pseudo-barcode if one doesn't exist (using sliced ID for demo)
      const barcodeValue = product.barcode || product.id.slice(0, 8).toUpperCase(); 
      return [...prev, { ...product, copies: 1, barcodeValue }];
    });
  };

  const updateCopies = (id: string, delta: number) => {
    setPrintQueue((prev) => prev.map((item) => {
      if (item.id === id) {
        const newCopies = Math.max(1, item.copies + delta);
        return { ...item, copies: newCopies };
      }
      return item;
    }));
  };

  const removeFromQueue = (id: string) => {
    setPrintQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const handlePrint = () => {
    if (printQueue.length === 0) return alert("Select items first!");
    window.print();
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="flex h-screen bg-[#020617] text-white overflow-hidden font-sans">
      
      {/* 🟢 LEFT SIDE: INVENTORY SELECTION (No Print) */}
      <div className="w-1/3 border-r border-slate-800 flex flex-col no-print">
        <div className="p-6 border-b border-slate-800">
            <h1 className="text-2xl font-black flex items-center gap-2 italic">
                <ScanBarcode className="text-blue-500"/> Sticker <span className="text-slate-500">Studio</span>
            </h1>
            <div className="flex justify-between items-end mt-1">
                <p className="text-xs text-slate-500">Select products to generate barcodes</p>
                {/* 🔥 Store Indicator */}
                <div className="flex items-center gap-1 text-[9px] font-bold text-blue-400 uppercase bg-blue-500/10 px-2 py-1 rounded">
                    <Store size={10}/> {activeStoreId ? "Store Active" : "Loading..."}
                </div>
            </div>
            
            <div className="mt-4 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input 
                    type="text" placeholder="Search Inventory..." 
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-10 text-sm outline-none focus:border-blue-500"
                    value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {loading ? <p className="text-center text-slate-500 text-xs">Loading...</p> : 
             filteredProducts.length === 0 ? <p className="text-center text-slate-600 text-xs mt-10">No items found in this store.</p> :
             filteredProducts.map((product) => (
                <div key={product.id} onClick={() => addToQueue(product)} className="flex justify-between items-center p-3 bg-slate-900/50 border border-slate-800 rounded-xl cursor-pointer hover:border-blue-500 transition-all group">
                    <div>
                        <p className="font-bold text-sm text-slate-200">{product.name}</p>
                        <p className="text-[10px] text-slate-500">₹{product.price}</p>
                    </div>
                    <button className="bg-slate-800 p-2 rounded-lg text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all"><Plus size={16}/></button>
                </div>
            ))}
        </div>
      </div>

      {/* 🔵 RIGHT SIDE: PRINT QUEUE (No Print) */}
      <div className="flex-1 flex flex-col bg-slate-950 no-print">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
            <div>
                <h2 className="text-xl font-bold">Print Queue</h2>
                <p className="text-xs text-slate-500">{printQueue.reduce((acc, item) => acc + item.copies, 0)} Stickers Total</p>
            </div>
            
            {/* Settings */}
            <div className="flex gap-4 items-center">
                <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                    <input type="checkbox" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} className="accent-blue-500"/> Show Price
                </label>
                <input 
                    type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)} 
                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs outline-none w-32 uppercase font-bold" placeholder="Store Name"
                />
                <button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition-all">
                    <Printer size={18}/> PRINT NOW
                </button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 content-start">
            {printQueue.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center text-slate-600 mt-20">
                    <ScanBarcode size={48} className="mb-4 opacity-50"/>
                    <p>Select items from the left to create stickers</p>
                </div>
            )}
            
            {printQueue.map((item) => (
                <div key={item.id} className="bg-white text-black p-4 rounded-xl relative group">
                    <button onClick={() => removeFromQueue(item.id)} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg"><X size={12}/></button>
                    
                    {/* Sticker Preview */}
                    <div className="flex flex-col items-center text-center border-2 border-dashed border-gray-300 p-2 rounded">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{storeName}</p>
                        <p className="font-black text-sm leading-tight my-1 line-clamp-1">{item.name}</p>
                        <Barcode value={item.barcodeValue} width={1.5} height={40} fontSize={12} displayValue={true} />
                        {showPrice && <p className="font-bold text-lg mt-1">₹{item.price}</p>}
                    </div>

                    {/* Controls */}
                    <div className="flex justify-center items-center gap-3 mt-4 bg-gray-100 p-2 rounded-lg">
                        <button onClick={() => updateCopies(item.id, -1)} className="p-1 hover:bg-gray-200 rounded"><Minus size={14}/></button>
                        <span className="font-bold text-sm w-4 text-center">{item.copies}</span>
                        <button onClick={() => updateCopies(item.id, 1)} className="p-1 hover:bg-gray-200 rounded"><Plus size={14}/></button>
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* 🖨️ ACTUAL PRINT AREA (Visible ONLY on Print) */}
      <div className="print-area hidden bg-white text-black absolute top-0 left-0 w-full h-full z-[9999]">
         <div className="grid grid-cols-3 gap-4 p-4">
            {printQueue.flatMap(item => 
               Array(item.copies).fill(item).map((_, idx) => (
                   <div key={`${item.id}-${idx}`} className="border border-gray-300 p-2 flex flex-col items-center justify-center text-center h-[180px] break-inside-avoid page-break">
                       <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-1">{storeName}</p>
                       <p className="font-black text-sm leading-tight mb-1">{item.name}</p>
                       {/* Barcode Component */}
                       <div className="scale-90 origin-center">
                           <Barcode value={item.barcodeValue} width={1.5} height={50} fontSize={14} displayValue={true} />
                       </div>
                       {showPrice && <p className="font-bold text-xl mt-1">₹{item.price}</p>}
                   </div>
               ))
            )}
         </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          .print-area { display: block !important; }
          body { background: white; -webkit-print-color-adjust: exact; }
          @page { margin: 0.5cm; size: auto; }
        }
        .page-break { page-break-inside: avoid; }
      `}</style>
    </div>
  );
}