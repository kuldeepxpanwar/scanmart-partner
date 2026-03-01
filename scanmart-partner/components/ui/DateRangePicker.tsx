'use client';
import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface DateRange {
    from: Date | null;
    to: Date | null;
}
interface Props {
    value: DateRange;
    onChange: (range: DateRange) => void;
    placeholder?: string;
    className?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(d: Date) {
    return `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`;
}
function sameDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function inRange(d: Date, from: Date, to: Date) {
    return d > from && d < to;
}

export default function DateRangePicker({ value, onChange, placeholder = 'Select date range', className = '' }: Props) {
    const today = new Date();
    const [open, setOpen] = useState(false);
    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth());
    const [hovering, setHovering] = useState<Date | null>(null);
    const [picking, setPicking] = useState<'from' | 'to'>('from'); // which end we're selecting
    const ref = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    // ── Calendar grid ──────────────────────────────────────────────────────────
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewYear, viewMonth, d));

    // ── Navigate ───────────────────────────────────────────────────────────────
    function prevMonth() {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
        else setViewMonth(m => m - 1);
    }
    function nextMonth() {
        if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
        else setViewMonth(m => m + 1);
    }

    // ── Day click ──────────────────────────────────────────────────────────────
    function handleDayClick(day: Date) {
        if (picking === 'from') {
            onChange({ from: day, to: null });
            setPicking('to');
        } else {
            if (value.from && day < value.from) {
                // clicked before from — swap
                onChange({ from: day, to: value.from });
            } else {
                onChange({ from: value.from, to: day });
            }
            setPicking('from');
            setOpen(false);
        }
    }

    // ── Quick selects ──────────────────────────────────────────────────────────
    function quickSelect(days: number) {
        const to = new Date();
        const from = new Date();
        from.setDate(from.getDate() - days);
        onChange({ from, to });
        setOpen(false);
    }
    function quickToday() {
        const d = new Date();
        onChange({ from: d, to: d });
        setOpen(false);
    }

    // ── Day styling ────────────────────────────────────────────────────────────
    function dayClass(day: Date) {
        const isFrom = value.from && sameDay(day, value.from);
        const isTo = value.to && sameDay(day, value.to);
        const isToday = sameDay(day, today);
        const hoverEnd = hovering ?? (picking === 'to' ? null : null);
        const isInRange = value.from && value.to && inRange(day, value.from, value.to);
        const isHoverRange =
            picking === 'to' && value.from && hovering &&
            hovering > value.from && inRange(day, value.from, hovering);

        let base = 'w-8 h-8 flex items-center justify-center text-sm rounded-full cursor-pointer transition-all select-none ';

        if (isFrom || isTo) return base + 'bg-blue-600 text-white font-bold';
        if (isInRange || isHoverRange) return base + 'bg-blue-500/20 text-blue-300 rounded-none';
        if (isToday) return base + 'border border-blue-500/50 text-blue-400';
        return base + 'text-slate-300 hover:bg-slate-700';
    }

    // ── Display label ──────────────────────────────────────────────────────────
    const label = value.from
        ? value.to && !sameDay(value.from, value.to)
            ? `${fmt(value.from)} → ${fmt(value.to)}`
            : fmt(value.from)
        : placeholder;

    return (
        <div ref={ref} className={`relative ${className}`}>
            {/* Trigger button */}
            <button
                onClick={() => { setOpen(o => !o); setPicking(value.from && !value.to ? 'to' : 'from'); }}
                className="flex items-center gap-2 bg-slate-800 border border-slate-700 hover:border-blue-500/50 px-3 py-2 rounded-xl text-sm transition-all w-full"
            >
                <Calendar size={14} className="text-blue-400 shrink-0" />
                <span className={value.from ? 'text-white' : 'text-slate-500'}>{label}</span>
                {value.from && (
                    <button
                        className="ml-auto text-slate-500 hover:text-red-400 transition-colors"
                        onClick={e => { e.stopPropagation(); onChange({ from: null, to: null }); setOpen(false); }}
                    >
                        <X size={12} />
                    </button>
                )}
            </button>

            {/* Dropdown calendar */}
            {open && (
                <div className="absolute top-full mt-2 z-[200] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-4 min-w-[280px]">

                    {/* Quick selects */}
                    <div className="flex gap-1 mb-3 flex-wrap">
                        {[
                            { label: 'Today', fn: quickToday },
                            { label: '7 Days', fn: () => quickSelect(7) },
                            { label: '30 Days', fn: () => quickSelect(30) },
                            { label: '90 Days', fn: () => quickSelect(90) },
                        ].map(q => (
                            <button
                                key={q.label}
                                onClick={q.fn}
                                className="text-xs px-3 py-1 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 transition-all font-medium border border-blue-500/20"
                            >
                                {q.label}
                            </button>
                        ))}
                    </div>

                    {/* Month navigation */}
                    <div className="flex items-center justify-between mb-3">
                        <button onClick={prevMonth} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-700 transition-all text-slate-400">
                            <ChevronLeft size={16} />
                        </button>
                        <span className="text-sm font-bold text-white">{MONTHS[viewMonth]}, {viewYear}</span>
                        <button onClick={nextMonth} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-700 transition-all text-slate-400">
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    {/* Day headers */}
                    <div className="grid grid-cols-7 mb-1">
                        {DAYS.map(d => (
                            <div key={d} className="text-center text-[10px] font-bold text-slate-500 pb-1">{d}</div>
                        ))}
                    </div>

                    {/* Calendar grid */}
                    <div className="grid grid-cols-7 gap-y-1">
                        {cells.map((day, i) => day ? (
                            <div
                                key={i}
                                className={dayClass(day)}
                                onClick={() => handleDayClick(day)}
                                onMouseEnter={() => setHovering(day)}
                                onMouseLeave={() => setHovering(null)}
                            >
                                {day.getDate()}
                            </div>
                        ) : (
                            <div key={i} />
                        ))}
                    </div>

                    {/* Footer */}
                    <div className="flex justify-between items-center mt-3 border-t border-slate-800 pt-3">
                        <span className="text-[10px] text-slate-500">
                            {picking === 'from' ? 'Select start date' : 'Select end date'}
                        </span>
                        <button
                            onClick={() => { onChange({ from: null, to: null }); setPicking('from'); }}
                            className="text-xs text-blue-400 hover:text-blue-300"
                        >
                            Clear
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
