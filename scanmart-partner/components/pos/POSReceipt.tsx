import React, { useEffect, useState } from 'react';
import { X, Printer } from 'lucide-react';
import QRCodeAny from 'react-qr-code';

interface POSReceiptProps {
    lastSale: any;
    storeSettings: any;
    paymentMethod: string;
    setShowReceipt: (val: boolean) => void;
}

export default function POSReceipt({
    lastSale,
    storeSettings,
    paymentMethod,
    setShowReceipt
}: POSReceiptProps) {
    const [qrRef, setQrRef] = useState('');
    const [timeLeft, setTimeLeft] = useState(60);

    const refreshQR = () => {
        const newRef = "SM" + Math.random().toString(36).substring(2, 9).toUpperCase();
        setQrRef(newRef);
        setTimeLeft(60);
    };

    useEffect(() => {
        let timer: any;
        if (paymentMethod === "upi" || paymentMethod === "split") {
            refreshQR();
            timer = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) { refreshQR(); return 60; }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [paymentMethod]);

    if (!lastSale) return null;

    return (
        <div className="fixed inset-0 bg-black/95 flex flex-col items-center justify-center z-[200] p-4 font-mono overflow-y-auto pt-[100px] pb-[100px]">
            <div className="bg-white text-black p-5 w-full max-w-[320px] receipt-box shadow-2xl relative text-[11px] my-auto">
                <button onClick={() => setShowReceipt(false)} className="absolute -top-12 right-0 text-white no-print">
                    <X size={24} />
                </button>

                {/* Store Header */}
                <div className="text-center pb-3 border-b border-dashed border-gray-400">
                    <h1 className="text-base font-black uppercase leading-tight">{storeSettings.shop_name}</h1>
                    <p className="text-[9px] mt-0.5">{storeSettings.shop_address}</p>
                    <p className="text-[9px]">Ph: {storeSettings.shop_phone}</p>
                    {storeSettings.gstin && <p className="text-[9px] font-bold">GSTIN: {storeSettings.gstin}</p>}
                </div>

                {/* Bill details */}
                <div className="py-2 space-y-0.5 border-b border-dashed border-gray-400">
                    <div className="flex justify-between"><span>Invoice:</span><span className="font-bold">{lastSale.invoiceNumber || lastSale.id?.slice(0, 8)}</span></div>
                    <div className="flex justify-between"><span>Date:</span><span>{lastSale.date}</span></div>
                    <div className="flex justify-between"><span>Time:</span><span>{lastSale.time}</span></div>
                    <div className="flex justify-between"><span>Cashier:</span><span>{lastSale.staffName}</span></div>
                    {lastSale.customer?.name && <div className="flex justify-between"><span>Customer:</span><span>{lastSale.customer.name}</span></div>}
                    {lastSale.customer?.phone && lastSale.customer.phone !== 'N/A' && <div className="flex justify-between"><span>Phone:</span><span>{lastSale.customer.phone}</span></div>}
                </div>

                {/* Items */}
                <table className="w-full my-2">
                    <thead>
                        <tr className="border-b border-black text-left text-[9px] font-black uppercase">
                            <th className="pb-1">Item</th>
                            <th className="text-center">Qty</th>
                            <th className="text-right">Rate</th>
                            <th className="text-right">Amt</th>
                        </tr>
                    </thead>
                    <tbody>
                        {lastSale.items.map((item: any, idx: number) => {
                            const gstRate = Number(item.gst_rate || 0);
                            const lineTotal = Number(item.price) * item.quantity;
                            const taxableLine = gstRate > 0 ? lineTotal / (1 + gstRate / 100) : lineTotal;
                            const gstLine = lineTotal - taxableLine;
                            return (
                                <tr key={item.id || idx} className="border-b border-dotted border-gray-200">
                                    <td className="py-0.5 pr-1 leading-tight max-w-[120px]">
                                        <div className="truncate">{item.name}</div>
                                        {gstRate > 0 && <div className="text-[8px] text-gray-400">GST {gstRate}% (₹{gstLine.toFixed(2)})</div>}
                                    </td>
                                    <td className="text-center align-top pt-0.5">{item.quantity}</td>
                                    <td className="text-right align-top pt-0.5">{Number(item.price).toFixed(0)}</td>
                                    <td className="text-right font-bold align-top pt-0.5">{lineTotal.toFixed(0)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {/* Totals + GST Breakdown */}
                {(() => {
                    const slabMap: Record<number, { taxable: number; tax: number }> = {};
                    let totalTaxable = 0;
                    let totalGst = 0;
                    lastSale.items.forEach((item: any) => {
                        const gstRate = Number(item.gst_rate || 0);
                        const lineTotal = Number(item.price) * item.quantity;
                        const taxable = gstRate > 0 ? lineTotal / (1 + gstRate / 100) : lineTotal;
                        const gst = lineTotal - taxable;
                        totalTaxable += taxable;
                        totalGst += gst;
                        if (gstRate > 0) {
                            if (!slabMap[gstRate]) slabMap[gstRate] = { taxable: 0, tax: 0 };
                            slabMap[gstRate].taxable += taxable;
                            slabMap[gstRate].tax += gst;
                        }
                    });
                    const hasGst = totalGst > 0.01;
                    return (
                        <div className="border-t border-dashed border-gray-400 pt-2 space-y-0.5">
                            {hasGst && (
                                <div className="flex justify-between text-gray-500"><span>Taxable Amt:</span><span>₹{totalTaxable.toFixed(2)}</span></div>
                            )}
                            {hasGst && Object.entries(slabMap).map(([rate, val]) => (
                                <div key={rate} className="flex justify-between text-gray-500">
                                    <span>GST @{rate}% (CGST {Number(rate) / 2}% + SGST {Number(rate) / 2}%):</span>
                                    <span>₹{val.tax.toFixed(2)}</span>
                                </div>
                            ))}
                            {lastSale.totalSavings > 0 && (
                                <div className="flex justify-between text-gray-500">
                                    <span>Discount:</span><span className="text-green-600 font-bold">-₹{lastSale.totalSavings.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-base font-black border-t border-black pt-1 mt-1">
                                <span>TOTAL</span><span>₹{Math.round(lastSale.total)}</span>
                            </div>

                            {/* Split Payment Display */}
                            {lastSale.paymentMethod === 'split' ? (
                                <div className="space-y-0.5 mt-1">
                                    <div className="flex justify-between text-[9px] text-gray-500"><span>💵 Cash:</span><span className="font-bold">₹{Math.round(lastSale.splitCash || 0)}</span></div>
                                    <div className="flex justify-between text-[9px] text-gray-500"><span>📱 UPI:</span><span className="font-bold">₹{Math.round(lastSale.splitUpi || 0)}</span></div>
                                </div>
                            ) : (
                                <div className="flex justify-between text-[9px] text-gray-500 mt-1">
                                    <span>Payment:</span><span className="uppercase font-bold">{lastSale.paymentMethod}</span>
                                </div>
                            )}
                        </div>
                    );
                })()}

                {/* UPI QR Code Generation */}
                {(paymentMethod === 'upi' || paymentMethod === 'split') && (
                    <div className="mt-3 p-2 bg-gray-100 rounded text-center border border-dashed border-gray-300">
                        <div className="flex justify-center bg-white p-1.5 w-fit mx-auto rounded">
                            <QRCodeAny
                                value={`upi://pay?pa=${storeSettings.upi_id || 'yourupi@bank'}&pn=${storeSettings.shop_name}&am=${paymentMethod === 'split' ? (lastSale.splitUpi || 0) : lastSale.total}&cu=INR&tr=${qrRef}`}
                                size={88}
                            />
                        </div>
                        <p className="text-[8px] mt-1 font-bold uppercase">
                            {paymentMethod === 'split' ? `UPI Pay ₹${Math.round(lastSale.splitUpi || 0)}` : 'Scan to Pay'} • {timeLeft}s
                        </p>
                        <p className="text-[8px] text-gray-500">{storeSettings.upi_id}</p>
                    </div>
                )}

                {/* Footer */}
                {storeSettings.invoice_footer && (
                    <p className="text-center text-[9px] text-gray-500 mt-3 border-t border-dashed border-gray-300 pt-2">{storeSettings.invoice_footer}</p>
                )}
                <p className="text-center text-[8px] text-gray-400 mt-1">Powered by ScanMart</p>

                <button onClick={() => window.print()} className="w-full bg-black text-white py-3 mt-4 font-bold no-print uppercase text-xs rounded">
                    🖨️ Print Receipt
                </button>
            </div>

            <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .no-print { display: none !important; }
          .receipt-box, .receipt-box * { visibility: visible; }
          .receipt-box {
            position: fixed;
            left: 0;
            top: 0;
            width: 80mm;
            margin: 0;
            padding: 4mm;
            box-shadow: none;
            font-size: 10pt;
            font-family: monospace;
          }
          @page {
            size: 80mm auto;
            margin: 0;
          }
        }
      `}</style>
        </div>
    );
}
