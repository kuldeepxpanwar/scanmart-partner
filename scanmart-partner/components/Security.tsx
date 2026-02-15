"use client";
import React from "react";
import { ShieldCheck, LockKeyhole, KeyRound, Database } from "lucide-react";

export const Security = () => {
  const securityFeatures = [
    {
      icon: <ShieldCheck size={28} />,
      title: "Role-Based Access",
      description: "Admin gets full control and analytics. Staff gets restricted access, protecting your sensitive shop data and profit margins.",
      color: "text-blue-500",
      bg: "bg-blue-500/10 border-blue-500/20"
    },
    {
      icon: <LockKeyhole size={28} />,
      title: "Auto-Session Lock",
      description: "Powered by strict SessionStorage. The moment a staff member closes the tab, the system locks automatically. Zero unauthorized access.",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10 border-emerald-500/20"
    },
    {
      icon: <KeyRound size={28} />,
      title: "Secure PIN Authentication",
      description: "No messy passwords for staff. Every employee gets a unique 4-digit PIN for lightning-fast, yet highly secure shift logins.",
      color: "text-purple-500",
      bg: "bg-purple-500/10 border-purple-500/20"
    },
    {
      icon: <Database size={28} />,
      title: "Supabase Cloud Security",
      description: "Your inventory, sales, and customer data are encrypted and stored on top-tier Supabase cloud infrastructure with 99.9% uptime.",
      color: "text-cyan-500",
      bg: "bg-cyan-500/10 border-cyan-500/20"
    }
  ];

  return (
    <section id="security" className="py-24 bg-white dark:bg-[#0B0C10] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2">Zero-Trust Architecture</h2>
          <h3 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
            Military-Grade <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">Security</span>
          </h3>
          <p className="mt-4 text-slate-600 dark:text-slate-400 max-w-2xl mx-auto text-lg">
            Built from the ground up to protect your business. Your data is yours, and only the right people get access to it.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {securityFeatures.map((feature, idx) => (
            <div key={idx} className="group p-8 rounded-[2rem] bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 transition-all hover:shadow-2xl hover:shadow-blue-500/10 relative overflow-hidden">
              <div className="flex items-start gap-6 relative z-10">
                <div className={`p-4 rounded-2xl border ${feature.bg} ${feature.color} shadow-inner`}>
                  {feature.icon}
                </div>
                <div>
                  <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{feature.title}</h4>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};