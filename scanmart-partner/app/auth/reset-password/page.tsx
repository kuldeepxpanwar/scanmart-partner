"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Lock, Loader2, CheckCircle, AlertTriangle, Zap } from "lucide-react";

// ─────────────────────────────────────────────────────────────
// /app/auth/reset-password/page.tsx
// Supabase password reset link → yahan redirect hoga
// URL format: /auth/reset-password#access_token=xxx&type=recovery
// ─────────────────────────────────────────────────────────────

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // ── On mount: Supabase reads the #access_token from URL hash automatically
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        // Token valid — user can now set new password
        setSessionReady(true);
        setCheckingSession(false);
      } else if (event === "SIGNED_IN" && session) {
        // Already signed in via token
        setSessionReady(true);
        setCheckingSession(false);
      } else {
        setCheckingSession(false);
      }
    });

    // Timeout: agar 5 seconds mein session na mile to error show karo
    const timeout = setTimeout(() => {
      setCheckingSession(false);
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      return setError("Password must be at least 6 characters.");
    }
    if (password !== confirm) {
      return setError("Passwords do not match.");
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      // 3 seconds baad login page pe bhejo
      setTimeout(() => router.push("/login"), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update password. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Glow */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse delay-1000" />
      </div>

      <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/10 p-10 rounded-[2.5rem] w-full max-w-md shadow-2xl relative z-10 text-white">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/40">
            <Zap size={32} className="text-white fill-white" />
          </div>
          <h1 className="text-3xl font-black tracking-tight">
            Scan<span className="text-blue-500">Mart</span>
          </h1>
          <p className="text-slate-400 text-sm mt-2 font-medium uppercase tracking-widest">
            Set New Password
          </p>
        </div>

        {/* Loading state */}
        {checkingSession && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="animate-spin text-blue-500" size={40} />
            <p className="text-slate-400 text-sm font-bold">Verifying reset link...</p>
          </div>
        )}

        {/* Invalid / Expired link */}
        {!checkingSession && !sessionReady && !success && (
          <div className="text-center">
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 mb-6">
              <AlertTriangle size={40} className="text-red-400 mx-auto mb-3" />
              <p className="text-red-400 font-bold text-base mb-2">Link Expired or Invalid</p>
              <p className="text-slate-400 text-sm">
                This password reset link has expired or already been used.
                <br />Reset links are valid for <strong>1 hour only</strong>.
              </p>
            </div>
            <button
              onClick={() => router.push("/login")}
              className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-2xl font-black uppercase tracking-widest text-sm transition-all"
            >
              Go to Login → Request New Link
            </button>
          </div>
        )}

        {/* Success state */}
        {success && (
          <div className="text-center">
            <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-6 mb-6">
              <CheckCircle size={40} className="text-green-400 mx-auto mb-3" />
              <p className="text-green-400 font-bold text-lg mb-2">✅ Password Updated!</p>
              <p className="text-slate-400 text-sm">
                Your password has been changed successfully.
                <br />Redirecting to login...
              </p>
            </div>
            <Loader2 className="animate-spin text-blue-500 mx-auto" size={24} />
          </div>
        )}

        {/* Password form */}
        {!checkingSession && sessionReady && !success && (
          <form onSubmit={handleReset} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="password"
                placeholder="New Password (min 6 chars)"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-slate-950 border border-slate-800 text-white placeholder-slate-600 pl-12 pr-4 py-4 rounded-2xl outline-none focus:border-blue-500 transition-all font-medium"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="password"
                placeholder="Confirm New Password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 text-white placeholder-slate-600 pl-12 pr-4 py-4 rounded-2xl outline-none focus:border-blue-500 transition-all font-medium"
              />
            </div>

            {/* Password strength indicator */}
            <div className="flex gap-1">
              {[1, 2, 3, 4].map(i => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-all ${
                    password.length >= i * 2
                      ? i <= 2 ? "bg-red-500" : i === 3 ? "bg-yellow-500" : "bg-green-500"
                      : "bg-slate-800"
                  }`}
                />
              ))}
            </div>
            <p className="text-[10px] text-slate-600 font-bold">
              {password.length < 4 ? "Weak" : password.length < 6 ? "Okay" : password.length < 8 ? "Good" : "Strong"} password
            </p>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-xl font-bold text-center">
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 py-4 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-blue-900/30 flex items-center justify-center gap-2 transition-all mt-2"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Lock size={18} />}
              {loading ? "Updating..." : "Set New Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
