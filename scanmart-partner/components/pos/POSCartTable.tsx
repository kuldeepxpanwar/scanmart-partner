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
}

export default function POSCartTable({ cart, searchTerm, updateQuantity, removeFromCart, changeCartItemUnit }: POSCartTableProps) {
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
            <div className="grid grid-cols-12 text-[10px] font-black text-gray-500 uppercase tracking-widest px-3 py-1.5 bg-gray-100 border-b border-gray-200">
                <div className="col-span-1">#</div>
                <div className="col-span-4">{t('item_description')}</div>
                <div className="col-span-2 text-center">{t('unit')}</div>
                <div className="col-span-2 text-center">{t('qty')}</div>
                <div className="col-span-1 text-right">{t('rate')}</div>
                <div className="col-span-2 text-right">{t('amount')}</div>
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
                        return (
                            <div key={item.id} className={`grid grid-cols-12 items-center px-3 py-2 border-b border-gray-100 group transition-all hover:bg-blue-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-[#e8f0fe]'}`}>
                                <div className="col-span-1 text-[10px] text-gray-400 font-mono">{idx + 1}</div>
                                <div className="col-span-4">
                                    <p className="font-bold text-xs text-gray-800 truncate">{item.name}</p>
                                    {item.barcode && <p className="text-[9px] text-gray-400">SKU: {item.barcode}</p>}
                                    {item.mrp > item.price && <span className="text-[8px] text-green-600 font-bold">♥ Save ₹{((item.mrp - item.price) * item.quantity).toFixed(0)}</span>}
                                </div>
                                {/* 💊 Unit Selector */}
                                <div className="col-span-2 flex justify-center">
                                    {showUnitSelector ? (
                                        <select
                                            value={item.sell_unit}
                                            onChange={(e) => changeCartItemUnit?.(item.id, e.target.value as SellUnit)}
                                            className="bg-blue-50 border border-blue-300 rounded px-1 py-0.5 text-[9px] font-black text-blue-700 outline-none cursor-pointer"
                                        >
                                            {availableUnits.map(u => (
                                                <option key={u} value={u}>{UNIT_LABELS[u]}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <span className="text-[9px] font-bold text-gray-400">{UNIT_LABELS[item.sell_unit]}</span>
                                    )}
                                </div>
                                <div className="col-span-2 flex justify-center">
                                    <div className="flex items-center border border-blue-300 rounded overflow-hidden">
                                        <button onClick={() => updateQuantity(item.id, -1)} className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-black text-sm">-</button>
                                        <span className="px-2 text-xs font-black w-7 text-center text-gray-800">{item.quantity}</span>
                                        <button onClick={() => updateQuantity(item.id, 1)} className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-black text-sm">+</button>
                                    </div>
                                </div>
                                <div className="col-span-1 text-right text-[10px] font-bold text-gray-600">₹{item.price}</div>
                                <div className="col-span-2 text-right text-xs font-black text-gray-800 flex justify-end items-center gap-1">
                                    ₹{(item.price * item.quantity).toFixed(2)}
                                    <button onClick={() => removeFromCart(item.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 p-0.5">
                                        <X size={12} />
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
