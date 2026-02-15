"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { AlertTriangle, X, Zap } from "lucide-react";

export default function SubscriptionHeader() {
  const [status, setStatus] = useState<{ days: number; plan: string } | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    async function checkSubscription() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase.from("partners").select("expiry_date, plan").eq("email", user.email).single();
      
      if (data) {
        const diff = new Date(data.expiry_date).getTime() - new Date().getTime();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        setStatus({ days, plan: data.plan });

        // Logic: 
        // 1. Agar expired hai (days <= 0) toh Hamesha dikhao.
        // 2. Agar 3 din bache hain, toh check karo ki kya aaj dikha chuke hain?
        if (days <= 0) {
          setIsVisible(true);
        } else if (days <= 3) {
          const lastShown = localStorage.getItem("expiry_alert_shown");
          const today = new Date().toDateString();
          if (lastShown !== today) {
            setIsVisible(true);
          }
        }
      }
    }
    checkSubscription();
  }, []);

  const dismissAlert = () => {
    setIsVisible(false);
    localStorage.setItem("expiry_alert_shown", new Date().toDateString());
  };

  if (!isVisible || !status) return null;

  const isExpired = status.days <= 0;

  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-2xl animate-in fade-in zoom-in duration-300`}>
      <div className={`relative overflow-hidden rounded-3xl p-6 shadow-2xl border-2 ${isExpired ? 'bg-red-950 border-red-500' : 'bg-slate-900 border-yellow-500/50'}`}>
        
        {/* Background Glow */}
        <div className={`absolute top-0 right-0 w-32 h-32 blur-[80px] -z-10 ${isExpired ? 'bg-red-600/30' : 'bg-yellow-600/20'}`}></div>

        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className={`p-4 rounded-2xl ${isExpired ? 'bg-red-500' : 'bg-yellow-500'}`}>
              <AlertTriangle size={24} className="text-black" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white italic">
                {isExpired ? "SUBSCRIPTION EXPIRED" : "ACTION REQUIRED"}
              </h3>
              <p className="text-slate-400 text-sm font-medium">
                {isExpired 
                  ? "Your access to premium features has been locked." 
                  : `Your ${status.plan} plan ends in ${status.days} days. Renew now to avoid interruption.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => window.location.href = "/dashboard/settings"}
              className={`px-6 py-3 rounded-xl font-black text-xs transition-all hover:scale-105 ${isExpired ? 'bg-red-500 text-white' : 'bg-yellow-500 text-black'}`}
            >
              RENEW NOW
            </button>
            
            {/* Dismiss button only if not expired */}
            {!isExpired && (
              <button onClick={dismissAlert} className="p-2 hover:bg-slate-800 rounded-lg text-slate-500">
                <X size={20} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}