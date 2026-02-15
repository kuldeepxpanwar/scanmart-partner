"use client";
import React, { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Users, Plus, Trash2, Key, Phone, 
  Loader2, UserCheck, X, Lock, Crown, ShieldAlert, Store
} from "lucide-react";

export default function StaffPage() {
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true); 
  const [listLoading, setListLoading] = useState(false); 
  const [isAddOpen, setIsAddOpen] = useState(false);
  
  // 🔥 Active Store State (New)
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null);

  // --- 🔐 SECURITY STATES ---
  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string>(""); 
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");

  // Auto-Lock Ref
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Forms
  const [newStaff, setNewStaff] = useState({ name: "", phone: "", role: "staff", pin_code: "" });
  const [ownerDetails, setOwnerDetails] = useState({ name: "", phone: "", pin_code: "" });

  // --- 🚀 INITIAL SYSTEM CHECK ---
  useEffect(() => {
    checkSystemStatus();
    
    // 🔥 Load Active Store
    const storedId = typeof window !== 'undefined' ? localStorage.getItem("active_store_id") : null;
    if (storedId) {
        setActiveStoreId(storedId);
    } else {
        fetchFirstStore();
    }
  }, []);

  // --- 🔄 RE-FETCH ON STORE SWITCH ---
  useEffect(() => {
      if(activeStoreId && !isLocked) {
          fetchStaff();
      }
  }, [activeStoreId]);

  const fetchFirstStore = async () => {
      const { data } = await supabase.from("stores").select("id").limit(1);
      if(data && data.length > 0) {
          setActiveStoreId(data[0].id);
          localStorage.setItem("active_store_id", data[0].id);
      }
  };

  // --- ⏱️ AUTO-LOCK LOGIC (1 Minute) ---
  useEffect(() => {
    if (!isLocked && !isFirstTimeSetup) {
      const resetTimer = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          setIsLocked(true); 
          setCurrentUserRole(""); 
          setPin(""); 
          setIsAddOpen(false); 
        }, 60000); 
      };

      window.addEventListener("mousemove", resetTimer);
      window.addEventListener("keypress", resetTimer);
      window.addEventListener("click", resetTimer);
      window.addEventListener("scroll", resetTimer);

      resetTimer(); 

      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        window.removeEventListener("mousemove", resetTimer);
        window.removeEventListener("keypress", resetTimer);
        window.removeEventListener("click", resetTimer);
        window.removeEventListener("scroll", resetTimer);
      };
    }
  }, [isLocked, isFirstTimeSetup]);

  const checkSystemStatus = async () => {
    setLoading(true);
    const { count, error } = await supabase
      .from("staff")
      .select("*", { count: 'exact', head: true })
      .eq("role", "admin")
      .eq("is_active", true);

    if (error) {
      console.error("System Check Error:", error);
      setIsLocked(true);
    } else {
      if (count === 0) {
        setIsFirstTimeSetup(true);
        setIsLocked(false);
      } else {
        setIsFirstTimeSetup(false);
        setIsLocked(true);
      }
    }
    setLoading(false);
  };

  // --- 🔓 UNLOCK FUNCTION (Admin + Manager) ---
  const handleUnlock = async () => {
    if (pin.length !== 4) return setPinError("PIN must be 4 digits");
    
    setPinError("");
    
    const { data } = await supabase
      .from("staff")
      .select("*")
      .in("role", ["admin", "manager"]) 
      .eq("pin_code", pin)
      .eq("is_active", true)
      .maybeSingle();

    if (data) {
      setIsLocked(false);
      setCurrentUserRole(data.role); 
      fetchStaff();
    } else {
      setPinError("❌ Access Denied: Invalid Admin/Manager PIN");
      setPin("");
    }
  };

  // --- 👑 CREATE OWNER ---
  const handleOwnerSetup = async () => {
    if (!ownerDetails.name || !ownerDetails.phone || ownerDetails.pin_code.length !== 4) {
      return alert("Please fill all details correctly.");
    }

    // Owner gets assigned to the first available store or creates one implicitly
    // Ideally, store creation happens next, so we leave store_id null initially or trigger DB trigger
    const { error } = await supabase.from("staff").insert([{
      name: ownerDetails.name,
      phone: ownerDetails.phone,
      role: "admin",
      pin_code: ownerDetails.pin_code,
      is_active: true
    }]);

    if (error) alert("Setup Failed: " + error.message);
    else {
      alert("✅ Owner Account Created!");
      setIsFirstTimeSetup(false);
      setIsLocked(false);
      setCurrentUserRole("admin");
      fetchStaff();
    }
  };

  // --- 📋 DATA FETCHING (Filtered by Store) ---
  const fetchStaff = async () => {
    if (!activeStoreId) return;
    setListLoading(true);
    
    // 🔥 FILTER: Only fetch staff for the Active Store
    const { data } = await supabase
      .from("staff")
      .select("*")
      .eq("store_id", activeStoreId) // Filter logic added
      .eq("is_active", true)
      .order("role", { ascending: true }); // Admin first, then Manager, then Staff

    setStaffList(data || []);
    setListLoading(false);
  };

  // --- ➕ ADD STAFF (With Permissions & Store Link) ---
  const handleAddStaff = async () => {
    if (!newStaff.name || !newStaff.phone || !newStaff.pin_code) return alert("Please fill all fields");
    if (newStaff.pin_code.length !== 4) return alert("PIN must be 4 digits");
    if (!activeStoreId) return alert("No Active Store Selected!");

    if (currentUserRole === 'manager' && (newStaff.role === 'admin' || newStaff.role === 'manager')) {
      return alert("❌ Permission Denied: Managers can only create Staff accounts.");
    }

    const { error } = await supabase.from("staff").insert([{
      name: newStaff.name,
      phone: newStaff.phone,
      role: newStaff.role,
      pin_code: newStaff.pin_code,
      store_id: activeStoreId, // 🔥 Linking new staff to Active Store
      is_active: true
    }]);

    if (error) alert("Error: " + error.message);
    else {
      alert("✅ Member Added Successfully!");
      setIsAddOpen(false);
      setNewStaff({ name: "", phone: "", role: "staff", pin_code: "" });
      fetchStaff();
    }
  };

  // --- 🛡️ DELETE STAFF (With Permissions) ---
  const handleDeleteStaff = async (staffMember: any) => {
    if (staffMember.role === 'admin') {
      return alert("❌ SECURITY ALERT: Cannot remove an Admin account.");
    }

    if (currentUserRole === 'manager' && staffMember.role === 'manager') {
      return alert("❌ Permission Denied: Managers cannot remove other Managers.");
    }

    if (!confirm(`Are you sure you want to remove ${staffMember.name}?`)) return;

    const { error } = await supabase
      .from("staff")
      .update({ is_active: false }) 
      .eq("id", staffMember.id);

    if (error) alert("Error: " + error.message);
    else fetchStaff();
  };

  // --- 🔄 LOADING ---
  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={40}/></div>;

  // --- 🥚 FIRST TIME SETUP ---
  if (isFirstTimeSetup) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center text-white p-4">
        <div className="bg-slate-900 p-8 rounded-[2.5rem] w-full max-w-md border border-blue-500/30 shadow-2xl text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-purple-500"></div>
          <div className="bg-blue-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border border-blue-500/20"><Crown size={40} className="text-blue-400" /></div>
          <h2 className="text-3xl font-black uppercase italic mb-2">Welcome Owner!</h2>
          <p className="text-slate-400 text-sm mb-8">Setup your main Admin account to get started.</p>
          <div className="space-y-4 text-left">
            <div><label className="text-[10px] font-bold uppercase text-slate-500 ml-2">Your Name</label><input type="text" placeholder="e.g. Kuldeep Panwar" className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white font-bold outline-none focus:border-blue-500 transition-all" value={ownerDetails.name} onChange={(e) => setOwnerDetails({...ownerDetails, name: e.target.value})}/></div>
            <div><label className="text-[10px] font-bold uppercase text-slate-500 ml-2">Phone</label><input type="number" placeholder="Mobile Number" className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white font-bold outline-none focus:border-blue-500 transition-all" value={ownerDetails.phone} onChange={(e) => setOwnerDetails({...ownerDetails, phone: e.target.value})}/></div>
            
            {/* 🔥 PASSWORD FIELD FOR FIRST TIME PIN */}
            <div><label className="text-[10px] font-bold uppercase text-slate-500 ml-2">Create Master PIN</label><input type="password" inputMode="numeric" maxLength={4} placeholder="XXXX" className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white font-bold text-center tracking-[1rem] outline-none focus:border-blue-500 transition-all" value={ownerDetails.pin_code} onChange={(e) => setOwnerDetails({...ownerDetails, pin_code: e.target.value.replace(/\D/g, '')})}/></div>
          </div>
          <button onClick={handleOwnerSetup} className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-2xl font-black uppercase tracking-widest mt-8 shadow-lg shadow-blue-900/20 active:scale-95 transition-all">Start My Shop</button>
        </div>
      </div>
    );
  }

  // --- 🔒 LOCK SCREEN ---
  if (isLocked) {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#020617] flex items-center justify-center text-white p-4 backdrop-blur-sm">
        <div className="bg-slate-900 p-8 rounded-[2rem] w-full max-w-sm border border-slate-800 shadow-2xl text-center relative z-[10000]">
          <div className="bg-red-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20"><Lock size={32} className="text-red-500" /></div>
          <h2 className="text-xl font-black uppercase tracking-wider mb-2">Restricted Area</h2>
          <p className="text-slate-500 text-xs mb-6 uppercase font-bold tracking-widest">Enter Admin or Manager PIN</p>
          <div className="flex justify-center gap-3 mb-6">{[0, 1, 2, 3].map((i) => (<div key={i} className={`w-3 h-3 rounded-full transition-all duration-200 ${pin.length > i ? "bg-red-500 scale-125 shadow-lg shadow-red-500/50" : "bg-slate-800"}`} />))}</div>
          
          <input 
            type="password" 
            inputMode="numeric"
            autoFocus 
            maxLength={4} 
            value={pin} 
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} 
            className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-center text-2xl font-black tracking-[1rem] outline-none focus:border-red-500 transition-all mb-4 text-white placeholder-slate-800 relative z-[10001]" 
            placeholder="****" 
          />
          
          {pinError && <p className="text-red-500 text-xs font-bold mb-4 animate-pulse bg-red-500/10 py-2 rounded-lg border border-red-500/20">{pinError}</p>}
          <button onClick={handleUnlock} className="w-full bg-red-600 hover:bg-red-500 py-4 rounded-2xl font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-red-900/20">Verify & Access</button>
        </div>
      </div>
    );
  }

  // --- ✅ MAIN DASHBOARD ---
  return (
    <div className="p-4 md:p-8 bg-[#020617] min-h-screen text-white pb-32">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black italic uppercase flex items-center gap-2"><Users className="text-blue-500" /> Team <span className="text-blue-500">Manager</span></h1>
          <div className="flex flex-col gap-1 mt-1">
             <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full animate-pulse ${currentUserRole === 'admin' ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{currentUserRole === 'admin' ? 'Master Admin' : 'Manager'} Access Granted</p>
             </div>
             {/* 🔥 Store Indicator */}
             <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase">
                <Store size={12} className="text-blue-500"/>
                Viewing Store ID: {activeStoreId ? activeStoreId.slice(0,8) : 'Loading...'}
             </div>
          </div>
        </div>
        <button onClick={() => setIsAddOpen(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-xl flex items-center gap-2 font-bold uppercase shadow-lg shadow-blue-900/20 active:scale-95 transition-all"><Plus size={18} /> Add Staff</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {listLoading ? (
          <div className="col-span-full py-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-500" size={32}/></div>
        ) : staffList.length === 0 ? (
          <div className="col-span-full py-20 text-center text-slate-500 font-bold uppercase">No Staff Found in this Store. Add someone!</div>
        ) : (
          staffList.map((staff) => (
            <div key={staff.id} className={`bg-slate-900 border p-5 rounded-[2rem] relative group transition-all ${staff.role === 'admin' ? 'border-yellow-500/30 shadow-lg shadow-yellow-500/10' : 'border-slate-800 hover:border-blue-500/30'}`}>
              <div className={`absolute top-0 right-0 px-3 py-1 rounded-bl-2xl text-[10px] font-black uppercase tracking-wider ${staff.role === 'manager' ? 'bg-purple-600 text-white' : staff.role === 'admin' ? 'bg-yellow-500 text-black' : 'bg-slate-800 text-slate-400'}`}>{staff.role}</div>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center text-2xl font-black text-slate-500">{staff.name.charAt(0)}</div>
                <div><h3 className="font-bold text-white text-lg">{staff.name}</h3><p className="text-slate-500 text-xs flex items-center gap-1 font-medium"><Phone size={10} /> {staff.phone}</p></div>
              </div>
              <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/50 flex justify-between items-center mb-4">
                <div className="flex items-center gap-2"><div className="bg-slate-800 p-1.5 rounded-lg text-slate-400"><Key size={14}/></div><div><p className="text-[9px] text-slate-500 uppercase font-bold">Access PIN</p><p className="text-white font-mono font-bold tracking-widest">****</p></div></div>
                <div className="px-2 py-1 bg-green-500/10 text-green-500 rounded text-[10px] font-bold uppercase flex items-center gap-1"><UserCheck size={10}/> Active</div>
              </div>
              
              <button 
                onClick={() => handleDeleteStaff(staff)}
                className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-xs uppercase transition-all ${staff.role === 'admin' ? 'bg-slate-800/50 text-slate-600 cursor-not-allowed' : 'bg-slate-800 hover:bg-red-600 hover:text-white text-slate-400'}`}
              >
                {staff.role === 'admin' ? <><ShieldAlert size={14} /> Protected</> : <><Trash2 size={14} /> Remove Access</>}
              </button>
            </div>
          ))
        )}
      </div>

      {/* ADD STAFF MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] w-full max-w-md shadow-2xl relative">
            <button onClick={() => setIsAddOpen(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white bg-slate-800 p-2 rounded-full transition-all"><X size={18}/></button>
            <h2 className="text-2xl font-black italic uppercase mb-1 text-white">Add <span className="text-blue-500">Member</span></h2>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-6">Create new staff for Current Store</p>
            <div className="space-y-4">
              <div><label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Full Name</label><input type="text" placeholder="e.g. Rahul Sharma" className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white font-bold outline-none focus:border-blue-500 transition-all" value={newStaff.name} onChange={(e) => setNewStaff({...newStaff, name: e.target.value})}/></div>
              <div><label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Phone Number</label><input type="number" placeholder="e.g. 9876543210" className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white font-bold outline-none focus:border-blue-500 transition-all" value={newStaff.phone} onChange={(e) => setNewStaff({...newStaff, phone: e.target.value})}/></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Role</label>
                    <select 
                        className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white font-bold outline-none focus:border-blue-500 transition-all" 
                        value={newStaff.role} 
                        onChange={(e) => setNewStaff({...newStaff, role: e.target.value})}
                    >
                        <option value="staff">Staff</option>
                        {currentUserRole === 'admin' && (
                            <>
                                <option value="manager">Manager</option>
                                <option value="admin">Admin</option>
                            </>
                        )}
                    </select>
                </div>
                {/* 🔥 PASSWORD FIELD FOR ADDING STAFF */}
                <div><label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Set PIN</label><input type="password" inputMode="numeric" maxLength={4} placeholder="1234" className="w-full bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white font-bold outline-none focus:border-blue-500 transition-all text-center tracking-widest" value={newStaff.pin_code} onChange={(e) => setNewStaff({...newStaff, pin_code: e.target.value.replace(/\D/g, '')})}/></div>
              </div>
              <button onClick={handleAddStaff} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest mt-2 shadow-lg shadow-blue-900/20 active:scale-95 transition-all">Create Account</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}