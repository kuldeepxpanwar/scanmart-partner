"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Save, Store, FileText, AlertTriangle, Loader2, 
  LogOut, Zap, Crown, Rocket, Star, X, CheckCircle,
  Wifi, Printer, ChevronDown, ChevronRight, Lock, 
  MapPin, Plus, Trash2, Building2, QrCode
} from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion"; 

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // --- 🏪 STORE STATES (NEW) ---
  const [stores, setStores] = useState<any[]>([]);
  const [newStoreName, setNewStoreName] = useState("");
  const [newStoreLocation, setNewStoreLocation] = useState("");
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);

  // --- 🔐 SECURITY STATES ---
  const [isLocked, setIsLocked] = useState(true);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");

  // --- UI States ---
  const [showQRModal, setShowQRModal] = useState(false);
  const [expandSubs, setExpandSubs] = useState(false); 
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [utrInput, setUtrInput] = useState("");

  // --- Hardware States ---
  const [isOnline, setIsOnline] = useState(true);
  const [printerType, setPrinterType] = useState("browser");
  const [printerIP, setPrinterIP] = useState("");

  // 🔥 UPDATED STATE: Added upi_id
  const [settings, setSettings] = useState({
    shop_name: "", shop_address: "", shop_phone: "", gstin: "", invoice_footer: "",
    upi_id: "" 
  });

  const MY_WHATSAPP = "9358752147"; 
  const MY_UPI_ID = "panwarkuldeep256-2@oksbi"; 

  const subPlans = [
    { name: "7-Days Trial", price: "Free", duration: "One Time", icon: <Rocket className="text-blue-400" size={20}/>, desc: "Test features", color: "border-blue-500/30" },
    { name: "Monthly", price: "₹399", duration: "1 Month", icon: <Zap className="text-purple-400" size={20}/>, desc: "Starter Plan", color: "border-purple-500/30" },
    { name: "Half Yearly", price: "₹1,999", duration: "6 Months", icon: <Star className="text-indigo-400" size={20}/>, desc: "Save ₹400", popular: true, color: "border-indigo-500" },
    { name: "Annual Pro", price: "₹2,999", duration: "1 Year", icon: <Crown className="text-yellow-500" size={20}/>, desc: "Best Value", color: "border-yellow-500" },
  ];

  useEffect(() => { 
    fetchData(); 
    if (typeof window !== 'undefined') {
        setIsOnline(navigator.onLine);
        window.addEventListener('online', () => setIsOnline(true));
        window.addEventListener('offline', () => setIsOnline(false));
        const savedPrinter = localStorage.getItem("printerType");
        const savedIP = localStorage.getItem("printerIP");
        if (savedPrinter) setPrinterType(savedPrinter);
        if (savedIP) setPrinterIP(savedIP);
    }
    return () => {
        if (typeof window !== 'undefined') {
            window.removeEventListener('online', () => setIsOnline(true));
            window.removeEventListener('offline', () => setIsOnline(false));
        }
    };
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
            upi_id: settingData.upi_id || "" 
        });
    }

    // 2. Fetch Stores
    const { data: storesData } = await supabase.from("stores").select("*").order("is_main_store", { ascending: false });
    if (storesData) setStores(storesData);

    setLoading(false);
  };

  const handlePinSubmit = async () => {
      const { data } = await supabase.from("staff").select("*").eq("role", "admin").eq("pin_code", pin).maybeSingle();
      if (data) { setIsLocked(false); setPinError(""); } 
      else { setPinError("❌ Invalid Admin PIN"); setPin(""); }
  };

  const handleSave = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
        const { error } = await supabase
            .from("store_settings")
            .update(settings) 
            .eq("id", user.id);

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
      if(!newStoreName) return alert("Store Name is required");
      setSaving(true);
      const { error } = await supabase.from("stores").insert([{
          name: newStoreName,
          location: newStoreLocation,
          is_main_store: false
      }]);

      if(error) alert("Error adding store: " + error.message);
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
      if(isMain) return alert("❌ Cannot delete Main Branch!");
      if(!confirm("Are you sure? This will delete all inventory linked to this store.")) return;
      
      const { error } = await supabase.from("stores").delete().eq("id", id);
      if(error) alert(error.message);
      else fetchData();
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
  
  const generateQR = (price: string) => `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=${MY_UPI_ID}&pn=ScanMart&am=${price.replace("₹","").replace(",","")}&cu=INR`;

  // --- 🔒 LOCK SCREEN ---
  if (isLocked) {
      return (
          <div className="h-screen bg-[#020617] flex items-center justify-center text-white p-4">
              <div className="bg-slate-900 p-8 rounded-[2rem] w-full max-w-sm border border-slate-800 shadow-2xl text-center">
                  <div className="bg-red-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20"><Lock size={32} className="text-red-500" /></div>
                  <h2 className="text-xl font-black uppercase tracking-wider mb-2">Restricted Area</h2>
                  <p className="text-slate-500 text-xs mb-6 uppercase font-bold tracking-widest">Only Admin can access settings</p>
                  <div className="flex justify-center gap-2 mb-6">{[0, 1, 2, 3].map((i) => (<div key={i} className={`w-3 h-3 rounded-full ${pin.length > i ? "bg-red-500" : "bg-slate-800"}`} />))}</div>
                  <input type="password" autoFocus maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-center text-2xl font-black tracking-[1rem] outline-none focus:border-red-500 transition-all mb-4"/>
                  {pinError && <p className="text-red-500 text-xs font-bold mb-4 animate-pulse">{pinError}</p>}
                  <button onClick={handlePinSubmit} className="w-full bg-red-600 hover:bg-red-500 py-4 rounded-2xl font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-red-900/20">Unlock Settings</button>
              </div>
          </div>
      );
  }

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={32}/></div>;

  return (
    <div className="p-4 md:p-8 bg-[#020617] min-h-screen text-white font-sans pb-32">
      
      {/* 🟢 TOP HEADER */}
      <div className="max-w-4xl mx-auto mb-8 flex justify-between items-center sticky top-0 z-40 bg-[#020617]/80 backdrop-blur-md py-4 border-b border-slate-800/50">
        <div>
            <h1 className="text-2xl md:text-3xl font-black italic tracking-tighter uppercase">Settings</h1>
            <p className="text-slate-500 text-[10px] font-bold tracking-widest uppercase">Manage Store & System</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-black text-xs md:text-sm shadow-lg shadow-blue-900/20 flex items-center gap-2 transition-all active:scale-95">
            {saving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} <span className="hidden md:inline">SAVE CHANGES</span>
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
                    <Plus size={14}/> Add New
                </button>
            </div>

            <div className="grid gap-3">
                {stores.map(store => (
                    <div key={store.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-lg ${store.is_main_store ? 'bg-orange-500/20 text-orange-500' : 'bg-slate-800 text-slate-400'}`}>
                                <Store size={20}/>
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                                    {store.name} 
                                    {store.is_main_store && <span className="bg-orange-500 text-black px-2 py-0.5 rounded text-[8px] font-black uppercase">Main</span>}
                                </h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1">
                                    <MapPin size={10}/> {store.location || "No Location"}
                                </p>
                            </div>
                        </div>
                        {!store.is_main_store && (
                            <button onClick={() => handleDeleteStore(store.id, store.is_main_store)} className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all">
                                <Trash2 size={16}/>
                            </button>
                        )}
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
                                    <ChevronRight size={16} className="text-slate-600 group-hover:text-white transition-colors"/>
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
                <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase ml-2">Shop Name</label><input type="text" value={settings.shop_name} onChange={(e)=>setSettings({...settings, shop_name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white font-bold text-sm outline-none focus:border-blue-500 transition-all" /></div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase ml-2">Phone</label><input type="text" value={settings.shop_phone} onChange={(e)=>setSettings({...settings, shop_phone: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white text-sm outline-none focus:border-blue-500 transition-all" /></div>
                    <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase ml-2">GSTIN</label><input type="text" value={settings.gstin} onChange={(e)=>setSettings({...settings, gstin: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white text-sm font-mono uppercase outline-none focus:border-blue-500 transition-all" /></div>
                </div>

                {/* 🔥 UPI ID FIELD */}
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-2 flex items-center gap-1">
                        <QrCode size={12}/> Your UPI ID (For Receiving Payments)
                    </label>
                    <input 
                        type="text" 
                        placeholder="e.g. shopname@okhdfcbank" 
                        value={settings.upi_id} 
                        onChange={(e)=>setSettings({...settings, upi_id: e.target.value})} 
                        className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white font-bold text-sm outline-none focus:border-green-500 transition-all text-green-400" 
                    />
                    <p className="text-[9px] text-slate-600 ml-2">Customers will scan QR linked to this ID.</p>
                </div>

                <div className="space-y-1"><label className="text-[10px] font-bold text-slate-500 uppercase ml-2">Address</label><textarea rows={2} value={settings.shop_address} onChange={(e)=>setSettings({...settings, shop_address: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white text-sm outline-none focus:border-blue-500 transition-all resize-none" /></div>
            </div>
        </section>

        {/* 3️⃣ BILL FOOTER */}
        <section className="bg-slate-900/40 border border-slate-800 p-6 md:p-8 rounded-[2rem]">
            <h2 className="text-sm font-black text-green-400 flex items-center gap-2 mb-6 uppercase tracking-widest"><FileText size={18} /> Invoice Footer</h2>
            <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-2">Bottom Message</label>
                <input type="text" value={settings.invoice_footer} onChange={(e)=>setSettings({...settings, invoice_footer: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white text-sm outline-none focus:border-green-500 transition-all" placeholder="Thank you for shopping!" />
            </div>
        </section>

        {/* 4️⃣ HARDWARE CONTROL */}
        <section className="bg-slate-900/40 border border-slate-800 p-6 md:p-8 rounded-[2rem]">
              <h2 className="text-sm font-black text-purple-400 flex items-center gap-2 mb-6 uppercase tracking-widest"><Wifi size={18} /> Hardware Control</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
                    <div><p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Network Status</p><div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div><span className={`text-xs font-black uppercase ${isOnline ? 'text-green-500' : 'text-red-500'}`}>{isOnline ? 'Online' : 'Offline'}</span></div></div><Wifi size={20} className="text-slate-700"/>
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

        {/* 5️⃣ DANGER ZONE */}
        <section className="border border-red-500/10 bg-red-500/5 p-6 rounded-[2rem]">
            <h2 className="text-xs font-black text-red-500 uppercase tracking-widest mb-4 flex items-center gap-2"><AlertTriangle size={14}/> Danger Zone</h2>
            <button onClick={() => supabase.auth.signOut().then(() => router.push("/login"))} className="w-full bg-slate-950 border border-slate-800 hover:border-red-500/50 text-slate-400 hover:text-red-500 py-4 rounded-xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all"><LogOut size={16} /> Sign Out Partner</button>
        </section>

      </div>

      {/* 💳 QR MODAL */}
      {showQRModal && selectedPlan && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl relative">
             <button onClick={() => setShowQRModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white bg-slate-800 p-2 rounded-full"><X size={18}/></button>
             <div className="text-center">
                <h3 className="text-xl font-black italic uppercase mb-1 text-white">Scan to Pay</h3>
                <p className="text-blue-400 font-bold text-sm mb-4">{selectedPlan.name} • {selectedPlan.price}</p>
                <div className="bg-white p-3 rounded-2xl inline-block mb-4 border-4 border-slate-800"><img src={generateQR(selectedPlan.price)} alt="QR" className="w-40 h-40" /></div>
                <input type="text" placeholder="Enter UTR (12 Digits)" value={utrInput} onChange={(e) => setUtrInput(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-center text-white font-mono text-sm mb-3 focus:border-blue-500 outline-none"/>
                <button onClick={submitUTR} disabled={saving} className="w-full bg-green-600 hover:bg-green-500 py-3 rounded-xl font-black uppercase text-xs flex items-center justify-center gap-2 text-white shadow-lg shadow-green-900/20">{saving ? <Loader2 className="animate-spin"/> : <><CheckCircle size={16}/> Verify UTR</>}</button>
             </div>
          </div>
        </div>
      )}

      {/* 🏪 ADD STORE MODAL */}
      {isStoreModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-[2rem] p-8 shadow-2xl relative">
             <button onClick={() => setIsStoreModalOpen(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white bg-slate-800 p-2 rounded-full"><X size={18}/></button>
             
             <h3 className="text-xl font-black italic uppercase mb-6 text-white flex items-center gap-2">
                <Building2 className="text-orange-500"/> New Store
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
                    {saving ? <Loader2 className="animate-spin"/> : "CREATE STORE"}
                 </button>
             </div>
          </div>
        </div>
      )}

    </div>
  );
}