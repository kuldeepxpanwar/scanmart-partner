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
import ForgotPinModal from "@/components/ForgotPinModal";
import { verifyPin } from "@/lib/pin";
import { idbAddSale, idbGetQueue, idbRemoveSale, idbQueueCount } from "@/lib/offlineDb";

export default function SalesPage() {
  const QRCodeAny = QRCode as any;

  // --- 🔐 STAFF & STORE STATES ---
  const [currentStaff, setCurrentStaff] = useState<any>(null);
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [showForgotPin, setShowForgotPin] = useState(false);

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
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi" | "card" | "split">("cash");
  // Split payment amounts
  const [splitCash, setSplitCash] = useState(0);
  const [splitUpi, setSplitUpi] = useState(0);

  // --- RECEIPT & QR ---
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  const [qrRef, setQrRef] = useState("");
  const [timeLeft, setTimeLeft] = useState(60);

  // --- 🔥 NEW: DISCOUNT & HOLD BILL ---
  const [discountValue, setDiscountValue] = useState(0);
  const [discountType, setDiscountType] = useState<'percent' | 'flat'>('percent');
  const [heldBills, setHeldBills] = useState<any[]>([]);
  const [showHeldBills, setShowHeldBills] = useState(false);

  // --- 🧾 INVOICE NUMBERING ---
  const generateInvoiceNumber = () => {
    const date = new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const seq = String(Math.floor(Math.random() * 900000) + 100000);
    return `INV-${y}${m}${d}-${seq}`;
  };

  // --- 🔒 PIN LOCKOUT ---
  const [pinAttempts, setPinAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [lockoutCountdown, setLockoutCountdown] = useState(0);
  const PIN_MAX_ATTEMPTS = 5;
  const LOCKOUT_MS = 30 * 60 * 1000;

  useEffect(() => {
    const stored = localStorage.getItem("pos_lockout_until");
    if (stored) {
      const until = Number(stored);
      if (Date.now() < until) setLockoutUntil(until);
      else localStorage.removeItem("pos_lockout_until");
    }
  }, []);

  useEffect(() => {
    if (!lockoutUntil) return;
    const iv = setInterval(() => {
      const rem = Math.ceil((lockoutUntil - Date.now()) / 1000);
      if (rem <= 0) { setLockoutUntil(null); setPinAttempts(0); localStorage.removeItem("pos_lockout_until"); clearInterval(iv); }
      else setLockoutCountdown(rem);
    }, 1000);
    return () => clearInterval(iv);
  }, [lockoutUntil]);

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
    if (activeStoreId) {
      fetchProducts();
      fetchSettings(); // 🔥 Fetch settings when store changes
    }
  }, [activeStoreId]);

  const fetchFirstStore = async () => {
    const { data } = await supabase.from("stores").select("id").limit(1);
    if (data && data.length > 0) {
      setActiveStoreId(data[0].id);
      localStorage.setItem("active_store_id", data[0].id);
    }
  };

  const fetchProducts = async () => {
    if (!activeStoreId) return;
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

  // --- 🔐 Staff Login with PIN lockout + bcrypt verify ---
  const handleStaffLogin = async () => {
    if (lockoutUntil && Date.now() < lockoutUntil) {
      return alert(`🔒 Too many failed attempts. Wait ${lockoutCountdown}s`);
    }
    if (pin.length < 4 || pin.length > 6) return alert("PIN must be 4–6 digits");
    setLoginLoading(true);

    // Fetch active staff for this store (can't filter by bcrypt hash in DB)
    const { data: staffList } = await supabase
      .from("staff")
      .select("*")
      .eq("store_id", activeStoreId)
      .eq("is_active", true);

    // Verify PIN against each staff member's hash
    let matched: any = null;
    for (const member of staffList || []) {
      const ok = await verifyPin(pin, member.pin_code);
      if (ok) { matched = member; break; }
    }

    if (!matched) {
      const newAttempts = pinAttempts + 1;
      setPinAttempts(newAttempts);
      const remaining = PIN_MAX_ATTEMPTS - newAttempts;
      if (newAttempts >= PIN_MAX_ATTEMPTS) {
        const until = Date.now() + LOCKOUT_MS;
        setLockoutUntil(until);
        localStorage.setItem("pos_lockout_until", String(until));
        alert(`🔒 Terminal locked for 30 minutes`);
      } else {
        alert(`❌ Invalid PIN — ${remaining} attempt${remaining !== 1 ? 's' : ''} left`);
      }
      setPin("");
    } else {
      setPinAttempts(0);
      localStorage.removeItem("pos_lockout_until");
      setCurrentStaff(matched);
      setPin("");
      sessionStorage.setItem("active_staff_id", matched.id);
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

  // --- 🔥 BUG FIX 6: updateQuantity - auto-remove item when qty reaches 0 ---
  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) => {
      const newCart = prev.map((item) => {
        if (item.id === id) {
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null; // ✅ Mark for removal
          const product = products.find((p) => p.id === id);
          if (product && newQty > product.stock) return item; // Don't exceed stock
          return { ...item, quantity: newQty };
        }
        return item;
      });
      return newCart.filter(Boolean) as any[]; // Remove nulls
    });
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  // --- 🔥 NEW: Discount-aware totals calculation ---
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
    // Apply manual discount
    let discountAmount = 0;
    if (discountValue > 0) {
      discountAmount = discountType === 'percent'
        ? (subTotal * discountValue) / 100
        : Math.min(discountValue, subTotal);
      totalSavings += discountAmount;
    }
    const finalTotal = Math.max(0, subTotal - discountAmount);
    return { subTotal, totalSavings, finalTotal, discountAmount };
  };

  const { subTotal, totalSavings, finalTotal, discountAmount } = calculateTotals();

  // --- 🔥 NEW: Hold Bill Feature ---
  const holdCurrentBill = () => {
    if (cart.length === 0) return alert("Cart is empty!");
    const holdLabel = `Hold #${heldBills.length + 1} - ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
    setHeldBills(prev => [...prev, { label: holdLabel, cart: [...cart], phone, name, totalSpent }]);
    setCart([]); setPhone(""); setName(""); setTotalSpent(0); setDiscountValue(0);
    alert(`⏸️ Bill held as "${holdLabel}"`);
  };

  const recallBill = (bill: any) => {
    if (cart.length > 0 && !confirm("Current cart will be replaced. Continue?")) return;
    setCart(bill.cart); setPhone(bill.phone); setName(bill.name); setTotalSpent(bill.totalSpent);
    setHeldBills(prev => prev.filter(b => b.label !== bill.label));
    setShowHeldBills(false);
  };

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

      // ── Compute profit & GST at sale time from cart ──────────
      // Cart items already have buying_price and gst_rate from inventory fetch
      let totalProfit = 0;
      let totalGst = 0;

      cart.forEach((item: any) => {
        const sellPrice = Number(item.price || 0);
        const qty = Number(item.quantity || 0);
        const buyPrice = Number(item.buying_price || 0);
        const gstPct = Number(item.gst_rate || 0);

        if (sellPrice > 0 && qty > 0) {
          if (gstPct > 0) {
            const base = sellPrice / (1 + gstPct / 100);
            const taxAmt = sellPrice - base;
            totalGst += taxAmt * qty;
            totalProfit += (base - buyPrice) * qty;
          } else {
            totalProfit += (sellPrice - buyPrice) * qty;
          }
        }
      });

      const invoiceNumber = generateInvoiceNumber();

      // ── Try inserting with profit+GST columns (needs SQL setup) ──
      // If columns missing → gracefully retry without them
      let saleData: any = null;
      let saleError: any = null;

      const baseSalePayload: any = {
        total_amount: Number(finalTotal.toFixed(2)),
        customer_id: customerId,
        payment_method: paymentMethod,
        split_cash: paymentMethod === "split" ? Number(splitCash.toFixed(2)) : null,
        split_upi: paymentMethod === "split" ? Number(splitUpi.toFixed(2)) : null,
        total_savings: Number(totalSavings.toFixed(2)) || 0,
        staff_id: currentStaff?.id,
        store_id: activeStoreId,
        created_at: new Date().toISOString(),
      };

      // First: try with profit + GST
      const { data: sd1, error: se1 } = await supabase.from("sales").insert([{
        ...baseSalePayload,
        total_profit: Number(totalProfit.toFixed(2)),
        total_gst: Number(totalGst.toFixed(2)),
      }]).select('id').single();

      if (se1 && (se1.message?.includes("total_profit") || se1.message?.includes("total_gst") || se1.message?.includes("schema cache"))) {
        // Columns not created yet → retry without profit/GST
        console.warn("[Checkout] Profit/GST columns missing, retrying without them. Run SQL to enable.");
        const { data: sd2, error: se2 } = await supabase.from("sales").insert([baseSalePayload]).select('id').single();
        saleData = sd2; saleError = se2;
      } else {
        saleData = sd1; saleError = se1;
      }


      if (saleError) throw saleError;

      const saleItemsData = cart.map((item) => ({
        sale_id: saleData.id,
        product_id: item.id,
        quantity: item.quantity,
        price_at_sale: Number(item.price),
        mrp_at_sale: Number(item.mrp || item.price)
        // NOTE: shop_id not included — column may not exist in sale_items table
      }));

      const { error: itemsInsertError } = await supabase.from("sale_items").insert(saleItemsData);
      if (itemsInsertError) console.error("sale_items insert error:", itemsInsertError?.message || itemsInsertError);

      for (const item of cart) {
        await supabase.from("inventory").update({
          stock: item.stock - item.quantity,
          last_sold_at: new Date().toISOString()
        }).eq("id", item.id);
      }

      setLastSale({
        id: saleData.id,
        invoiceNumber,
        date: new Date().toLocaleDateString('en-IN'),
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        customer: { name: name || "Guest", phone: phone || "N/A" },
        items: [...cart],
        total: finalTotal,
        totalSavings,
        totalQty: cart.reduce((acc, item) => acc + item.quantity, 0),
        paymentMethod,
        splitCash: paymentMethod === "split" ? splitCash : undefined,
        splitUpi: paymentMethod === "split" ? splitUpi : undefined,
        staffName: currentStaff?.name
      });
      setShowReceipt(true); setCart([]); setPhone(""); setName(""); setDiscountValue(0);
      setSplitCash(0); setSplitUpi(0); fetchProducts();
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

  // --- 🔴 OFFLINE MODE ---
  const [isOnline, setIsOnline] = useState(true);
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [numpadTarget, setNumpadTarget] = useState<'mobile' | 'discount' | null>(null);

  // Listen for online/offline + load IDB queue count
  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); syncOfflineQueue(); };
    const handleOffline = () => setIsOnline(false);
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      // Load queued count from IndexedDB
      idbQueueCount().then(setOfflineQueueCount).catch(() => { });
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync queued offline sales when back online (IndexedDB)
  const syncOfflineQueue = async () => {
    const queue = await idbGetQueue().catch(() => []);
    if (queue.length === 0) return;
    setSyncing(true);
    let synced = 0;
    for (const sale of queue) {
      try {
        const { data: saleData, error } = await supabase.from('sales').insert([sale.saleRecord]).select('id').single();
        if (!error && saleData) {
          const items = sale.items.map((i: any) => ({ ...i, sale_id: saleData.id }));
          await supabase.from('sale_items').insert(items);
          for (const item of sale.stockUpdates) {
            await supabase.from('inventory').update({ stock: item.newStock, last_sold_at: new Date().toISOString() }).eq('id', item.id);
          }
          await idbRemoveSale(sale.id);
          synced++;
        }
      } catch (_) { /* skip failed, retry next time */ }
    }
    const remaining = await idbQueueCount().catch(() => 0);
    setOfflineQueueCount(remaining);
    setSyncing(false);
    if (synced > 0) alert(`✅ Synced ${synced} offline bill(s) to cloud!`);
  };

  // 🔢 On-screen numpad handler
  const handleNumpad = (val: string) => {
    if (numpadTarget === 'mobile') {
      if (val === 'C') { setPhone(''); setIsExisting(false); setName(''); }
      else if (val === '<') handlePhoneSearch(phone.slice(0, -1));
      else if (phone.length < 10) handlePhoneSearch(phone + val);
    } else if (numpadTarget === 'discount') {
      if (val === 'C') setDiscountValue(0);
      else if (val === '<') setDiscountValue((prev: number) => Math.floor(prev / 10));
      else setDiscountValue((prev: number) => Number(String(prev) + val) || 0);
    }
  };

  // --- 🛂 STAFF LOGIN SCREEN ---
  if (!currentStaff) {
    return (
      <div className="h-screen bg-[#0a0f1e] flex items-center justify-center text-white">
        <div className="bg-[#0f172a] p-8 rounded-[2rem] w-full max-w-sm border border-slate-800 shadow-2xl text-center relative">
          {/* Top Bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-blue-400 to-blue-600 rounded-t-[2rem]"></div>

          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest">ScanMart</div>
            <div className="text-slate-500 text-[10px] font-bold">POS Terminal</div>
            <div className={`ml-auto text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 ${isOnline ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              {isOnline ? '● ONLINE' : `● OFFLINE${offlineQueueCount > 0 ? ` · ${offlineQueueCount} queued` : ''}`}
              {syncing && <span className="text-yellow-400 animate-pulse">⟳ syncing</span>}
            </div>
          </div>

          <Lock size={28} className="text-blue-500 mx-auto mb-3 mt-4" />
          <h2 className="text-xl font-black uppercase italic mb-1">POS Access</h2>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-5">Enter Staff PIN (Admin: 6 digits)</p>

          {/* PIN dots */}
          <div className="flex justify-center gap-2 mb-4">
            {[0, 1, 2, 3, 4, 5].map(i => (
              <div key={i} className={`w-2.5 h-2.5 rounded-full transition-all ${pin.length > i ? 'bg-blue-500 scale-125 shadow shadow-blue-500/50' : 'bg-slate-700'}`} />
            ))}
          </div>

          <input
            type="password" autoFocus maxLength={6}
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
            onKeyDown={e => e.key === 'Enter' && handleStaffLogin()}
            className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-center text-2xl font-black tracking-[1rem] outline-none mb-4 text-white focus:border-blue-500 transition-all"
            placeholder="••••"
          />

          <button onClick={handleStaffLogin} className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all active:scale-95">
            {loginLoading ? <Loader2 className="animate-spin mx-auto" size={18} /> : 'UNLOCK TERMINAL'}
          </button>

          <button
            onClick={() => setShowForgotPin(true)}
            className="mt-4 text-slate-500 hover:text-blue-400 text-xs font-bold uppercase tracking-widest transition-all block w-full"
          >
            Forgot PIN?
          </button>
        </div>
        <ForgotPinModal isOpen={showForgotPin} onClose={() => setShowForgotPin(false)} shopId={activeStoreId} />
      </div>
    );
  }

  // ============================================================
  //   🚀 RELIANCE POS INSPIRED LAYOUT
  // ============================================================
  const numpadKeys = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', 'C', '<'];

  return (
    <div className="flex flex-col h-screen bg-[#f0f4f8] text-gray-800 overflow-hidden font-sans select-none">

      {/* ⏫ TOP BAR — Reliance style */}
      <div className="bg-[#c0392b] text-white flex items-center px-4 py-1.5 text-[11px] font-bold gap-4 flex-shrink-0 shadow-md">
        <div className="font-black text-sm uppercase tracking-widest">ScanMart POS</div>
        <div className="text-red-200">Emp#: {currentStaff?.name?.split(' ')[0] || 'Staff'}</div>
        <div className="text-red-200">Store: {activeStoreId?.slice(0, 8)}</div>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-red-200">{new Date().toLocaleDateString('en-IN')} {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
          <span className={`font-black px-2 py-0.5 rounded text-[10px] ${isOnline ? 'bg-green-600 text-white' : 'bg-yellow-400 text-black'}`}>
            {syncing ? '↻ Syncing...' : isOnline ? '● ONLINE' : `● OFFLINE${offlineQueue.length > 0 ? ` (${offlineQueue.length} queued)` : ''}`}
          </span>
          <button onClick={handleLogout} className="bg-red-800 hover:bg-red-900 px-2 py-0.5 rounded text-[10px] flex items-center gap-1">
            <LogOut size={10} /> Exit
          </button>
        </div>
      </div>

      {/* MAIN BODY */}
      <div className="flex flex-1 overflow-hidden">

        {/* ============ LEFT: ITEM TABLE (60%) ============ */}
        <div className="flex-1 flex flex-col bg-white border-r border-gray-300">

          {/* Search Bar */}
          <div className="bg-[#1a237e] p-2 flex gap-2 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300" size={14} />
              <input
                id="search-box"
                autoFocus
                type="text"
                placeholder="Scan Barcode or Search Item (F2)..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && searchTerm) {
                    const found = products.find(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.barcode === searchTerm);
                    if (found) addToCart(found);
                  }
                }}
                onFocus={() => setNumpadTarget(null)}
                className="w-full bg-[#283593] text-white placeholder-blue-300 p-2 pl-8 rounded text-xs font-bold outline-none border border-blue-700 focus:border-blue-300"
              />
            </div>
            <button onClick={() => setIsScanning(true)} className="bg-blue-700 hover:bg-blue-600 text-white px-3 py-2 rounded text-xs font-bold flex items-center gap-1">
              <Camera size={14} /> Scan
            </button>
          </div>

          {/* Item LIST Header */}
          <div className="grid grid-cols-12 text-[10px] font-black text-gray-500 uppercase tracking-widest px-3 py-1.5 bg-gray-100 border-b border-gray-200">
            <div className="col-span-1">#</div>
            <div className="col-span-5">Item Description</div>
            <div className="col-span-2 text-center">Qty</div>
            <div className="col-span-2 text-right">Rate</div>
            <div className="col-span-2 text-right">Amount</div>
          </div>

          {/* Item ROWS — Striped like Reliance POS */}
          <div className="flex-1 overflow-y-auto">
            {searchTerm && (
              <div className="absolute top-28 left-2 right-[42%] bg-white border-2 border-blue-600 rounded-xl shadow-2xl z-50 max-h-56 overflow-y-auto">
                {products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 8).map(p => (
                  <div key={p.id} onClick={() => addToCart(p)} className="px-4 py-2 border-b border-gray-100 hover:bg-blue-50 cursor-pointer flex justify-between items-center">
                    <div>
                      <span className="text-sm font-bold text-gray-800">{p.name}</span>
                      {p.barcode && <span className="text-[9px] text-gray-400 ml-2">#{p.barcode}</span>}
                    </div>
                    <span className="text-xs font-black text-blue-700">₹{p.price}</span>
                  </div>
                ))}
              </div>
            )}
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-300">
                <ShoppingCart size={48} className="mb-3" />
                <p className="font-bold uppercase tracking-widest text-sm">Ready to Scan</p>
              </div>
            ) : (
              cart.map((item, idx) => (
                <div key={item.id} className={`grid grid-cols-12 items-center px-3 py-2 border-b border-gray-100 group transition-all hover:bg-blue-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-[#e8f0fe]'}`}>
                  <div className="col-span-1 text-[10px] text-gray-400 font-mono">{idx + 1}</div>
                  <div className="col-span-5">
                    <p className="font-bold text-xs text-gray-800 truncate">{item.name}</p>
                    {item.barcode && <p className="text-[9px] text-gray-400">SKU: {item.barcode}</p>}
                    {item.mrp > item.price && <span className="text-[8px] text-green-600 font-bold">♥ Save ₹{((item.mrp - item.price) * item.quantity).toFixed(0)}</span>}
                  </div>
                  <div className="col-span-2 flex justify-center">
                    <div className="flex items-center border border-blue-300 rounded overflow-hidden">
                      <button onClick={() => updateQuantity(item.id, -1)} className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-black text-sm">-</button>
                      <span className="px-2 text-xs font-black w-7 text-center text-gray-800">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-black text-sm">+</button>
                    </div>
                  </div>
                  <div className="col-span-2 text-right text-xs font-bold text-gray-600">₹{item.price}</div>
                  <div className="col-span-2 text-right text-xs font-black text-gray-800 flex justify-end items-center gap-1">
                    ₹{(item.price * item.quantity).toFixed(2)}
                    <button onClick={() => removeFromCart(item.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 p-0.5">
                      <X size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* BOTTOM SUMMARY BAR — Total Discount, Item Count, Tax, Total */}
          <div className="bg-[#1a237e] text-white px-4 py-2 grid grid-cols-5 gap-4 text-center border-t border-blue-900">
            <div>
              <p className="text-[8px] text-blue-300 uppercase font-bold">Items</p>
              <p className="text-sm font-black">{cart.reduce((a, i) => a + i.quantity, 0)}</p>
            </div>
            <div>
              <p className="text-[8px] text-blue-300 uppercase font-bold">Discount</p>
              <p className="text-sm font-black">₹{discountAmount.toFixed(0)}</p>
            </div>
            <div>
              <p className="text-[8px] text-blue-300 uppercase font-bold">Savings</p>
              <p className="text-sm font-black text-green-400">₹{totalSavings.toFixed(0)}</p>
            </div>
            <div>
              <p className="text-[8px] text-blue-300 uppercase font-bold">Subtotal</p>
              <p className="text-sm font-black">₹{subTotal.toFixed(0)}</p>
            </div>
            <div className="bg-green-600 rounded-lg py-0.5">
              <p className="text-[8px] text-green-200 uppercase font-bold">TOTAL</p>
              <p className="text-base font-black">₹{finalTotal.toFixed(0)}</p>
            </div>
          </div>
        </div>

        {/* ============ RIGHT PANEL (40%) ============ */}
        <div className="w-[42%] flex flex-col bg-[#f8fafc] border-l border-gray-200">

          {/* Customer Mobile Input */}
          <div className="p-3 bg-white border-b border-gray-200">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Mobile Number:</p>
            <div
              className={`flex items-center border-2 rounded-lg px-3 py-2 cursor-text transition-all ${numpadTarget === 'mobile' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white'
                }`}
              onClick={() => setNumpadTarget('mobile')}
            >
              <Phone size={14} className="text-gray-400 mr-2 flex-shrink-0" />
              <span className="font-black text-gray-800 text-lg tracking-widest flex-1">{phone || <span className="text-gray-300 font-normal text-sm">Tap numpad to enter...</span>}</span>
              {isExisting && <span className="text-[9px] bg-green-100 text-green-600 font-black px-1.5 py-0.5 rounded">VIP ❤</span>}
            </div>
            {isExisting && name && <p className="text-[10px] text-blue-600 font-bold mt-1 pl-1">● {name} — Spent ₹{totalSpent.toLocaleString()}</p>}
          </div>

          {/* Hold Bills section */}
          {heldBills.length > 0 && (
            <div className="px-3 pt-2">
              <button onClick={() => setShowHeldBills(!showHeldBills)} className="w-full bg-amber-50 border border-amber-300 text-amber-700 py-1.5 rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-1">
                <RotateCcw size={11} /> {heldBills.length} Held Bill(s) — Tap to Recall
              </button>
              {showHeldBills && (
                <div className="bg-white border border-amber-200 rounded-lg mt-1 overflow-hidden">
                  {heldBills.map((bill, i) => (
                    <div key={i} className="flex items-center px-2 py-1.5 border-b border-gray-100 gap-2">
                      <button onClick={() => recallBill(bill)} className="flex-1 text-left text-[10px] font-bold text-gray-700 hover:text-blue-600">{bill.label}</button>
                      <button onClick={() => setHeldBills(prev => prev.filter((_, idx2) => idx2 !== i))} className="text-red-400"><X size={12} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Discount Row */}
          <div className="px-3 py-2 bg-white border-b border-gray-200 flex items-center gap-2">
            <p className="text-[9px] font-black text-gray-400 uppercase">Discount:</p>
            <button
              onClick={() => setDiscountType(t => t === 'percent' ? 'flat' : 'percent')}
              className="bg-blue-600 text-white text-[10px] font-black px-2 py-1 rounded transition-all"
            >{discountType === 'percent' ? '%' : '₹'}</button>
            <div
              className={`flex-1 border-2 rounded px-2 py-1 text-sm font-black text-center cursor-text transition-all ${numpadTarget === 'discount' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-700'
                }`}
              onClick={() => setNumpadTarget('discount')}
            >
              {discountValue > 0 ? discountValue : <span className="text-gray-300 font-normal text-xs">0</span>}
            </div>
            {discountAmount > 0 && <span className="text-green-600 text-[10px] font-black">-₹{discountAmount.toFixed(0)}</span>}
          </div>

          {/* ON-SCREEN NUMPAD */}
          <div className="p-3 grid grid-cols-4 gap-2 flex-shrink-0">
            {numpadKeys.map(k => (
              <button
                key={k}
                onClick={() => handleNumpad(k)}
                className={`py-3.5 rounded-xl font-black text-sm transition-all active:scale-95 shadow-sm ${k === 'C' ? 'bg-red-600 text-white hover:bg-red-500' :
                  k === '<' ? 'bg-orange-500 text-white hover:bg-orange-400' :
                    'bg-white hover:bg-blue-600 hover:text-white text-gray-700 border border-gray-200'
                  }`}
              >{k === '<' ? '⌫' : k}</button>
            ))}
            {/* Enter / NO buttons */}
          </div>

          {/* Numpad hint */}
          <div className="flex gap-2 px-3 pb-2">
            <button onClick={() => setNumpadTarget('mobile')} className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase border-2 transition-all ${numpadTarget === 'mobile' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-400'}`}>📱 Mobile</button>
            <button onClick={() => setNumpadTarget('discount')} className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase border-2 transition-all ${numpadTarget === 'discount' ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-gray-200 text-gray-400'}`}>🏷️ Discount</button>
          </div>

          {/* Payment Method */}
          <div className="px-3 pb-2">
            <div className="grid grid-cols-4 gap-1.5 mb-2">
              {(['cash', 'upi', 'card', 'split'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => {
                    setPaymentMethod(m);
                    if (m !== 'split') { setSplitCash(0); setSplitUpi(0); }
                    else { setSplitCash(0); setSplitUpi(finalTotal); }
                  }}
                  className={`py-2 rounded-xl text-[9px] font-black border-2 uppercase flex items-center justify-center gap-1 transition-all ${paymentMethod === m
                    ? m === 'split' ? 'bg-purple-700 border-purple-600 text-white shadow-lg' : 'bg-[#1a237e] border-[#1a237e] text-white shadow-lg'
                    : 'bg-white border-gray-200 text-gray-500 hover:border-blue-400'
                    }`}
                >
                  {m === 'cash' && <Banknote size={11} />}
                  {m === 'upi' && <QrCode size={11} />}
                  {m === 'card' && <CreditCard size={11} />}
                  {m === 'split' && <span className="text-[8px]">⚡</span>}
                  {m === 'split' ? 'Split' : m}
                </button>
              ))}
            </div>

            {/* Split payment inputs */}
            {paymentMethod === 'split' && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-2.5 space-y-2">
                <p className="text-[9px] font-black text-purple-600 uppercase tracking-widest">Split: Cash + UPI = ₹{finalTotal.toFixed(0)}</p>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <p className="text-[8px] text-gray-500 font-bold uppercase mb-0.5">💵 Cash</p>
                    <input
                      type="number"
                      min={0}
                      max={finalTotal}
                      value={splitCash || ''}
                      onChange={e => {
                        const v = Math.min(Number(e.target.value) || 0, finalTotal);
                        setSplitCash(v);
                        setSplitUpi(parseFloat((finalTotal - v).toFixed(2)));
                      }}
                      placeholder="0"
                      className="w-full border-2 border-purple-300 rounded-lg px-2 py-1.5 text-sm font-black text-center focus:border-purple-600 outline-none bg-white"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-[8px] text-gray-500 font-bold uppercase mb-0.5">📱 UPI</p>
                    <input
                      type="number"
                      min={0}
                      max={finalTotal}
                      value={splitUpi || ''}
                      onChange={e => {
                        const v = Math.min(Number(e.target.value) || 0, finalTotal);
                        setSplitUpi(v);
                        setSplitCash(parseFloat((finalTotal - v).toFixed(2)));
                      }}
                      placeholder={String(finalTotal.toFixed(0))}
                      className="w-full border-2 border-purple-300 rounded-lg px-2 py-1.5 text-sm font-black text-center focus:border-purple-600 outline-none bg-white"
                    />
                  </div>
                </div>
                {/* Balance indicator */}
                {(() => {
                  const diff = parseFloat((splitCash + splitUpi - finalTotal).toFixed(2));
                  return diff !== 0 && (
                    <p className={`text-[9px] font-black text-center ${diff > 0 ? 'text-red-500' : 'text-orange-500'}`}>
                      {diff > 0 ? `⚠ Over by ₹${diff}` : `⚠ Short by ₹${Math.abs(diff)}`}
                    </p>
                  );
                })()}
                {splitCash > 0 && splitUpi > 0 && parseFloat((splitCash + splitUpi - finalTotal).toFixed(2)) === 0 && (
                  <p className="text-[9px] font-black text-green-600 text-center">✅ Amounts match!</p>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="px-3 pb-3 grid grid-cols-2 gap-2">
            <button onClick={holdCurrentBill} className="bg-amber-500 hover:bg-amber-400 text-white py-3 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-1 transition-all active:scale-95">
              <RotateCcw size={14} /> Hold
            </button>
            <button onClick={() => { setCart([]); setPhone(''); setName(''); setDiscountValue(0); }} className="bg-red-500 hover:bg-red-400 text-white py-3 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-1 transition-all active:scale-95">
              <Trash2 size={14} /> Clear
            </button>
            {lastSale && (
              <button onClick={() => setShowReceipt(true)} className="col-span-2 bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-1 transition-all active:scale-95">
                <Printer size={13} /> Reprint Last Bill
              </button>
            )}
          </div>

          {/* CHECKOUT BUTTON */}
          <div className="px-3 pb-4 mt-auto">
            <button
              onClick={() => {
                if (paymentMethod === 'split') {
                  const diff = parseFloat((splitCash + splitUpi - finalTotal).toFixed(2));
                  if (diff !== 0) return alert(`⚠️ Split amounts don't add up! Difference: ₹${Math.abs(diff)}`);
                }
                handleCheckout();
              }}
              disabled={checkoutLoading || cart.length === 0}
              className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-4 rounded-2xl font-black uppercase text-base tracking-widest flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
            >
              {checkoutLoading ? <Loader2 className="animate-spin" size={20} /> : <><Printer size={20} /> Pay &amp; Print</>}
              {!isOnline && <span className="text-[9px] bg-yellow-400 text-black px-1 rounded font-black">OFFLINE</span>}
            </button>
          </div>
        </div>
      </div>

      {/* 🧧 BARCODE SCANNER MODAL */}
      {isScanning && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[200] p-4">
          <div className="bg-slate-900 p-6 rounded-2xl w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-white">Camera Scanner</h3>
              <button onClick={() => setIsScanning(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <BarcodeScanner
              onScan={(code: string) => {
                const product = products.find(p => p.barcode === code);
                if (product) { addToCart(product); setIsScanning(false); }
                else alert('Product not found: ' + code);
              }}
              onClose={() => setIsScanning(false)}
            />
          </div>
        </div>
      )}

      {/* 🧧 RECEIPT MODAL */}
      {showReceipt && lastSale && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[200] p-4 font-mono">
          <div className="bg-white text-black p-5 w-full max-w-[320px] receipt-box shadow-2xl relative text-[11px]">
            <button onClick={() => setShowReceipt(false)} className="absolute -top-12 right-0 text-white no-print"><X size={24} /></button>

            {/* Store Header */}
            <div className="text-center pb-3 border-b border-dashed border-gray-400">
              <h1 className="text-base font-black uppercase leading-tight">{storeSettings.shop_name}</h1>
              <p className="text-[9px] mt-0.5">{storeSettings.shop_address}</p>
              <p className="text-[9px]">Ph: {storeSettings.shop_phone}</p>
              {storeSettings.gstin && <p className="text-[9px] font-bold">GSTIN: {storeSettings.gstin}</p>}
            </div>

            {/* Bill details */}
            <div className="py-2 space-y-0.5 border-b border-dashed border-gray-400">
              <div className="flex justify-between"><span>Invoice:</span><span className="font-bold">{lastSale.invoiceNumber || lastSale.id?.slice(0, 8)}</span></div>
              <div className="flex justify-between"><span>Date:</span><span>{lastSale.date}</span></div>
              <div className="flex justify-between"><span>Cashier:</span><span>{lastSale.staffName}</span></div>
              {lastSale.customerName && <div className="flex justify-between"><span>Customer:</span><span>{lastSale.customerName}</span></div>}
              {lastSale.customerPhone && <div className="flex justify-between"><span>Phone:</span><span>{lastSale.customerPhone}</span></div>}
            </div>

            {/* Items */}
            <table className="w-full my-2">
              <thead><tr className="border-b border-black text-left text-[9px] font-black uppercase"><th className="pb-1">Item</th><th className="text-center">Qty</th><th className="text-right">Rate</th><th className="text-right">Amt</th></tr></thead>
              <tbody>
                {lastSale.items.map((item: any, idx: number) => {
                  const gstRate = Number(item.gst_rate || 0);
                  const lineTotal = Number(item.price) * item.quantity;
                  const taxableLine = gstRate > 0 ? lineTotal / (1 + gstRate / 100) : lineTotal;
                  const gstLine = lineTotal - taxableLine;
                  return (
                    <tr key={item.id || idx} className="border-b border-dotted border-gray-200">
                      <td className="py-0.5 pr-1 leading-tight max-w-[120px]">
                        <div className="truncate">{item.name}</div>
                        {gstRate > 0 && <div className="text-[8px] text-gray-400">GST {gstRate}% (₹{gstLine.toFixed(2)})</div>}
                      </td>
                      <td className="text-center align-top pt-0.5">{item.quantity}</td>
                      <td className="text-right align-top pt-0.5">{Number(item.price).toFixed(0)}</td>
                      <td className="text-right font-bold align-top pt-0.5">{lineTotal.toFixed(0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Totals + GST Breakdown */}
            {(() => {
              // Compute GST slab breakdown from lastSale.items
              const slabMap: Record<number, { taxable: number; tax: number }> = {};
              let totalTaxable = 0;
              let totalGst = 0;
              lastSale.items.forEach((item: any) => {
                const gstRate = Number(item.gst_rate || 0);
                const lineTotal = Number(item.price) * item.quantity;
                const taxable = gstRate > 0 ? lineTotal / (1 + gstRate / 100) : lineTotal;
                const gst = lineTotal - taxable;
                totalTaxable += taxable;
                totalGst += gst;
                if (gstRate > 0) {
                  if (!slabMap[gstRate]) slabMap[gstRate] = { taxable: 0, tax: 0 };
                  slabMap[gstRate].taxable += taxable;
                  slabMap[gstRate].tax += gst;
                }
              });
              const hasGst = totalGst > 0.01;
              return (
                <div className="border-t border-dashed border-gray-400 pt-2 space-y-0.5">
                  {hasGst && (
                    <div className="flex justify-between text-gray-500"><span>Taxable Amt:</span><span>₹{totalTaxable.toFixed(2)}</span></div>
                  )}
                  {hasGst && Object.entries(slabMap).map(([rate, val]) => (
                    <div key={rate} className="flex justify-between text-gray-500">
                      <span>GST @{rate}% (CGST {Number(rate) / 2}% + SGST {Number(rate) / 2}%):</span>
                      <span>₹{val.tax.toFixed(2)}</span>
                    </div>
                  ))}
                  {lastSale.totalSavings > 0 && <div className="flex justify-between text-gray-500"><span>Discount:</span><span>-₹{lastSale.totalSavings.toFixed(2)}</span></div>}
                  <div className="flex justify-between text-base font-black border-t border-black pt-1 mt-1">
                    <span>TOTAL</span><span>₹{Math.round(lastSale.total)}</span>
                  </div>
                  {/* Payment method breakdown */}
                  {lastSale.paymentMethod === 'split' ? (
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[9px] text-gray-500"><span>💵 Cash:</span><span className="font-bold">₹{Math.round(lastSale.splitCash || 0)}</span></div>
                      <div className="flex justify-between text-[9px] text-gray-500"><span>📱 UPI:</span><span className="font-bold">₹{Math.round(lastSale.splitUpi || 0)}</span></div>
                    </div>
                  ) : (
                    <div className="flex justify-between text-[9px] text-gray-500"><span>Payment:</span><span className="uppercase font-bold">{lastSale.paymentMethod}</span></div>
                  )}
                </div>
              );
            })()}

            {/* UPI QR — shown for upi or split (UPI portion only) */}
            {(lastSale.paymentMethod === 'upi' || lastSale.paymentMethod === 'split') && (
              <div className="mt-3 p-2 bg-gray-100 rounded text-center border border-dashed border-gray-300">
                <div className="flex justify-center bg-white p-1.5 w-fit mx-auto rounded">
                  <QRCodeAny
                    value={`upi://pay?pa=${storeSettings.upi_id || 'yourupi@bank'}&pn=${storeSettings.shop_name}&am=${lastSale.paymentMethod === 'split' ? (lastSale.splitUpi || 0) : lastSale.total}&cu=INR&tr=${qrRef}`}
                    size={88}
                  />
                </div>
                <p className="text-[8px] mt-1 font-bold uppercase">
                  {lastSale.paymentMethod === 'split' ? `UPI Pay ₹${Math.round(lastSale.splitUpi || 0)}` : 'Scan to Pay'} • {timeLeft}s
                </p>
                <p className="text-[8px] text-gray-500">{storeSettings.upi_id}</p>
              </div>
            )}

            {/* Footer */}
            {storeSettings.invoice_footer && (
              <p className="text-center text-[9px] text-gray-500 mt-3 border-t border-dashed border-gray-300 pt-2">{storeSettings.invoice_footer}</p>
            )}
            <p className="text-center text-[8px] text-gray-400 mt-1">Powered by ScanMart</p>

            <button onClick={() => window.print()} className="w-full bg-black text-white py-3 mt-4 font-bold no-print uppercase text-xs rounded">
              🖨️ Print Receipt
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .no-print { display: none !important; }
          .receipt-box, .receipt-box * { visibility: visible; }
          .receipt-box {
            position: fixed;
            left: 0;
            top: 0;
            width: 80mm;
            margin: 0;
            padding: 4mm;
            box-shadow: none;
            font-size: 10pt;
            font-family: monospace;
          }
          @page {
            size: 80mm auto;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}
