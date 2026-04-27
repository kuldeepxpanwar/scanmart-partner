"use client";
import React from "react";
import { useApp } from "@/lib/AppContext";
import { Sun, Moon } from "lucide-react";

/**
 * 🌐 AppSwitcher — Theme + Language toggle buttons
 * Place anywhere in the app for instant switching.
 * Compact design for headers/toolbars.
 */
export default function AppSwitcher({ className = "" }: { className?: string }) {
  const { theme, toggleTheme, lang, toggleLang, t } = useApp();

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {/* Language Toggle */}
      <button
        onClick={toggleLang}
        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border
          bg-amber-500/10 border-amber-500/30 text-amber-500 hover:bg-amber-500/20 active:scale-95"
        title={lang === 'hi' ? 'Switch to English' : 'हिंदी में बदलें'}
      >
        {lang === 'hi' ? 'EN' : 'हिं'}
      </button>

      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border active:scale-95
          ${theme === 'dark'
            ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20'
            : 'bg-slate-500/10 border-slate-400/30 text-slate-600 hover:bg-slate-500/20'
          }`}
        title={theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
      >
        {theme === 'dark' ? <Sun size={12} /> : <Moon size={12} />}
      </button>
    </div>
  );
}
