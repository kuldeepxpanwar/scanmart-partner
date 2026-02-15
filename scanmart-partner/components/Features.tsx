"use client";
import React from "react";
import { motion } from "framer-motion";
import { ShieldCheck, BarChart3, Smartphone, Zap, MapPin, Lock } from "lucide-react";

const features = [
  {
    title: "Zero-Typing Onboarding",
    description: "Upload a shelf photo. Gemini AI detects items & creates inventory instantly.",
    icon: <Zap className="w-6 h-6 text-yellow-400" />,
    className: "md:col-span-2", // Bada card
    bg: "bg-gradient-to-br from-slate-900 to-slate-800",
  },
  {
    title: "Fraud Guard",
    description: "AI analyzes scan speed. Trusted users get Green Pass, risky ones get audit.",
    icon: <ShieldCheck className="w-6 h-6 text-green-400" />,
    className: "md:col-span-1",
    bg: "bg-slate-900",
  },
  {
    title: "Geo-Fencing Tech",
    description: "Auto-detects mall location. Works offline in basements.",
    icon: <MapPin className="w-6 h-6 text-red-400" />,
    className: "md:col-span-1",
    bg: "bg-slate-900",
  },
  {
    title: "Prescriptive Analytics",
    description: "'Rain predicted tomorrow. Suggest increasing Umbrella stock.'",
    icon: <BarChart3 className="w-6 h-6 text-blue-400" />,
    className: "md:col-span-2", // Bada card
    bg: "bg-gradient-to-br from-blue-900/50 to-slate-900",
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
            Grow with <span className="text-blue-600">Intelligence.</span>
          </motion.h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto text-lg">
            Don't just scan barcodes. Scan opportunities. Our partner dashboard gives you superpowers.
          </p>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
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