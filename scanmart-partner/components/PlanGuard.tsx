"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Lock, Zap } from "lucide-react";

export default function PlanGuard({ children }: { children: React.ReactNode }) {
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    async function checkPlan() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserEmail(user.email || "");

      const { data } = await supabase
        .from("partners")
        .select("status, expiry_date")
        .eq("email", user.email)
        .single();

      if (data) {
        const today = new Date();
        const expiry = new Date(data.expiry_date);
        // अगर सस्पेंड है या तारीख निकल गई है, तो ब्लॉक करें
        if (data.status === "Suspended" || expiry < today) {
          setIsAllowed(false);
        } else {
          setIsAllowed(true);
        }
      } else {
        setIsAllowed(true); // अगर पार्टनर टेबल में नहीं है (जैसे कि आप खुद)
      }
    }
    checkPlan();
  }, []);

  if (isAllowed === null) return <div className="p-10 text-white">Loading Security...</div>;

  if (!isAllowed) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-slate-950/50 backdrop-blur-xl border-2 border-dashed border-red-500/20 rounded-[3rem] p-10 text-center">
        <div className="bg-red-500/10 p-6 rounded-full mb-6">
          <Lock size={60} className="text-red-500 animate-bounce" />
        </div>
        <h2 className="text-3xl font-black text-white mb-4 italic">ACCESS RESTRICTED</h2>
        <p className="text-slate-400 max-w-md mb-8">
          Your ScanMart subscription has expired. Please renew your plan to unlock 
          Inventory, Customers, and Sales analytics.
        </p>
        <button 
          onClick={() => window.location.href = "/dashboard/settings"}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2 hover:scale-105 transition-all shadow-lg shadow-blue-900/40"
        >
          <Zap size={20} fill="white" /> RENEW SUBSCRIPTION NOW
        </button>
      </div>
    );
  }

  return <>{children}</>;
}