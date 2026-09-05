"use client";
import React from "react";
import { motion } from "framer-motion";
import { Receipt, BarChart3, Users, Package, ShieldCheck, Store } from "lucide-react";

// FIXED: Replaced aspirational/fake AI features with the app's REAL shipped features
const features = [
  {
    title: "Lightning-Fast Billing",
    description: "Barcode scan → item added → sale complete. Process a full cart in under 30 seconds.",
    icon: <Receipt className="w-6 h-6 text-yellow-400" />,
    className: "md:col-span-2",
    bg: "bg-gradient-to-br from-slate-900 to-slate-800",
  },
  {
    title: "Smart Inventory Control",
    description: "Track stock levels in real-time. Get low-stock alerts before you run out.",
    icon: <Package className="w-6 h-6 text-blue-400" />,
    className: "md:col-span-1",
    bg: "bg-slate-900",
  },
  {
    title: "Role-Based Staff Access",
    description: "Admin, Manager, Staff — each role sees only what they need. PIN-protected.",
    icon: <Users className="w-6 h-6 text-purple-400" />,
    className: "md:col-span-1",
    bg: "bg-slate-900",
  },
  {
    title: "Profit & GST Analytics",
    description: "Auto-calculate net profit, GST collected, and daily revenue — no accountant needed.",
    icon: <BarChart3 className="w-6 h-6 text-green-400" />,
    className: "md:col-span-2",
    bg: "bg-gradient-to-br from-blue-900/50 to-slate-900",
  },
  {
    title: "Multi-Store Management",
    description: "Switch between branches instantly. One login, all your stores.",
    icon: <Store className="w-6 h-6 text-cyan-400" />,
    className: "md:col-span-1",
    bg: "bg-slate-900",
  },
  {
    title: "Customer Records",
    description: "Track purchase history, total spent, and send promotions to your loyal buyers.",
    icon: <ShieldCheck className="w-6 h-6 text-rose-400" />,
    className: "md:col-span-2",
    bg: "bg-gradient-to-br from-slate-900 to-rose-900/20",
  },
];

export const Features = () => {
  return (
    <section id="features" className="py-24 bg-slate-50 dark:bg-[#0B0C10]">
      <div className="max-w-7xl mx-auto px-6">

        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4"
          >
            Everything your pharmacy <span className="text-blue-600">needs.</span>
          </motion.h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto text-lg">
            Real features for medical store billing, batch tracking, and compliance — shipped and working.
          </p>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              whileHover={{ y: -5 }}
              className={`relative overflow-hidden rounded-3xl p-8 ${item.bg} border border-white/10 shadow-2xl ${item.className}`}
            >
              {/* Background Glow */}
              <div className="absolute top-0 right-0 -mr-10 -mt-10 w-32 h-32 bg-white/5 rounded-full blur-3xl"></div>

              <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="bg-white/10 w-fit p-3 rounded-xl mb-6 backdrop-blur-md border border-white/10">
                  {item.icon}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-slate-400 leading-relaxed">{item.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
};