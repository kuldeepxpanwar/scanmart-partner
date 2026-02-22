"use client";
import React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface PaginatorProps {
    currentPage: number;       // 1-indexed
    totalItems: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    className?: string;
}

export default function Paginator({
    currentPage,
    totalItems,
    pageSize,
    onPageChange,
    className = "",
}: PaginatorProps) {
    const totalPages = Math.ceil(totalItems / pageSize);
    if (totalPages <= 1) return null;

    const from = (currentPage - 1) * pageSize + 1;
    const to = Math.min(currentPage * pageSize, totalItems);

    // Build page window: always show first, last, and 3 around current
    const pages: (number | "...")[] = [];
    const WINDOW = 2;
    for (let i = 1; i <= totalPages; i++) {
        if (
            i === 1 ||
            i === totalPages ||
            (i >= currentPage - WINDOW && i <= currentPage + WINDOW)
        ) {
            pages.push(i);
        } else if (
            (i === currentPage - WINDOW - 1 && i > 1) ||
            (i === currentPage + WINDOW + 1 && i < totalPages)
        ) {
            pages.push("...");
        }
    }

    return (
        <div className={`flex items-center justify-between gap-4 flex-wrap mt-4 ${className}`}>
            {/* Count label */}
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                Showing <span className="text-white">{from}–{to}</span> of{" "}
                <span className="text-white">{totalItems}</span>
            </p>

            {/* Page controls */}
            <div className="flex items-center gap-1">
                {/* First */}
                <button
                    onClick={() => onPageChange(1)}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="First page"
                >
                    <ChevronsLeft size={14} />
                </button>

                {/* Prev */}
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="Previous page"
                >
                    <ChevronLeft size={14} />
                </button>

                {/* Page numbers */}
                {pages.map((p, i) =>
                    p === "..." ? (
                        <span key={`dots-${i}`} className="px-1 text-slate-600 text-xs font-bold select-none">
                            ···
                        </span>
                    ) : (
                        <button
                            key={p}
                            onClick={() => onPageChange(p as number)}
                            className={`min-w-[30px] h-[30px] rounded-lg text-xs font-black transition-all ${p === currentPage
                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-900/30"
                                    : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
                                }`}
                        >
                            {p}
                        </button>
                    )
                )}

                {/* Next */}
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="Next page"
                >
                    <ChevronRight size={14} />
                </button>

                {/* Last */}
                <button
                    onClick={() => onPageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="Last page"
                >
                    <ChevronsRight size={14} />
                </button>
            </div>
        </div>
    );
}
