"use client";
import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import QRCode from "react-qr-code"; 
import { 
  Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, 
  Loader2, User, Phone, Banknote, QrCode, Printer, X, ScanBarcode, Camera,
  Lock, LogOut, ShieldCheck, Receipt, Store, Grid, List, RotateCcw,
  ChevronRight, Calculator
} from "lucide-react";
import BarcodeScanner from "@/components/BarcodeScanner"; 

export default function SalesPage() {
  const QRCodeAny = QRCode as any; 

  // --- 🔐 STAFF & STORE STATES ---
  const [currentStaff, setCurrentStaff] = useState<any>(null);
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // --- BILLING STATES ---
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false); 
  const [activeTab, setActiveTab] = useState<'scan' | 'loose'>('scan');

  // --- SETTINGS ---
  const [storeSettings, setStoreSettings] = useState({
    shop_name: "ScanMart Store",
    shop_address: "123, Market Road, City",
    shop_phone: "9876543210",
    gstin: "", 
    invoice_footer: "Thank you for shopping! Visit Again.",
    upi_id: "" // 🔥 Added UPI ID to default state
  });

  // --- CUSTOMER & PAYMENT ---
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [totalSpent, setTotalSpent] = useState(0);
  const [isExisting, setIsExisting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi" | "card">("cash");
  
  // --- RECEIPT & QR ---
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  const [qrRef, setQrRef] = useState("");
  const [timeLeft, setTimeLeft] = useState(60);
  
  // --- INITIALIZATION ---
  useEffect(() => {
    const storedId = typeof window !== 'undefined' ? localStorage.getItem("active_store_id") : null;
    if (storedId) {
        setActiveStoreId(storedId);
    } else {
        fetchFirstStore();
    }
  }, []);

  useEffect(() => {
      if(activeStoreId) {
          fetchProducts();
          fetchSettings(); // 🔥 Fetch settings when store changes
      }
  }, [activeStoreId]);

  const fetchFirstStore = async () => {
      const { data } = await supabase.from("stores").select("id").limit(1);
      if(data && data.length > 0) {
          setActiveStoreId(data[0].id);
          localStorage.setItem("active_store_id", data[0].id);
      }
  };

  const fetchProducts = async () => {
    if(!activeStoreId) return;
    const { data, error } = await supabase
        .from("inventory")
        .select("*, mrp")
        .eq("store_id", activeStoreId)
        .gt('stock', 0)
        .eq('is_active', true);

    if (error) console.error("Error fetching products:", error);
    if (data) setProducts(data);
  };

  // 🔥 UPDATED FETCH SETTINGS LOGIC
  const fetchSettings = async () => {
    // We assume store_settings table uses the user's ID as the primary key (Owner ID)
    // If activeStoreId is available, we first find who owns this store
    if (!activeStoreId) return;

    try {
        // 1. Get owner_id from the store
        const { data: storeData } = await supabase.from("stores").select("owner_id").eq("id", activeStoreId).single();
        
        if (storeData?.owner_id) {
            // 2. Fetch settings for that owner
            const { data: settingsData } = await supabase.from("store_settings").select("*").eq("id", storeData.owner_id).single();
            if (settingsData) setStoreSettings(settingsData);
        }
    } catch (error) {
        console.error("Error loading settings:", error);
    }
  };

  // --- 🔐 STAFF LOGIN ---
  const handleStaffLogin = async () => {
    if (pin.length !== 4) return alert("PIN must be 4 digits");
    setLoginLoading(true);
    const { data, error } = await supabase.from("staff").select("*").eq("pin_code", pin).eq("is_active", true).single();
    
    if (error || !data) { 
        alert("❌ Invalid PIN"); setPin(""); 
    } else { 
        if(data.role !== 'admin' && data.store_id && data.store_id !== activeStoreId) {
            alert("❌ Access Denied: You belong to a different store.");
            setPin("");
        } else {
            setCurrentStaff(data); setPin(""); 
        }
    }
    setLoginLoading(false);
  };

  const handleLogout = () => { setCurrentStaff(null); setCart([]); setPhone(""); setName(""); };

  // --- ⌨️ KEYBOARD SHORTCUTS ---
  useEffect(() => {
      const handleGlobalKeys = (e: KeyboardEvent) => {
          if (!currentStaff) return;
          if (e.key === "F2") document.getElementById("search-box")?.focus();
          if (e.key === "F9") setPaymentMethod("cash");
          if (e.key === "F10") setPaymentMethod("upi");
      };
      window.addEventListener("keydown", handleGlobalKeys);
      return () => window.removeEventListener("keydown", handleGlobalKeys);
  }, [currentStaff]);

  // --- 🛒 CART LOGIC ---
  const addToCart = (product: any) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { 
          ...product, 
          mrp: Number(product.mrp || product.price), 
          quantity: 1 
      }];
    });
    setSearchTerm("");
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) => prev.map((item) => {
      if (item.id === id) {
        const newQty = item.quantity + delta;
        const product = products.find((p) => p.id === id);
        if (newQty > 0 && product && newQty <= product.stock) return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const calculateTotals = () => {
    let subTotal = 0; let totalSavings = 0;
    cart.forEach(item => {
      const price = Number(item.price || 0);
      const mrp = Number(item.mrp || price); 
      subTotal += price * item.quantity;
      if (mrp > price) {
          totalSavings += (mrp - price) * item.quantity;
      }
    });
    return { subTotal, totalSavings, finalTotal: subTotal };
  };

  const { subTotal, totalSavings, finalTotal } = calculateTotals();

  // --- 🟢 CHECKOUT LOGIC ---
  const handleCheckout = async () => {
    if (cart.length === 0) return alert("❌ Cart Empty!");
    setCheckoutLoading(true);
    try {
      let customerId = null;
      if (phone) {
          const { data: customer } = await supabase.from("customers").upsert({ 
              name: name || "Guest", 
              phone, 
              total_spent: totalSpent + finalTotal,
              store_id: activeStoreId
          }, { onConflict: 'phone' }).select().maybeSingle();
          customerId = customer?.id;
      }

      const { data: saleData, error: saleError } = await supabase.from("sales").insert([{ 
        total_amount: Number(finalTotal.toFixed(2)), 
        customer_id: customerId, 
        payment_method: paymentMethod,
        total_savings: Number(totalSavings.toFixed(2)) || 0, 
        staff_id: currentStaff?.id,
        store_id: activeStoreId,
        created_at: new Date().toISOString()
      }]).select('id').single(); 

      if (saleError) throw saleError;

      const saleItemsData = cart.map((item) => ({
        sale_id: saleData.id, 
        product_id: item.id, 
        quantity: item.quantity, 
        price_at_sale: Number(item.price),
        mrp_at_sale: Number(item.mrp || item.price) 
      }));

      await supabase.from("sale_items").insert(saleItemsData);
      
      for (const item of cart) {
        await supabase.from("inventory").update({ stock: item.stock - item.quantity, last_sold_at: new Date().toISOString() }).eq("id", item.id);
      }

      setLastSale({ 
          id: saleData.id, 
          date: new Date().toLocaleDateString('en-IN'), 
          time: new Date().toLocaleTimeString('en-IN', {hour: '2-digit', minute:'2-digit'}),
          customer: { name: name || "Guest", phone: phone || "N/A" }, 
          items: [...cart], 
          total: finalTotal, 
          totalSavings,
          totalQty: cart.reduce((acc, item) => acc + item.quantity, 0),
          paymentMethod, 
          staffName: currentStaff?.name 
      });
      setShowReceipt(true); setCart([]); setPhone(""); setName(""); fetchProducts();
    } catch (err: any) { alert("Error: " + err.message); } finally { setCheckoutLoading(false); }
  };

  const handlePhoneSearch = async (inputPhone: string) => {
    setPhone(inputPhone);
    if (inputPhone.length === 10) {
      const { data } = await supabase.from("customers").select("*").eq("phone", inputPhone).eq("store_id", activeStoreId).maybeSingle();
      if (data) {
        setIsExisting(true); setName(data.name); 
        setTotalSpent(data.total_spent || 0);
      } else {
        setIsExisting(false); setName(""); setTotalSpent(0);
      }
    } else { setIsExisting(false); }
  };

  // --- 🔵 QR LOGIC ---
  const refreshQR = () => {
    const newRef = "SM" + Math.random().toString(36).substring(2, 9).toUpperCase();
    setQrRef(newRef);
    setTimeLeft(60); 
  };

  useEffect(() => {
    let timer: any;
    if (showReceipt && paymentMethod === "upi") {
      refreshQR();
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) { refreshQR(); return 60; }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showReceipt, paymentMethod]);

  // --- BARCODE BUFFER ---
  const barcodeBuffer = useRef("");
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!currentStaff) return; 
      if ((e.target as HTMLElement).tagName === 'INPUT') return;

      if (e.key === "Enter") {
        const scannedCode = barcodeBuffer.current.trim();
        if (scannedCode) {
          const product = products.find(p => p.barcode === scannedCode);
          if (product) addToCart(product);
        }
        barcodeBuffer.current = "";
      } else {
        barcodeBuffer.current += e.key;
        setTimeout(() => { barcodeBuffer.current = ""; }, 200);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [products, currentStaff]);

  // --- UI: STAFF LOGIN ---
  if (!currentStaff) {
    return (
      <div className="h-screen bg-[#020617] flex items-center justify-center text-white">
        <div className="bg-slate-900 p-8 rounded-[2rem] w-full max-w-sm border border-slate-800 shadow-2xl text-center">
          <Lock size={32} className="text-blue-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black uppercase italic mb-6">POS Access</h2>
          <div className="text-[10px] uppercase font-bold text-slate-500 mb-4 bg-slate-950 p-2 rounded">
             Store ID: {activeStoreId ? activeStoreId.slice(0,8) : "Loading..."}
          </div>
          <input type="password" autoFocus maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-center text-2xl font-black tracking-[1rem] outline-none mb-4" />
          <button onClick={handleStaffLogin} className="w-full bg-blue-600 py-4 rounded-2xl font-black">{loginLoading ? "..." : "UNLOCK TERMINAL"}</button>
        </div>
      </div>
    );
  }

  // --- 🚀 PROFESSIONAL POS UI ---
  return (
    <div className="flex h-screen bg-[#0b0f19] text-white overflow-hidden font-sans">
      
      {/* 🟢 COLUMN 1: LOOSE ITEMS (20%) */}
      <div className="hidden lg:flex w-[20%] flex-col border-r border-slate-800 bg-[#0f172a]">
         <div className="p-4 border-b border-slate-800">
             <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Grid size={16}/> Quick Pick</h2>
         </div>
         <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
             <div className="grid grid-cols-2 gap-2">
                 {products.filter(p => !p.barcode).map(p => (
                     <button key={p.id} onClick={() => addToCart(p)} className="bg-slate-800 p-3 rounded-xl border border-slate-700 hover:border-blue-500 hover:bg-slate-700 transition-all text-left">
                         <p className="font-bold text-[10px] line-clamp-2 text-white">{p.name}</p>
                         <p className="text-blue-400 font-bold text-xs mt-1">₹{p.price}</p>
                     </button>
                 ))}
             </div>
         </div>
         <div className="p-4 border-t border-slate-800">
             <div className="bg-slate-900 rounded-xl p-3 flex items-center gap-3 border border-slate-800">
                 <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center font-bold text-xs">{currentStaff.name.charAt(0)}</div>
                 <div><p className="text-[10px] text-slate-500 font-bold uppercase">Cashier</p><p className="text-xs font-bold">{currentStaff.name}</p></div>
                 <button onClick={handleLogout} className="ml-auto text-red-500 hover:bg-red-500/10 p-1.5 rounded-lg"><LogOut size={14}/></button>
             </div>
         </div>
      </div>

      {/* 🔵 COLUMN 2: TRANSACTION TABLE (50%) */}
      <div className="flex-1 flex flex-col bg-[#020617] border-r border-slate-800 relative">
          <div className="p-4 border-b border-slate-800 flex gap-4 items-center bg-slate-900/50">
              <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input 
                    id="search-box"
                    autoFocus
                    type="text" 
                    placeholder="Scan Barcode / Search Item (F2)" 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    onKeyDown={(e) => {
                        if(e.key === 'Enter' && searchTerm) {
                            const found = products.find(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.barcode === searchTerm);
                            if(found) addToCart(found);
                        }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 text-white p-3 pl-12 rounded-xl text-sm font-bold outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
              </div>
              <div className="hidden md:flex gap-2">
                  <button onClick={() => setIsScanning(true)} className="bg-slate-800 p-3 rounded-xl hover:bg-blue-600 hover:text-white transition-all text-slate-400"><Camera size={18}/></button>
              </div>
          </div>

          {searchTerm && (
              <div className="absolute top-20 left-4 right-4 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto">
                  {products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
                      <div key={p.id} onClick={() => addToCart(p)} className="p-3 border-b border-slate-800 hover:bg-blue-900/20 cursor-pointer flex justify-between items-center">
                          <span className="text-sm font-bold">{p.name}</span>
                          <span className="text-xs font-mono text-blue-400">₹{p.price}</span>
                      </div>
                  ))}
              </div>
          )}

          <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-slate-950 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">
              <div className="col-span-1">#</div>
              <div className="col-span-5">Item Description</div>
              <div className="col-span-2 text-center">Qty</div>
              <div className="col-span-2 text-right">Price</div>
              <div className="col-span-2 text-right">Total</div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-1">
              {cart.map((item, idx) => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 px-4 py-3 bg-slate-900/50 hover:bg-slate-900 items-center rounded-lg border border-transparent hover:border-slate-800 transition-all group">
                      <div className="col-span-1 text-slate-500 text-xs font-mono">{idx + 1}</div>
                      <div className="col-span-5">
                          <p className="font-bold text-sm text-white truncate">{item.name}</p>
                          {item.mrp > item.price && <span className="text-[9px] text-green-500 font-bold bg-green-500/10 px-1 rounded">SAVE ₹{(item.mrp - item.price).toFixed(0)}</span>}
                      </div>
                      <div className="col-span-2 flex justify-center">
                          <div className="flex items-center bg-slate-950 rounded-lg border border-slate-800">
                              <button onClick={() => updateQuantity(item.id, -1)} className="px-2 py-1 hover:bg-slate-800 rounded-l-lg text-slate-400">-</button>
                              <span className="px-2 text-xs font-bold w-6 text-center">{item.quantity}</span>
                              <button onClick={() => updateQuantity(item.id, 1)} className="px-2 py-1 hover:bg-slate-800 rounded-r-lg text-slate-400">+</button>
                          </div>
                      </div>
                      <div className="col-span-2 text-right font-mono text-sm text-slate-300">₹{item.price}</div>
                      <div className="col-span-2 text-right font-black text-sm text-white flex justify-end gap-2 items-center">
                          ₹{item.price * item.quantity}
                          <button onClick={() => removeFromCart(item.id)} className="opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-500/10 p-1 rounded transition-all"><X size={14}/></button>
                      </div>
                  </div>
              ))}
              {cart.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50">
                      <ShoppingCart size={48} className="mb-4"/>
                      <p className="font-bold uppercase tracking-widest text-sm">Ready to Scan</p>
                  </div>
              )}
          </div>
      </div>

      {/* 🔴 COLUMN 3: ACTION PANEL (30%) */}
      <div className="w-full md:w-[30%] bg-[#0f172a] flex flex-col h-full border-l border-slate-800">
          <div className="p-4 border-b border-slate-800 space-y-3">
              <div className="flex gap-2">
                  <input type="number" placeholder="Customer Mobile" value={phone} onChange={(e) => handlePhoneSearch(e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 p-3 rounded-xl text-sm font-bold outline-none focus:border-blue-500" />
                  <div className={`p-3 rounded-xl border flex items-center justify-center ${isExisting ? 'bg-green-500/10 border-green-500 text-green-500' : 'bg-slate-900 border-slate-700 text-slate-500'}`}>
                      <User size={18} />
                  </div>
              </div>
              <input type="text" placeholder="Customer Name" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-sm font-bold outline-none focus:border-blue-500" />
          </div>

          <div className="p-4 grid grid-cols-3 gap-2">
              <button onClick={() => setCart([])} className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all h-20">
                  <Trash2 size={20}/>
                  <span className="text-[9px] font-bold uppercase">Clear</span>
              </button>
              <button className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all h-20">
                  <RotateCcw size={20}/>
                  <span className="text-[9px] font-bold uppercase">Hold</span>
              </button>
              <button className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all h-20">
                  <Grid size={20}/>
                  <span className="text-[9px] font-bold uppercase">More</span>
              </button>
          </div>

          <div className="flex-1"></div>

          <div className="bg-slate-950 p-6 border-t border-slate-800 shadow-2xl">
              <div className="space-y-2 mb-6 text-sm">
                  <div className="flex justify-between text-slate-400"><span>Subtotal</span><span>₹{subTotal.toFixed(2)}</span></div>
                  <div className="flex justify-between text-green-500"><span>Savings</span><span>- ₹{totalSavings.toFixed(2)}</span></div>
                  <div className="flex justify-between text-white text-3xl font-black mt-2 pt-4 border-t border-slate-800">
                      <span>Total</span>
                      <span>₹{finalTotal.toFixed(0)}</span>
                  </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                  {["cash", "upi", "card"].map(m => (
                      <button key={m} onClick={() => setPaymentMethod(m as any)} className={`py-3 rounded-xl text-xs font-black border uppercase flex items-center justify-center gap-2 transition-all ${paymentMethod === m ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20" : "bg-slate-900 border-slate-800 text-slate-500 hover:bg-slate-800"}`}>
                          {m === 'cash' && <Banknote size={14}/>}
                          {m === 'upi' && <QrCode size={14}/>}
                          {m === 'card' && <CreditCard size={14}/>}
                          {m}
                      </button>
                  ))}
              </div>

              <button onClick={handleCheckout} disabled={checkoutLoading} className="w-full bg-green-600 hover:bg-green-500 text-white py-5 rounded-2xl font-black uppercase text-lg tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-green-900/20 active:scale-95 transition-all">
                  {checkoutLoading ? <Loader2 className="animate-spin"/> : <><Printer size={24}/> Pay & Print</>}
              </button>
          </div>
      </div>

      {/* 🧾 RECEIPT MODAL */}
      {showReceipt && lastSale && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[200] p-4 font-mono">
          <div className="bg-white text-black p-6 w-full max-w-[350px] receipt-box shadow-2xl relative">
            <button onClick={() => setShowReceipt(false)} className="absolute -top-12 right-0 text-white no-print"><X size={24}/></button>
            <div className="text-center pb-4 border-b border-dashed border-gray-400">
              <h1 className="text-2xl font-black uppercase">{storeSettings.shop_name}</h1>
              <p className="text-[10px]">{storeSettings.shop_address}</p>
              <p className="text-[10px]">Ph: {storeSettings.shop_phone}</p>
            </div>
            <div className="py-2 text-[10px] space-y-1 border-b border-dashed border-gray-400">
                <div className="flex justify-between"><span>Date:</span><span>{lastSale.date}</span></div>
                <div className="flex justify-between"><span>Bill #:</span><span>{lastSale.id.slice(0,8)}</span></div>
            </div>
            <table className="w-full text-[10px] my-2">
                <thead><tr className="border-b border-black text-left"><th>Item</th><th className="text-right">Qty</th><th className="text-right">Amt</th></tr></thead>
                <tbody>
                    {lastSale.items.map((item: any) => (
                        <tr key={item.id}>
                            <td className="py-1">{item.name}</td>
                            <td className="text-right">{item.quantity}</td>
                            <td className="text-right">{(item.price * item.quantity).toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="border-t border-dashed border-gray-400 pt-2 text-right">
                <p className="text-xl font-black">TOTAL: ₹{Math.round(lastSale.total)}</p>
                <p className="text-[10px]">Saved: ₹{lastSale.totalSavings.toFixed(2)}</p>
            </div>
            {/* 🔥 DYNAMIC QR LOGIC */}
            {lastSale.paymentMethod === 'upi' && (
              <div className="mt-4 p-3 bg-gray-100 rounded-lg text-center border border-dashed border-gray-300">
                <div className="flex justify-center bg-white p-2 w-fit mx-auto rounded shadow-sm">
                   <QRCodeAny 
                       value={`upi://pay?pa=${storeSettings.upi_id || "yourupi@bank"}&pn=${storeSettings.shop_name}&am=${lastSale.total}&cu=INR&tr=${qrRef}`} 
                       size={100} 
                   />
                </div>
                <p className="text-[9px] mt-2 font-bold uppercase">Scan to Pay Store</p>
              </div>
            )}
            <button onClick={() => window.print()} className="w-full bg-black text-white py-3 mt-4 font-bold no-print uppercase">Print Receipt</button>
          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .no-print { display: none !important; }
          .receipt-box, .receipt-box * { visibility: visible; }
          .receipt-box { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; box-shadow: none; }
          @page { size: 80mm auto; margin: 0; }
        }
      `}</style>
    </div>
  );
}