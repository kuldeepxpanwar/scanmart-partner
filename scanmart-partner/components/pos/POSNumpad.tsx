import React, { useEffect } from 'react';

interface POSNumpadProps {
    numpadTarget: 'mobile' | 'discount' | null;
    phone: string;
    setPhone: (val: string) => void;
    discountValue: number;
    setDiscountValue: (val: number | ((prev: number) => number)) => void;
    handlePhoneSearch: (phone: string) => void;
    setIsExisting: (val: boolean) => void;
    setName: (val: string) => void;
}

export default function POSNumpad({
    numpadTarget,
    phone,
    setPhone,
    discountValue,
    setDiscountValue,
    handlePhoneSearch,
    setIsExisting,
    setName
}: POSNumpadProps) {
    // Standard calculator layout: 7,8,9 / 4,5,6 / 1,2,3 / C,0,⌫
    const numpadKeys = ['7', '8', '9', '4', '5', '6', '1', '2', '3', 'C', '0', '<'];

    const handleNumpad = (val: string) => {
        if (numpadTarget === 'mobile') {
            if (val === 'C') {
                setPhone('');
                setIsExisting(false);
                setName('');
            } else if (val === '<') {
                handlePhoneSearch(phone.slice(0, -1));
            } else if (phone.length < 10) {
                handlePhoneSearch(phone + val);
            }
        } else if (numpadTarget === 'discount') {
            if (val === 'C') {
                setDiscountValue(0);
            } else if (val === '<') {
                setDiscountValue((prev: number) => Math.floor(prev / 10));
            } else {
                setDiscountValue((prev: number) => Number(String(prev) + val) || 0);
            }
        }
    };

    // ⌨️ Keyboard support — desktop users can type without touching numpad
    useEffect(() => {
        if (!numpadTarget) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if user is typing in an input/textarea elsewhere
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;

            if (e.key >= '0' && e.key <= '9') {
                e.preventDefault();
                handleNumpad(e.key);
            } else if (e.key === 'Backspace') {
                e.preventDefault();
                handleNumpad('<');
            } else if (e.key === 'Escape') {
                e.preventDefault();
                handleNumpad('C');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [numpadTarget, phone, discountValue]);

    return (
        <div className="p-3 grid grid-cols-3 gap-2 flex-shrink-0">
            {numpadKeys.map(k => (
                <button
                    key={k}
                    onClick={() => handleNumpad(k)}
                    className={`py-4 rounded-xl font-black text-base transition-all active:scale-95 shadow-sm
            ${k === 'C' ? 'bg-red-600 text-white hover:bg-red-500' :
                            k === '<' ? 'bg-orange-500 text-white hover:bg-orange-400' :
                                'bg-white hover:bg-blue-600 hover:text-white text-gray-800 border border-gray-200'
                        }`}
                >
                    {k === '<' ? '⌫' : k}
                </button>
            ))}
        </div>
    );
}
