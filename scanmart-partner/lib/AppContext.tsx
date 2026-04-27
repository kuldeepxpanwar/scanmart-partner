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

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [lang, setLangState] = useState<Language>("hi");
  const [mounted, setMounted] = useState(false);

  // Initialize from localStorage
  useEffect(() => {
    const savedTheme = getTheme();
    const savedLang = (typeof window !== "undefined"
      ? localStorage.getItem("scanmart_lang") as Language
      : null) || "hi";

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

  // Prevent flash of wrong theme
  if (!mounted) {
    return <div style={{ visibility: "hidden" }}>{children}</div>;
  }

  return (
    <AppContext.Provider value={{ theme, toggleTheme, setTheme, lang, toggleLang, setLang, t }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export default AppProvider;
