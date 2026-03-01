'use client';
import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react';

interface DateRange { from: Date | null; to: Date | null; }
interface Props {
    value: DateRange;
    onChange: (r: DateRange) => void;
    placeholder?: string;
    className?: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FULL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function fmt(d: Date) {
    return `${d.getDate().toString().padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
function sameDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function DateRangePicker({ value, onChange, placeholder = 'All dates', className = '' }: Props) {
    const today = new Date();
    const [open, setOpen] = useState(false);
    const [year, setYear] = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth());
    const [hover, setHover] = useState<Date | null>(null);
    const [stage, setStage] = useState<'from' | 'to'>('from');
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', fn);
        return () => document.removeEventListener('mousedown', fn);
    }, []);

    // ── Calendar grid ──────────────────────────────────────────────────────────
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

    function prev() { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); }
    function next() { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); }

    function pick(day: Date) {
        if (stage === 'from') {
            onChange({ from: day, to: null });
            setStage('to');
        } else {
            if (value.from && day < value.from) onChange({ from: day, to: value.from });
            else onChange({ from: value.from, to: day });
            setStage('from');
            setOpen(false);
        }
    }

    function quick(days: number) {
        const to = new Date();
        if (days === 0) { onChange({ from: to, to }); }
        else {
            const from = new Date(); from.setDate(from.getDate() - days);
            onChange({ from, to });
        }
        setOpen(false);
    }

    function clear() { onChange({ from: null, to: null }); setStage('from'); }

    // ── Day class ───────────────────────────────────────────────────────────────
    function dayClass(day: Date): string {
        const isFrom = value.from && sameDay(day, value.from);
        const isTo = value.to && sameDay(day, value.to);
        const isToday = sameDay(day, today);

        const activeEnd = stage === 'to' && hover ? hover : value.to;
        const inRange = value.from && activeEnd && day > value.from && day < activeEnd;

        if (isFrom || isTo) return 'w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center cursor-pointer select-none';
        if (inRange) return 'w-7 h-7 rounded-full bg-blue-600/20 text-blue-300 text-xs flex items-center justify-center cursor-pointer select-none';
        if (isToday) return 'w-7 h-7 rounded-full border border-blue-500 text-blue-400 text-xs flex items-center justify-center cursor-pointer select-none';
        return 'w-7 h-7 rounded-full text-slate-400 text-xs flex items-center justify-center cursor-pointer hover:bg-slate-700 select-none';
    }

    // ── Label ───────────────────────────────────────────────────────────────────
    const label = value.from
        ? value.to && !sameDay(value.from, value.to)
            ? `${fmt(value.from)} – ${fmt(value.to)}`
            : fmt(value.from)
        : placeholder;

    return (
        <div ref={ref} className={`relative ${className}`}>
            {/* Trigger */}
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center gap-2 bg-slate-800/80 border border-slate-700 hover:border-blue-500/60 px-3 py-2 rounded-lg text-xs transition-all"
            >
                <Calendar size={13} className="text-blue-400 shrink-0" />
                <span className={`flex-1 text-left truncate ${value.from ? 'text-white' : 'text-slate-500'}`}>{label}</span>
                {value.from && (
                    <span onClick={e => { e.stopPropagation(); clear(); }} className="text-slate-500 hover:text-red-400 transition-colors">
                        <X size={12} />
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute left-0 top-full mt-1 z-[300] bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden"
                    style={{ width: 260 }}>

                    {/* Quick selects row */}
                    <div className="flex gap-1 p-2 bg-slate-950/60 border-b border-slate-800">
                        {[['Today', 0], ['7D', 7], ['30D', 30], ['90D', 90]].map(([lbl, d]) => (
                            <button key={lbl as string}
                                onClick={() => quick(d as number)}
                                className="flex-1 py-1 text-[10px] font-bold rounded-md bg-blue-600/20 text-blue-400 hover:bg-blue-600/50 hover:text-white transition-all">
                                {lbl as string}
                            </button>
                        ))}
                    </div>

                    {/* Month nav */}
                    <div className="flex items-center justify-between px-3 py-2">
                        <button onClick={prev} className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-700 text-slate-400 transition-all">
                            <ChevronLeft size={14} />
                        </button>
                        <span className="text-xs font-bold text-white">{FULL_MONTHS[month]} {year}</span>
                        <button onClick={next} className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-700 text-slate-400 transition-all">
                            <ChevronRight size={14} />
                        </button>
                    </div>

                    {/* Day headers */}
                    <div className="grid grid-cols-7 px-2 pb-1">
                        {DAYS.map(d => (
                            <div key={d} className="flex justify-center">
                                <span className="text-[9px] font-bold text-slate-600">{d}</span>
                            </div>
                        ))}
                    </div>

                    {/* Calendar grid */}
                    <div className="grid grid-cols-7 gap-y-0.5 px-2 pb-2">
                        {cells.map((day, i) =>
                            day ? (
                                <div key={i} className="flex justify-center"
                                    onClick={() => pick(day)}
                                    onMouseEnter={() => setHover(day)}
                                    onMouseLeave={() => setHover(null)}>
                                    <div className={dayClass(day)}>{day.getDate()}</div>
                                </div>
                            ) : <div key={i} />
                        )}
                    </div>

                    {/* Footer hint */}
                    <div className="border-t border-slate-800 px-3 py-1.5 flex justify-between items-center">
                        <span className="text-[9px] text-slate-600">
                            {stage === 'from' ? '① Pick start date' : '② Pick end date'}
                        </span>
                        <button onClick={clear} className="text-[9px] text-slate-500 hover:text-red-400 transition-colors">Clear</button>
                    </div>
                </div>
            )}
        </div>
    );
}
