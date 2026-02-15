"use client";
import React from "react";
import { Layers, Database, Palette, Zap } from "lucide-react";

export const TechStack = () => {
  const technologies = [
    {
      name: "Next.js & React",
      role: "Frontend Framework",
      desc: "Delivers lightning-fast page loads and a seamless single-page application experience. No more waiting for pages to refresh.",
      icon: <Layers size={32} />,
      color: "text-slate-800 dark:text-white",
      bg: "bg-slate-200 dark:bg-slate-800"
    },
    {
      name: "Supabase",
      role: "Backend & Database",
      desc: "Open-source Firebase alternative powered by PostgreSQL. Ensures your business data is encrypted, backed up, and highly available.",
      icon: <Database size={32} />,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10"
    },
    {
      name: "Tailwind CSS",
      role: "UI & Styling",
      desc: "Utility-first framework that powers our premium, responsive design. Looks stunning on desktop counters and mobile screens alike.",
      icon: <Palette size={32} />,
      color: "text-cyan-500",
      bg: "bg-cyan-500/10"
    },
    {
      name: "Framer Motion",
      role: "Fluid Animations",
      desc: "Provides the buttery-smooth animations and transitions that make the software feel alive and intuitive for your staff.",
      icon: <Zap size={32} />,
      color: "text-blue-500",
      bg: "bg-blue-500/10"
    }
  ];

  return (
    <section id="tech-stack" className="py-24 bg-white dark:bg-[#050505] relative border-t border-slate-200 dark:border-slate-800/50">
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        <div className="text-center mb-16">
          <h2 className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2">Under The Hood</h2>
          <h3 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
            Powered by <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">Modern Tech</span>
          </h3>
          <p className="mt-4 text-slate-600 dark:text-slate-400 max-w-2xl mx-auto text-lg">
            We don't use legacy, clunky software. ScanMart is built on the exact same technology stack used by the world's leading tech giants.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {technologies.map((tech, index) => (
            <div key={index} className="p-8 rounded-[2rem] bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 transition-all hover:-translate-y-2 group">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${tech.bg} ${tech.color} group-hover:scale-110 transition-transform`}>
                {tech.icon}
              </div>
              <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{tech.name}</h4>
              <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-4">{tech.role}</p>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                {tech.desc}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};