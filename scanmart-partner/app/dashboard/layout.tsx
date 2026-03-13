"use client";
import React, { useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar";
import ErrorBoundary from "@/components/ErrorBoundary";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { applyTheme, getTheme } from "@/lib/theme";
import { Toaster } from "react-hot-toast";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [showAlert, setShowAlert] = useState(false);

  // 🔍 1. Stock Check Logic (Wahi Purana Logic)
  const checkStock = async () => {
    // 🔥 BUG FIX: Filter by shop_id so only your shop's items trigger alert
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("inventory")
      .select("name")
      .eq("shop_id", user.id) // ✅ Only THIS shop's inventory
      .eq("is_active", true)
      .lt("stock", 5); // ⚠️ Threshold: 5

    if (data && data.length > 0) {
      setLowStockItems(data);
      setShowAlert(true);
    } else {
      setShowAlert(false);
    }
  };

  useEffect(() => {
    // Apply saved theme on mount
    applyTheme(getTheme());

    checkStock();
    const subscription = supabase
      .channel('stock_alerts')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'inventory' }, () => checkStock())
      .subscribe();
    return () => { supabase.removeChannel(subscription); };
  }, []);

  // — Register Service Worker ————————————————————————————————
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        })
        .catch(() => { /* SW registration failed silently */ });
    }
  }, []);

  return (
    <div className="flex min-h-screen bg-[#020617]">
      {/* 🛡️ Sidebar Restore: Iski wajah se navigation aur layout alignment fix hogi */}
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* 🔥 Dynamic Low Stock Alert Bar: Ye top par hi rahega */}
        <AnimatePresence>
          {showAlert && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-red-600 text-white px-6 py-3 flex items-center justify-between shadow-2xl z-50"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle size={20} className="animate-bounce" />
                <span className="text-xs md:text-sm font-black tracking-wide uppercase">
                  {lowStockItems.length === 1
                    ? `STOCK ALERT: ${lowStockItems[0].name} is running critically low!`
                    : `CRITICAL ALERT: ${lowStockItems.length} items are running out of stock!`}
                </span>
              </div>
              <button onClick={() => setShowAlert(false)} className="hover:bg-white/20 p-1 rounded-full transition-colors">
                <X size={18} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 📊 Main Content Area: Is container ki wajah se Stickers aur Analytics sahi dikhenge */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </div>
      </main>
      <Toaster position="bottom-right" toastOptions={{ style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid #334155', fontSize: '13px' }, success: { iconTheme: { primary: '#22c55e', secondary: '#f1f5f9' } }, error: { iconTheme: { primary: '#ef4444', secondary: '#f1f5f9' } } }} />
    </div>
  );
}