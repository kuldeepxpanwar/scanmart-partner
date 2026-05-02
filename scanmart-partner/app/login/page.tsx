"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Mail, Loader2, Zap, ArrowRight, Store, KeyRound } from "lucide-react";
import AppSwitcher from "@/components/AppSwitcher";

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Form States
  const [shopName, setShopName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");

  // Forgot Password States
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState("");
  const [forgotError, setForgotError] = useState("");

  // UI States
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // 🛡️ Security: Clear stale session on page load
  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.clear();
      localStorage.removeItem("active_staff_id");
      localStorage.removeItem("active_store_id"); // 🔥 FIX: Clear stale store ID to prevent data mixing
      localStorage.removeItem("sb-auth-token");
    }
  }, []);

  // --- Forgot Password Handler ---
  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) return setForgotError("Please enter your email address.");
    setForgotLoading(true);
    setForgotError("");
    setForgotMsg("");
    try {
      // ✅ FIX: Always redirect to production URL, not localhost
      // On Vercel: NEXT_PUBLIC_SITE_URL is set. Locally: fallback to origin.
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: `${siteUrl}/auth/reset-password`,
      });
      if (error) throw error;
      setForgotMsg("✅ Reset link sent! Check your inbox (also check Spam folder).");
    } catch (err: any) {
      setForgotError(err.message || "Failed to send reset email. Try again.");
    } finally {
      setForgotLoading(false);
    }
  };

  // --- Main Auth Handler ---
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      if (isSignUp) {
        // ==========================================
        // 📝 NEW SHOP REGISTRATION
        // ==========================================

        // 1. PIN Validation — Admin must have 6-digit PIN
        if (pin.length !== 6) {
          throw new Error("Admin PIN must be exactly 6 digits.");
        }

        // 2. Create Auth User
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              shop_name: shopName,
              role: 'owner',
            },
          },
        });

        if (authError) throw authError;

        // 3. Create Staff Profile + Default Store — prevents blank dashboard bug
        if (authData.user) {
          // 3a. Create default store for this new user
          const { data: newStore, error: storeError } = await supabase
            .from('stores')
            .insert([{
              name: shopName || "My Store",
              owner_id: authData.user.id,
              is_main_store: true,
              location: "",
            }])
            .select()
            .single();

          if (storeError) {
            console.error("Store DB Error:", storeError);
            // Non-fatal — user can create store from settings
          }

          // 3b. Create Staff Profile linked to the new store
          const { error: staffError } = await supabase
            .from('staff')
            .insert([{
              id: authData.user.id,
              name: "Shop Owner",
              role: "admin",
              pin_code: pin,
              is_active: true,
              shop_id: authData.user.id,
              store_id: newStore?.id || null, // 🔥 Link staff to new store
            }]);

          if (staffError) {
            console.error("Staff DB Error:", staffError);
            throw new Error("Account created but failed to setup Shop Database. Contact Support.");
          }

          // 3c. Pre-set the new store ID in localStorage so dashboard loads correctly
          if (newStore?.id && typeof window !== 'undefined') {
            localStorage.setItem("active_store_id", newStore.id);
          }
        }

        // 4. Check if email confirmation is required
        if (authData.user && !authData.user.email_confirmed_at) {
          setSuccessMsg("📬 Check your email! We've sent a verification link. Please verify before logging in.");
          setLoading(false);
          return;
        }

        setSuccessMsg("🎉 Shop Registered Successfully! Logging you in...");
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 1500);

      } else {
        // ==========================================
        // 🔐 LOGIN LOGIC
        // ==========================================
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        setSuccessMsg("Verifying Credentials...");
        window.location.href = "/dashboard";
      }

    } catch (error: any) {
      console.error("Auth Error:", error);
      setErrorMsg(error.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 relative overflow-hidden font-sans">

      {/* 🌌 Animated Background Glow */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse delay-1000"></div>
      </div>

      {/* 🔮 Glassmorphism Card */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="bg-slate-900/40 backdrop-blur-2xl border border-white/10 p-10 rounded-[2.5rem] w-full max-w-md shadow-2xl relative z-10"
      >
        {/* Logo & Title */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
            className="bg-gradient-to-br from-blue-600 to-indigo-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/40"
          >
            <Zap size={40} className="text-white fill-white" />
          </motion.div>
          <h1 className="text-4xl font-black text-white tracking-tight drop-shadow-lg">
            Scan<span className="text-blue-500">Mart</span>
          </h1>
          <p className="text-slate-400 text-sm mt-3 font-medium tracking-wide uppercase">
            {showForgotPassword ? "Password Recovery" : isSignUp ? "Create Your Shop" : "Next-Gen Business OS"}
          </p>
        </div>

        {/* Error / Success Messages */}
        <AnimatePresence mode="wait">
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-4 rounded-2xl mb-6 text-center font-bold"
            >
              ⚠️ {errorMsg}
            </motion.div>
          )}
          {successMsg && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-green-500/10 border border-green-500/20 text-green-400 text-xs p-4 rounded-2xl mb-6 text-center font-bold"
            >
              ✅ {successMsg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===================================
              FORGOT PASSWORD VIEW
            =================================== */}
        {showForgotPassword ? (
          <motion.div key="forgot" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            <div className="text-center mb-2">
              <p className="text-slate-300 font-bold text-sm">Reset your password</p>
              <p className="text-slate-500 text-xs mt-1">Enter your registered email. We'll send a secure reset link.</p>
            </div>

            {forgotMsg ? (
              <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-5 text-center space-y-2">
                <div className="text-3xl">📬</div>
                <p className="text-green-400 text-sm font-black">{forgotMsg}</p>
                <p className="text-slate-400 text-xs">After clicking the link in the email, you can set a new password and log in again.</p>
              </div>
            ) : (
              <>
                <div className="space-y-2 group">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Registered Email</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="text-slate-500" size={20} />
                    </div>
                    <input
                      type="email"
                      autoFocus
                      placeholder="admin@example.com"
                      value={forgotEmail}
                      onChange={e => { setForgotEmail(e.target.value); setForgotError(""); }}
                      onKeyDown={e => e.key === "Enter" && handleForgotPassword()}
                      className="w-full bg-slate-950/50 border border-white/5 rounded-2xl py-4 pl-12 text-white placeholder:text-slate-600 outline-none focus:border-blue-500/50 focus:bg-slate-900/80 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                    />
                  </div>
                </div>

                {forgotError && (
                  <p className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-2xl font-bold">⚠️ {forgotError}</p>
                )}

                <button
                  onClick={handleForgotPassword}
                  disabled={forgotLoading || !forgotEmail.trim()}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/30"
                >
                  {forgotLoading ? <Loader2 className="animate-spin" size={20} /> : <><Mail size={18} /> Send Reset Link</>}
                </button>
              </>
            )}

            <button
              onClick={() => { setShowForgotPassword(false); setForgotEmail(""); setForgotMsg(""); setForgotError(""); }}
              className="w-full text-slate-500 hover:text-slate-300 text-sm font-bold py-2 transition-all"
            >
              ← Back to Login
            </button>
          </motion.div>

        ) : (
          /* ===================================
                LOGIN / SIGN-UP VIEW
             =================================== */
          <>
            <form onSubmit={handleAuth} className="space-y-6">
              <AnimatePresence>
                {isSignUp && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 group overflow-hidden"
                  >
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest group-focus-within:text-blue-500 transition-colors">
                      Shop Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Store className="text-slate-500 group-focus-within:text-blue-500 transition-colors" size={20} />
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. Phoenix Supermarket"
                        value={shopName}
                        onChange={(e) => setShopName(e.target.value)}
                        className="w-full bg-slate-950/50 border border-white/5 rounded-2xl py-4 pl-12 text-white placeholder:text-slate-600 outline-none focus:border-blue-500/50 focus:bg-slate-900/80 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                        required={isSignUp}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2 group">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest group-focus-within:text-blue-500 transition-colors">
                  Access ID (Email)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="text-slate-500 group-focus-within:text-blue-500 transition-colors" size={20} />
                  </div>
                  <input
                    type="email"
                    placeholder="admin@scanmart.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950/50 border border-white/5 rounded-2xl py-4 pl-12 text-white placeholder:text-slate-600 outline-none focus:border-blue-500/50 focus:bg-slate-900/80 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2 group">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest group-focus-within:text-blue-500 transition-colors">
                  Secure Key (Password)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="text-slate-500 group-focus-within:text-blue-500 transition-colors" size={20} />
                  </div>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950/50 border border-white/5 rounded-2xl py-4 pl-12 text-white placeholder:text-slate-600 outline-none focus:border-blue-500/50 focus:bg-slate-900/80 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                    required
                  />
                </div>
              </div>

              {/* Forgot Password link — only shown in Login mode */}
              {!isSignUp && (
                <div className="text-right -mt-3">
                  <button
                    type="button"
                    onClick={() => { setShowForgotPassword(true); setForgotEmail(email); }}
                    className="text-[11px] text-blue-400 hover:text-blue-300 font-bold transition-colors underline underline-offset-2 decoration-blue-500/30"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              <AnimatePresence>
                {isSignUp && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 group overflow-hidden"
                  >
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest group-focus-within:text-blue-500 transition-colors">
                      Create 6-Digit Admin PIN
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <KeyRound className="text-slate-500 group-focus-within:text-blue-500 transition-colors" size={20} />
                      </div>
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="e.g. 123456"
                        value={pin}
                        onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-slate-950/50 border border-white/5 rounded-2xl py-4 pl-12 text-white placeholder:text-slate-600 outline-none focus:border-blue-500/50 focus:bg-slate-900/80 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium tracking-[0.5em]"
                        required={isSignUp}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-blue-900/30 flex items-center justify-center gap-3 transition-all mt-6 group relative overflow-hidden"
              >
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                {loading ? <Loader2 className="animate-spin" /> : (
                  <>
                    {isSignUp ? "CREATE NEW SHOP" : "INITIALIZE SYSTEM"}
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 text-center border-t border-white/5 pt-6">
              <p className="text-sm text-slate-400 font-medium">
                {isSignUp ? "Already a partner?" : "New to ScanMart?"}
                <button
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setErrorMsg("");
                    setSuccessMsg("");
                    setPin("");
                  }}
                  className="ml-2 text-blue-400 hover:text-blue-300 font-bold transition-colors focus:outline-none underline decoration-blue-500/30 underline-offset-4"
                >
                  {isSignUp ? "Log In Instead" : "Create a Shop"}
                </button>
              </p>
            </div>
          </>
        )}

        <div className="mt-6 flex flex-col items-center gap-3">
          <AppSwitcher />
          <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold">
            Secured by ScanMart Enclave™ v2.0
          </p>
        </div>
      </motion.div>
    </div>
  );
}