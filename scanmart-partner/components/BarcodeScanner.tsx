"use client";
import React, { useEffect, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { X, Camera } from "lucide-react";

export default function BarcodeScanner({ onScan, onClose }: { onScan: (code: string) => void, onClose: () => void }) {
  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "reader", 
      { 
        fps: 15, 
        qrbox: { width: 250, height: 150 }, 
        aspectRatio: 1.777778 // 16:9 mobile friendly ratio
      }, 
      /* verbose= */ false
    );

    scanner.render(
      (decodedText) => {
        onScan(decodedText); 
        scanner.clear(); 
      },
      (error) => {
       
      }
    );

    return () => {
      scanner.clear().catch(err => console.error("Scanner cleanup failed", err));
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md relative">
        <button onClick={onClose} className="absolute -top-12 right-0 p-3 bg-white/10 rounded-full text-white">
          <X size={24} />
        </button>
        
        <div className="text-center mb-6">
          <div className="inline-block p-4 bg-blue-600/20 rounded-2xl mb-2 text-blue-500">
            <Camera size={32} />
          </div>
          <h3 className="text-xl font-black italic uppercase tracking-widest text-white">Scanning...</h3>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-tighter">Align the barcode inside the frame</p>
        </div>

        {/* Scanner Area */}
        <div id="reader" className="overflow-hidden rounded-[2.5rem] border-4 border-blue-600 shadow-2xl shadow-blue-600/20 bg-slate-900"></div>
        
        <p className="mt-8 text-center text-slate-400 text-xs font-medium italic">
          Tip: Ensure good lighting for faster detection.
        </p>
      </div>
    </div>
  );
}