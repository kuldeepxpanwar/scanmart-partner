"use client";
import React from "react";
import { motion } from "framer-motion";
import { ScanLine, CheckCircle2, BarChart3, Users, Package, ShieldCheck } from "lucide-react";
import Link from "next/link";

export const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-[#0B0C10] pt-20">

      {/* Background Glow Effects */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/20 rounded-full blur-[100px]" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px]" />

      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">

        {/* Left Side: Text Content */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 mb-6 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-300 tracking-wider uppercase">
              Smart POS for Indian Retailers
            </span>
          </div>

          {/* FIXED: Headline matches what the product actually does */}
          <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 dark:text-white leading-tight mb-6">
            Run Your Shop{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 animate-gradient bg-300%">
              Smarter.
            </span>
          </h1>

          {/* FIXED: Description matches real product features */}
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 max-w-lg leading-relaxed">
            Billing. Inventory. Staff. Analytics — all in one dashboard.
            Built for{" "}
            <span className="text-slate-900 dark:text-white font-semibold">kirana stores, pharmacies & supermarkets</span>{" "}
            that want to grow faster.
          </p>

          {/* FIXED: CTA is honest and direct */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/login"
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
            >
              Open Your Dashboard →
            </Link>
            <a
              href="#features"
              className="px-8 py-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-white/10 transition-all flex items-center justify-center gap-2"
            >
              See Features
            </a>
          </div>

          {/* Real feature highlights replacing fake "partner" list */}
          <div className="mt-10 grid grid-cols-2 gap-3">
            {[
              "Fast Barcode Billing",
              "Inventory Management",
              "Staff Role Control",
              "Profit & GST Analytics",
            ].map((feat) => (
              <div key={feat} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
                {feat}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Right Side: App Preview Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative hidden lg:block"
        >
          {/* Floating Animation Wrapper */}
          <motion.div
            animate={{ y: [0, -20, 0] }}
            transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
            className="relative z-10 mx-auto w-[300px] h-[600px] bg-slate-900 rounded-[3rem] border-8 border-slate-800 shadow-2xl shadow-blue-500/20 overflow-hidden"
          >
            {/* Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-xl z-20"></div>

            {/* Screen Content */}
            <div className="w-full h-full bg-slate-950 flex flex-col relative">
              {/* App Header */}
              <div className="p-6 pt-12 flex justify-between items-center bg-gradient-to-b from-blue-900/20 to-transparent">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">S</div>
                {/* FIXED: Generic store name instead of "PHOENIX MALL" */}
                <div className="text-xs font-mono text-blue-400">MAIN BRANCH</div>
              </div>

              {/* Scanning Animation */}
              <div className="flex-1 flex flex-col items-center justify-center relative">
                <div className="w-48 h-48 border-2 border-blue-500/50 rounded-xl flex items-center justify-center relative">
                  <motion.div
                    animate={{ height: ["0%", "100%", "0%"] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute top-0 w-full bg-blue-500/20 border-b-2 border-blue-400"
                  ></motion.div>
                  <ScanLine className="w-12 h-12 text-blue-400" />
                </div>
                {/* FIXED: removed "Gemini Scanning..." — generic label */}
                <div className="mt-4 px-4 py-2 bg-slate-900 rounded-lg border border-slate-800 flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-xs text-slate-300">Scanning...</span>
                </div>
              </div>

              {/* Bottom Sheet */}
              <div className="p-6 bg-slate-900 rounded-t-3xl border-t border-slate-800">
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <div className="text-xs text-slate-400">Total</div>
                    <div className="text-2xl font-bold text-white">₹1,249</div>
                  </div>
                  <div className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">Paid ✓</div>
                </div>
                <div className="w-full h-12 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-white text-sm">
                  Complete Sale
                </div>
              </div>
            </div>
          </motion.div>

          {/* Floating Badge — kept */}
          <motion.div
            animate={{ y: [0, 30, 0] }}
            transition={{ repeat: Infinity, duration: 5, delay: 1 }}
            className="absolute top-20 -right-10 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 flex items-center gap-3 z-20"
          >
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <ShieldCheck className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Security</div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">Role-Based</div>
            </div>
          </motion.div>

        </motion.div>

      </div>
    </section>
  );
};