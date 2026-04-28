"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useApp } from "@/lib/AppContext";
import { 
  Loader2, Calendar as CalendarIcon, Briefcase, Plus, UserPlus, FileSpreadsheet 
} from "lucide-react";

export default function DoctorsReferralPage() {
  const { t } = useApp();
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [doctors, setDoctors] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [showAddModal, setShowAddModal] = useState(false);
  const [newDoctor, setNewDoctor] = useState({ name: "", specialization: "", phone: "", commission_rate: "" });

  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  useEffect(() => {
    const storedId = typeof window !== 'undefined' ? localStorage.getItem("active_store_id") : null;
    if (storedId) {
      setActiveStoreId(storedId);
    } else {
      fetchStoresFirst();
    }
  }, []);

  useEffect(() => {
    if (activeStoreId) {
      fetchData();
    }
  }, [activeStoreId, selectedMonth, selectedYear]);

  const fetchStoresFirst = async () => {
    const { data } = await supabase.from("stores").select("id").limit(1);
    if (data && data.length > 0) setActiveStoreId(data[0].id);
  };

  const fetchData = async () => {
    if (!activeStoreId) return;
    setLoading(true);

    // Fetch doctors
    const { data: doctorsData } = await supabase
      .from("doctors")
      .select("*")
      .eq("store_id", activeStoreId);
      
    if (doctorsData) setDoctors(doctorsData);

    // Fetch sales for current month
    const startDate = new Date(selectedYear, selectedMonth, 1).toISOString();
    const endDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59).toISOString();

    const { data: salesData } = await supabase
      .from("sales")
      .select("id, total_amount, doctor_name")
      .eq("store_id", activeStoreId)
      .not("doctor_name", "is", null)
      .gte("created_at", startDate)
      .lte("created_at", endDate);

    if (salesData) setSales(salesData);

    setLoading(false);
  };

  const handleAddDoctor = async () => {
    if (!newDoctor.name) return alert("Doctor name is required!");
    const { error } = await supabase.from("doctors").insert([{
      store_id: activeStoreId,
      name: newDoctor.name,
      specialization: newDoctor.specialization,
      phone: newDoctor.phone,
      commission_rate: newDoctor.commission_rate ? Number(newDoctor.commission_rate) : 0
    }]);

    if (error) {
      alert("Error adding doctor: " + error.message);
    } else {
      setShowAddModal(false);
      setNewDoctor({ name: "", specialization: "", phone: "", commission_rate: "" });
      fetchData();
    }
  };

  const formatCurrency = (amt: number) => `₹${amt.toFixed(2)}`;

  // Calculate stats
  const getDoctorStats = (docName: string) => {
    const docSales = sales.filter(s => s.doctor_name === docName);
    const totalSales = docSales.reduce((sum, s) => sum + Number(s.total_amount), 0);
    return { count: docSales.length, totalSales };
  };

  return (
    <div className="p-4 md:p-8 space-y-6 min-h-screen bg-[#020617] text-white font-sans pb-32">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#020617]/95 backdrop-blur-md py-4 border-b border-slate-800/50 sticky top-0 z-30">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-3 uppercase italic">
            <Briefcase className="text-purple-500" size={28} /> Doctor <span className="text-purple-500">Referrals</span>
          </h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Track Commissions & Prescriptions</p>
        </div>

        <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 p-2 rounded-2xl">
          <CalendarIcon size={16} className="text-slate-500 ml-2" />
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="bg-transparent text-white text-sm font-bold outline-none cursor-pointer p-1"
          >
            {months.map((m, i) => <option key={i} value={i} className="bg-slate-900">{m}</option>)}
          </select>
          <span className="text-slate-700">/</span>
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-transparent text-white text-sm font-bold outline-none cursor-pointer p-1 mr-2"
          >
            {years.map((y) => <option key={y} value={y} className="bg-slate-900">{y}</option>)}
          </select>
        </div>
      </div>

      <div className="flex justify-end">
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95"
        >
          <UserPlus size={16} /> Add Doctor
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-32"><Loader2 className="animate-spin text-purple-500" size={40} /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {doctors.map(doc => {
            const stats = getDoctorStats(doc.name);
            const commissionAmount = (stats.totalSales * (doc.commission_rate / 100));

            return (
              <div key={doc.id} className="bg-slate-900/40 border border-slate-800 p-6 rounded-[2rem] hover:border-purple-500/50 transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-black text-white">Dr. {doc.name}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{doc.specialization || 'General Physician'}</p>
                  </div>
                  <div className="bg-purple-500/10 text-purple-400 text-[10px] font-black px-2 py-1 rounded-lg">
                    {doc.commission_rate}% Cut
                  </div>
                </div>

                <div className="space-y-3 mt-6">
                  <div className="flex justify-between items-center border-b border-slate-800/50 pb-2">
                    <span className="text-xs text-slate-500 font-bold uppercase">Prescriptions</span>
                    <span className="text-sm font-black text-white">{stats.count}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-800/50 pb-2">
                    <span className="text-xs text-slate-500 font-bold uppercase">Total Sales</span>
                    <span className="text-sm font-black text-blue-400">{formatCurrency(stats.totalSales)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-xs text-purple-400 font-black uppercase">Est. Commission</span>
                    <span className="text-lg font-black text-green-400">{formatCurrency(commissionAmount)}</span>
                  </div>
                </div>
              </div>
            );
          })}
          
          {doctors.length === 0 && (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-800 rounded-[2rem]">
              <Briefcase size={48} className="mx-auto text-slate-700 mb-4" />
              <h3 className="text-xl font-black text-slate-500">No Doctors Added Yet</h3>
              <p className="text-slate-600 text-sm mt-2">Start tracking referral commissions by adding doctors.</p>
            </div>
          )}
        </div>
      )}

      {/* ADD DOCTOR MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-[2rem] w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-black mb-6 uppercase italic text-white flex items-center gap-2">
              <UserPlus className="text-purple-500" /> Add New Doctor
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Doctor Name</label>
                <input 
                  type="text" value={newDoctor.name} onChange={e => setNewDoctor({...newDoctor, name: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm font-black text-white outline-none focus:border-purple-500"
                  placeholder="e.g. Ramesh Kumar"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Specialization</label>
                <input 
                  type="text" value={newDoctor.specialization} onChange={e => setNewDoctor({...newDoctor, specialization: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm font-bold text-white outline-none focus:border-purple-500"
                  placeholder="e.g. Cardiologist"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Phone</label>
                  <input 
                    type="text" value={newDoctor.phone} onChange={e => setNewDoctor({...newDoctor, phone: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm font-bold text-white outline-none focus:border-purple-500"
                    placeholder="98765..."
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Commission %</label>
                  <input 
                    type="number" value={newDoctor.commission_rate} onChange={e => setNewDoctor({...newDoctor, commission_rate: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm font-bold text-white outline-none focus:border-purple-500"
                    placeholder="10.0"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button onClick={() => setShowAddModal(false)} className="px-5 py-2 rounded-xl text-xs font-black uppercase text-slate-400 hover:text-white">Cancel</button>
              <button onClick={handleAddDoctor} className="bg-purple-600 hover:bg-purple-500 px-6 py-2 rounded-xl text-xs font-black uppercase text-white transition-all active:scale-95">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
