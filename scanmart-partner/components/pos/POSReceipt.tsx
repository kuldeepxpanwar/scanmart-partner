import React, { useEffect, useState } from 'react';
import { X, Printer } from 'lucide-react';
import QRCodeAny from 'react-qr-code';

interface POSReceiptProps {
    lastSale: any;
    storeSettings: any;
    paymentMethod: string;
    setShowReceipt: (val: boolean) => void;
    printMode?: 'thermal' | 'a4'; // NEW
}

export default function POSReceipt({
    lastSale,
    storeSettings,
    paymentMethod,
    setShowReceipt,
    printMode = 'thermal'
}: POSReceiptProps) {
    const [qrRef, setQrRef] = useState('');
    const [timeLeft, setTimeLeft] = useState(60);
    const isA4 = printMode === 'a4';

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

    // GST calculation
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
        <div className="fixed inset-0 bg-black/95 flex flex-col items-center justify-center z-[200] p-4 font-mono overflow-y-auto pt-[100px] pb-[100px]">

            {/* ── CLOSE BUTTON ── */}
            <button onClick={() => setShowReceipt(false)} className="fixed top-6 right-6 text-white no-print z-50 bg-slate-800 rounded-full p-2">
                <X size={20} />
            </button>

            {/* ── PRINT MODE BADGE ── */}
            <div className="no-print mb-3 flex items-center gap-2">
                <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest ${isA4 ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'bg-green-600/20 text-green-400 border border-green-500/30'}`}>
                    {isA4 ? '📄 A4 Invoice Mode' : '🧾 Thermal 80mm Mode'}
                </span>
                <span className="text-[9px] text-slate-500">Change in Settings → Hardware</span>
            </div>

            {/* ════════════════════════════════════════
                RECEIPT BOX — Thermal OR A4
            ════════════════════════════════════════ */}
            <div className={isA4
                ? "bg-white text-black w-full max-w-[595px] receipt-box-a4 shadow-2xl relative my-auto"
                : "bg-white text-black p-5 w-full max-w-[320px] receipt-box shadow-2xl relative text-[11px] my-auto"
            }>

                {/* ── A4 HEADER ── */}
                {isA4 ? (
                    <div className="p-8">
                        {/* Top bar */}
                        <div className="flex justify-between items-start border-b-2 border-gray-800 pb-4 mb-4">
                            <div>
                                <h1 className="text-2xl font-black uppercase">{storeSettings.shop_name}</h1>
                                <p className="text-xs text-gray-500 mt-0.5">{storeSettings.shop_address}</p>
                                <p className="text-xs text-gray-500">Ph: {storeSettings.shop_phone}</p>
                                {storeSettings.gstin && <p className="text-xs font-bold mt-1">GSTIN: {storeSettings.gstin}</p>}
                            </div>
                            <div className="text-right">
                                <p className="text-lg font-black text-gray-800">TAX INVOICE</p>
                                <p className="text-xs text-gray-500 mt-1">Invoice: <span className="font-bold text-black">{lastSale.invoiceNumber || lastSale.id?.slice(0, 8)}</span></p>
                                <p className="text-xs text-gray-500">Date: <span className="font-bold text-black">{lastSale.date}</span></p>
                                <p className="text-xs text-gray-500">Time: <span className="font-bold text-black">{lastSale.time}</span></p>
                            </div>
                        </div>

                        {/* Customer + Cashier row */}
                        <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
                            <div className="bg-gray-50 rounded-lg p-3">
                                <p className="font-bold text-gray-800 uppercase text-[9px] mb-1">Bill To</p>
                                <p className="font-bold">{lastSale.customer?.name || 'Walk-in Customer'}</p>
                                {lastSale.customer?.phone && lastSale.customer.phone !== 'N/A' && <p className="text-gray-500">{lastSale.customer.phone}</p>}
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                                <p className="font-bold text-gray-800 uppercase text-[9px] mb-1">Served By</p>
                                <p className="font-bold">{lastSale.staffName}</p>
                                <p className="text-gray-500">Payment: <span className="uppercase font-bold text-black">{lastSale.paymentMethod}</span></p>
                            </div>
                        </div>

                        {/* Items Table */}
                        <table className="w-full text-xs mb-4">
                            <thead>
                                <tr className="bg-gray-800 text-white">
                                    <th className="py-2 px-3 text-left rounded-tl-lg">#</th>
                                    <th className="py-2 px-3 text-left">Item</th>
                                    <th className="py-2 px-2 text-center">Qty</th>
                                    <th className="py-2 px-2 text-right">Rate</th>
                                    <th className="py-2 px-2 text-center">GST%</th>
                                    <th className="py-2 px-3 text-right rounded-tr-lg">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lastSale.items.map((item: any, idx: number) => {
                                    const gstRate = Number(item.gst_rate || 0);
                                    const lineTotal = Number(item.price) * item.quantity;
                                    return (
                                        <tr key={item.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                            <td className="py-1.5 px-3 text-gray-400">{idx + 1}</td>
                                            <td className="py-1.5 px-3 font-medium">{item.name}</td>
                                            <td className="py-1.5 px-2 text-center">{item.quantity}</td>
                                            <td className="py-1.5 px-2 text-right">₹{Number(item.price).toFixed(2)}</td>
                                            <td className="py-1.5 px-2 text-center text-gray-500">{gstRate > 0 ? `${gstRate}%` : '-'}</td>
                                            <td className="py-1.5 px-3 text-right font-bold">₹{lineTotal.toFixed(2)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {/* Totals */}
                        <div className="flex justify-end">
                            <div className="w-64 text-xs space-y-1">
                                {hasGst && <div className="flex justify-between text-gray-500"><span>Taxable Amount:</span><span>₹{totalTaxable.toFixed(2)}</span></div>}
                                {hasGst && Object.entries(slabMap).map(([rate, val]) => (
                                    <div key={rate} className="flex justify-between text-gray-500">
                                        <span>GST @{rate}% (CGST {Number(rate) / 2}% + SGST {Number(rate) / 2}%):</span>
                                        <span>₹{val.tax.toFixed(2)}</span>
                                    </div>
                                ))}
                                {lastSale.totalSavings > 0 && (
                                    <div className="flex justify-between text-green-600"><span>Discount:</span><span>-₹{lastSale.totalSavings.toFixed(2)}</span></div>
                                )}
                                <div className="flex justify-between font-black text-base border-t-2 border-gray-800 pt-2 mt-2">
                                    <span>TOTAL</span><span>₹{Math.round(lastSale.total)}</span>
                                </div>
                            </div>
                        </div>

                        {/* UPI QR */}
                        {(paymentMethod === 'upi' || paymentMethod === 'split') && storeSettings.upi_id && (
                            <div className="mt-4 flex gap-4 items-center border border-dashed border-gray-300 rounded-lg p-3">
                                <div className="bg-white p-1 rounded">
                                    <QRCodeAny
                                        value={`upi://pay?pa=${storeSettings.upi_id}&pn=${storeSettings.shop_name}&am=${paymentMethod === 'split' ? (lastSale.splitUpi || 0) : lastSale.total}&cu=INR&tr=${qrRef}`}
                                        size={72}
                                    />
                                </div>
                                <div>
                                    <p className="text-xs font-bold">Scan to Pay via UPI</p>
                                    <p className="text-[10px] text-gray-500">{storeSettings.upi_id}</p>
                                    <p className="text-[10px] text-gray-400">{timeLeft}s to refresh</p>
                                </div>
                            </div>
                        )}

                        {/* Footer */}
                        {storeSettings.invoice_footer && (
                            <p className="text-center text-[10px] text-gray-400 mt-4 border-t border-dashed border-gray-300 pt-3">{storeSettings.invoice_footer}</p>
                        )}
                        <p className="text-center text-[9px] text-gray-300 mt-1">Powered by ScanMart</p>
                    </div>
                ) : (
                    /* ── THERMAL RECEIPT LAYOUT ── */
                    <>
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

                        {/* Totals */}
                        <div className="border-t border-dashed border-gray-400 pt-2 space-y-0.5">
                            {hasGst && <div className="flex justify-between text-gray-500"><span>Taxable Amt:</span><span>₹{totalTaxable.toFixed(2)}</span></div>}
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

                        {/* UPI QR */}
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
                    </>
                )}

                {/* ── PRINT BUTTON ── */}
                <button
                    onClick={() => window.print()}
                    className="w-full bg-black text-white py-3 mt-4 font-bold no-print uppercase text-xs rounded flex items-center justify-center gap-2"
                >
                    <Printer size={14} /> Print Receipt
                </button>
            </div>

            {/* ── PRINT CSS ── inline to override globals ── */}
            <style>{`
        @media print {
          body * { visibility: hidden; }
          .no-print { display: none !important; }
          ${isA4 ? `
          .receipt-box-a4, .receipt-box-a4 * { visibility: visible; }
          .receipt-box-a4 { position: fixed; left: 50%; top: 20mm; transform: translateX(-50%); width: 170mm; padding: 12mm; box-shadow: none; font-family: Arial, sans-serif; font-size: 11pt; background: white; color: black; }
          @page { size: A4; margin: 15mm; }
          ` : `
          .receipt-box, .receipt-box * { visibility: visible; }
          .receipt-box { position: fixed; left: 0; top: 0; width: 80mm; margin: 0; padding: 4mm; box-shadow: none; font-size: 10pt; font-family: monospace; background: white; color: black; }
          @page { size: 80mm auto; margin: 0; }
          `}
        }
      `}</style>
        </div>
    );
}
