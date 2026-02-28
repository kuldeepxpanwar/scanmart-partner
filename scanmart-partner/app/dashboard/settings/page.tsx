"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
    Save, Store, FileText, AlertTriangle, Loader2,
    LogOut, Zap, Crown, Rocket, Star, X, CheckCircle,
    Wifi, Printer, ChevronDown, ChevronRight, Lock,
    MapPin, Plus, Trash2, Building2, QrCode, CreditCard, Edit2
} from "lucide-react";
import QRCode from "react-qr-code";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import ForgotPinModal from "@/components/ForgotPinModal";
import { verifyPin } from "@/lib/pin";

export default function SettingsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // --- 🏪 STORE STATES (NEW) ---
    const [stores, setStores] = useState<any[]>([]);
    const [newStoreName, setNewStoreName] = useState("");
    const [newStoreLocation, setNewStoreLocation] = useState("");
    const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
    const [activeStoreId, setActiveStoreId] = useState<string | null>(
        typeof window !== 'undefined' ? localStorage.getItem("active_store_id") : null
    );
    const [editingStore, setEditingStore] = useState<any>(null); // store being edited
    const [editStoreForm, setEditStoreForm] = useState({ name: "", location: "", upi_id: "", razorpay_key_id: "" });
    const [editSaving, setEditSaving] = useState(false);

    // --- 🔐 SECURITY STATES ---
    const [isLocked, setIsLocked] = useState(true);
    const [pin, setPin] = useState("");
    const [pinError, setPinError] = useState("");
    const [showForgotPin, setShowForgotPin] = useState(false);

    // --- UI States ---
    const [showQRModal, setShowQRModal] = useState(false);
    const [expandSubs, setExpandSubs] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<any>(null);
    const [utrInput, setUtrInput] = useState("");

    // --- Hardware States ---
    const [isOnline, setIsOnline] = useState(true);
    const [printerType, setPrinterType] = useState("browser");
    const [printerIP, setPrinterIP] = useState("");

    // Payment Gateway Settings
    const [settings, setSettings] = useState({
        shop_name: "", shop_address: "", shop_phone: "", gstin: "", invoice_footer: "",
        upi_id: "",
        razorpay_key_id: "",
        razorpay_key_secret: "",
    });
    const [showRazorpaySecret, setShowRazorpaySecret] = useState(false);

    const MY_WHATSAPP = "9358752147";
    const MY_UPI_ID = "panwarkuldeep256-2@oksbi";

    const subPlans = [
        { name: "7-Days Trial", price: "Free", duration: "One Time", icon: <Rocket className="text-blue-400" size={20} />, desc: "Test features", color: "border-blue-500/30" },
        { name: "Monthly", price: "₹399", duration: "1 Month", icon: <Zap className="text-purple-400" size={20} />, desc: "Starter Plan", color: "border-purple-500/30" },
        { name: "Half Yearly", price: "₹1,999", duration: "6 Months", icon: <Star className="text-indigo-400" size={20} />, desc: "Save ₹400", popular: true, color: "border-indigo-500" },
        { name: "Annual Pro", price: "₹2,999", duration: "1 Year", icon: <Crown className="text-yellow-500" size={20} />, desc: "Best Value", color: "border-yellow-500" },
    ];

    useEffect(() => {
        fetchData();
        if (typeof window !== 'undefined') {
            // BUG 10 FIX: Named functions use karein taaki removeEventListener kaam kare
            const handleOnline = () => setIsOnline(true);
            const handleOffline = () => setIsOnline(false);
            setIsOnline(navigator.onLine);
            window.addEventListener('online', handleOnline);
            window.addEventListener('offline', handleOffline);
            const savedPrinter = localStorage.getItem("printerType");
            const savedIP = localStorage.getItem("printerIP");
            if (savedPrinter) setPrinterType(savedPrinter);
            if (savedIP) setPrinterIP(savedIP);
            return () => {
                window.removeEventListener('online', handleOnline);
                window.removeEventListener('offline', handleOffline);
            };
        }
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Fetch Settings
        const { data: settingData } = await supabase.from("store_settings").select("*").eq("id", user.id).single();
        if (settingData) {
            setSettings({
                shop_name: settingData.shop_name || "",
                shop_address: settingData.shop_address || "",
                shop_phone: settingData.shop_phone || "",
                gstin: settingData.gstin || "",
                invoice_footer: settingData.invoice_footer || "",
                upi_id: settingData.upi_id || "",
                razorpay_key_id: settingData.razorpay_key_id || "",
                razorpay_key_secret: settingData.razorpay_key_secret || "",
            });
        }

        // 2. Fetch only THIS owner's Stores
        const { data: storesData } = await supabase
            .from("stores")
            .select("*")
            .eq("owner_id", user.id)
            .order("is_main_store", { ascending: false });
        if (storesData) setStores(storesData);

        setLoading(false);
    };

    const handlePinSubmit = async () => {
        if (pin.length < 4) return setPinError("PIN must be 4-6 digits");
        // BUG 1 FIX: Pehle plain text match tha — ab verifyPin() (bcrypt) use hoga
        //            Warna hashed PINs kabhi match nahi karte the
        const { data: adminStaff } = await supabase
            .from("staff")
            .select("*")
            .eq("role", "admin")
            .eq("is_active", true);

        if (!adminStaff || adminStaff.length === 0) {
            setPinError("❌ No admin found");
            return;
        }

        let matched = false;
        for (const staff of adminStaff) {
            if (!staff.pin_code) continue;
            if (await verifyPin(pin, staff.pin_code)) {
                matched = true;
                break;
            }
        }

        if (matched) { setIsLocked(false); setPinError(""); }
        else { setPinError("❌ Invalid Admin PIN"); setPin(""); }
    };

    const handleSave = async () => {
        setSaving(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            // 🔥 BUG FIX: Use upsert() instead of update()
            // update() silently fails if no row exists for this user
            // upsert() will INSERT if not exists, UPDATE if it does
            const { error } = await supabase
                .from("store_settings")
                .upsert({ id: user.id, ...settings });

            if (error) {
                alert("Error: " + error.message);
            } else {
                if (typeof window !== 'undefined') {
                    localStorage.setItem("printerType", printerType);
                    localStorage.setItem("printerIP", printerIP);
                }
                alert("✅ Settings Saved Successfully!");
                fetchData();
            }
        }
        setSaving(false);
    };

    // 🔥 ADD STORE
    const handleAddStore = async () => {
        if (!newStoreName) return alert("Store Name is required");
        setSaving(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setSaving(false); return; }

        const { error } = await supabase.from("stores").insert([{
            name: newStoreName,
            location: newStoreLocation,
            is_main_store: false,
            owner_id: user.id   // ← Critical: link store to this owner
        }]);

        if (error) alert("Error adding store: " + error.message);
        else {
            alert("✅ New Store Created!");
            setIsStoreModalOpen(false);
            setNewStoreName("");
            setNewStoreLocation("");
            fetchData();
        }
        setSaving(false);
    };

    // 🔥 DELETE STORE
    const handleDeleteStore = async (id: string, isMain: boolean) => {
        if (isMain) return alert("❌ Cannot delete Main Branch!");
        if (!confirm("Are you sure? This will delete all inventory linked to this store.")) return;

        const { error } = await supabase.from("stores").delete().eq("id", id);
        if (error) alert(error.message);
        else fetchData();
    };

    // 🔥 EDIT STORE
    const openEditStore = (store: any) => {
        setEditingStore(store);
        setEditStoreForm({
            name: store.name || "",
            location: store.location || "",
            upi_id: store.upi_id || "",
            razorpay_key_id: store.razorpay_key_id || "",
        });
    };

    const handleEditStore = async () => {
        if (!editingStore) return;
        setEditSaving(true);
        const { error } = await supabase.from("stores").update({
            name: editStoreForm.name,
            location: editStoreForm.location,
            upi_id: editStoreForm.upi_id || null,
            razorpay_key_id: editStoreForm.razorpay_key_id || null,
        }).eq("id", editingStore.id);

        if (error) alert("Error: " + error.message);
        else {
            setEditingStore(null);
            fetchData();
        }
        setEditSaving(false);
    };

    // --- Payment & Utils ---
    const handlePaymentClick = (plan: any) => {
        if (plan.price === "Free") {
            const msg = `Hello ScanMart! Activate 7-Days Trial for: ${settings.shop_name}`;
            window.open(`https://wa.me/${MY_WHATSAPP}?text=${encodeURIComponent(msg)}`, "_blank");
            return;
        }
        setSelectedPlan(plan); setShowQRModal(true);
    };

    // 🛠️ UPDATED SUBMIT UTR (Sends Store ID now)
    const submitUTR = async () => {
        if (utrInput.length < 10) return alert("❌ Invalid UTR");
        setSaving(true);

        // 1. Find Main Store (or first available)
        const mainStore = stores.find(s => s.is_main_store) || stores[0];

        if (!mainStore) {
            alert("❌ No Store Found! Please create a store first.");
            setSaving(false);
            return;
        }

        console.log("Submitting Request for:", mainStore.name);

        const { error } = await supabase.from("payment_requests").insert([{
            store_id: mainStore.id, // 🔥 IMPORTANT: Linking exact store ID
            shop_name: mainStore.name, // Using actual store name from DB
            plan_name: selectedPlan.name,
            amount: selectedPlan.price,
            utr_number: utrInput,
            status: 'pending'
        }]);

        if (error) {
            console.error("Supabase Error:", error);
            alert("❌ Failed to submit request: " + error.message);
        } else {
            alert("✅ Request Submitted Successfully! Admin will review shortly.");
            setShowQRModal(false);
            setUtrInput("");
        }
        setSaving(false);
    };

    const generateQR = (price: string) => `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=${MY_UPI_ID}&pn=ScanMart&am=${price.replace("₹", "").replace(",", "")}&cu=INR`;

    // --- 🔒 LOCK SCREEN ---
    if (isLocked) {
        return (
            <div className="h-screen bg-[#020617] flex items-center justify-center text-white p-4">
                <div className="bg-slate-900 p-8 rounded-[2rem] w-full max-w-sm border border-slate-800 shadow-2xl text-center">
                    <div className="bg-red-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20"><Lock size={32} className="text-red-500" /></div>
                    <h2 className="text-xl font-black uppercase tracking-wider mb-2">Restricted Area</h2>
                    <p className="text-slate-500 text-xs mb-6 uppercase font-bold tracking-widest">Admin PIN (6-digit) Required</p>
                    <div className="flex justify-center gap-2 mb-6">{[0, 1, 2, 3, 4, 5].map((i) => (<div key={i} className={`w-2.5 h-2.5 rounded-full ${pin.length > i ? "bg-red-500" : "bg-slate-800"}`} />))}</div>
                    <input type="password" autoFocus maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} onKeyDown={e => e.key === 'Enter' && handlePinSubmit()} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-center text-2xl font-black tracking-[1rem] outline-none focus:border-red-500 transition-all mb-4" placeholder="••••••" />
                    {pinError && <p className="text-red-500 text-xs font-bold mb-4 animate-pulse">{pinError}</p>}
                    <button onClick={handlePinSubmit} className="w-full bg-red-600 hover:bg-red-500 py-4 rounded-2xl font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-red-900/20">Unlock Settings</button>
                    <button onClick={() => setShowForgotPin(true)} className="mt-4 text-slate-500 hover:text-red-400 text-xs font-bold uppercase tracking-widest transition-all block w-full">
                        Forgot PIN?
                    </button>
                </div>
                <ForgotPinModal isOpen={showForgotPin} onClose={() => setShowForgotPin(false)} />
            </div>
        );
    }

    if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={32} /></div>;

    return (
        <div className="p-4 md:p-8 bg-[#020617] min-h-screen text-white font-sans pb-32">

            {/* 🟢 TOP HEADER */}
            <div className="max-w-4xl mx-auto mb-8 flex justify-between items-center sticky top-0 z-40 bg-[#020617]/80 backdrop-blur-md py-4 border-b border-slate-800/50">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black italic tracking-tighter uppercase">Settings</h1>
                    <p className="text-slate-500 text-[10px] font-bold tracking-widest uppercase">Manage Store & System</p>
                </div>
                <button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-black text-xs md:text-sm shadow-lg shadow-blue-900/20 flex items-center gap-2 transition-all active:scale-95">
                    {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} <span className="hidden md:inline">SAVE CHANGES</span>
                </button>
            </div>

            <div className="max-w-4xl mx-auto space-y-6">

                {/* 🏪 STORE MANAGEMENT */}
                <section className="bg-slate-900/40 border border-slate-800 p-6 md:p-8 rounded-[2rem]">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-sm font-black text-orange-400 flex items-center gap-2 uppercase tracking-widest">
                            <Building2 size={18} /> My Stores
                        </h2>
                        <button onClick={() => setIsStoreModalOpen(true)} className="bg-orange-600/20 text-orange-400 hover:bg-orange-600 hover:text-white px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all">
                            <Plus size={14} /> Add New
                        </button>
                    </div>

                    <div className="grid gap-3">
                        {stores.map(store => (
                            <div key={store.id} className={`bg-slate-950 p-4 rounded-xl border flex justify-between items-center transition-all ${activeStoreId === store.id ? 'border-blue-500/50 bg-blue-500/5' : 'border-slate-800'}`}>
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-lg ${store.is_main_store ? 'bg-orange-500/20 text-orange-500' : activeStoreId === store.id ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-400'}`}>
                                        <Store size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-sm flex items-center gap-2">
                                            {store.name}
                                            {store.is_main_store && <span className="bg-orange-500 text-black px-2 py-0.5 rounded text-[8px] font-black uppercase">Main</span>}
                                        </h3>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1">
                                            <MapPin size={10} /> {store.location || "No Location"}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {activeStoreId === store.id ? (
                                        <span className="text-[9px] font-black uppercase text-blue-400 bg-blue-500/10 border border-blue-500/30 px-3 py-1.5 rounded-lg flex items-center gap-1">
                                            <CheckCircle size={10} /> Active
                                        </span>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                localStorage.setItem("active_store_id", store.id);
                                                setActiveStoreId(store.id);
                                                setTimeout(() => window.location.reload(), 300);
                                            }}
                                            className="text-[9px] font-black uppercase text-slate-400 hover:text-white bg-slate-800 hover:bg-blue-600 border border-slate-700 hover:border-blue-500 px-3 py-1.5 rounded-lg transition-all"
                                        >
                                            Switch
                                        </button>
                                    )}
                                    {/* Edit button — always visible */}
                                    <button onClick={() => openEditStore(store)} className="p-2 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all">
                                        <Edit2 size={16} />
                                    </button>
                                    {!store.is_main_store && (
                                        <button onClick={() => handleDeleteStore(store.id, store.is_main_store)} className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all">
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 1️⃣ YOUR SUBSCRIPTION */}
                <section className="bg-slate-900/40 border border-slate-800 rounded-[2rem] overflow-hidden transition-all hover:border-slate-700">
                    <div onClick={() => setExpandSubs(!expandSubs)} className="p-6 flex items-center justify-between cursor-pointer bg-slate-900/60 hover:bg-slate-800/60 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="bg-yellow-500/10 p-3 rounded-xl text-yellow-500 border border-yellow-500/20"><Crown size={24} /></div>
                            <div><h2 className="text-lg font-black italic uppercase text-white">Your Subscription</h2><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{expandSubs ? "Select a plan below" : "Click to view plans & upgrade"}</p></div>
                        </div>
                        <div className={`p-2 rounded-full bg-slate-950 text-slate-400 transition-transform duration-300 ${expandSubs ? 'rotate-180' : ''}`}><ChevronDown size={20} /></div>
                    </div>
                    <AnimatePresence>
                        {expandSubs && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-slate-800">
                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {subPlans.map((plan) => (
                                        <div key={plan.name} onClick={() => handlePaymentClick(plan)} className={`relative p-4 rounded-2xl border bg-slate-950/50 cursor-pointer hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-between group ${plan.color}`}>
                                            {plan.popular && <span className="absolute top-0 right-0 bg-indigo-600 text-[8px] px-2 py-0.5 rounded-bl-lg font-bold uppercase">Best</span>}
                                            <div className="flex items-center gap-3"><div className="p-2 bg-slate-900 rounded-lg">{plan.icon}</div><div><h3 className="font-bold text-sm uppercase">{plan.name}</h3><p className="text-[10px] text-slate-500 font-bold">{plan.price} / {plan.duration}</p></div></div>
                                            <ChevronRight size={16} className="text-slate-600 group-hover:text-white transition-colors" />
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </section>

                {/* 2️⃣ SHOP IDENTITY */}
                <section className="bg-slate-900/40 border border-slate-800 p-6 md:p-8 rounded-[2rem]">
                    <h2 className="text-sm font-black text-blue-400 flex items-center gap-2 mb-6 uppercase tracking-widest"><Store size={18} /> Store Profile</h2>
                    <div className="space-y-4">
                        <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase ml-2">Shop Name</label><input type="text" value={settings.shop_name} onChange={(e) => setSettings({ ...settings, shop_name: e.target.value })} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white font-bold text-sm outline-none focus:border-blue-500 transition-all" /></div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase ml-2">Phone</label><input type="text" value={settings.shop_phone} onChange={(e) => setSettings({ ...settings, shop_phone: e.target.value })} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white text-sm outline-none focus:border-blue-500 transition-all" /></div>
                            <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase ml-2">GSTIN</label><input type="text" value={settings.gstin} onChange={(e) => setSettings({ ...settings, gstin: e.target.value })} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white text-sm font-mono uppercase outline-none focus:border-blue-500 transition-all" /></div>
                        </div>

                        {/* 🔥 UPI ID FIELD */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-2 flex items-center gap-1">
                                <QrCode size={12} /> Your UPI ID (For Receiving Payments)
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. shopname@okhdfcbank"
                                value={settings.upi_id}
                                onChange={(e) => setSettings({ ...settings, upi_id: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white font-bold text-sm outline-none focus:border-green-500 transition-all text-green-400"
                            />
                            <p className="text-[9px] text-slate-600 ml-2">Customers will scan QR linked to this ID.</p>
                        </div>

                        <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase ml-2">Address</label><textarea rows={2} value={settings.shop_address} onChange={(e) => setSettings({ ...settings, shop_address: e.target.value })} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white text-sm outline-none focus:border-blue-500 transition-all resize-none" /></div>
                    </div>
                </section>

                {/* 3️⃣ BILL FOOTER */}
                <section className="bg-slate-900/40 border border-slate-800 p-6 md:p-8 rounded-[2rem]">
                    <h2 className="text-sm font-black text-green-400 flex items-center gap-2 mb-6 uppercase tracking-widest"><FileText size={18} /> Invoice Footer</h2>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-2">Bottom Message</label>
                        <input type="text" value={settings.invoice_footer} onChange={(e) => setSettings({ ...settings, invoice_footer: e.target.value })} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white text-sm outline-none focus:border-green-500 transition-all" placeholder="Thank you for shopping!" />
                    </div>
                </section>

                {/* 4️⃣ HARDWARE CONTROL */}
                <section className="bg-slate-900/40 border border-slate-800 p-6 md:p-8 rounded-[2rem]">
                    <h2 className="text-sm font-black text-purple-400 flex items-center gap-2 mb-6 uppercase tracking-widest"><Wifi size={18} /> Hardware Control</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
                            <div><p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Network Status</p><div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div><span className={`text-xs font-black uppercase ${isOnline ? 'text-green-500' : 'text-red-500'}`}>{isOnline ? 'Online' : 'Offline'}</span></div></div><Wifi size={20} className="text-slate-700" />
                        </div>
                        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                            <p className="text-[10px] text-slate-500 font-bold uppercase mb-2">Printer Mode</p>
                            <select value={printerType} onChange={(e) => setPrinterType(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs font-bold text-white outline-none">
                                <option value="browser">USB / System Default</option>
                                <option value="wifi">Wi-Fi / LAN (IP)</option>
                            </select>
                        </div>
                    </div>
                    {printerType === 'wifi' && (
                        <div className="mt-4"><input type="text" placeholder="Enter Printer IP (e.g. 192.168.1.50)" value={printerIP} onChange={(e) => setPrinterIP(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs font-mono outline-none" /></div>
                    )}
                    <div className="mt-6 flex justify-end">
                        <button onClick={() => printerType === 'browser' ? window.print() : alert("Checking Wi-Fi Printer...")} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest flex items-center gap-2"><Printer size={14} /> Test Print</button>
                    </div>
                </section>

                {/* 5️⃣ PAYMENT GATEWAY */}
                <section className="bg-slate-900/40 border border-slate-800 p-6 md:p-8 rounded-[2rem]">
                    <h2 className="text-sm font-black text-emerald-400 flex items-center gap-2 mb-2 uppercase tracking-widest">
                        <QrCode size={18} /> Payment Gateway
                    </h2>
                    <p className="text-[10px] text-slate-500 mb-6">Configure UPI and Razorpay for your billing terminal.</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* ── UPI Block ─────────────────────────────── */}
                        <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-4">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-7 h-7 bg-green-500/20 rounded-lg flex items-center justify-center">
                                    <QrCode size={14} className="text-green-400" />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-white">UPI (PhonePe / Paytm / BHIM)</p>
                                    <p className="text-[10px] text-slate-500">Works for all small-medium merchants</p>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Your UPI ID</label>
                                <input
                                    type="text"
                                    placeholder="shopname@ybl  or  9876543210@paytm"
                                    value={settings.upi_id}
                                    onChange={(e) => setSettings({ ...settings, upi_id: e.target.value.trim() })}
                                    className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-green-400 font-bold text-sm outline-none focus:border-green-500 transition-all"
                                />
                                <p className="text-[9px] text-slate-600 ml-1">Billing me "UPI" select karne par yahi QR banta hai</p>
                            </div>

                            {/* Live QR Preview */}
                            {settings.upi_id && (
                                <div className="flex flex-col items-center gap-2 p-3 bg-white rounded-xl">
                                    <QRCode
                                        value={`upi://pay?pa=${settings.upi_id}&pn=${encodeURIComponent(settings.shop_name || 'Shop')}&cu=INR`}
                                        size={110}
                                    />
                                    <p className="text-[9px] text-slate-700 font-bold">{settings.upi_id}</p>
                                </div>
                            )}

                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
                                <p className="text-[10px] text-blue-400 font-bold">💡 Auto-confirm chahiye?</p>
                                <p className="text-[10px] text-slate-500 mt-1">PhonePe Business ya Paytm Business account se API key milegi — tab payment auto-verified hoga. Abhi cashier manually "Mark Paid" karta hai.</p>
                            </div>
                        </div>

                        {/* ── Razorpay Block ────────────────────────── */}
                        <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-4">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-7 h-7 bg-blue-500/20 rounded-lg flex items-center justify-center">
                                    <CreditCard size={14} className="text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-white">Razorpay</p>
                                    <p className="text-[10px] text-slate-500">For high-volume / multi-store businesses</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Key ID <span className="text-blue-400">(Public)</span></label>
                                    <input
                                        type="text"
                                        placeholder="rzp_live_xxxxxxxxxxxxxxxx"
                                        value={settings.razorpay_key_id}
                                        onChange={(e) => setSettings({ ...settings, razorpay_key_id: e.target.value.trim() })}
                                        className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-blue-400 font-mono text-[11px] outline-none focus:border-blue-500 transition-all"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Key Secret <span className="text-red-400">(Private)</span></label>
                                    <div className="relative">
                                        <input
                                            type={showRazorpaySecret ? "text" : "password"}
                                            placeholder="••••••••••••••••••••"
                                            value={settings.razorpay_key_secret}
                                            onChange={(e) => setSettings({ ...settings, razorpay_key_secret: e.target.value.trim() })}
                                            className="w-full bg-slate-900 border border-slate-700 p-3 pr-10 rounded-xl text-red-400 font-mono text-[11px] outline-none focus:border-red-500 transition-all"
                                        />
                                        <button type="button" onClick={() => setShowRazorpaySecret(v => !v)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                                            <Lock size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {settings.razorpay_key_id ? (
                                <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl p-3">
                                    <CheckCircle size={14} className="text-green-400 flex-shrink-0" />
                                    <p className="text-[10px] text-green-400 font-bold">Razorpay connected — billing me "Razorpay" option dikhega</p>
                                </div>
                            ) : (
                                <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 space-y-1">
                                    <p className="text-[10px] text-slate-400 font-bold">Keys kahan milenge?</p>
                                    <p className="text-[10px] text-slate-500">1. dashboard.razorpay.com → Login</p>
                                    <p className="text-[10px] text-slate-500">2. Settings → API Keys → Generate Key</p>
                                    <p className="text-[10px] text-slate-500">3. Key ID + Secret yahan paste karo</p>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* 6️⃣ DANGER ZONE */}
                <section className="border border-red-500/10 bg-red-500/5 p-6 rounded-[2rem]">
                    <h2 className="text-xs font-black text-red-500 uppercase tracking-widest mb-4 flex items-center gap-2"><AlertTriangle size={14} /> Danger Zone</h2>
                    <button onClick={() => supabase.auth.signOut().then(() => router.push("/login"))} className="w-full bg-slate-950 border border-slate-800 hover:border-red-500/50 text-slate-400 hover:text-red-500 py-4 rounded-xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all"><LogOut size={16} /> Sign Out Partner</button>
                </section>

            </div>

            {/* 💳 QR MODAL */}
            {showQRModal && selectedPlan && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl relative">
                        <button onClick={() => setShowQRModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white bg-slate-800 p-2 rounded-full"><X size={18} /></button>
                        <div className="text-center">
                            <h3 className="text-xl font-black italic uppercase mb-1 text-white">Scan to Pay</h3>
                            <p className="text-blue-400 font-bold text-sm mb-4">{selectedPlan.name} • {selectedPlan.price}</p>
                            <div className="bg-white p-3 rounded-2xl inline-block mb-4 border-4 border-slate-800"><img src={generateQR(selectedPlan.price)} alt="QR" className="w-40 h-40" /></div>
                            <input type="text" placeholder="Enter UTR (12 Digits)" value={utrInput} onChange={(e) => setUtrInput(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-center text-white font-mono text-sm mb-3 focus:border-blue-500 outline-none" />
                            <button onClick={submitUTR} disabled={saving} className="w-full bg-green-600 hover:bg-green-500 py-3 rounded-xl font-black uppercase text-xs flex items-center justify-center gap-2 text-white shadow-lg shadow-green-900/20">{saving ? <Loader2 className="animate-spin" /> : <><CheckCircle size={16} /> Verify UTR</>}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 🏪 ADD STORE MODAL */}
            {isStoreModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-[2rem] p-8 shadow-2xl relative">
                        <button onClick={() => setIsStoreModalOpen(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white bg-slate-800 p-2 rounded-full"><X size={18} /></button>

                        <h3 className="text-xl font-black italic uppercase mb-6 text-white flex items-center gap-2">
                            <Building2 className="text-orange-500" /> New Store
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase ml-2">Store Name</label>
                                <input type="text" placeholder="e.g. City Godown" value={newStoreName} onChange={(e) => setNewStoreName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white font-bold text-sm outline-none focus:border-orange-500 transition-all" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase ml-2">Location</label>
                                <input type="text" placeholder="e.g. MG Road, Jaipur" value={newStoreLocation} onChange={(e) => setNewStoreLocation(e.target.value)} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white font-bold text-sm outline-none focus:border-orange-500 transition-all" />
                            </div>

                            <button onClick={handleAddStore} disabled={saving} className="w-full bg-orange-600 hover:bg-orange-500 py-4 rounded-xl font-black uppercase text-xs flex items-center justify-center gap-2 text-white shadow-lg shadow-orange-900/20 mt-2">
                                {saving ? <Loader2 className="animate-spin" /> : "CREATE STORE"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ✏️ EDIT STORE MODAL */}
            {editingStore && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-[2rem] p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                        <button onClick={() => setEditingStore(null)} className="absolute top-4 right-4 text-slate-500 hover:text-white bg-slate-800 p-2 rounded-full"><X size={18} /></button>
                        <h3 className="text-xl font-black italic uppercase mb-6 text-white flex items-center gap-2">
                            <Edit2 className="text-blue-400" /> Edit Store
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase ml-2">Store Name</label>
                                <input type="text" value={editStoreForm.name} onChange={(e) => setEditStoreForm({ ...editStoreForm, name: e.target.value })} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white font-bold text-sm outline-none focus:border-blue-500 transition-all" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase ml-2">Location</label>
                                <input type="text" placeholder="e.g. MG Road, Jaipur" value={editStoreForm.location} onChange={(e) => setEditStoreForm({ ...editStoreForm, location: e.target.value })} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white text-sm outline-none focus:border-blue-500 transition-all" />
                            </div>
                            <div className="border-t border-slate-800 pt-4">
                                <p className="text-[10px] font-bold text-slate-500 uppercase mb-3 flex items-center gap-1"><QrCode size={10} /> Payment Settings <span className="text-slate-600 normal-case font-normal ml-1">(Optional)</span></p>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-600 uppercase ml-2">UPI ID <span className="text-green-400">(this store only)</span></label>
                                        <input type="text" placeholder="shopname@ybl" value={editStoreForm.upi_id} onChange={(e) => setEditStoreForm({ ...editStoreForm, upi_id: e.target.value })} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-green-400 font-bold text-sm outline-none focus:border-green-500 transition-all" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-600 uppercase ml-2">Razorpay Key ID <span className="text-blue-400">(this store only)</span></label>
                                        <input type="text" placeholder="rzp_live_xxxxxxxx" value={editStoreForm.razorpay_key_id} onChange={(e) => setEditStoreForm({ ...editStoreForm, razorpay_key_id: e.target.value })} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-blue-400 font-mono text-[11px] outline-none focus:border-blue-500 transition-all" />
                                    </div>
                                </div>
                            </div>
                            <button onClick={handleEditStore} disabled={editSaving} className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-black uppercase text-xs flex items-center justify-center gap-2 text-white shadow-lg shadow-blue-900/20 mt-2">
                                {editSaving ? <Loader2 className="animate-spin" size={16} /> : <><Save size={14} /> SAVE CHANGES</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
