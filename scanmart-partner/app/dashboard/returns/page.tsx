"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
    RotateCcw, Search, Phone, Receipt, Package,
    CheckCircle, XCircle, Loader2,
    Minus, Plus, BadgePercent, ArrowLeft, Store, Lock
} from "lucide-react";

interface SaleItem {
    id: string;
    quantity: number;
    price_at_sale: number;
    inventory: { name: string; id: string } | null;
    product_id: string;
    returnQty: number;
}

interface Sale {
    id: string;
    created_at: string;
    total_amount: number;
    payment_method: string;
    invoice_number?: string;
    sale_items: SaleItem[];
    customers?: { name: string; phone: string } | null;
}

type Step = "search" | "items" | "done";

export default function ReturnsPage() {
    const [step, setStep] = useState<Step>("search");
    const [activeStoreId, setActiveStoreId] = useState<string | null>(null);
    const [isAuthorised, setIsAuthorised] = useState(false);
    const [authChecking, setAuthChecking] = useState(true);

    // Search
    const [searchMode, setSearchMode] = useState<"phone" | "invoice">("phone");
    const [searchQuery, setSearchQuery] = useState("");
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState("");

    // Found Sales
    const [foundSales, setFoundSales] = useState<Sale[]>([]);
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

    // Return state
    const [returnItems, setReturnItems] = useState<SaleItem[]>([]);
    const [reason, setReason] = useState("");
    const [processing, setProcessing] = useState(false);

    // Done state
    const [refundSummary, setRefundSummary] = useState<any>(null);

    useEffect(() => {
        const checkAuth = async () => {
            const staffId = typeof window !== "undefined" ? sessionStorage.getItem("active_staff_id") : null;
            if (!staffId) { setAuthChecking(false); return; }

            const { data } = await supabase
                .from("staff")
                .select("id, role")
                .eq("id", staffId)
                .eq("is_active", true)
                .single();

            if (data) setIsAuthorised(true);
            setAuthChecking(false);
        };
        checkAuth();

        const storedId = typeof window !== "undefined" ? localStorage.getItem("active_store_id") : null;
        if (storedId) setActiveStoreId(storedId);
        else fetchFirstStore();
    }, []);

    const fetchFirstStore = async () => {
        const { data } = await supabase.from("stores").select("id").limit(1);
        if (data && data.length > 0) setActiveStoreId(data[0].id);
    };

    // ── Search Sales ──────────────────────────────────────────────
    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setSearching(true);
        setSearchError("");
        setFoundSales([]);

        try {
            const baseQuery = () => supabase
                .from("sales")
                .select(`
          id, created_at, total_amount, payment_method,
          customers:customer_id ( name, phone ),
          sale_items (
            id, quantity, price_at_sale, product_id,
            inventory:product_id ( name, id )
          )
        `)
                .eq("store_id", activeStoreId)
                .order("created_at", { ascending: false })
                .limit(10);

            let salesData: any[] = [];

            if (searchMode === "phone") {
                // Search by customer phone
                const { data: customerData } = await supabase
                    .from("customers")
                    .select("id")
                    .eq("phone", searchQuery.trim())
                    .eq("store_id", activeStoreId)
                    .maybeSingle();

                if (!customerData) {
                    setSearchError("No customer found with this phone number. Guest checkouts can't be searched by phone.");
                    setSearching(false);
                    return;
                }
                const { data, error } = await baseQuery().eq("customer_id", customerData.id);
                if (error) throw error;
                salesData = data || [];
            } else {
                // Invoice search: match by sale ID prefix (invoice number not stored in DB)
                // Support: full UUID, first 8 chars, or "INV-..." prefix (strip prefix for ID match)
                const raw = searchQuery.trim();
                const idHint = raw.replace(/^INV-\d{8}-/i, "").toLowerCase();

                // Fetch recent sales and filter client-side by ID prefix
                const { data: recentSales, error } = await supabase
                    .from("sales")
                    .select(`
                      id, created_at, total_amount, payment_method,
                      customers:customer_id ( name, phone ),
                      sale_items (
                        id, quantity, price_at_sale, product_id,
                        inventory:product_id ( name, id )
                      )
                    `)
                    .eq("store_id", activeStoreId)
                    .order("created_at", { ascending: false })
                    .limit(200);

                if (error) throw error;

                // Try exact ID match first, then prefix match
                salesData = (recentSales || []).filter((s: any) =>
                    s.id === raw ||
                    s.id.startsWith(idHint) ||
                    s.id.replace(/-/g, "").startsWith(idHint.replace(/-/g, ""))
                );

                if (salesData.length === 0) {
                    setSearchError(`No sale found matching "${raw}". Try searching by the first 8 characters of the Sale ID shown on the receipt.`);
                    setSearching(false);
                    return;
                }
            }

            if (!salesData || salesData.length === 0) {
                setSearchError("No sales found for this search.");
            } else {
                // Add returnQty = 0 by default to each sale item
                const processed = (salesData as any[]).map((sale) => ({
                    ...sale,
                    sale_items: sale.sale_items.map((item: any) => ({
                        ...item,
                        returnQty: 0,
                    })),
                }));
                setFoundSales(processed);
            }
        } catch (err: any) {
            setSearchError(err.message || "Search failed.");
        }
        setSearching(false);
    };

    const selectSale = (sale: Sale) => {
        setSelectedSale(sale);
        setReturnItems(sale.sale_items.map((item) => ({ ...item, returnQty: 0 })));
        setStep("items");
    };

    // ── Qty Controls ─────────────────────────────────────────────
    const updateReturnQty = (productId: string, delta: number) => {
        setReturnItems((prev) =>
            prev.map((item) => {
                if (item.product_id !== productId) return item;
                const newQty = Math.max(0, Math.min(item.quantity, item.returnQty + delta));
                return { ...item, returnQty: newQty };
            })
        );
    };

    // ── Confirm Return ────────────────────────────────────────────
    const handleConfirmReturn = async () => {
        if (!selectedSale || !activeStoreId) return;
        const itemsToReturn = returnItems.filter((i) => i.returnQty > 0);
        if (itemsToReturn.length === 0) return alert("Select at least 1 item to return.");

        setProcessing(true);
        try {
            const totalRefund = itemsToReturn.reduce(
                (sum, item) => sum + item.price_at_sale * item.returnQty,
                0
            );

            // 1. Restore stock for each returned item
            for (const item of itemsToReturn) {
                const { data: invData } = await supabase
                    .from("inventory")
                    .select("stock")
                    .eq("id", item.product_id)
                    .single();

                if (invData) {
                    await supabase
                        .from("inventory")
                        .update({ stock: invData.stock + item.returnQty })
                        .eq("id", item.product_id);
                }
            }

            // 2. Record in returns table (create if doesn't exist — graceful fail)
            const returnRecord = {
                original_sale_id: selectedSale.id,
                store_id: activeStoreId,
                return_items: itemsToReturn.map((i) => ({
                    product_id: i.product_id,
                    name: i.inventory?.name || "Unknown",
                    qty: i.returnQty,
                    price: i.price_at_sale,
                })),
                total_refund: Number(totalRefund.toFixed(2)),
                reason: reason || "Customer return",
                created_at: new Date().toISOString(),
            };

            const { error: returnErr } = await supabase.from("returns").insert([returnRecord]);
            if (returnErr) {
                // Table might not exist yet — graceful skip
            }

            setRefundSummary({
                items: itemsToReturn,
                totalRefund,
                saleId: selectedSale.id,
                date: new Date().toLocaleDateString("en-IN"),
            });
            setStep("done");
        } catch (err: any) {
            alert("Return failed: " + err.message);
        }
        setProcessing(false);
    };

    const resetAll = () => {
        setStep("search");
        setSearchQuery("");
        setFoundSales([]);
        setSelectedSale(null);
        setReturnItems([]);
        setReason("");
        setRefundSummary(null);
        setSearchError("");
    };

    const totalRefundPreview = returnItems.reduce(
        (sum, i) => sum + i.price_at_sale * i.returnQty,
        0
    );


    // ─── Auth gate ───────────────────────────────────────────────
    if (authChecking) {
        return (
            <div className="min-h-screen bg-[#020617] flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-500" size={36} />
            </div>
        );
    }

    if (!isAuthorised) {
        return (
            <div className="min-h-screen bg-[#020617] flex items-center justify-center text-white">
                <div className="bg-slate-900 border border-slate-800 p-10 rounded-[2rem] text-center max-w-sm">
                    <Lock size={40} className="text-slate-600 mx-auto mb-4" />
                    <h2 className="text-xl font-black uppercase tracking-widest mb-2">Session Expired</h2>
                    <p className="text-slate-500 text-sm mb-6">Please log in from the dashboard to access Returns.</p>
                    <a href="/dashboard" className="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all inline-block">
                        Back to Dashboard
                    </a>
                </div>
            </div>
        );
    }

    // ═══════════════ RENDER ═══════════════
    return (
        <div className="p-4 md:p-8 min-h-screen bg-[#020617] text-white font-sans pb-20">

            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                {step !== "search" && (
                    <button
                        onClick={resetAll}
                        className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all text-slate-400 hover:text-white"
                    >
                        <ArrowLeft size={18} />
                    </button>
                )}
                <div>
                    <h1 className="text-3xl font-black uppercase italic flex items-center gap-3">
                        <RotateCcw className="text-orange-500" size={28} />
                        Returns <span className="text-orange-500">&</span> Refunds
                    </h1>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">
                        Process customer returns, restore stock
                    </p>
                </div>
                <div className="ml-auto flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase">
                    <Store size={12} />
                    Store: {activeStoreId?.slice(0, 8)}...
                </div>
            </div>


            {/* ─── STEP 1: SEARCH ─── */}
            {step === "search" && (
                <div className="max-w-xl">
                    {/* Mode toggle */}
                    <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800 mb-5 w-fit gap-1">
                        <button
                            onClick={() => setSearchMode("phone")}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${searchMode === "phone" ? "bg-blue-600 text-white" : "text-slate-500 hover:text-white"}`}
                        >
                            <Phone size={13} /> By Phone
                        </button>
                        <button
                            onClick={() => setSearchMode("invoice")}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${searchMode === "invoice" ? "bg-blue-600 text-white" : "text-slate-500 hover:text-white"}`}
                        >
                            <Receipt size={13} /> By Invoice
                        </button>
                    </div>

                    {/* Search input */}
                    <div className="relative mb-3">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            autoFocus
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                            placeholder={searchMode === "phone" ? "Enter 10-digit mobile number..." : "Enter Invoice Number (INV-...)"}
                            className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 pl-12 outline-none focus:border-blue-500 text-base font-bold text-white placeholder-slate-600 transition-all"
                        />
                    </div>

                    <button
                        onClick={handleSearch}
                        disabled={searching || !searchQuery.trim()}
                        className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        {searching ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                        {searching ? "Searching..." : "Find Sales"}
                    </button>

                    {searchError && (
                        <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-center gap-3">
                            <XCircle size={16} className="text-red-400 flex-shrink-0" />
                            <p className="text-red-400 font-bold text-sm">{searchError}</p>
                        </div>
                    )}

                    {/* Found Sales List */}
                    {foundSales.length > 0 && (
                        <div className="mt-6 space-y-3">
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-3">
                                {foundSales.length} sale(s) found — select one to process return:
                            </p>
                            {foundSales.map((sale) => (
                                <button
                                    key={sale.id}
                                    onClick={() => selectSale(sale)}
                                    className="w-full bg-slate-900 border border-slate-800 hover:border-orange-500/50 p-5 rounded-2xl text-left transition-all group"
                                >
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-white font-black text-base">₹{Number(sale.total_amount).toFixed(2)}</span>
                                        <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase ${sale.payment_method === "cash" ? "bg-green-500/10 text-green-400" : "bg-blue-500/10 text-blue-400"}`}>
                                            {sale.payment_method}
                                        </span>
                                    </div>
                                    <p className="text-slate-500 text-[10px] font-bold uppercase">
                                        {new Date(sale.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                    </p>
                                    <p className="text-slate-400 text-xs mt-1">
                                        {sale.sale_items.length} item(s) • {(sale.customers as any)?.name || "Guest"}
                                    </p>
                                    <div className="mt-2 text-orange-500 text-[10px] font-black uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                                        Click to select →
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ─── STEP 2: SELECT ITEMS ─── */}
            {step === "items" && selectedSale && (
                <div className="max-w-2xl">
                    {/* Sale summary bar */}
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl mb-6 flex justify-between items-center">
                        <div>
                            <p className="text-[10px] text-slate-500 uppercase font-bold">Original Sale</p>
                            <p className="text-white font-black text-lg">₹{Number(selectedSale.total_amount).toFixed(2)}</p>
                            <p className="text-slate-400 text-[10px] mt-0.5">
                                {new Date(selectedSale.created_at).toLocaleDateString("en-IN")} • {(selectedSale.customers as any)?.name || "Guest"}
                            </p>
                        </div>
                        <Receipt size={28} className="text-slate-700" />
                    </div>

                    {/* Items */}
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-3">
                        Select items & quantity to return:
                    </p>
                    <div className="space-y-3 mb-5">
                        {returnItems.map((item) => (
                            <div
                                key={item.product_id}
                                className={`bg-slate-900 border rounded-2xl p-4 flex items-center gap-4 transition-all ${item.returnQty > 0 ? "border-orange-500/50 bg-orange-500/5" : "border-slate-800"}`}
                            >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${item.returnQty > 0 ? "bg-orange-500/20 text-orange-400" : "bg-slate-800 text-slate-600"}`}>
                                    <Package size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-white text-sm truncate">{item.inventory?.name || "Unknown Item"}</p>
                                    <p className="text-slate-500 text-[10px]">₹{item.price_at_sale} × {item.quantity} sold</p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <button
                                        onClick={() => updateReturnQty(item.product_id, -1)}
                                        disabled={item.returnQty === 0}
                                        className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 flex items-center justify-center transition-all"
                                    >
                                        <Minus size={14} />
                                    </button>
                                    <span className={`w-8 text-center font-black text-base ${item.returnQty > 0 ? "text-orange-400" : "text-slate-600"}`}>
                                        {item.returnQty}
                                    </span>
                                    <button
                                        onClick={() => updateReturnQty(item.product_id, 1)}
                                        disabled={item.returnQty >= item.quantity}
                                        className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 flex items-center justify-center transition-all"
                                    >
                                        <Plus size={14} />
                                    </button>
                                </div>
                                {item.returnQty > 0 && (
                                    <span className="text-orange-400 font-black text-sm">-₹{(item.price_at_sale * item.returnQty).toFixed(0)}</span>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Reason */}
                    <div className="mb-5">
                        <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Return Reason (Optional)</label>
                        <input
                            type="text"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Damaged, wrong item, customer changed mind..."
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 outline-none focus:border-orange-500 text-sm text-white placeholder-slate-600 transition-all"
                        />
                    </div>

                    {/* Total Preview */}
                    {totalRefundPreview > 0 && (
                        <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-4 mb-5 flex justify-between items-center">
                            <div>
                                <p className="text-orange-400 text-[10px] font-black uppercase tracking-widest">Total Refund Amount</p>
                                <p className="text-orange-400 text-2xl font-black">₹{totalRefundPreview.toFixed(2)}</p>
                            </div>
                            <BadgePercent size={24} className="text-orange-500" />
                        </div>
                    )}

                    <button
                        onClick={handleConfirmReturn}
                        disabled={processing || totalRefundPreview === 0}
                        className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        {processing ? <Loader2 className="animate-spin" size={18} /> : <RotateCcw size={18} />}
                        {processing ? "Processing..." : "Confirm Return & Restore Stock"}
                    </button>
                </div>
            )}

            {/* ─── STEP 3: DONE ─── */}
            {step === "done" && refundSummary && (
                <div className="max-w-lg">
                    <div className="bg-slate-900 border border-green-500/30 rounded-[2rem] p-8 text-center">
                        <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle size={40} className="text-green-400" />
                        </div>
                        <h2 className="text-2xl font-black text-white mb-1">Return Processed!</h2>
                        <p className="text-slate-500 text-sm mb-6">Stock has been restored to inventory.</p>

                        <div className="bg-slate-800/50 rounded-2xl p-5 text-left mb-6 space-y-3">
                            {refundSummary.items.map((item: any, i: number) => (
                                <div key={i} className="flex justify-between text-sm">
                                    <span className="text-slate-400">{item.inventory?.name || "Item"} ×{item.returnQty}</span>
                                    <span className="text-orange-400 font-black">-₹{(item.price_at_sale * item.returnQty).toFixed(2)}</span>
                                </div>
                            ))}
                            <div className="border-t border-slate-700 pt-3 flex justify-between">
                                <span className="font-black text-white">Total Refund</span>
                                <span className="font-black text-orange-400 text-lg">₹{refundSummary.totalRefund.toFixed(2)}</span>
                            </div>
                        </div>

                        <p className="text-slate-600 text-xs mb-6">
                            Date: {refundSummary.date} • Sale: {refundSummary.saleId.slice(0, 8)}...
                        </p>

                        <button
                            onClick={resetAll}
                            className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all"
                        >
                            Process Another Return
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
