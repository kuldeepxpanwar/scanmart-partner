"use client";
import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { X, Phone, Mail, Key, MessageCircle, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface ForgotPinModalProps {
    isOpen: boolean;
    onClose: () => void;
    shopId?: string | null;
}

type Tab = "phone" | "email";
type PhoneStep = "search" | "found" | "not_found";

export default function ForgotPinModal({ isOpen, onClose, shopId }: ForgotPinModalProps) {
    const [activeTab, setActiveTab] = useState<Tab>("phone");

    // Phone / Staff ID flow
    const [searchInput, setSearchInput] = useState(""); // phone or name
    const [phoneStep, setPhoneStep] = useState<PhoneStep>("search");
    const [foundStaff, setFoundStaff] = useState<any>(null);
    const [searchLoading, setSearchLoading] = useState(false);

    // Email flow
    const [email, setEmail] = useState("");
    const [emailSent, setEmailSent] = useState(false);
    const [emailLoading, setEmailLoading] = useState(false);
    const [emailError, setEmailError] = useState("");

    const resetModal = () => {
        setSearchInput(""); setPhoneStep("search"); setFoundStaff(null);
        setEmail(""); setEmailSent(false); setEmailError("");
        setActiveTab("phone");
    };

    const handleClose = () => { resetModal(); onClose(); };

    // --- Search staff by phone or name ---
    const handleSearch = async () => {
        if (!searchInput.trim()) return;
        setSearchLoading(true);

        let query = supabase.from("staff").select("id, name, phone, role").eq("is_active", true);
        if (shopId) query = query.eq("shop_id", shopId);

        // Try phone first, then name
        const isPhone = /^\d+$/.test(searchInput.trim());
        if (isPhone) {
            query = query.ilike("phone", `%${searchInput.trim()}%`);
        } else {
            query = query.ilike("name", `%${searchInput.trim()}%`);
        }

        const { data } = await query.maybeSingle();

        if (data) {
            setFoundStaff(data);
            setPhoneStep("found");
        } else {
            setPhoneStep("not_found");
        }
        setSearchLoading(false);
    };

    // Open WhatsApp to notify admin about PIN reset request
    const notifyAdminWhatsApp = async () => {
        // Find admin's phone
        let adminQuery = supabase.from("staff").select("phone, name").eq("role", "admin").eq("is_active", true);
        if (shopId) adminQuery = adminQuery.eq("shop_id", shopId);
        const { data: admin } = await adminQuery.maybeSingle();

        const msg = `🔔 ScanMart PIN Reset Request\n\nStaff Member: ${foundStaff?.name}\nPhone: ${foundStaff?.phone || "N/A"}\nRole: ${foundStaff?.role}\n\nPlease reset their PIN from the Staff Management page.`;

        if (admin?.phone) {
            window.open(`https://wa.me/91${admin.phone}?text=${encodeURIComponent(msg)}`, "_blank");
        } else {
            alert("Admin phone number not found. Please contact admin directly.");
        }
    };

    // Send email reset (for owner/admin only)
    const handleEmailReset = async () => {
        if (!email.trim()) return setEmailError("Please enter your email");
        setEmailLoading(true);
        setEmailError("");
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
            redirectTo: `${window.location.origin}/login`,
        });
        if (error) {
            setEmailError(error.message);
        } else {
            setEmailSent(true);
        }
        setEmailLoading(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-[2rem] w-full max-w-sm shadow-2xl relative overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-900/60 to-slate-900 p-6 border-b border-slate-800">
                    <button onClick={handleClose} className="absolute top-4 right-4 text-slate-500 hover:text-white bg-slate-800 p-1.5 rounded-full transition-all">
                        <X size={16} />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-500/20 p-2.5 rounded-xl border border-blue-500/30">
                            <Key size={20} className="text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black uppercase text-white tracking-tight">Forgot PIN?</h2>
                            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Recovery Options</p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-0 p-4 pb-0">
                    <button
                        onClick={() => setActiveTab("phone")}
                        className={`flex-1 py-2.5 text-xs font-black uppercase tracking-widest rounded-tl-xl rounded-bl-xl border transition-all ${activeTab === "phone" ? "bg-blue-600 border-blue-500 text-white" : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"}`}
                    >
                        <Phone size={12} className="inline mr-1" />Phone / ID
                    </button>
                    <button
                        onClick={() => setActiveTab("email")}
                        className={`flex-1 py-2.5 text-xs font-black uppercase tracking-widest rounded-tr-xl rounded-br-xl border transition-all ${activeTab === "email" ? "bg-blue-600 border-blue-500 text-white" : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"}`}
                    >
                        <Mail size={12} className="inline mr-1" />Email
                    </button>
                </div>

                <div className="p-5">
                    {/* === PHONE / STAFF ID TAB === */}
                    {activeTab === "phone" && (
                        <div className="space-y-4">
                            {phoneStep === "search" && (
                                <>
                                    <p className="text-slate-400 text-xs font-medium">
                                        Enter your <span className="text-white font-bold">mobile number</span> or <span className="text-white font-bold">staff name</span> to find your account.
                                    </p>
                                    <input
                                        type="text"
                                        placeholder="Phone number or Staff name"
                                        value={searchInput}
                                        onChange={e => setSearchInput(e.target.value)}
                                        onKeyDown={e => e.key === "Enter" && handleSearch()}
                                        className="w-full bg-slate-950 border border-slate-700 text-white p-3 rounded-xl text-sm font-bold outline-none focus:border-blue-500 transition-all"
                                    />
                                    <button
                                        onClick={handleSearch}
                                        disabled={searchLoading || !searchInput.trim()}
                                        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-3 rounded-xl font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-2"
                                    >
                                        {searchLoading ? <Loader2 size={16} className="animate-spin" /> : "Search Account"}
                                    </button>
                                </>
                            )}

                            {phoneStep === "found" && foundStaff && (
                                <div className="space-y-4">
                                    <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
                                        <CheckCircle size={20} className="text-green-500 flex-shrink-0" />
                                        <div>
                                            <p className="text-green-400 text-xs font-black uppercase">Account Found!</p>
                                            <p className="text-white font-bold text-sm">{foundStaff.name}</p>
                                            <p className="text-slate-400 text-[10px]">{foundStaff.phone} • {foundStaff.role}</p>
                                        </div>
                                    </div>
                                    <p className="text-slate-400 text-xs">
                                        Your Admin will receive a WhatsApp message to reset your PIN from the Staff Management page.
                                    </p>
                                    <button
                                        onClick={notifyAdminWhatsApp}
                                        className="w-full bg-green-600 hover:bg-green-500 text-white py-3 rounded-xl font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-2"
                                    >
                                        <MessageCircle size={14} />
                                        Notify Admin via WhatsApp
                                    </button>
                                    <button onClick={() => { setPhoneStep("search"); setSearchInput(""); setFoundStaff(null); }} className="w-full text-slate-500 text-xs py-2 hover:text-slate-300 transition-all">
                                        ← Search Again
                                    </button>
                                </div>
                            )}

                            {phoneStep === "not_found" && (
                                <div className="space-y-4">
                                    <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
                                        <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
                                        <div>
                                            <p className="text-red-400 text-xs font-black uppercase">Not Found</p>
                                            <p className="text-slate-300 text-xs">No account matched your search. Contact your admin directly.</p>
                                        </div>
                                    </div>
                                    <button onClick={() => { setPhoneStep("search"); setSearchInput(""); }} className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-black uppercase text-xs tracking-widest transition-all">
                                        ← Try Again
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* === EMAIL TAB === */}
                    {activeTab === "email" && (
                        <div className="space-y-4">
                            {!emailSent ? (
                                <>
                                    <p className="text-slate-400 text-xs font-medium">
                                        For <span className="text-white font-bold">Shop Owner / Admin</span> only. Enter your registered email to receive a reset link.
                                    </p>
                                    <input
                                        type="email"
                                        placeholder="admin@example.com"
                                        value={email}
                                        onChange={e => { setEmail(e.target.value); setEmailError(""); }}
                                        onKeyDown={e => e.key === "Enter" && handleEmailReset()}
                                        className="w-full bg-slate-950 border border-slate-700 text-white p-3 rounded-xl text-sm font-bold outline-none focus:border-blue-500 transition-all"
                                    />
                                    {emailError && (
                                        <p className="text-red-400 text-xs font-bold bg-red-500/10 border border-red-500/20 rounded-lg p-2">
                                            ❌ {emailError}
                                        </p>
                                    )}
                                    <button
                                        onClick={handleEmailReset}
                                        disabled={emailLoading || !email.trim()}
                                        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-3 rounded-xl font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-2"
                                    >
                                        {emailLoading ? <Loader2 size={16} className="animate-spin" /> : <><Mail size={14} /> Send Reset Link</>}
                                    </button>
                                </>
                            ) : (
                                <div className="text-center py-4 space-y-3">
                                    <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-5">
                                        <CheckCircle size={32} className="text-green-500 mx-auto mb-3" />
                                        <p className="text-green-400 font-black uppercase text-xs mb-1">Email Sent!</p>
                                        <p className="text-slate-300 text-xs">Check your inbox at <span className="text-white font-bold">{email}</span> and click the reset link.</p>
                                    </div>
                                    <button onClick={handleClose} className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all">
                                        Close
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
