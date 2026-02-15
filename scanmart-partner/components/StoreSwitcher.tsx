"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Store, ChevronDown, Lock, CheckCircle } from "lucide-react";

export default function StoreSwitcher() {
  const [stores, setStores] = useState<any[]>([]);
  const [currentStore, setCurrentStore] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    checkUserRoleAndStores();
  }, []);

  const checkUserRoleAndStores = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    // 1. Check Staff Role
    const { data: staffData } = await supabase
      .from("staff")
      .select("role, store_id, name")
      .eq("id", user.id)
      .maybeSingle();

    // Owner check
    const { data: ownerStore } = await supabase.from("stores").select("*").eq("owner_id", user.id).limit(1);
    const isOwner = ownerStore && ownerStore.length > 0;

    // Determine if Admin
    const adminAccess = isOwner || (staffData && staffData.role === 'admin');
    setIsAdmin(!!adminAccess);

    if (adminAccess) {
      // ✅ ADMIN: Fetch ALL Stores
      const { data: allStores } = await supabase.from("stores").select("*").order("is_main_store", { ascending: false });
      
      if (allStores) {
        setStores(allStores);
        
        // LocalStorage se active store uthao
        const savedStoreId = typeof window !== 'undefined' ? localStorage.getItem("active_store_id") : null;
        const active = allStores.find(s => s.id === savedStoreId) || allStores[0];
        
        setCurrentStore(active);
        
        // Agar naya session hai to default set karo
        if(active && active.id !== savedStoreId && typeof window !== 'undefined') {
            localStorage.setItem("active_store_id", active.id);
        }
      }

    } else {
      // 🔒 STAFF: Fetch ONLY Assigned Store
      if (staffData?.store_id) {
        const { data: myStore } = await supabase.from("stores").select("*").eq("id", staffData.store_id).single();
        if (myStore) {
            setStores([myStore]);
            setCurrentStore(myStore);
            
            // Security: Force correct store
            if (typeof window !== 'undefined' && localStorage.getItem("active_store_id") !== myStore.id) {
               localStorage.setItem("active_store_id", myStore.id);
               window.location.reload();
            }
        }
      }
    }
    setLoading(false);
  };

  const handleSwitch = (store: any) => {
    localStorage.setItem("active_store_id", store.id);
    setCurrentStore(store);
    setIsOpen(false);
    window.location.reload();
  };

  if (loading) return <div className="h-10 w-32 bg-slate-800 animate-pulse rounded-xl"></div>;

  return (
    <div className="relative z-50">
      {/* TRIGGER BUTTON */}
      <button 
        onClick={() => isAdmin && setIsOpen(!isOpen)} 
        className={`flex items-center gap-3 px-3 py-2 rounded-xl border transition-all w-full md:w-auto
          ${isAdmin 
            ? 'bg-slate-900 border-slate-700 hover:border-blue-500 cursor-pointer' 
            : 'bg-slate-950 border-slate-800 cursor-default opacity-80'
          }`}
      >
        <div className={`p-2 rounded-lg ${isAdmin ? 'bg-blue-600' : 'bg-slate-800'}`}>
           {isAdmin ? <Store size={18} className="text-white" /> : <Lock size={18} className="text-slate-500"/>}
        </div>
        
        <div className="text-left hidden md:block">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            {isAdmin ? "Switch Store" : "Your Store"}
          </p>
          <p className="text-sm font-bold text-white leading-none truncate max-w-[120px]">
            {currentStore?.name || "Select Store"}
          </p>
        </div>

        {isAdmin && <ChevronDown size={16} className={`text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}/>}
      </button>

      {/* DROPDOWN MENU */}
      {isOpen && isAdmin && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className="absolute top-full left-0 mt-2 w-60 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95">
             <div className="p-2 bg-slate-950 border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">
                Select Active Branch
             </div>
             <div className="max-h-60 overflow-y-auto">
               {stores.map((store) => (
                 <button 
                   key={store.id} 
                   onClick={() => handleSwitch(store)}
                   className={`w-full text-left p-3 text-sm font-bold flex items-center justify-between hover:bg-slate-800 transition-colors
                     ${currentStore?.id === store.id ? 'text-blue-400 bg-blue-500/10' : 'text-slate-300'}
                   `}
                 >
                    <div className="flex items-center gap-3">
                        <Store size={16} />
                        <div>
                            <p>{store.name}</p>
                            <p className="text-[9px] text-slate-500 font-normal uppercase">{store.location}</p>
                        </div>
                    </div>
                    {currentStore?.id === store.id && <CheckCircle size={14} />}
                 </button>
               ))}
             </div>
             <div className="p-2 bg-slate-950 border-t border-slate-800 text-center">
                 <a href="/dashboard/settings" className="text-[10px] text-blue-500 font-bold hover:underline">MANAGE STORES</a>
             </div>
          </div>
        </>
      )}
    </div>
  );
}