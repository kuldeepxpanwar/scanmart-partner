import React from 'react';
import { ShoppingCart, X } from 'lucide-react';
import { CartItem } from '../../hooks/useCart';

interface POSCartTableProps {
    cart: CartItem[];
    searchTerm: string;
    updateQuantity: (id: string, delta: number) => void;
    removeFromCart: (id: string) => void;
}

export default function POSCartTable({ cart, searchTerm, updateQuantity, removeFromCart }: POSCartTableProps) {
    return (
        <>
            {/* Item LIST Header */}
            <div className="grid grid-cols-12 text-[10px] font-black text-gray-500 uppercase tracking-widest px-3 py-1.5 bg-gray-100 border-b border-gray-200">
                <div className="col-span-1">#</div>
                <div className="col-span-5">Item Description</div>
                <div className="col-span-2 text-center">Qty</div>
                <div className="col-span-2 text-right">Rate</div>
                <div className="col-span-2 text-right">Amount</div>
            </div>

            {/* Item ROWS */}
            <div className="flex-1 overflow-y-auto relative">
                {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-300">
                        <ShoppingCart size={48} className="mb-3" />
                        <p className="font-bold uppercase tracking-widest text-sm">Ready to Scan</p>
                    </div>
                ) : (
                    cart.map((item, idx) => (
                        <div key={item.id} className={`grid grid-cols-12 items-center px-3 py-2 border-b border-gray-100 group transition-all hover:bg-blue-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-[#e8f0fe]'}`}>
                            <div className="col-span-1 text-[10px] text-gray-400 font-mono">{idx + 1}</div>
                            <div className="col-span-5">
                                <p className="font-bold text-xs text-gray-800 truncate">{item.name}</p>
                                {item.barcode && <p className="text-[9px] text-gray-400">SKU: {item.barcode}</p>}
                                {item.mrp > item.price && <span className="text-[8px] text-green-600 font-bold">♥ Save ₹{((item.mrp - item.price) * item.quantity).toFixed(0)}</span>}
                            </div>
                            <div className="col-span-2 flex justify-center">
                                <div className="flex items-center border border-blue-300 rounded overflow-hidden">
                                    <button onClick={() => updateQuantity(item.id, -1)} className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-black text-sm">-</button>
                                    <span className="px-2 text-xs font-black w-7 text-center text-gray-800">{item.quantity}</span>
                                    <button onClick={() => updateQuantity(item.id, 1)} className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-black text-sm">+</button>
                                </div>
                            </div>
                            <div className="col-span-2 text-right text-xs font-bold text-gray-600">₹{item.price}</div>
                            <div className="col-span-2 text-right text-xs font-black text-gray-800 flex justify-end items-center gap-1">
                                ₹{(item.price * item.quantity).toFixed(2)}
                                <button onClick={() => removeFromCart(item.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 p-0.5">
                                    <X size={12} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </>
    );
}
