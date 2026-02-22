import { useState } from 'react';

export interface CartItem {
    id: string;
    name: string;
    price: number;
    mrp: number;
    quantity: number;
    stock: number;
    barcode?: string;
    buying_price?: number;
    gst_rate?: number;
}

export interface HoldBill {
    label: string;
    cart: CartItem[];
    phone: string;
    name: string;
    totalSpent: number;
}

export function useCart(products: any[]) {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [discountValue, setDiscountValue] = useState(0);
    const [discountType, setDiscountType] = useState<'percent' | 'flat'>('percent');
    const [heldBills, setHeldBills] = useState<HoldBill[]>([]);
    const [phone, setPhone] = useState("");
    const [name, setName] = useState("");
    const [totalSpent, setTotalSpent] = useState(0);

    // --- CART OPERATIONS ---
    const addToCart = (product: any) => {
        setCart((prev) => {
            const existing = prev.find((item) => item.id === product.id);
            if (existing) {
                if (existing.quantity >= product.stock) return prev;
                return prev.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, {
                ...product,
                mrp: Number(product.mrp || product.price),
                quantity: 1
            }];
        });
    };

    const updateQuantity = (id: string, delta: number) => {
        setCart((prev) => {
            const newCart = prev.map((item) => {
                if (item.id === id) {
                    const newQty = item.quantity + delta;
                    if (newQty <= 0) return null; // Mark for removal
                    const product = products.find((p) => p.id === id);
                    if (product && newQty > product.stock) return item; // Limit to stock
                    return { ...item, quantity: newQty };
                }
                return item;
            }).filter(Boolean) as CartItem[]; // Remove nulls
            return newCart;
        });
    };

    const removeFromCart = (id: string) => {
        setCart((prev) => prev.filter((item) => item.id !== id));
    };

    const clearCart = () => {
        setCart([]);
        setDiscountValue(0);
    };

    const resetCustomer = () => {
        setPhone("");
        setName("");
        setTotalSpent(0);
    }

    // --- CALCULATIONS ---
    const calculateTotals = () => {
        let subTotal = 0;
        let totalSavings = 0;

        cart.forEach(item => {
            const price = Number(item.price || 0);
            const mrp = Number(item.mrp || price);
            subTotal += price * item.quantity;
            if (mrp > price) {
                totalSavings += (mrp - price) * item.quantity;
            }
        });

        let discountAmount = 0;
        if (discountValue > 0) {
            discountAmount = discountType === 'percent'
                ? (subTotal * discountValue) / 100
                : Math.min(discountValue, subTotal);
            totalSavings += discountAmount;
        }

        const finalTotal = Math.max(0, subTotal - discountAmount);
        return { subTotal, totalSavings, finalTotal, discountAmount };
    };

    const { subTotal, totalSavings, finalTotal, discountAmount } = calculateTotals();

    // --- HOLD BILLS LOGIC ---
    const holdCurrentBill = () => {
        if (cart.length === 0) {
            alert("Cart is empty!");
            return;
        }
        const holdLabel = `Hold #${heldBills.length + 1} - ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
        setHeldBills(prev => [...prev, { label: holdLabel, cart: [...cart], phone, name, totalSpent }]);
        clearCart();
        resetCustomer();
        alert(`⏸️ Bill held as "${holdLabel}"`);
    };

    const recallBill = (bill: HoldBill) => {
        if (cart.length > 0 && !confirm("Current cart will be replaced. Continue?")) return;
        setCart(bill.cart);
        setPhone(bill.phone);
        setName(bill.name);
        setTotalSpent(bill.totalSpent);
        setHeldBills(prev => prev.filter(b => b.label !== bill.label));
    };

    const removeHeldBill = (label: string) => {
        setHeldBills(prev => prev.filter(b => b.label !== label));
    };

    return {
        cart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        discountValue,
        setDiscountValue,
        discountType,
        setDiscountType,
        subTotal,
        totalSavings,
        finalTotal,
        discountAmount,
        phone, setPhone,
        name, setName,
        totalSpent, setTotalSpent,
        heldBills,
        holdCurrentBill,
        recallBill,
        removeHeldBill,
        resetCustomer
    };
}
