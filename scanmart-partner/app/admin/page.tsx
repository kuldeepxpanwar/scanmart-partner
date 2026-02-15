"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { 
  ShieldCheck, Ban, CheckCircle, Trash2, Power, 
  Loader2, Mail, Lock, Clock, AlertTriangle, MapPin, 
  CreditCard, XCircle, LayoutDashboard
} from "lucide-react";

export default function SuperAdminPanel() {
  const MASTER_KEY = "KPANWAR126"; 
  const ADMIN_EMAIL = "panwarkuldeep256@gmail.com"; 

  const [step, setStep] = useState<"LOCK" | "OTP" | "DASHBOARD">("LOCK");
  const [activeTab, setActiveTab] = useState<"SHOPS" | "PAYMENTS">("SHOPS");
  
  const [partners, setPartners] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]); // Payment Requests
  const [loading, setLoading] = useState(false);
  
  const [inputKey, setInputKey] = useState("");
  const [inputOtp, setInputOtp] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (step === "DASHBOARD") {
        fetchPartners();
        fetchPaymentRequests();
    }
  }, [step, activeTab]);

  // --- 📡 FETCH DATA ---
  const fetchPartners = async () => {
    setLoading(true);
    const { data } = await supabase
        .from("stores")
        .select("*")
        .order("created_at", { ascending: false });
    
    if (data) {
        const mappedData = data.map(store => ({
            id: store.id,
            shop_name: store.name,
            owner_name: store.location || "Location N/A", 
            plan: store.subscription_plan || 'Free',
            expiry_date: store.subscription_expiry,
            status: store.status || 'Active',
            created_at: store.created_at
        }));
        setPartners(mappedData);
    }
    setLoading(false);
  };

  const fetchPaymentRequests = async () => {
      const { data } = await supabase
        .from("payment_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if(data) setRequests(data);
  };

  // --- ⚙️ ACTIONS (UPDATED APPROVAL LOGIC) ---
  const handleApprovePayment = async (req: any) => {
      if(!confirm(`Approve payment of ₹${req.amount} for ${req.shop_name}?`)) return;
      setLoading(true);

      // 1. Calculate New Expiry
      const newExpiry = new Date();
      if(req.plan_name.includes("Monthly")) newExpiry.setDate(newExpiry.getDate() + 30);
      else if(req.plan_name.includes("Yearly")) newExpiry.setFullYear(newExpiry.getFullYear() + 1);
      else newExpiry.setDate(newExpiry.getDate() + 7); // Trial

      let storeIdToUpdate = req.store_id;

      // Fallback: If store_id is missing in request (old requests), find by name
      if (!storeIdToUpdate) {
          const { data: storeByName } = await supabase.from("stores").select("id").ilike('name', req.shop_name).maybeSingle();
          if (storeByName) storeIdToUpdate = storeByName.id;
      }

      if(storeIdToUpdate) {
          // 2. Update Store Subscription using ID
          const { error } = await supabase.from("stores").update({
              subscription_plan: req.plan_name,
              subscription_expiry: newExpiry.toISOString(),
              status: 'Active'
          }).eq("id", storeIdToUpdate);

          if(!error) {
              // 3. Mark Request Approved
              await supabase.from("payment_requests").update({ status: 'approved' }).eq("id", req.id);
              alert("✅ Plan Activated Successfully!");
              fetchPaymentRequests();
              fetchPartners();
          } else {
              alert("❌ Database Error: " + error.message);
          }
      } else {
          // 🚨 Store Not Found
          alert(`⚠️ Error: Store '${req.shop_name}' not found. Please ask user to verify store name.`);
      }
      setLoading(false);
  };

  const handleRejectPayment = async (id: string) => {
      if(!confirm("Reject this request?")) return;
      await supabase.from("payment_requests").update({ status: 'rejected' }).eq("id", id);
      fetchPaymentRequests();
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "Active" ? "Suspended" : "Active";
    await supabase.from("stores").update({ status: newStatus }).eq("id", id);
    fetchPartners();
  };

  const deletePartner = async (id: string) => {
    if (confirm("🛑 Delete shop? This cannot be undone.")) {
      await supabase.from("stores").delete().eq("id", id);
      fetchPartners();
    }
  };

  // --- 🔐 AUTH HANDLERS ---
  const handleMasterKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(""); setLoading(true);
    if (inputKey !== MASTER_KEY) { setErrorMsg("❌ Wrong Master Key!"); setLoading(false); return; }
    const { error } = await supabase.auth.signInWithOtp({ email: ADMIN_EMAIL });
    if (error) setErrorMsg("Error: " + error.message); else setStep("OTP");
    setLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(""); setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ email: ADMIN_EMAIL, token: inputOtp, type: "email" });
    if (error) setErrorMsg("❌ Invalid OTP."); else setStep("DASHBOARD");
    setLoading(false);
  };

  // --- UI: LOCK & OTP ---
  if (step === "LOCK") return <LockScreen inputKey={inputKey} setInputKey={setInputKey} handleMasterKey={handleMasterKey} loading={loading} errorMsg={errorMsg}/>;
  if (step === "OTP") return <OtpScreen inputOtp={inputOtp} setInputOtp={setInputOtp} handleVerifyOtp={handleVerifyOtp} loading={loading} errorMsg={errorMsg} email={ADMIN_EMAIL}/>;

  // --- UI: DASHBOARD ---
  return (
    <div className="min-h-screen bg-[#0f172a] text-white p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-4xl font-black italic flex items-center gap-3">
              <Power className="text-purple-500" /> SUPER <span className="text-purple-500">ADMIN</span>
            </h1>
            <p className="text-slate-400 mt-2 font-medium text-sm">System Control Center</p>
          </div>
          <div className="flex gap-4">
              <div className="bg-slate-800 p-4 rounded-2xl text-center min-w-[120px] border border-slate-700">
                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Total Shops</p>
                  <p className="text-2xl font-black text-white">{partners.length}</p>
              </div>
              <div className="bg-slate-800 p-4 rounded-2xl text-center min-w-[120px] border border-slate-700">
                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Pending Req</p>
                  <p className="text-2xl font-black text-yellow-500">{requests.filter(r => r.status === 'pending').length}</p>
              </div>
          </div>
        </div>

        {/* TABS */}
        <div className="flex gap-4 mb-8 border-b border-slate-800 pb-1">
            <button onClick={() => setActiveTab("SHOPS")} className={`pb-3 px-4 text-sm font-bold uppercase tracking-widest transition-all ${activeTab === 'SHOPS' ? 'text-purple-500 border-b-2 border-purple-500' : 'text-slate-500 hover:text-white'}`}>
                <LayoutDashboard className="inline mb-1 mr-2" size={16}/> Active Stores
            </button>
            <button onClick={() => setActiveTab("PAYMENTS")} className={`pb-3 px-4 text-sm font-bold uppercase tracking-widest transition-all ${activeTab === 'PAYMENTS' ? 'text-purple-500 border-b-2 border-purple-500' : 'text-slate-500 hover:text-white'}`}>
                <CreditCard className="inline mb-1 mr-2" size={16}/> Payment Requests
            </button>
        </div>

        {/* CONTENT */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl backdrop-blur-md min-h-[400px]">
          
          {/* TAB 1: SHOPS LIST */}
          {activeTab === "SHOPS" && (
              <table className="w-full text-left">
                <thead className="bg-slate-950/80 text-slate-500 text-[10px] uppercase tracking-[0.25em] font-black border-b border-slate-800">
                  <tr><th className="p-6">Store Info</th><th className="p-6">Plan Status</th><th className="p-6">State</th><th className="p-6 text-right">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {partners.length === 0 ? <tr><td colSpan={4} className="p-20 text-center text-slate-500">No Stores Found</td></tr> : 
                   partners.map((p) => <StoreRow key={p.id} partner={p} onDelete={deletePartner} onToggle={toggleStatus} />)}
                </tbody>
              </table>
          )}

          {/* TAB 2: PAYMENT REQUESTS */}
          {activeTab === "PAYMENTS" && (
              <table className="w-full text-left">
                <thead className="bg-slate-950/80 text-slate-500 text-[10px] uppercase tracking-[0.25em] font-black border-b border-slate-800">
                  <tr><th className="p-6">Shop Name</th><th className="p-6">Plan & Amount</th><th className="p-6">UTR Number</th><th className="p-6 text-right">Approval</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {requests.length === 0 ? <tr><td colSpan={4} className="p-20 text-center text-slate-500">No Pending Requests</td></tr> : 
                   requests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-800/30">
                          <td className="p-6 font-bold text-white">{req.shop_name}</td>
                          <td className="p-6">
                              <span className="block text-sm font-bold text-blue-400">{req.plan_name}</span>
                              <span className="text-xs text-slate-400">₹{req.amount}</span>
                          </td>
                          <td className="p-6"><span className="bg-slate-950 px-3 py-1 rounded border border-slate-700 font-mono text-xs">{req.utr_number}</span></td>
                          <td className="p-6 text-right">
                              {req.status === 'pending' ? (
                                  <div className="flex justify-end gap-2">
                                      <button onClick={() => handleApprovePayment(req)} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase flex items-center gap-2 transition-all"><CheckCircle size={14}/> Approve</button>
                                      <button onClick={() => handleRejectPayment(req.id)} className="bg-red-600 hover:bg-red-500 text-white p-2 rounded-lg transition-all"><XCircle size={16}/></button>
                                  </div>
                              ) : (
                                  <span className={`text-[10px] font-black uppercase px-3 py-1 rounded border ${req.status === 'approved' ? 'text-green-500 border-green-500/20 bg-green-500/10' : 'text-red-500 border-red-500/20 bg-red-500/10'}`}>{req.status}</span>
                              )}
                          </td>
                      </tr>
                   ))}
                </tbody>
              </table>
          )}

        </div>
      </div>
    </div>
  );
}

// --- SUB COMPONENTS ---
function LockScreen({ inputKey, setInputKey, handleMasterKey, loading, errorMsg }: any) {
    return (
        <div className="h-screen bg-[#020617] flex flex-col items-center justify-center text-white p-4 font-sans">
            <motion.div initial={{opacity: 0}} animate={{opacity: 1}} className="bg-slate-900/50 p-8 rounded-3xl border border-slate-800 w-full max-w-sm text-center shadow-2xl">
                <ShieldCheck size={60} className="text-blue-600 mx-auto mb-4 animate-pulse"/>
                <h2 className="text-xl font-black uppercase tracking-widest mb-1">Admin Access</h2>
                <form onSubmit={handleMasterKey} className="space-y-4 mt-6">
                    <input type="password" placeholder="MASTER KEY" autoFocus value={inputKey} onChange={e=>setInputKey(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl py-4 text-center text-white outline-none focus:border-blue-500 font-bold tracking-widest placeholder-slate-600" />
                    {errorMsg && <p className="text-red-500 text-xs font-bold">{errorMsg}</p>}
                    <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 py-4 rounded-xl font-black transition-all active:scale-95">{loading ? <Loader2 className="animate-spin mx-auto"/> : "REQUEST OTP"}</button>
                </form>
            </motion.div>
        </div>
    );
}

function OtpScreen({ inputOtp, setInputOtp, handleVerifyOtp, loading, errorMsg, email }: any) {
    return (
        <div className="h-screen bg-[#020617] flex flex-col items-center justify-center text-white p-4 font-sans text-center">
             <motion.div initial={{opacity: 0, scale: 0.9}} animate={{opacity: 1, scale: 1}} className="bg-slate-900/50 p-8 rounded-3xl border border-slate-800 w-full max-w-sm shadow-2xl">
                <Mail size={50} className="text-purple-500 mx-auto mb-4"/>
                <h2 className="text-lg font-bold mb-4 uppercase tracking-widest">Verify Identity</h2>
                <p className="text-xs text-slate-500 mb-6">Enter code sent to {email}</p>
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <input type="text" placeholder="######" maxLength={6} value={inputOtp} onChange={e=>setInputOtp(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl py-4 text-center text-2xl font-black tracking-[1rem] outline-none focus:border-purple-500 placeholder-slate-700" />
                    {errorMsg && <p className="text-red-500 text-xs font-bold">{errorMsg}</p>}
                    <button disabled={loading} className="w-full bg-purple-600 hover:bg-purple-500 py-4 rounded-xl font-black transition-all active:scale-95">{loading ? <Loader2 className="animate-spin mx-auto"/> : "UNLOCK SYSTEM"}</button>
                </form>
             </motion.div>
        </div>
    );
}

function StoreRow({ partner, onDelete, onToggle }: any) {
    const getDaysLeft = (expiryDate: string) => {
        if (!expiryDate) return 0;
        const today = new Date();
        const expiry = new Date(expiryDate);
        const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays;
    };
    const daysLeft = getDaysLeft(partner.expiry_date);

    return (
        <tr className="hover:bg-slate-800/30 transition-all group">
            <td className="p-6">
                <p className="font-black text-white text-lg">{partner.shop_name}</p>
                <p className="text-xs text-slate-400 font-bold uppercase flex items-center gap-1"><MapPin size={10}/> {partner.owner_name}</p>
            </td>
            <td className="p-6">
                <span className="block text-xs font-black text-purple-400 uppercase mb-1">{partner.plan}</span>
                <div className={`flex items-center gap-1 text-[10px] font-bold ${daysLeft <= 0 ? 'text-red-500' : 'text-green-500'}`}>
                    <Clock size={10}/> {daysLeft <= 0 ? "EXPIRED" : `${daysLeft} Days Left`}
                </div>
            </td>
            <td className="p-6">
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${partner.status === 'Active' ? 'text-green-500 border-green-500/30' : 'text-red-500 border-red-500/30'}`}>{partner.status}</span>
            </td>
            <td className="p-6 text-right">
                <div className="flex justify-end gap-3 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button 
                        onClick={() => onToggle(partner.id, partner.status)} 
                        className={`p-2 rounded-lg transition-all border ${partner.status === 'Active' ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20'}`}
                    >
                        <Power size={16}/>
                    </button>
                    <button 
                        onClick={() => onDelete(partner.id)} 
                        className="p-2 bg-slate-800 text-slate-500 hover:bg-red-600 hover:text-white rounded-lg transition-all border border-slate-700"
                    >
                        <Trash2 size={16}/>
                    </button>
                </div>
            </td>
        </tr>
    );
}