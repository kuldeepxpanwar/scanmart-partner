"use client";
import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Search, Trash2, CreditCard, Loader2, Phone, Banknote, QrCode, Printer, X, Camera, Lock, LogOut, RotateCcw, ChevronLeft, ChevronRight, Zap, AlertTriangle, Book } from "lucide-react";

// --- MODULAR IMPORTS ---
import { useCart } from "@/hooks/useCart";
// POSNumpad removed
import POSCartTable from "@/components/pos/POSCartTable";
import POSReceipt from "@/components/pos/POSReceipt";
import BarcodeScanner from "@/components/BarcodeScanner";
import ForgotPinModal from "@/components/ForgotPinModal";
import AppSwitcher from "@/components/AppSwitcher";
import { useApp } from "@/lib/AppContext";

// --- UTILS ---
import { verifyPin } from "@/lib/pin";
import { idbAddSale, idbGetQueue, idbRemoveSale, idbQueueCount } from "@/lib/offlineDb";

export default function SalesPage() {
  const { t, theme } = useApp();
  // --- 🔐 STAFF & STORE STATES ---
  const [currentStaff, setCurrentStaff] = useState<any>(null);
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [showForgotPin, setShowForgotPin] = useState(false);

  // --- BILLING STATES ---
  const [products, setProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  // --- H1 DRUG COMPLIANCE ---
  const [isH1ModalOpen, setIsH1ModalOpen] = useState(false);
  const [h1Details, setH1Details] = useState({ doctorName: "", clinicName: "", patientDetails: "" });

  // --- SETTINGS ---
  const [storeSettings, setStoreSettings] = useState({
    shop_name: "ScanMart Store",
    shop_address: "123, Market Road, City",
    shop_phone: "9876543210",
    gstin: "",
    invoice_footer: "Thank you for shopping! Visit Again.",
    upi_id: ""
  });

  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi" | "card" | "split" | "udhaar">("cash");
  const [splitCash, setSplitCash] = useState(0);
  const [splitUpi, setSplitUpi] = useState(0);

  // --- RECEIPT & QR ---
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  const [isExisting, setIsExisting] = useState(false);
  const [customerGstin, setCustomerGstin] = useState("");
  const [printMode, setPrintMode] = useState<'thermal' | 'a4'>('thermal');
  const [referringDoctor, setReferringDoctor] = useState("");
  const [doctorsList, setDoctorsList] = useState<any[]>([]);
  const [isTbPatient, setIsTbPatient] = useState(false);
  const [rateProfile, setRateProfile] = useState<'retail' | 'wholesale'>('retail');
  const [invoiceType, setInvoiceType] = useState<'Tax Invoice' | 'Estimate'>('Tax Invoice');
  const [draftInvoiceNo, setDraftInvoiceNo] = useState("");

  // --- CUSTOM HOOK FOR CART ---
  const {
    cart, addToCart, updateQuantity, removeFromCart, clearCart, toggleMute,
    changeCartItemUnit, getTabletsPerUnit,
    discountValue, setDiscountValue, discountType, setDiscountType,
    subTotal, grossSubTotal, totalSavings, finalTotal, discountAmount,
    phone, setPhone, name, setName, totalSpent, setTotalSpent,
    heldBills, holdCurrentBill, recallBill, removeHeldBill, resetCustomer
  } = useCart(products);

  const [showHeldBills, setShowHeldBills] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // --- REFS FOR HOTKEYS ---
  const checkoutBtnRef = useRef<HTMLButtonElement>(null);

  // --- WHATSAPP LOGIC ---
  const handleWhatsApp = () => {
     if (!phone) return alert("Please enter Patient Mobile first.");
     const text = `Hello ${name ? name : 'Customer'},\nYour total bill at ScanMart is ₹${finalTotal.toFixed(2)}.\nThank you for visiting!`;
     window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  // --- GLOBAL HOTKEYS (Phase 3) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F2 -> Toggle TB
      if (e.key === 'F2') {
        e.preventDefault();
        setIsTbPatient(prev => !prev);
      }
      // F4 -> Focus/Trigger Checkout
      if (e.key === 'F4') {
        e.preventDefault();
        checkoutBtnRef.current?.click();
      }
      // Alt + W -> WhatsApp
      if (e.altKey && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        handleWhatsApp();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phone, name, finalTotal]);

  // --- 📶 OFFLINE MODE STATES ---
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const getNextDailySequence = (storeId: string | null) => {
    if (!storeId) return "1";
    const todayStr = new Date().toISOString().split('T')[0];
    const localSeqKey = `daily_bill_seq_${storeId}_${todayStr}`;
    const localSeq = Number(localStorage.getItem(localSeqKey) || "0");
    return (localSeq + 1).toString();
  };

  const incrementDailySequence = (storeId: string | null) => {
    if (!storeId) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const localSeqKey = `daily_bill_seq_${storeId}_${todayStr}`;
    const localSeq = Number(localStorage.getItem(localSeqKey) || "0");
    localStorage.setItem(localSeqKey, (localSeq + 1).toString());
  };

  useEffect(() => {
    if (activeStoreId) {
      setDraftInvoiceNo(getNextDailySequence(activeStoreId));
    }
  }, [activeStoreId]);

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
    // Load print mode from Settings
    const savedPrintMode = localStorage.getItem("printMode") as 'thermal' | 'a4' | null;
    if (savedPrintMode) setPrintMode(savedPrintMode);

    // 📶 Network detection
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineQueue(); // auto-sync when back online
    };
    const handleOffline = () => setIsOnline(false);
    setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check pending count on mount
    idbQueueCount().then(setPendingCount).catch(() => {});

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
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
      fetchSettings();
      fetchDoctors();
    }
  }, [activeStoreId]);

  const fetchDoctors = async () => {
    if (!activeStoreId) return;
    const { data } = await supabase.from("doctors").select("name").eq("store_id", activeStoreId);
    if (data) setDoctorsList(data);
  };

  const fetchFirstStore = async () => {
    const { data } = await supabase.from("stores").select("id").limit(1);
    if (data && data.length > 0) {
      setActiveStoreId(data[0].id);
      localStorage.setItem("active_store_id", data[0].id);
    }
  };

  const fetchProducts = async () => {
    if (!activeStoreId) return;

    if (!navigator.onLine) {
      // 📴 Offline: load from IndexedDB product cache
      try {
        const cached = localStorage.getItem(`scanmart_products_${activeStoreId}`);
        if (cached) setProducts(JSON.parse(cached));
      } catch { /* ignore */ }
      return;
    }

    const { data, error } = await supabase
      .from("inventory")
      .select("*, inventory_batches(batch_number, expiry_date, quantity)")
      .eq("store_id", activeStoreId)
      .eq('is_active', true);

    if (error) console.error("Error fetching products:", error);
    if (data) {
      // FEFO (First Expiry First Out) extraction
      const processedData = data.map((item: any) => {
         let activeBatch = null;
         if (item.inventory_batches && Array.isArray(item.inventory_batches)) {
             const validBatches = item.inventory_batches.filter((b: any) => b.quantity > 0);
             if (validBatches.length > 0) {
                 validBatches.sort((a: any, b: any) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());
                 activeBatch = validBatches[0];
             }
         }
         return {
             ...item,
             batch_no: activeBatch ? activeBatch.batch_number : null,
             expiry_date: activeBatch ? activeBatch.expiry_date : null
         };
      });

      setProducts(processedData);
      // 💾 Cache products for offline use
      try { localStorage.setItem(`scanmart_products_${activeStoreId}`, JSON.stringify(processedData)); } catch { /* storage full */ }
    }
  };

  // ── Sync pending offline sales to Supabase ─────────────────
  const syncOfflineQueue = async () => {
    const queue = await idbGetQueue();
    if (queue.length === 0) { setPendingCount(0); return; }

    setIsSyncing(true);
    let synced = 0;
    for (const entry of queue) {
      try {
        // 1. Insert sale
        const { data: saleData, error: saleErr } = await supabase
          .from("sales").insert([entry.saleRecord]).select('id').single();
        if (saleErr) continue;

        // 2. Insert sale items
        const items = entry.items.map((item: any) => ({ ...item, sale_id: saleData.id }));
        await supabase.from("sale_items").insert(items);

        // 3. Apply stock decrements
        for (const upd of entry.stockUpdates) {
          await supabase.rpc("decrement_stock", { p_product_id: upd.id, p_quantity: upd.qty });
        }

        await idbRemoveSale(entry.id);
        synced++;
      } catch { /* skip — retry next time */ }
    }
    const remaining = await idbQueueCount();
    setPendingCount(remaining);
    setIsSyncing(false);
    if (synced > 0) fetchProducts(); // refresh stock
  };

  const fetchSettings = async () => {
    if (!activeStoreId) return;
    try {
      const { data: storeData } = await supabase.from("stores").select("owner_id").eq("id", activeStoreId).single();
      if (storeData?.owner_id) {
        const { data: settingsData } = await supabase.from("store_settings").select("*").eq("id", storeData.owner_id).single();
        if (settingsData) setStoreSettings(settingsData);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const MASTER_PIN = process.env.NEXT_PUBLIC_MASTER_PIN || "";

  const handleStaffLogin = async () => {
    if (lockoutUntil && Date.now() < lockoutUntil) return alert(`🔒 Too many failed attempts. Wait ${lockoutCountdown}s`);
    if (pin.length < 4 || pin.length > 6) return alert("PIN must be 4–6 digits");
    setLoginLoading(true);

    // 🔑 MASTER PIN BYPASS (for admin/testing) — never goes to DB
    if (MASTER_PIN && pin === MASTER_PIN) {
      const masterStaff = {
        id: 'master',
        name: '🔑 Master Access',
        role: 'admin',
        store_id: activeStoreId,
        pin_code: null,
        is_active: true,
      };
      setCurrentStaff(masterStaff);
      setPin("");
      setPinAttempts(0);
      localStorage.removeItem("pos_lockout_until");
      sessionStorage.setItem("active_staff_id", 'master');
      setLoginLoading(false);
      return;
    }

    try {
      // Step 1: Get auth user to scope staff by owner's stores
      const { data: { user: authUser } } = await supabase.auth.getUser();

      // Step 2: Get this owner's store IDs (for admin scoping)
      let ownerStoreIds: string[] = [];
      if (authUser) {
        const { data: ownedStores } = await supabase
          .from("stores").select("id").eq("owner_id", authUser.id);
        ownerStoreIds = (ownedStores || []).map((s: any) => s.id);
      }

      // Step 3: Fetch all active staff
      const { data: staffList, error } = await supabase
        .from("staff").select("*").eq("is_active", true);
      if (error) throw error;

      // Step 4: PIN match + access scope check
      // - Admin: must belong to one of owner's stores (or null store_id = owner setup)
      // - Manager/Staff: must match activeStoreId exactly
      let matchedStaff: any = null;
      for (const member of (staffList || [])) {
        if (!member.pin_code) continue;
        if (!(await verifyPin(pin, member.pin_code))) continue;

        // Admin: if ownerStoreIds loaded → must be in owner's stores
        //        if ownerStoreIds empty (stores.owner_id not set in DB yet) → allow any admin (trust bcrypt)
        const isOwnerAdmin = member.role === 'admin' &&
          (ownerStoreIds.length === 0 || !member.store_id || ownerStoreIds.includes(member.store_id));
        // Staff/Manager: must match activeStoreId exactly (both must be non-null)
        const isStoreStaff = !!(activeStoreId && member.store_id && member.store_id === activeStoreId);

        if (isOwnerAdmin || isStoreStaff) {
          matchedStaff = member;
          break;
        }
      }

      if (!matchedStaff) {
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
        setCurrentStaff(matchedStaff);
        setPin("");
        sessionStorage.setItem("active_staff_id", matchedStaff.id);
        sessionStorage.removeItem("active_staff_role"); // clear sidebar cache so it re-fetches
      }
    } catch (err: any) {
      alert("Login error: " + err.message);
    }
    setLoginLoading(false);
  };

  const resetCustomerState = () => { resetCustomer(); setTotalSpent(0); setIsExisting(false); setCustomerGstin(""); setReferringDoctor(""); };
  const handleLogout = () => { setCurrentStaff(null); clearCart(); resetCustomerState(); };

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

  const handleCheckout = async () => {
    if (cart.length === 0) return alert("❌ Cart Empty!");
    if (paymentMethod === "udhaar" && !phone) return alert("❌ Phone number is required for Udhaar / Khata billing!");

    // Check for H1 drugs and enforce compliance
    const hasH1 = cart.some((item: any) => item.is_h1);
    if (hasH1 && (!h1Details.doctorName || !h1Details.clinicName || !h1Details.patientDetails)) {
      setIsH1ModalOpen(true);
      return;
    }

    setCheckoutLoading(true);

    const invoiceNumber = draftInvoiceNo || getNextDailySequence(activeStoreId);
    const offlineId = `offline_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    // ── Calculate profit + GST ─────────────────────────────────
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
          totalGst += (sellPrice - base) * qty;
          totalProfit += (base - buyPrice) * qty;
        } else {
          totalProfit += (sellPrice - buyPrice) * qty;
        }
      }
    });

    const salePayload: any = {
      total_amount: Number(finalTotal.toFixed(2)),
      customer_id: null, // set below if online
      payment_method: paymentMethod,
      split_cash: paymentMethod === "split" ? Number(splitCash.toFixed(2)) : null,
      split_upi: paymentMethod === "split" ? Number(splitUpi.toFixed(2)) : null,
      total_savings: Number(totalSavings.toFixed(2)) || 0,
      total_profit: Number(totalProfit.toFixed(2)),
      total_gst: Number(totalGst.toFixed(2)),
      staff_id: currentStaff?.id,
      store_id: activeStoreId,
      created_at: new Date().toISOString(),
      doctor_name: hasH1 && h1Details.doctorName ? h1Details.doctorName : (referringDoctor || null),
      clinic_name: hasH1 ? h1Details.clinicName : null,
      patient_details: hasH1 ? h1Details.patientDetails : null,
    };

    const stockUpdates = cart.map((item) => ({
      id: item.id,
      qty: item.quantity * getTabletsPerUnit(item.pack_size, item.strip_size, item.sell_unit),
    }));

    const saleItemsPayload = cart.map((item) => ({
      product_id: item.id,
      quantity: item.quantity,
      price_at_sale: Number(item.price),
    }));

    // ─── 📴 OFFLINE MODE ────────────────────────────────────────
    if (!navigator.onLine) {
      try {
        await idbAddSale({
          id: offlineId,
          saleRecord: salePayload,
          items: saleItemsPayload,
          stockUpdates,
        });
        const newCount = await idbQueueCount();
        setPendingCount(newCount);

        // Show receipt from local data
        setLastSale({
          id: offlineId,
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
          staffName: currentStaff?.name,
          isOffline: true, // flag for receipt to show offline badge
        });
        setShowReceipt(true); clearCart(); resetCustomerState();
        setSplitCash(0); setSplitUpi(0);
        setH1Details({ doctorName: "", clinicName: "", patientDetails: "" });
        incrementDailySequence(activeStoreId);
        setDraftInvoiceNo(getNextDailySequence(activeStoreId)); // Prepare next bill
      } catch (err: any) {
        alert("❌ Offline save failed: " + err.message);
      } finally {
        setCheckoutLoading(false);
      }
      return;
    }

    // ─── 📶 ONLINE MODE ─────────────────────────────────────────
    try {
      let customerId = null;
      if (phone) {
        const { data: existingCustomer } = await supabase
          .from("customers").select("total_spent, khata_balance")
          .eq("phone", phone).eq("store_id", activeStoreId).maybeSingle();
        const currentSpent = Number(existingCustomer?.total_spent || 0);
        const currentKhata = Number(existingCustomer?.khata_balance || 0);
        const newKhata = paymentMethod === "udhaar" ? currentKhata + finalTotal : currentKhata;

        const { data: customer } = await supabase.from("customers").upsert({
          name: name || "Guest", phone, gstin: customerGstin || null,
          total_spent: currentSpent + finalTotal,
          khata_balance: newKhata,
          store_id: activeStoreId
        }, { onConflict: 'phone' }).select().maybeSingle();
        customerId = customer?.id;

        if (paymentMethod === "udhaar" && customer?.id) {
          await supabase.from("customer_khata_tx").insert({
            store_id: activeStoreId,
            customer_id: customer.id,
            amount: finalTotal,
            type: "credit",
            note: "Udhaar for Invoice: " + invoiceNumber
          });
        }
      }

      salePayload.customer_id = customerId;

      const { data: saleData, error: saleError } = await supabase
        .from("sales").insert([salePayload]).select('id').single();
      if (saleError) throw saleError;

      const itemsWithSaleId = saleItemsPayload.map(item => ({ ...item, sale_id: saleData.id }));
      const { error: itemsInsertError } = await supabase.from("sale_items").insert(itemsWithSaleId);
      if (itemsInsertError) console.error("sale_items insert error:", itemsInsertError?.message);

      for (const upd of stockUpdates) {
        const { error: stockErr } = await supabase.rpc("decrement_stock", {
          p_product_id: upd.id, p_quantity: upd.qty,
        });
        if (stockErr) console.error(`[Checkout] Stock decrement failed:`, stockErr.message);
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
        staffName: currentStaff?.name,
      });
      setShowReceipt(true); clearCart(); resetCustomerState();
      setSplitCash(0); setSplitUpi(0); 
      setH1Details({ doctorName: "", clinicName: "", patientDetails: "" });
      incrementDailySequence(activeStoreId);
      setDraftInvoiceNo(getNextDailySequence(activeStoreId)); // Prepare next bill
      fetchProducts();
    } catch (err: any) { alert("Error: " + err.message); } finally { setCheckoutLoading(false); }
  };

  const handlePhoneSearch = async (inputPhone: string) => {
    setPhone(inputPhone);
    if (inputPhone.length === 10) {
      const { data } = await supabase.from("customers").select("*").eq("phone", inputPhone).eq("store_id", activeStoreId).maybeSingle();
      if (data) {
        setIsExisting(true); setName(data.name);
        setTotalSpent(data.total_spent || 0);
        setCustomerGstin(data.gstin || "");
      } else {
        setIsExisting(false); setName(""); setTotalSpent(0); setCustomerGstin("");
      }
    } else { setIsExisting(false); setCustomerGstin(""); }
  };

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
  }, [products, currentStaff, addToCart]);
  // Numpad removed
  if (!currentStaff) {
    return (
      <div className="h-screen bg-[#0a0f1e] flex items-center justify-center text-white">
        <div className="bg-[#0f172a] p-8 rounded-[2rem] w-full max-w-sm border border-slate-800 shadow-2xl text-center relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-blue-400 to-blue-600 rounded-t-[2rem]"></div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest">ScanMart</div>
            <div className="text-slate-500 text-[10px] font-bold">POS Terminal</div>
            <div className={`ml-auto text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 ${isOnline ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              {isOnline ? '● ONLINE' : `● OFFLINE${pendingCount > 0 ? ` · ${pendingCount} queued` : ''}`}
              {isSyncing && <span className="text-yellow-400 animate-pulse">⟳ syncing</span>}
            </div>
          </div>
          <Lock size={28} className="text-blue-500 mx-auto mb-3 mt-4" />
          <h2 className="text-xl font-black uppercase italic mb-1">POS Access</h2>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-5">{t('enter_pin')} (Admin: 6 digits)</p>
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
            {loginLoading ? <Loader2 className="animate-spin mx-auto" size={18} /> : t('unlock_terminal')}
          </button>
          <button onClick={() => setShowForgotPin(true)} className="mt-4 text-slate-500 hover:text-blue-400 text-xs font-bold uppercase tracking-widest transition-all block w-full">
            {t('forgot_pin')}
          </button>
          <div className="mt-4 flex justify-center">
            <AppSwitcher />
          </div>
        </div>
        <ForgotPinModal isOpen={showForgotPin} onClose={() => setShowForgotPin(false)} shopId={activeStoreId} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#f0f4f8] text-gray-800 overflow-hidden font-sans select-none">
      <div className="bg-[#c0392b] text-white flex items-center px-4 py-1.5 text-[11px] font-bold gap-4 flex-shrink-0 shadow-md">
        <div className="font-black text-sm uppercase tracking-widest">{t('app_name')} POS</div>
        <div className="text-red-200">Emp#: {currentStaff?.name?.split(' ')[0] || 'Staff'}</div>
        <div className="text-red-200">Store: {activeStoreId?.slice(0, 8)}</div>
        <div className="ml-auto flex items-center gap-3">
          <AppSwitcher />
          <span className="text-red-200">{new Date().toLocaleDateString('en-IN')} {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
          <span className={`font-black px-2 py-0.5 rounded text-[10px] ${isOnline ? 'bg-green-600 text-white' : 'bg-yellow-400 text-black'}`}>
            {isSyncing ? '↻ Syncing...' : isOnline ? t('online') : `${t('offline')}${pendingCount > 0 ? ` (${pendingCount} queued)` : ''}`}
          </span>
          <button onClick={handleLogout} className="bg-red-800 hover:bg-red-900 px-2 py-0.5 rounded text-[10px] flex items-center gap-1">
            <LogOut size={10} /> {t('exit')}
          </button>
        </div>
      </div>

      {/* --- METADATA HEADER BAR --- */}
      <div className="bg-white border-b border-gray-300 px-4 py-1.5 flex items-center gap-4 text-[10px] shadow-sm z-20 flex-shrink-0">
        <div className="flex items-center gap-2 flex-1">
           {/* Bill No & Type (New Additions) */}
           <div className="flex flex-col border-r border-gray-300 pr-3 py-0.5">
             <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-0.5">Bill No.</span>
             <span className="text-xs font-black text-blue-900 leading-none">{draftInvoiceNo || '---'}</span>
           </div>
           
           <select value={invoiceType} onChange={e => setInvoiceType(e.target.value as any)} className="border border-gray-300 rounded px-2 py-1.5 outline-none font-bold text-gray-700 cursor-pointer bg-blue-50 text-[10px] uppercase text-blue-800 mr-2 shadow-sm focus:border-blue-500">
             <option value="Tax Invoice">Tax Invoice</option>
             <option value="Estimate">Estimate</option>
           </select>

           <div className="flex items-center border border-gray-300 rounded focus-within:border-blue-500 overflow-hidden bg-gray-50">
             <div className="bg-gray-200 px-2 py-1.5"><Phone size={12} className="text-gray-600" /></div>
             <input type="text" id="patient-mobile" placeholder="Patient Mobile" className="outline-none py-1.5 px-2 w-28 text-gray-800 font-bold bg-transparent text-xs" 
                value={phone} onChange={e => handlePhoneSearch(e.target.value)} maxLength={10} 
                onKeyDown={e => e.key === 'Enter' && document.getElementById('patient-name')?.focus()} />
           </div>
           <input type="text" id="patient-name" placeholder="Patient Name" className="border border-gray-300 rounded px-3 py-1.5 outline-none focus:border-blue-500 w-40 font-bold text-gray-800 text-xs" 
              value={name} onChange={e => setName(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && document.getElementById('doctor-name')?.focus()} />
           {isExisting && <span className="bg-green-100 text-green-700 font-black px-2 py-1 rounded border border-green-200">VIP (₹{totalSpent})</span>}
           
           <div className="h-6 w-px bg-gray-300 mx-2"></div>
           
           <input type="text" id="patient-gstin" placeholder="GSTIN (B2B)" className="border border-gray-300 rounded px-3 py-1.5 outline-none focus:border-blue-500 w-36 uppercase text-gray-800 text-xs font-bold" 
              value={customerGstin} onChange={e => setCustomerGstin(e.target.value.toUpperCase())} maxLength={15} 
              onKeyDown={e => e.key === 'Enter' && document.getElementById('doctor-name')?.focus()} />

           <div className="relative flex items-center">
             <input 
               type="text" 
               id="doctor-name"
               list="doctors-list"
               placeholder="Doctor Name..." 
               className="border border-gray-300 rounded px-3 py-1.5 outline-none focus:border-purple-500 w-36 font-bold text-purple-700 text-xs bg-purple-50 placeholder-purple-300 uppercase"
               value={referringDoctor} 
               onChange={e => setReferringDoctor(e.target.value.toUpperCase())} 
               onKeyDown={e => e.key === 'Enter' && document.getElementById('search-box')?.focus()}
             />
             <datalist id="doctors-list">
                {doctorsList.map((doc, i) => <option key={i} value={doc.name} />)}
             </datalist>
           </div>

           <div className="h-6 w-px bg-gray-300 mx-2"></div>

           <label className="flex items-center gap-1.5 cursor-pointer bg-red-50 text-red-700 px-2 py-1.5 rounded border border-red-200 hover:bg-red-100 transition-colors">
             <input type="checkbox" checked={isTbPatient} onChange={e => setIsTbPatient(e.target.checked)} className="accent-red-600 w-3 h-3 cursor-pointer" />
             <span className="font-bold uppercase tracking-widest text-[9px]">TB (H1)</span>
           </label>

           <select value={rateProfile} onChange={e => setRateProfile(e.target.value as any)} className="border border-gray-300 rounded px-2 py-1.5 outline-none font-bold text-gray-700 cursor-pointer bg-gray-50 text-[10px] uppercase">
             <option value="retail">Retail</option>
             <option value="wholesale">Wholesale</option>
           </select>

           <button onClick={handleWhatsApp} className="ml-auto bg-[#25D366] hover:bg-[#128C7E] text-white px-3 py-1.5 rounded font-bold flex items-center gap-1.5 transition-colors shadow-sm">
              <Phone size={12} /> <span className="uppercase text-[9px] tracking-widest">WhatsApp</span>
           </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar Collapse Toggle Button */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-30 bg-[#1a237e] text-white p-1 rounded-r-lg shadow-lg hover:bg-blue-700 transition-all"
          style={{ left: sidebarCollapsed ? '0px' : 'calc(72% - 12px)' }}
          title={sidebarCollapsed ? 'Show Cart' : 'Collapse Cart'}
        >
          {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className={`flex flex-col bg-white border-r border-gray-300 transition-all duration-300 ${sidebarCollapsed ? 'w-0 overflow-hidden opacity-0' : 'flex-1'}`}>
          <div className="bg-[#1a237e] p-2 flex gap-2 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300" size={14} />
              <input
                id="search-box"
                autoFocus
                type="text"
                placeholder={t('scan_or_search')}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && searchTerm) {
                    const found = products.find(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.barcode === searchTerm);
                    if (found) addToCart(found);
                    setSearchTerm('');
                  }
                }}
                className="w-full bg-[#283593] text-white placeholder-blue-300 p-2 pl-8 rounded text-xs font-bold outline-none border border-blue-700 focus:border-blue-300"
              />
            </div>
            <button onClick={() => setIsScanning(true)} className="bg-blue-700 hover:bg-blue-600 text-white px-3 py-2 rounded text-xs font-bold flex items-center gap-1">
              <Camera size={14} /> {t('scan')}
            </button>
          </div>

          <POSCartTable
            cart={cart}
            searchTerm={searchTerm}
            updateQuantity={updateQuantity}
            removeFromCart={removeFromCart}
            changeCartItemUnit={changeCartItemUnit}
            toggleMute={toggleMute}
          />

          {/* Empty Cart State */}
          {cart.length === 0 && !searchTerm && (
            <div className="flex-1 flex flex-col items-center justify-center opacity-30 select-none">
              <Book size={64} className="text-gray-400 mb-4" />
              <p className="text-2xl font-black text-gray-400 tracking-widest uppercase">Start Scanning</p>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-2">or search product by name / batch</p>
            </div>
          )}
          {/* BUG 4 FIX: Dropdown ab search bar ke relative position mein dikhtaa hai */}
          {searchTerm && (
            <div className="absolute top-[4.5rem] left-2 right-2 bg-white border-2 border-blue-600 rounded-xl shadow-2xl z-50 max-h-96 overflow-y-auto">
              {products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.composition && p.composition.toLowerCase().includes(searchTerm.toLowerCase()))).slice(0, 15).map(p => {
                const isOOS = p.stock <= 0;
                const substitutes = p.composition ? products.filter(sub => sub.id !== p.id && sub.stock > 0 && sub.composition && sub.composition.toLowerCase() === p.composition.toLowerCase()) : [];

                return (
                  <div key={p.id} className={`px-4 py-3 border-b border-gray-100 ${isOOS ? 'bg-red-50/30' : 'hover:bg-blue-50 cursor-pointer transition-colors'}`} onClick={() => { if(!isOOS) { addToCart(p); setSearchTerm(''); } }}>
                    <div className="flex justify-between items-start">
                      <div>
                        <span className={`text-sm font-bold ${isOOS ? 'text-gray-500 line-through' : 'text-gray-800'}`}>{p.name}</span>
                        {p.barcode && <span className="text-[9px] text-gray-400 ml-2">#{p.barcode}</span>}
                        {p.composition && <div className="text-[9px] text-slate-500 font-bold leading-tight mt-0.5 truncate max-w-[200px]">🧪 {p.composition}</div>}
                        {p.location && <div className="text-[9px] text-blue-500 font-bold leading-tight mt-1 inline-block bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">📍 Rack: {p.location}</div>}
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-black ${isOOS ? 'text-red-400' : 'text-blue-700'}`}>
                          {isOOS ? 'Out of Stock' : `₹${p.price}`}
                        </span>
                        {!isOOS && <div className="text-[9px] font-bold text-green-600">Stock: {p.stock}</div>}
                      </div>
                    </div>

                    {substitutes.length > 0 && (
                      <div className={`mt-2 ${isOOS ? 'bg-green-50 border-green-200' : 'bg-blue-50/50 border-blue-100'} border rounded-lg p-2`} onClick={(e) => e.stopPropagation()}>
                        <p className={`text-[9px] font-black uppercase tracking-widest mb-1.5 ${isOOS ? 'text-green-700' : 'text-blue-700'}`}>
                          💊 Available Substitutes (Same Salt):
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {substitutes.slice(0, 4).map(sub => (
                            <button
                              key={sub.id}
                              onClick={() => { addToCart(sub); setSearchTerm(''); }}
                              className="bg-white border border-gray-200 hover:border-green-500 text-gray-800 text-[10px] font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1 transition-all active:scale-95"
                            >
                              {sub.name} <span className="text-green-600 font-black">₹{sub.price}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="bg-[#1a237e] text-white px-4 py-2 grid grid-cols-5 gap-4 text-center border-t border-blue-900">
            <div><p className="text-[8px] text-blue-300 uppercase font-bold">{t('items')}</p><p className="text-sm font-black">{cart.reduce((a, i) => a + i.quantity, 0)}</p></div>
            <div><p className="text-[8px] text-blue-300 uppercase font-bold">{t('discount')}</p><p className="text-sm font-black">₹{discountAmount.toFixed(0)}</p></div>
            <div><p className="text-[8px] text-blue-300 uppercase font-bold">{t('savings')}</p><p className="text-sm font-black text-green-400">₹{totalSavings.toFixed(0)}</p></div>
            <div><p className="text-[8px] text-blue-300 uppercase font-bold">{t('subtotal')}</p><p className="text-sm font-black">₹{subTotal.toFixed(0)}</p></div>
            <div className="bg-green-600 rounded-lg py-0.5"><p className="text-[8px] text-green-200 uppercase font-bold">{t('total')}</p><p className="text-base font-black">₹{finalTotal.toFixed(0)}</p></div>
          </div>
        </div>

        <div className={`flex flex-col bg-[#f8fafc] border-l border-gray-200 transition-all duration-300 ${sidebarCollapsed ? 'flex-1' : 'w-[28%]'}`}>
          {heldBills.length > 0 && (
            <div className="px-3 pt-3">
              <button onClick={() => setShowHeldBills(!showHeldBills)} className="w-full bg-amber-50 border border-amber-300 text-amber-700 py-2 rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-1">
                <RotateCcw size={14} /> {heldBills.length} Held Bill(s)
              </button>
              {showHeldBills && (
                <div className="bg-white border border-amber-200 rounded-lg mt-1 overflow-hidden shadow-sm">
                  {heldBills.map((bill, i) => (
                    <div key={i} className="flex items-center px-2 py-2 border-b border-gray-100 gap-2">
                      <button onClick={() => recallBill(bill)} className="flex-1 text-left text-xs font-bold text-gray-700 hover:text-blue-600">{bill.label}</button>
                      <button onClick={() => removeHeldBill(bill.label)} className="text-red-400 hover:text-red-600"><X size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="px-3 py-3 mt-2 bg-white border-y border-gray-200 flex items-center gap-2">
            <p className="text-[10px] font-black text-gray-500 uppercase flex-shrink-0">{t('discount')}:</p>
            <button
              onClick={() => setDiscountType(t => t === 'percent' ? 'flat' : 'percent')}
              className="bg-blue-600 text-white text-xs font-black px-2 py-1.5 rounded transition-all w-8 text-center"
            >{discountType === 'percent' ? '%' : '₹'}</button>
            <input
              type="number"
              min="0"
              value={discountValue || ''}
              onChange={(e) => setDiscountValue(Number(e.target.value))}
              className="flex-1 border-2 border-gray-200 rounded px-3 py-1.5 text-sm font-black text-center focus:border-blue-500 outline-none text-gray-800"
              placeholder="0"
            />
            {discountAmount > 0 && <span className="text-green-600 text-xs font-black">-₹{discountAmount.toFixed(0)}</span>}
          </div>

          <div className="px-4 py-3 bg-[#f8fafc] border-b border-gray-200 space-y-1">
             <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase">
                <span>Gross Total</span>
                <span>₹{grossSubTotal.toFixed(2)}</span>
             </div>
             {grossSubTotal > subTotal && (
                 <div className="flex justify-between text-[10px] font-bold text-red-400 uppercase">
                    <span>Muted / Removed</span>
                    <span>-₹{(grossSubTotal - subTotal).toFixed(2)}</span>
                 </div>
             )}
             <div className="flex justify-between text-[11px] font-black text-blue-900 uppercase pt-1 border-t border-gray-200 mt-1">
                <span>Selected Subtotal</span>
                <span>₹{subTotal.toFixed(2)}</span>
             </div>
          </div>

          <div className="px-3 pb-2 pt-2">
            <div className="grid grid-cols-5 gap-1.5 mb-2">
              {(['cash', 'upi', 'card', 'split', 'udhaar'] as const).map(m => (
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
                  {m === 'udhaar' && <Book size={11} />}
                  {m === 'split' ? 'Split' : m === 'udhaar' ? 'Udhaar' : m}
                </button>
              ))}
            </div>

            {paymentMethod === 'split' && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-2.5 space-y-2">
                <p className="text-[9px] font-black text-purple-600 uppercase tracking-widest">Split: Cash + UPI = ₹{finalTotal.toFixed(0)}</p>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <p className="text-[8px] text-gray-500 font-bold uppercase mb-0.5">💵 Cash</p>
                    <input
                      type="number" min={0} max={finalTotal} value={splitCash || ''}
                      onChange={e => {
                        const v = Math.min(Number(e.target.value) || 0, finalTotal);
                        setSplitCash(v); setSplitUpi(parseFloat((finalTotal - v).toFixed(2)));
                      }}
                      placeholder="0" className="w-full border-2 border-purple-300 rounded-lg px-2 py-1.5 text-sm font-black text-center focus:border-purple-600 outline-none bg-white"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-[8px] text-gray-500 font-bold uppercase mb-0.5">📱 UPI</p>
                    <input
                      type="number" min={0} max={finalTotal} value={splitUpi || ''}
                      onChange={e => {
                        const v = Math.min(Number(e.target.value) || 0, finalTotal);
                        setSplitUpi(v); setSplitCash(parseFloat((finalTotal - v).toFixed(2)));
                      }}
                      placeholder={String(finalTotal.toFixed(0))} className="w-full border-2 border-purple-300 rounded-lg px-2 py-1.5 text-sm font-black text-center focus:border-purple-600 outline-none bg-white"
                    />
                  </div>
                </div>
                {(() => {
                  const diff = parseFloat((splitCash + splitUpi - finalTotal).toFixed(2));
                  return diff !== 0 && <p className={`text-[9px] font-black text-center ${diff > 0 ? 'text-red-500' : 'text-orange-500'}`}>{diff > 0 ? `⚠ Over by ₹${diff}` : `⚠ Short by ₹${Math.abs(diff)}`}</p>;
                })()}
                {splitCash > 0 && splitUpi > 0 && parseFloat((splitCash + splitUpi - finalTotal).toFixed(2)) === 0 && (
                  <p className="text-[9px] font-black text-green-600 text-center">✅ Amounts match!</p>
                )}
              </div>
            )}
          </div>

          <div className="px-3 pb-3 grid grid-cols-2 gap-2">
            <button onClick={holdCurrentBill} className="bg-amber-500 hover:bg-amber-400 text-white py-3 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-1 transition-all active:scale-95">
              <RotateCcw size={14} /> {t('hold')}
            </button>
            <button onClick={() => { clearCart(); resetCustomerState(); }} className="bg-red-500 hover:bg-red-400 text-white py-3 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-1 transition-all active:scale-95">
              <Trash2 size={14} /> {t('clear')}
            </button>
            {lastSale && (
              <button onClick={() => setShowReceipt(true)} className="col-span-2 bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-1 transition-all active:scale-95">
                <Printer size={13} /> {t('reprint')}
              </button>
            )}
          </div>

          <div className="px-3 pb-4 mt-auto">
            <button
              ref={checkoutBtnRef}
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
              {checkoutLoading ? <Loader2 className="animate-spin" size={20} /> : <><Printer size={20} /> {t('pay_and_print')}</>}
              {!isOnline && <span className="text-[9px] bg-yellow-400 text-black px-1 rounded font-black">OFFLINE</span>}
            </button>
          </div>
          
          {/* --- SHORTCUT MAP --- */}
          <div className="px-3 pb-2 text-center flex flex-wrap justify-center gap-3">
             <span className="text-[8px] text-gray-400 font-bold uppercase"><kbd className="bg-gray-100 text-gray-500 border border-gray-200 px-1 rounded">F2</kbd> TB Patient</span>
             <span className="text-[8px] text-gray-400 font-bold uppercase"><kbd className="bg-gray-100 text-gray-500 border border-gray-200 px-1 rounded">F4</kbd> Checkout</span>
             <span className="text-[8px] text-gray-400 font-bold uppercase"><kbd className="bg-gray-100 text-gray-500 border border-gray-200 px-1 rounded">ALT+W</kbd> WhatsApp</span>
          </div>
        </div>
      </div>

      {/* --- 🏥 H1 COMPLIANCE MODAL --- */}
      {isH1ModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl w-full max-w-md shadow-2xl relative">
            <button onClick={() => setIsH1ModalOpen(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
              <X size={20} />
            </button>
            <div className="flex items-center gap-3 mb-6 text-red-500">
              <div className="bg-red-500/20 p-2 rounded-xl">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold uppercase tracking-wider">Schedule H1 Drug</h2>
                <p className="text-[10px] text-red-400">Doctor & Patient Details Required</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Doctor Name *</label>
                <input type="text" placeholder="e.g. Dr. R.K. Sharma"
                  className="w-full bg-slate-800 p-3 rounded-xl border border-slate-700 outline-none text-white focus:border-red-500 transition-colors"
                  value={h1Details.doctorName} onChange={e => setH1Details({ ...h1Details, doctorName: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Clinic / Hospital Name *</label>
                <input type="text" placeholder="e.g. City Care Hospital"
                  className="w-full bg-slate-800 p-3 rounded-xl border border-slate-700 outline-none text-white focus:border-red-500 transition-colors"
                  value={h1Details.clinicName} onChange={e => setH1Details({ ...h1Details, clinicName: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Patient Details (Name & Contact) *</label>
                <input type="text" placeholder="e.g. Rahul Verma, 9876543210"
                  className="w-full bg-slate-800 p-3 rounded-xl border border-slate-700 outline-none text-white focus:border-red-500 transition-colors"
                  value={h1Details.patientDetails} onChange={e => setH1Details({ ...h1Details, patientDetails: e.target.value })}
                />
              </div>
            </div>

            <button
              onClick={() => {
                if (!h1Details.doctorName || !h1Details.clinicName || !h1Details.patientDetails) {
                  return alert("Please fill all details for H1 Compliance!");
                }
                setIsH1ModalOpen(false);
                handleCheckout(); // Resume checkout
              }}
              className="w-full mt-8 bg-red-600 hover:bg-red-500 text-white py-4 rounded-xl font-black uppercase tracking-widest transition-colors shadow-lg shadow-red-600/20 active:scale-95"
            >
              Confirm & Continue Checkout
            </button>
          </div>
        </div>
      )}

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

      {showReceipt && lastSale && (
        <POSReceipt
          lastSale={lastSale}
          storeSettings={storeSettings}
          paymentMethod={paymentMethod}
          setShowReceipt={setShowReceipt}
          printMode={printMode}
        />
      )}
    </div>
  );
}
