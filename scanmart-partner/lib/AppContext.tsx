"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { type Language, translate } from "@/lib/translations";
import { type Theme, getTheme, applyTheme } from "@/lib/theme";

// ─────────────────────────────────────────────────
// ScanMart App Context — Theme + Language
// Provides: theme toggle, language toggle, t() function
// ─────────────────────────────────────────────────

interface AppContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
  lang: Language;
  toggleLang: () => void;
  setLang: (l: Language) => void;
  t: (key: string) => string;
}

// ✅ Provide a safe default so useApp() never throws during SSR
const defaultContext: AppContextType = {
  theme: "dark",
  toggleTheme: () => {},
  setTheme: () => {},
  lang: "hi",
  toggleLang: () => {},
  setLang: () => {},
  t: (key: string) => translate(key, "hi"),
};

const AppContext = createContext<AppContextType>(defaultContext);

export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [lang, setLangState] = useState<Language>("hi");
  const [mounted, setMounted] = useState(false);

  // Initialize from localStorage — only runs client-side
  useEffect(() => {
    const savedTheme = getTheme();
    const savedLang = (localStorage.getItem("scanmart_lang") as Language) || "hi";

    setThemeState(savedTheme);
    setLangState(savedLang);
    applyTheme(savedTheme);
    setMounted(true);
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    applyTheme(t);
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
  };

  const setLang = (l: Language) => {
    setLangState(l);
    if (typeof window !== "undefined") {
      localStorage.setItem("scanmart_lang", l);
    }
  };

  const toggleLang = () => {
    setLang(lang === "hi" ? "en" : "hi");
  };

  const t = (key: string) => translate(key, lang);

  return (
    // ✅ Always render Provider — never block children render
    // suppressHydrationWarning prevents mismatch warnings during hydration
    <AppContext.Provider value={{ theme, toggleTheme, setTheme, lang, toggleLang, setLang, t }}>
      <div suppressHydrationWarning style={!mounted ? { visibility: "hidden" } : undefined}>
        {children}
      </div>
    </AppContext.Provider>
  );
}

// ✅ No throw — returns default context during SSR/prerender
export function useApp() {
  return useContext(AppContext);
}

export default AppProvider;
