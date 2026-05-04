import React, { useEffect, useState } from 'react';
import { X, Printer, MessageCircle, FileDown, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import QRCodeAny from 'react-qr-code';

interface POSReceiptProps {
    lastSale: any;
    storeSettings: any;
    paymentMethod: string;
    setShowReceipt: (val: boolean) => void;
    printMode?: 'thermal' | 'a4' | 'a5-pharmacy';
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
    const [pdfGenerating, setPdfGenerating] = useState(false);
    const isA4 = printMode === 'a4';
    const isA5Pharmacy = printMode === 'a5-pharmacy';

    // ── A5 Pharmacy PDF Generator ──
    const generateA5PDF = async () => {
        setPdfGenerating(true);
        try {
            const doc = new jsPDF({ unit: 'mm', format: 'a5', orientation: 'landscape' });
            const W = 210; const H = 148;
            const shop = storeSettings.shop_name || 'Medical Store';
            const inv = lastSale.invoiceNumber || lastSale.id?.slice(0, 8) || '-';
            const dl = storeSettings.drug_license || '';
            const gstin = storeSettings.gstin || '';
            let y = 8;

            // Header left
            doc.setFontSize(13); doc.setFont('helvetica', 'bold');
            doc.text(shop.toUpperCase(), 6, y); y += 5;
            doc.setFontSize(7); doc.setFont('helvetica', 'normal');
            if (storeSettings.shop_address) { doc.text(storeSettings.shop_address, 6, y); y += 4; }
            if (storeSettings.shop_phone) { doc.text(`Ph: ${storeSettings.shop_phone}`, 6, y); y += 4; }
            if (dl) { doc.text(`DL No: ${dl}`, 6, y); y += 4; }
            if (gstin) { doc.text(`GSTIN: ${gstin}`, 6, y); }

            // Header right
            doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
            doc.text('CASH MEMO / TAX INVOICE', W - 6, 8, { align: 'right' });
            doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
            doc.text(`Invoice: ${inv}`, W - 6, 14, { align: 'right' });
            doc.text(`Date: ${lastSale.date || ''}  Time: ${lastSale.time || ''}`, W - 6, 18, { align: 'right' });
            if (lastSale.customer?.name) doc.text(`Patient: ${lastSale.customer.name}`, W - 6, 22, { align: 'right' });
            if (lastSale.customer?.phone && lastSale.customer.phone !== 'N/A') doc.text(`Ph: ${lastSale.customer.phone}`, W - 6, 26, { align: 'right' });
            if (lastSale.doctorName) doc.text(`Dr: ${lastSale.doctorName}`, W - 6, 30, { align: 'right' });

            // Divider
            y = 38; doc.setLineWidth(0.4); doc.line(6, y, W - 6, y); y += 4;

            // Table header
            doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
            const cols = [6, 14, 90, 118, 132, 148, 162, 176, 192];
            doc.text('#', cols[0], y); doc.text('MEDICINE', cols[1], y);
            doc.text('BATCH', cols[2], y); doc.text('EXP', cols[3], y);
            doc.text('MRP', cols[4], y, { align: 'right' }); doc.text('QTY', cols[5], y, { align: 'center' });
            doc.text('RATE', cols[6], y, { align: 'right' }); doc.text('DIS%', cols[7], y, { align: 'center' }); doc.text('AMT', cols[8], y, { align: 'right' });
            y += 3; doc.line(6, y, W - 6, y); y += 4;

            // Items
            doc.setFont('helvetica', 'normal');
            lastSale.items.forEach((item: any, idx: number) => {
                const lineTotal = Number(item.price) * item.quantity;
                const name = item.name.length > 28 ? item.name.slice(0, 27) + '…' : item.name;
                const batch = item.batch_number || item.batchNo || '-';
                const exp = item.expiry_date ? item.expiry_date.slice(0, 7) : '-';
                const mrp = item.mrp ? `${Number(item.mrp).toFixed(0)}` : '-';
                const dis = item.discount_percent ? `${item.discount_percent}%` : '-';
                doc.text(String(idx + 1), cols[0], y);
                doc.text(name, cols[1], y);
                doc.text(batch, cols[2], y);
                doc.text(exp, cols[3], y);
                doc.text(mrp, cols[4], y, { align: 'right' });
                doc.text(String(item.quantity), cols[5], y, { align: 'center' });
                doc.text(Number(item.price).toFixed(0), cols[6], y, { align: 'right' });
                doc.text(dis, cols[7], y, { align: 'center' });
                doc.text(lineTotal.toFixed(0), cols[8], y, { align: 'right' });
                y += 5;
            });

            // Totals
            doc.line(6, y, W - 6, y); y += 4;
            if (totalGst > 0.01) {
                doc.text(`Taxable: Rs ${totalTaxable.toFixed(2)}`, W - 60, y);
                doc.text(`GST: Rs ${totalGst.toFixed(2)}`, W - 30, y); y += 4;
            }
            doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
            doc.text(`TOTAL: Rs ${Math.round(lastSale.total)}`, W - 6, y, { align: 'right' }); y += 5;
            doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5);
            doc.text(`Payment: ${(lastSale.paymentMethod || 'CASH').toUpperCase()}`, W - 6, y, { align: 'right' }); y += 6;

            // Disclaimer
            doc.line(6, y, W - 6, y); y += 4;
            doc.setFontSize(6.5);
            doc.text('* Drugs once sold will not be taken back or exchanged.', 6, y); y += 4;
            doc.text('* This bill is computer generated.', 6, y);
            doc.text('Powered by ScanMart', W - 6, y, { align: 'right' });

            doc.save(`PharmaBill-${inv}-${lastSale.date || 'today'}.pdf`);
        } catch (e) { console.error(e); alert('PDF failed'); }
        finally { setPdfGenerating(false); }
    };

    // ── PDF Bill Generator (jsPDF) ──
    const generatePDF = async () => {
        if (isA5Pharmacy) { generateA5PDF(); return; }
        setPdfGenerating(true);
        try {
            const doc = new jsPDF({ unit: 'mm', format: [80, 220], orientation: 'portrait' });
            const shop = storeSettings.shop_name || 'Our Store';
            const inv = lastSale.invoiceNumber || lastSale.id?.slice(0, 8) || '-';
            let y = 8;

            // Header
            doc.setFontSize(12); doc.setFont('helvetica', 'bold');
            doc.text(shop.toUpperCase(), 40, y, { align: 'center' }); y += 5;
            doc.setFontSize(7); doc.setFont('helvetica', 'normal');
            if (storeSettings.shop_address) { doc.text(storeSettings.shop_address, 40, y, { align: 'center' }); y += 4; }
            if (storeSettings.shop_phone) { doc.text(`Ph: ${storeSettings.shop_phone}`, 40, y, { align: 'center' }); y += 4; }
            if (storeSettings.gstin) { doc.text(`GSTIN: ${storeSettings.gstin}`, 40, y, { align: 'center' }); y += 4; }

            // Divider
            y += 2; doc.setDrawColor(0); doc.setLineWidth(0.3);
            doc.line(4, y, 76, y); y += 4;

            // Invoice details
            doc.setFontSize(7);
            doc.text(`Invoice: ${inv}`, 4, y); doc.text(`Date: ${lastSale.date || ''}`, 76, y, { align: 'right' }); y += 4;
            doc.text(`Time: ${lastSale.time || ''}`, 4, y); y += 4;
            if (lastSale.customer?.name) { doc.text(`Customer: ${lastSale.customer.name}`, 4, y); y += 4; }
            if (lastSale.staffName) { doc.text(`Cashier: ${lastSale.staffName}`, 4, y); y += 4; }

            // Items header
            y += 1; doc.line(4, y, 76, y); y += 4;
            doc.setFont('helvetica', 'bold');
            doc.text('Item', 4, y); doc.text('Qty', 50, y, { align: 'center' }); doc.text('Rate', 62, y, { align: 'right' }); doc.text('Amt', 76, y, { align: 'right' }); y += 3;
            doc.line(4, y, 76, y); y += 4;

            // Items
            doc.setFont('helvetica', 'normal');
            lastSale.items.forEach((item: any) => {
                const lineTotal = (Number(item.price) * item.quantity).toFixed(0);
                const name = item.name.length > 22 ? item.name.slice(0, 21) + '…' : item.name;
                doc.text(name, 4, y);
                doc.text(String(item.quantity), 50, y, { align: 'center' });
                doc.text(Number(item.price).toFixed(0), 62, y, { align: 'right' });
                doc.text(`${lineTotal}`, 76, y, { align: 'right' }); y += 5;
            });

            // Totals
            doc.line(4, y, 76, y); y += 4;
            if (lastSale.totalSavings > 0) {
                doc.text(`Discount:`, 4, y); doc.text(`-Rs ${lastSale.totalSavings.toFixed(0)}`, 76, y, { align: 'right' }); y += 4;
            }
            doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
            doc.text('TOTAL:', 4, y); doc.text(`Rs ${Math.round(lastSale.total)}`, 76, y, { align: 'right' }); y += 5;
            doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
            doc.text(`Payment: ${(lastSale.paymentMethod || 'CASH').toUpperCase()}`, 4, y); y += 5;

            // Footer
            doc.line(4, y, 76, y); y += 4;
            if (storeSettings.invoice_footer) { doc.text(storeSettings.invoice_footer, 40, y, { align: 'center' }); y += 4; }
            doc.setFontSize(6); doc.text('Powered by ScanMart', 40, y, { align: 'center' });

            const filename = `Bill-${inv}-${lastSale.date || 'today'}.pdf`;
            doc.save(filename);
        } catch (e) {
            console.error('PDF generation failed:', e);
            alert('PDF generation failed. Please try again.');
        } finally {
            setPdfGenerating(false);
        }
    };

    // ── WhatsApp Share (Phase 5 — Pharmacy Format) ──
    const handleWhatsAppShare = () => {
        const shop = storeSettings.shop_name || 'Our Store';
        const inv = lastSale.invoiceNumber || lastSale.id?.slice(0, 8) || '-';
        const customerName = lastSale.customer?.name || 'Guest';
        const payment = (lastSale.paymentMethod || 'CASH').toUpperCase();
        const dl = storeSettings.drug_license || '';
        const isPharmacy = lastSale.items?.some((i: any) => Number(i.strip_size) > 1 || i.batch_number || i.expiry_date);

        let msg = `💊 *${shop}*\n`;
        if (storeSettings.shop_address) msg += `📍 ${storeSettings.shop_address}\n`;
        if (storeSettings.shop_phone) msg += `📞 ${storeSettings.shop_phone}\n`;
        if (dl) msg += `DL No: ${dl}\n`;
        if (storeSettings.gstin) msg += `GSTIN: ${storeSettings.gstin}\n`;
        msg += `\n🧾 *Invoice:* ${inv}\n`;
        msg += `📅 *Date:* ${lastSale.date || ''} ${lastSale.time || ''}\n`;
        msg += `👤 *Patient:* ${customerName}\n`;
        if (lastSale.doctorName) msg += `👨‍⚕️ *Ref. Dr:* ${lastSale.doctorName}\n`;
        msg += `💳 *Payment:* ${payment}\n`;
        msg += `\n━━━━━━━━━━━━━━━━━━━━━━━\n`;

        lastSale.items.forEach((item: any, idx: number) => {
            const lineTotal = (Number(item.price) * item.quantity).toFixed(0);
            const ss = Number(item.strip_size) || 1;
            const qtyLabel = ss > 1
                ? `${item.quantity} strips (${item.quantity * ss} tabs)`
                : `${item.quantity} pcs`;
            const mrpLabel = item.mrp ? ` | MRP ₹${Number(item.mrp).toFixed(0)}` : '';
            const batchLabel = item.batch_number ? `\n   📦 Batch: ${item.batch_number}` : '';
            const expLabel = item.expiry_date ? ` | Exp: ${item.expiry_date.slice(0, 7)}` : '';
            msg += `*${idx + 1}. ${item.name}*\n`;
            msg += `   Qty: ${qtyLabel} | Rate: ₹${Number(item.price).toFixed(0)}${mrpLabel} | Amt: ₹${lineTotal}`;
            msg += `${batchLabel}${expLabel}\n`;
        });

        msg += `━━━━━━━━━━━━━━━━━━━━━━━\n`;
        if (lastSale.totalSavings > 0) msg += `💚 *Discount:* -₹${lastSale.totalSavings.toFixed(0)}\n`;
        if (totalGst > 0.01) msg += `🧮 *GST Included:* ₹${totalGst.toFixed(2)}\n`;
        msg += `\n💰 *TOTAL: ₹${Math.round(lastSale.total)}*\n`;
        if (lastSale.paymentMethod === 'split') {
            msg += `   💵 Cash: ₹${Math.round(lastSale.splitCash || 0)} | 📱 UPI: ₹${Math.round(lastSale.splitUpi || 0)}\n`;
        }
        msg += `\n_* Drugs once sold will not be taken back._\n`;
        if (storeSettings.invoice_footer) msg += `_${storeSettings.invoice_footer}_\n`;
        msg += `_Powered by ScanMart_ 🚀`;

        const text = encodeURIComponent(msg);
        const phone = lastSale.customer?.phone;
        const cleanPhone = phone && phone !== 'N/A' ? phone.replace(/\D/g, '') : '';
        const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone.length === 12 ? cleanPhone : '';
        const url = waPhone ? `https://wa.me/${waPhone}?text=${text}` : `https://wa.me/?text=${text}`;
        window.open(url, '_blank');
    };


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
                <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest ${
                    isA5Pharmacy ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                    : isA4 ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'bg-green-600/20 text-green-400 border border-green-500/30'}`}>
                    {isA5Pharmacy ? '💊 A5 Pharmacy Bill' : isA4 ? '📄 A4 Invoice Mode' : '🧾 Thermal 80mm Mode'}
                </span>
                <span className="text-[9px] text-slate-500">Change in Settings → Hardware</span>
            </div>

            {/* ════════════════════════════════════════
                RECEIPT BOX — Thermal OR A4
            ════════════════════════════════════════ */}
            <div className={isA5Pharmacy
                ? "bg-white text-black w-full max-w-[780px] receipt-box-a5 shadow-2xl relative my-auto text-[10px]"
                : isA4 ? "bg-white text-black w-full max-w-[595px] receipt-box-a4 shadow-2xl relative my-auto"
                : "bg-white text-black p-5 w-full max-w-[320px] receipt-box shadow-2xl relative text-[11px] my-auto"
            }>

                {/* ── A5 PHARMACY LANDSCAPE LAYOUT ── */}
                {isA5Pharmacy && (
                  <div className="p-5 font-sans">
                    {/* Header: Store left | Invoice right */}
                    <div className="flex justify-between items-start border-b-2 border-gray-800 pb-3 mb-3">
                      <div>
                        <h1 className="text-lg font-black uppercase leading-tight tracking-wide">{storeSettings.shop_name}</h1>
                        <p className="text-[9px] text-gray-500 mt-0.5">{storeSettings.shop_address}</p>
                        <p className="text-[9px] text-gray-500">Ph: {storeSettings.shop_phone}</p>
                        {storeSettings.drug_license && <p className="text-[9px] font-bold text-gray-700 mt-0.5">DL No: {storeSettings.drug_license}</p>}
                        {storeSettings.gstin && <p className="text-[9px] font-bold text-gray-700">GSTIN: {storeSettings.gstin}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-gray-800 uppercase">Cash Memo / Tax Invoice</p>
                        <p className="text-[9px] text-gray-500 mt-1">Invoice: <span className="font-black text-black">{lastSale.invoiceNumber || lastSale.id?.slice(0, 8)}</span></p>
                        <p className="text-[9px] text-gray-500">Date: <span className="font-bold text-black">{lastSale.date}</span> &nbsp; Time: <span className="font-bold text-black">{lastSale.time}</span></p>
                        {lastSale.customer?.name && <p className="text-[9px] text-gray-500">Patient: <span className="font-bold text-black">{lastSale.customer.name}</span></p>}
                        {lastSale.customer?.phone && lastSale.customer.phone !== 'N/A' && <p className="text-[9px] text-gray-500">Ph: {lastSale.customer.phone}</p>}
                        {lastSale.doctorName && <p className="text-[9px] text-gray-500">Ref. Dr: <span className="font-bold text-black">{lastSale.doctorName}</span></p>}
                        <p className="text-[9px] text-gray-500">Cashier: <span className="font-bold text-black">{lastSale.staffName}</span></p>
                      </div>
                    </div>

                    {/* Items Table */}
                    <table className="w-full text-[9px] mb-3">
                      <thead>
                        <tr className="bg-gray-800 text-white">
                          <th className="py-1.5 px-1.5 text-left rounded-tl">#</th>
                          <th className="py-1.5 px-2 text-left">Medicine Name</th>
                          <th className="py-1.5 px-1.5 text-center">Batch</th>
                          <th className="py-1.5 px-1.5 text-center">Exp</th>
                          <th className="py-1.5 px-1.5 text-right">MRP</th>
                          <th className="py-1.5 px-1.5 text-center">Qty</th>
                          <th className="py-1.5 px-1.5 text-right">Rate</th>
                          <th className="py-1.5 px-1.5 text-center">Dis%</th>
                          <th className="py-1.5 px-1.5 text-right rounded-tr">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lastSale.items.map((item: any, idx: number) => {
                          const lineTotal = Number(item.price) * item.quantity;
                          const gstRate = Number(item.gst_rate || 0);
                          return (
                            <tr key={item.id || idx} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                              <td className="py-1 px-1.5 text-gray-400">{idx + 1}</td>
                              <td className="py-1 px-2">
                                <div className="font-semibold">{item.name}</div>
                                {gstRate > 0 && <div className="text-[8px] text-gray-400">GST {gstRate}%</div>}
                              </td>
                              <td className="py-1 px-1.5 text-center font-mono text-gray-600">{item.batch_number || item.batchNo || '—'}</td>
                              <td className="py-1 px-1.5 text-center text-gray-600">{item.expiry_date ? item.expiry_date.slice(0,7) : '—'}</td>
                              <td className="py-1 px-1.5 text-right text-gray-500">{item.mrp ? `₹${Number(item.mrp).toFixed(0)}` : '—'}</td>
                              <td className="py-1 px-1.5 text-center font-bold">{item.quantity}</td>
                              <td className="py-1 px-1.5 text-right">₹{Number(item.price).toFixed(0)}</td>
                              <td className="py-1 px-1.5 text-center text-orange-600">{item.discount_percent ? `${item.discount_percent}%` : '—'}</td>
                              <td className="py-1 px-1.5 text-right font-bold">₹{lineTotal.toFixed(0)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {/* Totals + Footer row */}
                    <div className="flex justify-between items-end gap-4">
                      {/* Disclaimer left */}
                      <div className="text-[8px] text-gray-400 max-w-[55%] leading-relaxed border-t border-dashed border-gray-300 pt-2">
                        <p>* Drugs once sold will not be taken back or exchanged.</p>
                        <p>* Check expiry before purchase. Keep out of reach of children.</p>
                        {storeSettings.invoice_footer && <p className="mt-1">{storeSettings.invoice_footer}</p>}
                        <p className="mt-1 text-gray-300">Powered by ScanMart</p>
                      </div>
                      {/* Totals right */}
                      <div className="text-[9px] space-y-0.5 min-w-[180px] border-t border-gray-300 pt-2">
                        {hasGst && <div className="flex justify-between text-gray-500"><span>Taxable Amount:</span><span>₹{totalTaxable.toFixed(2)}</span></div>}
                        {hasGst && Object.entries(slabMap).map(([rate, val]) => (
                          <div key={rate} className="flex justify-between text-gray-500">
                            <span>GST @{rate}% (CGST {Number(rate)/2}%+SGST {Number(rate)/2}%):</span>
                            <span>₹{val.tax.toFixed(2)}</span>
                          </div>
                        ))}
                        {lastSale.totalSavings > 0 && (
                          <div className="flex justify-between text-green-600"><span>Discount:</span><span>-₹{lastSale.totalSavings.toFixed(2)}</span></div>
                        )}
                        <div className="flex justify-between font-black text-sm border-t-2 border-gray-800 pt-1 mt-1">
                          <span>TOTAL</span><span>₹{Math.round(lastSale.total)}</span>
                        </div>
                        <div className="flex justify-between text-gray-500">
                          <span>Payment:</span><span className="font-bold uppercase">{lastSale.paymentMethod}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

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
                                            <td className="py-1.5 px-2 text-center">
                                              {(() => {
                                                const ss = Number(item.strip_size) || 1;
                                                if (ss > 1) return (
                                                  <div>
                                                    <div className="font-bold">{item.quantity}</div>
                                                    <div className="text-[8px] text-gray-400">strips</div>
                                                    <div className="text-[8px] text-purple-500">{item.quantity * ss} tabs</div>
                                                  </div>
                                                );
                                                return <span>{item.quantity}</span>;
                                              })()}
                                            </td>
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
                                            <td className="text-center align-top pt-0.5">
                                              {(() => {
                                                const ss = Number(item.strip_size) || 1;
                                                if (ss > 1) return (
                                                  <div className="leading-tight">
                                                    <div>{item.quantity}</div>
                                                    <div className="text-[7px] text-purple-500">{item.quantity * ss}t</div>
                                                  </div>
                                                );
                                                return item.quantity;
                                              })()}
                                            </td>
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

                {/* ── ACTION BUTTONS ── */}
                <div className="no-print mt-4 flex gap-2">
                    <button
                        onClick={() => window.print()}
                        className="flex-1 bg-black text-white py-3 font-bold uppercase text-xs rounded flex items-center justify-center gap-2 hover:bg-gray-800 transition-all"
                    >
                        <Printer size={14} /> Print
                    </button>
                    <button
                        onClick={generatePDF}
                        disabled={pdfGenerating}
                        className="flex-1 bg-blue-700 text-white py-3 font-bold uppercase text-xs rounded flex items-center justify-center gap-2 hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-60"
                    >
                        {pdfGenerating ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />} PDF
                    </button>
                    <button
                        onClick={handleWhatsAppShare}
                        className="flex-1 bg-[#25D366] text-white py-3 font-bold uppercase text-xs rounded flex items-center justify-center gap-2 hover:bg-[#1ebe5d] transition-all active:scale-95"
                    >
                        <MessageCircle size={14} /> WhatsApp
                    </button>
                </div>
            </div>

            {/* ── PRINT CSS ── inline to override globals ── */}
            <style>{`
        @media print {
          body * { visibility: hidden; }
          .no-print { display: none !important; }
          ${isA5Pharmacy ? `
          .receipt-box-a5, .receipt-box-a5 * { visibility: visible; }
          .receipt-box-a5 { position: fixed; left: 0; top: 0; width: 210mm; padding: 6mm; box-shadow: none; font-family: Arial, sans-serif; font-size: 8pt; background: white; color: black; }
          @page { size: A5 landscape; margin: 4mm; }
          ` : isA4 ? `
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
