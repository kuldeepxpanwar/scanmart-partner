import React from 'react';
import { ShoppingCart, X } from 'lucide-react';
import { CartItem, SellUnit } from '../../hooks/useCart';
import { useApp } from '@/lib/AppContext';

const UNIT_LABELS: Record<SellUnit, string> = {
    box: 'BOX',
    strip: 'TAB',
    tablet: 'TAB',
    piece: 'PC',
};

// ── Smart Pack Label: reads DB fields, falls back to name parsing ──
const getPackLabel = (item: CartItem & { pack_volume?: number; volume_unit?: string }): string => {
    // Tablets sold as strip
    if (item.sell_unit === 'strip') return `${item.strip_size || 10} TAB`;
    if (item.sell_unit === 'tablet') return 'TAB';
    if (item.sell_unit === 'box') return `${item.pack_size || 1} BOX`;

    // Piece/Syrup/Gel/Cream — use DB pack_volume if set
    if (item.sell_unit === 'piece') {
        const pv = (item as any).pack_volume;
        const pu = ((item as any).volume_unit || '').toLowerCase();

        if (pv && pv > 1 && pu) return `${pv} ${pu.toUpperCase()}`; // "100 ML" / "30 GM"
        if (pv && pv > 1)       return `${pv}`;

        // Fallback: parse name pattern "SYP-1*100" or "GEL-30 GM"
        const name = item.name.toUpperCase();
        const starMatch = name.match(/(\d+)\*(\d+)/);
        if (starMatch) {
            const vol = Number(starMatch[2]);
            if (vol > 1) {
                const unitGuess = /SYP|SYRUP|SOL|LIQ|SUS|DROP/.test(name) ? 'ML'
                               : /GEL|CREAM|OINT|LOTION/.test(name) ? 'GM'
                               : 'ML';
                return `${vol} ${unitGuess}`;
            }
        }
        // Last resort: detect unit from name keywords
        if (/SYP|SYRUP|SOL|SUSP/.test(name)) return '1 ML';
        if (/GEL|CREAM|OINT/.test(name))     return '1 GM';
        return '1 PC';
    }
    return `${item.strip_size || 1} TAB`;
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
    const [activeRowIndex, setActiveRowIndex] = React.useState(0);

    // Reset active row if cart size shrinks below index
    React.useEffect(() => {
        if (activeRowIndex >= cart.length) {
            setActiveRowIndex(Math.max(0, cart.length - 1));
        }
    }, [cart.length, activeRowIndex]);

    // Keyboard Navigation for Cart Table
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (cart.length === 0) return;
            
            // Do not intercept if user is typing in an input field (except maybe we want to allow Escape)
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
                return;
            }

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setActiveRowIndex(prev => Math.min(prev + 1, cart.length - 1));
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setActiveRowIndex(prev => Math.max(prev - 1, 0));
                    break;
                case 'ArrowLeft':
                case '-':
                    e.preventDefault();
                    if (cart[activeRowIndex]) updateQuantity(cart[activeRowIndex].id, -1);
                    break;
                case 'ArrowRight':
                case '+':
                case '=':
                    e.preventDefault();
                    if (cart[activeRowIndex]) updateQuantity(cart[activeRowIndex].id, 1);
                    break;
                case ' ': // Space to toggle mute
                    e.preventDefault();
                    if (cart[activeRowIndex]) toggleMute?.(cart[activeRowIndex].id);
                    break;
                case 'Delete':
                case 'Backspace':
                    // e.preventDefault();
                    // Optional: remove item on delete
                    // if (cart[activeRowIndex]) removeFromCart(cart[activeRowIndex].id);
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [cart, activeRowIndex, updateQuantity, toggleMute, removeFromCart]);

    // Determine available units for a product
    const getAvailableUnits = (item: CartItem): SellUnit[] => {
        if (item.pack_size <= 1 && item.strip_size <= 1) return ['piece'];
        const units: SellUnit[] = [];
        if (item.pack_size > 1) units.push('box');
        units.push('strip');
        if (item.strip_size > 1) units.push('tablet');
        return units;
    };

    const activeItem = cart[activeRowIndex];

    return (
        <div className="flex flex-col h-full bg-white relative">
            {/* Item LIST Header */}
            <div className="grid grid-cols-12 text-[10px] font-black text-white bg-[#1a237e] uppercase tracking-widest px-2 py-2 border-b border-blue-900 shadow-md">
                <div className="col-span-1 text-center">+/-</div>
                <div className="col-span-3">PRODUCT NAME</div>
                <div className="col-span-1 text-center">PACK</div>
                <div className="col-span-1 text-center">MRP</div>
                <div className="col-span-1 text-center">BATCH</div>
                <div className="col-span-1 text-center">EXPIRY</div>
                <div className="col-span-1 text-center">RATE</div>
                <div className="col-span-2 text-center">QTY</div>
                <div className="col-span-1 text-right pr-2">AMOUNT</div>
            </div>

            {/* Item ROWS */}
            <div className="flex-1 overflow-y-auto relative pb-8">
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
                        const isActive = idx === activeRowIndex;

                        return (
                            <div key={item.id} 
                                onClick={() => setActiveRowIndex(idx)}
                                className={`grid grid-cols-12 items-center px-2 py-1.5 border-b border-gray-200 group transition-all cursor-pointer
                                ${isActive ? 'ring-2 ring-inset ring-blue-500 bg-blue-50 shadow-sm' : ''} 
                                ${isMuted ? 'bg-gray-100 opacity-60 grayscale' : (!isActive && idx % 2 === 0 ? 'bg-white' : (!isActive ? 'bg-[#f8faff]' : ''))}`}
                            >
                                {/* Mute Checkbox */}
                                <div className="col-span-1 flex justify-center items-center">
                                    <input type="checkbox" checked={!isMuted} onChange={() => toggleMute?.(item.id)} className="w-4 h-4 cursor-pointer accent-blue-600" title="Include in Bill" />
                                </div>
                                {/* Product Details */}
                                <div className="col-span-3 flex flex-col justify-center pr-1">
                                    <p className={`font-bold text-[11px] truncate ${isMuted ? 'text-gray-500 line-through' : 'text-blue-900'}`} title={item.name}>{item.name}</p>
                                    <div className="flex gap-2 items-center mt-0.5">
                                      {item.location && <p className="text-[8px] text-blue-500 font-bold">📍{item.location}</p>}
                                    </div>
                                </div>
                                {/* Pack Size / Unit */}
                                <div className="col-span-1 flex flex-col items-center justify-center">
                                    <span className="text-[10px] font-black text-gray-600 uppercase">
                                        {getPackLabel(item as any)}
                                    </span>
                                </div>
                                {/* MRP */}
                                <div className="col-span-1 text-center text-[10px] font-bold text-gray-500">
                                    {item.mrp.toFixed(2)}
                                </div>
                                {/* BATCH (Placeholder until DB link) */}
                                <div className="col-span-1 text-center text-[10px] font-bold text-green-700">
                                    {(item as any).batch_no || '---'}
                                </div>
                                {/* EXPIRY (Placeholder until DB link) */}
                                <div className="col-span-1 text-center text-[10px] font-bold text-red-600">
                                    {(item as any).expiry_date ? new Date((item as any).expiry_date).toLocaleDateString('en-GB', { month: '2-digit', year: '2-digit' }) : '---'}
                                </div>
                                {/* UNIT RATE */}
                                <div className="col-span-1 text-center text-[11px] font-black text-blue-800">
                                    {item.price.toFixed(2)}
                                </div>
                                {/* QTY */}
                                <div className="col-span-2 flex justify-center">
                                    <div className="flex items-center border border-gray-300 rounded overflow-hidden bg-white shadow-sm h-6">
                                        <button onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, -1); }} className="px-1.5 hover:bg-red-50 text-red-600 font-black text-sm leading-none transition-colors border-r border-gray-200">-</button>
                                        <span className="px-1.5 text-xs font-black w-6 text-center text-gray-800">{item.quantity}</span>
                                        <button onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, 1); }} className="px-1.5 hover:bg-green-50 text-green-600 font-black text-sm leading-none transition-colors border-l border-gray-200">+</button>
                                    </div>
                                </div>
                                {/* AMOUNT & ACTIONS */}
                                <div className="col-span-1 text-right text-xs font-black flex justify-end items-center gap-1 pr-2">
                                    <span className={isMuted ? 'text-gray-400' : 'text-blue-900'}>
                                        {(item.price * item.quantity).toFixed(2)}
                                    </span>
                                    <button onClick={(e) => { e.stopPropagation(); removeFromCart(item.id); }} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity bg-red-50 rounded p-0.5">
                                        <X size={12} strokeWidth={3} />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Dynamic Footer Panel (Item Details) */}
            {activeItem && (
                <div className="absolute bottom-0 left-0 right-0 bg-[#fffde7] border-t border-amber-200 p-2 flex justify-between items-center text-[10px] font-bold text-gray-800 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-10">
                    <div className="flex gap-4">
                        <span><span className="text-gray-500 uppercase">Stock:</span> <span className="text-blue-700">{activeItem.stock}</span> <span className="text-gray-400 font-normal">{activeItem.sell_unit}s</span></span>
                        <span><span className="text-gray-500 uppercase">Rack:</span> <span className="text-blue-700">{activeItem.location || 'N/A'}</span></span>
                        <span><span className="text-gray-500 uppercase">Buy Price:</span> <span className="text-blue-700">₹{activeItem.buying_price?.toFixed(2) || 'N/A'}</span></span>
                    </div>
                    <div>
                        <span className="text-gray-500 uppercase tracking-widest mr-1">Est. Margin:</span>
                        <span className="text-green-700 font-black text-xs bg-green-100 px-1.5 py-0.5 rounded border border-green-200">
                           {activeItem.buying_price && activeItem.price > 0 ? `${(((activeItem.price - activeItem.buying_price) / activeItem.price) * 100).toFixed(1)}%` : 'N/A'}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
