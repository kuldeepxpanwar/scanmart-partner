"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { BookLock, Printer, Loader2, Search, Calendar, User, FileText, Download } from "lucide-react";
import toast from "react-hot-toast";

export default function H1RegisterPage() {
  const [loading, setLoading] = useState(true);
  const [registers, setRegisters] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchH1Registers();
  }, []);

  const fetchH1Registers = async () => {
    try {
      const activeStoreId = typeof window !== 'undefined' ? localStorage.getItem("active_store_id") : null;
      if (!activeStoreId) return;

      const { data, error } = await supabase
        .from("sales")
        .select(`
          id,
          created_at,
          total_amount,
          doctor_name,
          clinic_name,
          patient_details,
          sale_items (
            quantity,
            price_at_sale,
            inventory (
              name,
              is_h1
            )
          )
        `)
        .eq("store_id", activeStoreId)
        .not("doctor_name", "is", null)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formatted = (data || []).map(sale => {
        const h1Items = sale.sale_items.filter((item: any) => item.inventory?.is_h1);
        return {
          id: sale.id,
          date: new Date(sale.created_at).toLocaleDateString('en-IN'),
          time: new Date(sale.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          doctorName: sale.doctor_name,
          clinicName: sale.clinic_name,
          patientDetails: sale.patient_details,
          items: h1Items.map((i: any) => ({
            name: i.inventory?.name,
            qty: i.quantity
          }))
        };
      }).filter(sale => sale.items.length > 0);

      setRegisters(formatted);
    } catch (error: any) {
      toast.error("Failed to fetch H1 register: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredRegisters = registers.filter(r => 
    r.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.patientDetails.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.clinicName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.items.some((i: any) => i.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl print:hidden">
        <div className="flex items-center gap-4">
          <div className="bg-red-500/20 p-3 rounded-2xl border border-red-500/30">
            <BookLock className="text-red-500" size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-wide uppercase">Schedule H1 <span className="text-red-500 italic">Register</span></h1>
            <p className="text-slate-400 text-sm font-medium">Mandatory record for regulatory compliance</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="Search doctor, patient, drug..."
              className="bg-slate-800 border border-slate-700 text-white pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-red-500 transition-colors w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={handlePrint} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors border border-slate-700">
            <Printer size={18} /> Print
          </button>
        </div>
      </div>

      {/* Print Header (Only visible when printing) */}
      <div className="hidden print:block text-center mb-8 border-b-2 border-black pb-4">
        <h1 className="text-3xl font-black uppercase">Schedule H / H1 Drug Register</h1>
        <p className="text-sm font-bold mt-1">Generated on: {new Date().toLocaleString('en-IN')}</p>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="animate-spin text-red-500 mb-4" size={40} />
          <p className="text-slate-400 font-medium">Loading H1 register data...</p>
        </div>
      ) : filteredRegisters.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center shadow-xl print:hidden">
          <FileText className="mx-auto text-slate-600 mb-4" size={48} />
          <h3 className="text-xl font-bold text-white mb-2">No Records Found</h3>
          <p className="text-slate-400">No Schedule H1 drug sales have been recorded yet.</p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl print:border-none print:shadow-none print:bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/50 print:bg-gray-200">
                  <th className="p-4 font-black text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800 print:border-black print:text-black">Date & Time</th>
                  <th className="p-4 font-black text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800 print:border-black print:text-black">Patient Details</th>
                  <th className="p-4 font-black text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800 print:border-black print:text-black">Doctor & Clinic</th>
                  <th className="p-4 font-black text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800 print:border-black print:text-black">Prescribed H1 Drugs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 print:divide-black/20">
                {filteredRegisters.map((reg, idx) => (
                  <tr key={reg.id} className="hover:bg-slate-800/20 transition-colors print:hover:bg-transparent">
                    <td className="p-4 align-top">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar size={14} className="text-slate-500 print:hidden" />
                        <span className="font-bold text-slate-300 print:text-black">{reg.date}</span>
                      </div>
                      <span className="text-xs font-medium text-slate-500 print:text-black">{reg.time}</span>
                    </td>
                    <td className="p-4 align-top">
                      <div className="flex items-start gap-2">
                        <User size={16} className="text-blue-400 mt-0.5 print:hidden" />
                        <span className="font-bold text-slate-200 print:text-black">{reg.patientDetails}</span>
                      </div>
                    </td>
                    <td className="p-4 align-top">
                      <div className="font-bold text-red-400 print:text-black">{reg.doctorName}</div>
                      <div className="text-sm font-medium text-slate-500 mt-1 print:text-gray-700">{reg.clinicName}</div>
                    </td>
                    <td className="p-4 align-top">
                      <ul className="space-y-1">
                        {reg.items.map((item: any, i: number) => (
                          <li key={i} className="flex justify-between items-center bg-slate-800/50 print:bg-transparent print:border-b print:border-dotted print:border-gray-300 px-3 py-1.5 rounded-lg">
                            <span className="font-bold text-slate-300 text-sm print:text-black">{item.name}</span>
                            <span className="font-black text-xs bg-slate-700 print:bg-transparent text-slate-300 px-2 py-0.5 rounded print:text-black">Qty: {item.qty}</span>
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
