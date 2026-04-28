import { useState } from 'react';

export type SellUnit = 'box' | 'strip' | 'tablet' | 'piece';

export interface CartItem {
    id: string;
    name: string;
    price: number;        // price per selected unit
    mrp: number;          // MRP per strip (original)
    quantity: number;
    stock: number;        // total stock in tablets (smallest unit)
    barcode?: string;
    buying_price?: number;
    gst_rate?: number;
    is_muted?: boolean;
    // 💊 Multi-unit fields
    pack_size: number;    // strips per box
    strip_size: number;   // tablets per strip
    sell_unit: SellUnit;  // current selling unit for this cart item
    base_price: number;   // original price per strip from inventory
    base_mrp: number;     // original MRP per strip from inventory
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
    // 💊 Calculate price for a given unit
    const getUnitPrice = (basePrice: number, packSize: number, stripSize: number, unit: SellUnit) => {
        switch (unit) {
            case 'box': return basePrice * packSize;
            case 'strip': return basePrice;
            case 'tablet': return Math.round((basePrice / stripSize) * 100) / 100;
            case 'piece': return basePrice;
            default: return basePrice;
        }
    };

    // 💊 How many tablets does 1 unit of this type represent?
    const getTabletsPerUnit = (packSize: number, stripSize: number, unit: SellUnit) => {
        switch (unit) {
            case 'box': return packSize * stripSize;
            case 'strip': return stripSize;
            case 'tablet': return 1;
            case 'piece': return 1;
            default: return stripSize;
        }
    };

    const addToCart = (product: any, unitOverride?: SellUnit) => {
        const packSize = Number(product.pack_size) || 1;
        const stripSize = Number(product.strip_size) || 1;
        const defaultUnit: SellUnit = unitOverride || product.sell_unit || 'strip';
        const basePrice = Number(product.price || 0);
        const baseMrp = Number(product.mrp || product.price || 0);

        setCart((prev) => {
            const existing = prev.find((item) => item.id === product.id);
            if (existing) {
                // Stock check in tablets
                const tabletsPerUnit = getTabletsPerUnit(existing.pack_size, existing.strip_size, existing.sell_unit);
                const newTablets = (existing.quantity + 1) * tabletsPerUnit;
                if (newTablets > product.stock) return prev;
                return prev.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            }

            const unitPrice = getUnitPrice(basePrice, packSize, stripSize, defaultUnit);
            const unitMrp = getUnitPrice(baseMrp, packSize, stripSize, defaultUnit);

            return [...prev, {
                ...product,
                price: unitPrice,
                mrp: unitMrp,
                quantity: 1,
                pack_size: packSize,
                strip_size: stripSize,
                sell_unit: defaultUnit,
                base_price: basePrice,
                base_mrp: baseMrp,
            }];
        });
    };

    // 💊 Change sell unit for an item already in cart
    const changeCartItemUnit = (id: string, newUnit: SellUnit) => {
        setCart((prev) => prev.map((item) => {
            if (item.id !== id) return item;
            const newPrice = getUnitPrice(item.base_price, item.pack_size, item.strip_size, newUnit);
            const newMrp = getUnitPrice(item.base_mrp, item.pack_size, item.strip_size, newUnit);
            // Reset quantity to 1 when changing unit to avoid stock overflow
            return { ...item, sell_unit: newUnit, price: newPrice, mrp: newMrp, quantity: 1 };
        }));
    };

    const updateQuantity = (id: string, delta: number) => {
        setCart((prev) => {
            const newCart = prev.map((item) => {
                if (item.id === id) {
                    const newQty = item.quantity + delta;
                    if (newQty <= 0) return null; // Mark for removal
                    // 💊 Stock check in tablets (smallest unit)
                    const product = products.find((p: any) => p.id === id);
                    if (product) {
                        const tabletsPerUnit = getTabletsPerUnit(item.pack_size, item.strip_size, item.sell_unit);
                        const totalTablets = newQty * tabletsPerUnit;
                        if (totalTablets > product.stock) return item; // Over stock
                    }
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

    const toggleMute = (id: string) => {
        setCart((prev) => prev.map(item => item.id === id ? { ...item, is_muted: !item.is_muted } : item));
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
            if (item.is_muted) return;
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
        toggleMute,
        changeCartItemUnit,
        getTabletsPerUnit,
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
