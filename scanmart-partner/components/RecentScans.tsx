"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, AlertTriangle, CheckCircle, Package } from "lucide-react";

// Fake Data Generator
const products = [
  { name: "Dairy Milk Silk", price: "₹180", type: "success" },
  { name: "Nike Air Jordan", price: "₹12,500", type: "success" },
  { name: "Coke Zero 300ml", price: "₹40", type: "success" },
  { name: "Unknown Item (Barcode Error)", price: "---", type: "warning" },
  { name: "Samsung Galaxy S24", price: "₹79,999", type: "success" },
  { name: "Lays Classic Salted", price: "₹20", type: "success" },
  { name: "Suspicious Activity (Camera)", price: "Alert", type: "danger" },
];

export const RecentScans = () => {
  const [scans, setScans] = useState<any[]>([]);

  // Har 2 second mein naya scan add karna
  useEffect(() => {
    const interval = setInterval(() => {
      const randomProduct = products[Math.floor(Math.random() * products.length)];
      const newScan = {
        id: Date.now(),
        ...randomProduct,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };

      setScans((prev) => [newScan, ...prev].slice(0, 7)); // Sirf latest 7 dikhao
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 h-full overflow-hidden flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          Live Feed
        </h3>
        <span className="text-xs text-slate-500 font-mono">REC ●</span>
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {scans.map((scan) => (
            <motion.div
              key={scan.id}
              initial={{ opacity: 0, x: -20, height: 0 }}
              animate={{ opacity: 1, x: 0, height: "auto" }}
              exit={{ opacity: 0, x: 20 }}
              className={`flex items-center justify-between p-3 rounded-xl border border-white/5 ${
                scan.type === "danger" ? "bg-red-500/10 border-red-500/50" : 
                scan.type === "warning" ? "bg-yellow-500/10 border-yellow-500/50" : 
                "bg-slate-800/50"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  scan.type === "danger" ? "bg-red-500/20 text-red-500" : 
                  scan.type === "warning" ? "bg-yellow-500/20 text-yellow-500" : 
                  "bg-blue-500/20 text-blue-500"
                }`}>
                  {scan.type === "danger" ? <AlertTriangle size={16} /> : 
                   scan.type === "warning" ? <Package size={16} /> : 
                   <ShoppingBag size={16} />}
                </div>
                <div>
                  <p className={`text-sm font-medium ${
                    scan.type === "danger" ? "text-red-400" : "text-slate-200"
                  }`}>
                    {scan.name}
                  </p>
                  <p className="text-xs text-slate-500">{scan.time}</p>
                </div>
              </div>
              
              <div className="text-right">
                <p className={`text-sm font-bold ${
                   scan.type === "danger" ? "text-red-500" : "text-white"
                }`}>{scan.price}</p>
                {scan.type === "success" && <CheckCircle size={12} className="text-green-500 ml-auto mt-1" />}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {scans.length === 0 && (
            <p className="text-slate-600 text-center text-sm py-4 animate-pulse">Waiting for scans...</p>
        )}
      </div>
    </div>
  );
};