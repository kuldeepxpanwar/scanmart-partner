"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
    CheckCircle, Package, Users, ArrowRight,
    Store, Loader2, Sparkles, ChevronRight, Plus
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface OnboardingStep {
    id: number;
    title: string;
    description: string;
    cta: string;
    href: string;
    icon: React.ReactNode;
    color: string;
    checkFn: (storeId: string) => Promise<boolean>;
}

export default function OnboardingPage() {
    const router = useRouter();
    const [activeStoreId, setActiveStoreId] = useState<string | null>(null);
    const [storeName, setStoreName] = useState("");
    const [loading, setLoading] = useState(true);
    const [stepStatus, setStepStatus] = useState<boolean[]>([false, false, false]);
    const allDone = stepStatus.every(Boolean);

    const steps: OnboardingStep[] = [
        {
            id: 1,
            title: "Set Up Your Store",
            description: "Add your store name, address, GSTIN, and UPI ID for billing.",
            cta: "Go to Settings",
            href: "/dashboard/settings",
            icon: <Store size={28} />,
            color: "blue",
            checkFn: async (storeId) => {
                const { data } = await supabase
                    .from("stores")
                    .select("name, address")
                    .eq("id", storeId)
                    .single();
                return !!(data?.name && data?.address);
            },
        },
        {
            id: 2,
            title: "Add Your Products",
            description: "Add at least one product to your inventory to start billing.",
            cta: "Add Products",
            href: "/dashboard/inventory",
            icon: <Package size={28} />,
            color: "emerald",
            checkFn: async (storeId) => {
                const { count } = await supabase
                    .from("inventory")
                    .select("id", { count: "exact", head: true })
                    .eq("store_id", storeId);
                return (count ?? 0) > 0;
            },
        },
        {
            id: 3,
            title: "Add a Staff Member",
            description: "Add at least one staff or cashier with a PIN to manage billing.",
            cta: "Manage Team",
            href: "/dashboard/staff",
            icon: <Users size={28} />,
            color: "purple",
            checkFn: async (storeId) => {
                const { count } = await supabase
                    .from("staff")
                    .select("id", { count: "exact", head: true })
                    .eq("store_id", storeId)
                    .eq("is_active", true);
                return (count ?? 0) > 0;
            },
        },
    ];

    useEffect(() => {
        const init = async () => {
            const storedId =
                typeof window !== "undefined" ? localStorage.getItem("active_store_id") : null;
            let storeId = storedId;

            if (!storeId) {
                const { data } = await supabase.from("stores").select("id, name").limit(1);
                if (data?.[0]) {
                    storeId = data[0].id;
                    setStoreName(data[0].name || "");
                }
            } else {
                const { data } = await supabase
                    .from("stores")
                    .select("name")
                    .eq("id", storeId)
                    .single();
                setStoreName(data?.name || "");
            }

            if (!storeId) { setLoading(false); return; }
            setActiveStoreId(storeId);

            // Check all steps in parallel
            const results = await Promise.all(steps.map((s) => s.checkFn(storeId!)));
            setStepStatus(results);
            setLoading(false);
        };
        init();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const colorMap: Record<string, { bg: string; text: string; border: string; iconBg: string; glow: string }> = {
        blue: { bg: "bg-blue-600", text: "text-blue-400", border: "border-blue-500/40", iconBg: "bg-blue-500/10", glow: "shadow-blue-900/30" },
        emerald: { bg: "bg-emerald-600", text: "text-emerald-400", border: "border-emerald-500/40", iconBg: "bg-emerald-500/10", glow: "shadow-emerald-900/30" },
        purple: { bg: "bg-purple-600", text: "text-purple-400", border: "border-purple-500/40", iconBg: "bg-purple-500/10", glow: "shadow-purple-900/30" },
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#020617] flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-500" size={40} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#020617] text-white font-sans p-4 md:p-10 pb-20">

            {/* Header */}
            <div className="max-w-2xl mx-auto mb-10 text-center">
                <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-full text-blue-400 text-xs font-black uppercase tracking-widest mb-5">
                    <Sparkles size={14} /> Quick Setup
                </div>
                <h1 className="text-4xl font-black uppercase italic tracking-tighter mb-3">
                    Welcome to <span className="text-blue-500">ScanMart</span>
                </h1>
                <p className="text-slate-400 text-sm font-bold">
                    {storeName ? `Setting up "${storeName}"` : "Let's get your store ready in 3 steps."}
                </p>

                {/* Progress bar */}
                <div className="mt-6 bg-slate-800 rounded-full h-2 max-w-xs mx-auto overflow-hidden">
                    <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-700"
                        style={{ width: `${(stepStatus.filter(Boolean).length / steps.length) * 100}%` }}
                    />
                </div>
                <p className="text-slate-500 text-xs mt-2 font-bold">
                    {stepStatus.filter(Boolean).length} of {steps.length} steps complete
                </p>
            </div>

            {/* Steps */}
            <div className="max-w-2xl mx-auto space-y-4">
                {steps.map((step, i) => {
                    const done = stepStatus[i];
                    const c = colorMap[step.color];
                    return (
                        <div
                            key={step.id}
                            className={`bg-slate-900 border ${done ? "border-green-500/30 bg-green-500/5" : c.border} rounded-3xl p-6 flex items-center gap-5 transition-all`}
                        >
                            {/* Icon / check */}
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 ${done ? "bg-green-500/10" : c.iconBg}`}>
                                {done
                                    ? <CheckCircle size={32} className="text-green-400" />
                                    : <span className={c.text}>{step.icon}</span>
                                }
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-slate-600 text-[10px] font-black uppercase">Step {step.id}</span>
                                    {done && <span className="text-green-400 text-[10px] font-black bg-green-500/10 px-2 py-0.5 rounded-full">✓ Done</span>}
                                </div>
                                <p className="text-white font-black text-base">{step.title}</p>
                                <p className="text-slate-500 text-xs font-bold mt-0.5">{step.description}</p>
                            </div>

                            {/* CTA */}
                            {!done && (
                                <Link href={step.href}>
                                    <button className={`flex-shrink-0 ${c.bg} hover:opacity-90 px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 shadow-xl ${c.glow}`}>
                                        {step.cta} <ChevronRight size={14} />
                                    </button>
                                </Link>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* All done! */}
            {allDone && (
                <div className="max-w-2xl mx-auto mt-8 bg-gradient-to-br from-green-600/20 to-emerald-600/10 border border-green-500/30 rounded-3xl p-8 text-center animate-in fade-in duration-500">
                    <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle size={40} className="text-green-400" />
                    </div>
                    <h2 className="text-2xl font-black text-white mb-2">You're All Set! 🎉</h2>
                    <p className="text-slate-400 text-sm mb-6">Store configured, products added, staff ready. Time to start billing!</p>
                    <Link href="/dashboard/sales">
                        <button className="bg-green-500 hover:bg-green-400 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center gap-2 mx-auto transition-all active:scale-95">
                            Start Billing <ArrowRight size={16} />
                        </button>
                    </Link>
                </div>
            )}

            {/* Skip link */}
            <div className="text-center mt-8">
                <Link href="/dashboard" className="text-slate-600 hover:text-slate-400 text-xs font-bold uppercase tracking-widest transition-all">
                    Skip Setup → Go to Dashboard
                </Link>
            </div>
        </div>
    );
}
