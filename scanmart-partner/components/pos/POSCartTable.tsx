import React from 'react';
import { ShoppingCart, X } from 'lucide-react';
import { CartItem, SellUnit } from '../../hooks/useCart';
import { useApp } from '@/lib/AppContext';

const UNIT_LABELS: Record<SellUnit, string> = {
    box: '📦 Box',
    strip: '💊 Strip',
    tablet: '💉 Tab',
    piece: '🔹 Pc',
};

interface POSCartTableProps {
    cart: CartItem[];
    searchTerm: string;
    updateQuantity: (id: string, delta: number) => void;
    removeFromCart: (id: string) => void;
    changeCartItemUnit?: (id: string, unit: SellUnit) => void;
    toggleMute?: (id: string) => void;
}

export default function POSCartTable({ cart, searchTerm, updateQuantity, removeFromCart, changeCartItemUnit, toggleMute }: POSCartTableProps) {
    const { t } = useApp();
    // Determine available units for a product
    const getAvailableUnits = (item: CartItem): SellUnit[] => {
        if (item.pack_size <= 1 && item.strip_size <= 1) return ['piece'];
        const units: SellUnit[] = [];
        if (item.pack_size > 1) units.push('box');
        units.push('strip');
        if (item.strip_size > 1) units.push('tablet');
        return units;
    };

    return (
        <>
            {/* Item LIST Header */}
            <div className="grid grid-cols-12 text-[10px] font-black text-white bg-[#1a237e] uppercase tracking-widest px-2 py-2 border-b border-blue-900 shadow-md">
                <div className="col-span-1 text-center">+/-</div>
                <div className="col-span-4">PRODUCT / BATCH</div>
                <div className="col-span-1 text-center">PACK</div>
                <div className="col-span-1 text-center">MRP</div>
                <div className="col-span-1 text-right">UNIT RATE</div>
                <div className="col-span-2 text-center">QTY</div>
                <div className="col-span-2 text-right pr-2">AMOUNT</div>
            </div>

            {/* Item ROWS */}
            <div className="flex-1 overflow-y-auto relative">
                {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-300">
                        <ShoppingCart size={48} className="mb-3" />
                        <p className="font-bold uppercase tracking-widest text-sm">{t('ready_to_scan')}</p>
                    </div>
                ) : (
                    cart.map((item, idx) => {
                        const availableUnits = getAvailableUnits(item);
                        const showUnitSelector = availableUnits.length > 1;
                        const isMuted = item.is_muted;
                        return (
                            <div key={item.id} className={`grid grid-cols-12 items-center px-2 py-1.5 border-b border-gray-200 group transition-all ${isMuted ? 'bg-gray-100 opacity-50 grayscale' : (idx % 2 === 0 ? 'bg-white' : 'bg-[#f8faff]')}`}>
                                {/* Mute Checkbox */}
                                <div className="col-span-1 flex justify-center items-center">
                                    <input type="checkbox" checked={!isMuted} onChange={() => toggleMute?.(item.id)} className="w-4 h-4 cursor-pointer accent-blue-600" title="Include in Bill" />
                                </div>
                                {/* Product Details */}
                                <div className="col-span-4 flex flex-col justify-center">
                                    <p className={`font-bold text-xs truncate ${isMuted ? 'text-gray-500 line-through' : 'text-blue-900'}`}>{item.name}</p>
                                    <div className="flex gap-2 items-center mt-0.5">
                                      {item.barcode && <p className="text-[9px] font-bold text-gray-500 bg-gray-100 px-1 rounded border border-gray-200">{item.barcode}</p>}
                                      {item.location && <p className="text-[9px] text-blue-500 font-bold">📍{item.location}</p>}
                                    </div>
                                </div>
                                {/* Pack Size / Unit */}
                                <div className="col-span-1 flex flex-col items-center justify-center">
                                    {showUnitSelector ? (
                                        <select
                                            value={item.sell_unit}
                                            onChange={(e) => changeCartItemUnit?.(item.id, e.target.value as SellUnit)}
                                            className="bg-transparent border border-blue-300 rounded px-1 py-0.5 text-[9px] font-black text-blue-700 outline-none cursor-pointer"
                                        >
                                            {availableUnits.map(u => (
                                                <option key={u} value={u}>{UNIT_LABELS[u]}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <span className="text-[10px] font-black text-gray-600">{UNIT_LABELS[item.sell_unit]}</span>
                                    )}
                                </div>
                                {/* MRP */}
                                <div className="col-span-1 text-center text-[10px] font-bold text-gray-500">
                                    {item.mrp.toFixed(2)}
                                </div>
                                {/* UNIT RATE */}
                                <div className="col-span-1 text-right text-[11px] font-black text-green-700">
                                    {item.price.toFixed(2)}
                                </div>
                                {/* QTY */}
                                <div className="col-span-2 flex justify-center">
                                    <div className="flex items-center border border-gray-300 rounded overflow-hidden bg-white shadow-sm">
                                        <button onClick={() => updateQuantity(item.id, -1)} className="px-2 py-1 hover:bg-red-50 text-red-600 font-black text-sm leading-none transition-colors border-r border-gray-200">-</button>
                                        <span className="px-2 text-xs font-black w-8 text-center text-gray-800">{item.quantity}</span>
                                        <button onClick={() => updateQuantity(item.id, 1)} className="px-2 py-1 hover:bg-green-50 text-green-600 font-black text-sm leading-none transition-colors border-l border-gray-200">+</button>
                                    </div>
                                </div>
                                {/* AMOUNT & ACTIONS */}
                                <div className="col-span-2 text-right text-xs font-black flex justify-end items-center gap-2 pr-2">
                                    <span className={isMuted ? 'text-gray-400' : 'text-blue-900'}>
                                        {(item.price * item.quantity).toFixed(2)}
                                    </span>
                                    <button onClick={() => removeFromCart(item.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity bg-red-50 rounded p-1">
                                        <X size={14} strokeWidth={3} />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </>
    );
}
