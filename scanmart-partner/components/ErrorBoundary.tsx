"use client";
import React from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

interface Props { children: React.ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export default class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error("[ErrorBoundary] Caught error:", error, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 text-white">
                    <div className="bg-slate-900 border border-red-500/20 p-10 rounded-[2.5rem] max-w-md w-full text-center shadow-2xl relative overflow-hidden">
                        {/* Glow */}
                        <div className="absolute inset-0 bg-gradient-to-br from-red-900/20 to-transparent pointer-events-none" />

                        <div className="relative z-10">
                            <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <AlertTriangle size={40} className="text-red-500" />
                            </div>

                            <h1 className="text-2xl font-black uppercase tracking-tight mb-2">
                                Something <span className="text-red-500">Crashed</span>
                            </h1>
                            <p className="text-slate-400 text-sm mb-2">
                                An unexpected error occurred in this section.
                            </p>

                            {this.state.error && (
                                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 mb-6 text-left overflow-x-auto">
                                    <p className="text-red-400 text-[11px] font-mono break-all">
                                        {this.state.error.message}
                                    </p>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={() => this.setState({ hasError: false, error: null })}
                                    className="flex-1 bg-blue-600 hover:bg-blue-500 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
                                >
                                    <RotateCcw size={16} /> Try Again
                                </button>
                                <button
                                    onClick={() => window.location.href = "/dashboard"}
                                    className="flex-1 bg-slate-800 hover:bg-slate-700 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
                                >
                                    <Home size={16} /> Dashboard
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}
