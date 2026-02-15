"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Search, Plus, Truck, Phone, MapPin, Trash2, Loader2, X, 
  Edit3, Mail, MessageCircle, Building2, CheckCircle2, XCircle 
} from "lucide-react";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Form State
  const initialFormState = { 
    id: "",
    name: "", 
    contact_person: "", 
    phone: "", 
    email: "",
    address: "",
    gstin: "",
    category: "General",
    status: "Active"
  };
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => { fetchSuppliers(); }, []);

  const fetchSuppliers = async () => {
    setLoading(true);
    const { data } = await supabase.from("suppliers").select("*").order("id", { ascending: false });
    if (data) setSuppliers(data);
    setLoading(false);
  };

  // --- HANDLE ADD / EDIT ---
  const handleSubmit = async () => {
    if (!formData.name || !formData.phone) return alert("Name and Phone are required!");
    setSubmitLoading(true);

    try {
      const payload = {
        name: formData.name,
        contact_person: formData.contact_person,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        gstin: formData.gstin,
        category: formData.category,
        status: formData.status
      };

      if (isEditing && formData.id) {
        // Update
        const { error } = await supabase.from("suppliers").update(payload).eq("id", formData.id);
        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase.from("suppliers").insert([payload]);
        if (error) throw error;
      }

      setIsModalOpen(false);
      fetchSuppliers();
      setFormData(initialFormState);
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleEditClick = (supplier: any) => {
    setFormData({
      id: supplier.id,
      name: supplier.name || "",
      contact_person: supplier.contact_person || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
      gstin: supplier.gstin || "",
      category: supplier.category || "General",
      status: supplier.status || "Active"
    });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleAddNewClick = () => {
    setFormData(initialFormState);
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this supplier?")) {
      await supabase.from("suppliers").delete().eq("id", id);
      fetchSuppliers();
    }
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.phone.includes(searchTerm) ||
    s.gstin?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 bg-[#020617] min-h-screen text-white font-sans">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black italic">Supplier <span className="text-blue-500">Network</span></h1>
          <p className="text-slate-400 mt-1 flex items-center gap-2">
            <span className="bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded text-xs font-bold">{suppliers.length} Partners</span>
            <span className="bg-green-500/10 text-green-400 px-2 py-0.5 rounded text-xs font-bold">
              {suppliers.filter(s => s.status === 'Active').length} Active
            </span>
          </p>
        </div>
        <button 
          onClick={handleAddNewClick} 
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-all font-bold shadow-lg shadow-blue-900/20"
        >
          <Plus size={20} /> Add Supplier
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-6 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="Search by Company, Phone, or GSTIN..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-4 pl-12 text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all" 
        />
      </div>

      {/* Suppliers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-20"><Loader2 className="animate-spin mx-auto text-blue-500" size={40}/></div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="col-span-full text-center py-20 text-slate-500">No suppliers found. Add one to get started!</div>
        ) : (
          filteredSuppliers.map((supplier) => (
            <div key={supplier.id} className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] hover:border-blue-500/50 transition-all group relative flex flex-col h-full">
              
              {/* Header: Badge & Actions */}
              <div className="flex justify-between items-start mb-4">
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${supplier.status === 'Active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                   {supplier.status || 'Active'}
                </span>
                <div className="flex gap-2">
                    <button onClick={() => handleEditClick(supplier)} className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white hover:bg-blue-600 transition-all">
                        <Edit3 size={16}/>
                    </button>
                    <button onClick={() => handleDelete(supplier.id)} className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white hover:bg-red-600 transition-all">
                        <Trash2 size={16}/>
                    </button>
                </div>
              </div>

              {/* Main Info */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl flex items-center justify-center text-blue-500 shadow-inner">
                  <Building2 size={28} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white leading-tight">{supplier.name}</h3>
                  <p className="text-xs text-blue-400 font-bold mt-1">{supplier.category}</p>
                </div>
              </div>

              {/* Details Grid */}
              <div className="space-y-3 text-sm text-slate-400 mb-6 flex-1">
                <div className="flex items-center gap-3">
                  <Truck size={14} className="text-slate-500"/> 
                  <span className="font-bold text-slate-300">{supplier.contact_person || "N/A"}</span>
                </div>
                {supplier.gstin && (
                    <div className="flex items-center gap-3">
                        <CheckCircle2 size={14} className="text-slate-500"/> 
                        <span className="font-mono text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-300">GST: {supplier.gstin}</span>
                    </div>
                )}
                {supplier.email && (
                    <div className="flex items-center gap-3 truncate">
                        <Mail size={14} className="text-slate-500"/> 
                        <span className="truncate">{supplier.email}</span>
                    </div>
                )}
                <div className="flex items-start gap-3">
                  <MapPin size={14} className="text-slate-500 mt-1 shrink-0"/> 
                  <span className="text-xs leading-relaxed line-clamp-2">{supplier.address || "No Address Provided"}</span>
                </div>
              </div>

              {/* Action Footer (Call/WhatsApp) */}
              <div className="grid grid-cols-2 gap-3 mt-auto pt-4 border-t border-slate-800">
                 <a href={`tel:${supplier.phone}`} className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 py-3 rounded-xl text-xs font-bold transition-all">
                    <Phone size={16} className="text-green-500"/> Call
                 </a>
                 <a href={`https://wa.me/91${supplier.phone}`} target="_blank" className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 py-3 rounded-xl text-xs font-bold transition-all">
                    <MessageCircle size={16} className="text-blue-500"/> WhatsApp
                 </a>
              </div>

            </div>
          ))
        )}
      </div>

      {/* 🔵 MODAL: ADD / EDIT SUPPLIER */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem] w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white bg-slate-800 p-2 rounded-full"><X size={20}/></button>
            
            <h2 className="text-2xl font-black italic mb-1 text-blue-500">{isEditing ? "Edit" : "New"} <span className="text-white">Partner</span></h2>
            <p className="text-slate-500 text-xs mb-6">Enter supplier details accurately for billing.</p>
            
            <div className="space-y-4">
              {/* Name & Person */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Company Name *</label>
                    <input type="text" placeholder="e.g. Raju Electronics" className="w-full bg-slate-800 p-3 rounded-xl border border-slate-700 outline-none focus:border-blue-500 text-white font-medium"
                        value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Contact Person</label>
                    <input type="text" placeholder="e.g. Raju Bhai" className="w-full bg-slate-800 p-3 rounded-xl border border-slate-700 outline-none focus:border-blue-500 text-white font-medium"
                        value={formData.contact_person} onChange={(e) => setFormData({...formData, contact_person: e.target.value})} />
                </div>
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Phone Number *</label>
                    <input type="number" placeholder="98765..." className="w-full bg-slate-800 p-3 rounded-xl border border-slate-700 outline-none focus:border-blue-500 text-white font-medium"
                        value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Email (Optional)</label>
                    <input type="email" placeholder="supplier@mail.com" className="w-full bg-slate-800 p-3 rounded-xl border border-slate-700 outline-none focus:border-blue-500 text-white font-medium"
                        value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                </div>
              </div>

              {/* Category & Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Category</label>
                    <select className="w-full bg-slate-800 p-3 rounded-xl border border-slate-700 outline-none focus:border-blue-500 text-slate-300 font-medium cursor-pointer"
                        value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}>
                        <option>General</option>
                        <option>Electronics</option>
                        <option>Grocery/FMCG</option>
                        <option>Packaging</option>
                        <option>Logistics</option>
                        <option>Wholesaler</option>
                    </select>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Status</label>
                    <select className="w-full bg-slate-800 p-3 rounded-xl border border-slate-700 outline-none focus:border-blue-500 text-slate-300 font-medium cursor-pointer"
                        value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Blacklisted">Blacklisted</option>
                    </select>
                 </div>
              </div>

              {/* GSTIN */}
              <div className="space-y-1">
                 <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">GSTIN (Tax ID)</label>
                 <input type="text" placeholder="22AAAAA0000A1Z5" className="w-full bg-slate-800 p-3 rounded-xl border border-slate-700 outline-none focus:border-blue-500 text-white font-mono uppercase"
                    value={formData.gstin} onChange={(e) => setFormData({...formData, gstin: e.target.value})} />
              </div>

              {/* Address */}
              <div className="space-y-1">
                 <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Full Address</label>
                 <textarea placeholder="Shop No, Street, City..." rows={3} className="w-full bg-slate-800 p-3 rounded-xl border border-slate-700 outline-none focus:border-blue-500 text-white font-medium resize-none"
                    value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
              </div>
              
              <button 
                onClick={handleSubmit} disabled={submitLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 py-4 rounded-2xl font-black mt-4 text-white shadow-lg shadow-blue-900/20 transition-all uppercase tracking-wide"
              >
                {submitLoading ? "Saving..." : isEditing ? "Update Supplier" : "Save Supplier"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}