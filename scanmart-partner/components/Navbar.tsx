"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Zap, ChevronRight } from "lucide-react";
import Link from "next/link";

export const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Scroll detect karke glass effect lagana
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled
          ? "bg-white/10 backdrop-blur-md border-b border-white/10 shadow-xl dark:bg-black/40"
          : "bg-transparent"
        }`}
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-16">
        <div className="flex items-center justify-between h-20">

          {/* Logo - Click karne par Home par layega */}
          <Link href="/" className="flex items-center gap-2 cursor-pointer group">
            <div className="p-2 bg-gradient-to-tr from-blue-600 to-cyan-500 rounded-lg shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
              <Zap className="text-white w-5 h-5 fill-current" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Scan<span className="text-blue-500">Mart</span>
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            {["Features", "Tech Stack", "Security", "Contact"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(" ", "-")}`}
                className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-blue-500 dark:hover:text-blue-400 transition-colors relative group"
              >
                {item}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-500 transition-all group-hover:w-full"></span>
              </a>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <Link href="/login">
              <button className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-500 transition">
                Log In
              </button>
            </Link>

            <Link href="/login">
              <button className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-full shadow-lg shadow-blue-500/30 transition-all transform hover:scale-105 active:scale-95">
                Get Started <ChevronRight size={16} />
              </button>
            </Link>
          </div>

          {/* Mobile Toggle */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 text-slate-800 dark:text-white rounded-md hover:bg-white/10 transition-colors"
            >
              {isOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white/95 dark:bg-black/95 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 overflow-hidden"
          >
            <div className="flex flex-col p-6 gap-4">
              {/* ✅ FIX: Mobile Menu me ab Contact bhi hai aur click par menu close hoga */}
              {["Features", "Tech Stack", "Security", "Contact"].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase().replace(" ", "-")}`}
                  onClick={() => setIsOpen(false)}
                  className="text-lg font-medium text-slate-800 dark:text-slate-200 hover:text-blue-500 transition-colors"
                >
                  {item}
                </a>
              ))}
              <hr className="border-gray-200 dark:border-gray-800 my-2" />

              <Link href="/login" onClick={() => setIsOpen(false)}>
                <button className="w-full py-4 bg-blue-600 hover:bg-blue-700 transition-colors text-white rounded-xl font-bold shadow-lg shadow-blue-500/20">
                  Get Started
                </button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};