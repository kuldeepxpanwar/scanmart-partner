"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, CartesianGrid 
} from "recharts";
import { 
  TrendingUp, Package, AlertTriangle, IndianRupee, 
  Calendar, ShoppingBag, Percent, Wallet 
} from "lucide-react";

export default function AnalyticsPage() {
  const [stats, setStats] = useState({ 
    totalRevenue: 0, totalSales: 0, lowStockCount: 0, 
    totalProfit: 0, totalTax: 0, totalSavings: 0 
  });
  const [productData, setProductData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [isMounted, setIsMounted] = useState(false);
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  // --- 1. INITIALIZATION & STORE CHECK ---
  useEffect(() => {
    setIsMounted(true);
    // Get active store from local storage to ensure data isolation
    const storedId = typeof window !== 'undefined' ? localStorage.getItem("active_store_id") : null;
    if (storedId) {
        setActiveStoreId(storedId);
    } else {
        // Fallback if no store selected (rare)
        fetchFirstStore();
    }
  }, []);

  // --- 2. RE-FETCH ON CHANGE ---
  useEffect(() => {
    if (activeStoreId) {
        fetchAnalytics();
    }
  }, [filter, activeStoreId]); // Re-run if Filter OR Store changes

  const fetchFirstStore = async () => {
      const { data } = await supabase.from("stores").select("id").limit(1);
      if(data && data.length > 0) setActiveStoreId(data[0].id);
  };

  // --- 🛠️ MASTER CALCULATION LOGIC (FIXED) ---
  const fetchAnalytics = async () => {
    if (!activeStoreId) return;
    setLoading(true);
    console.log(`🔄 Fetching Analytics for Store: ${activeStoreId}...`);

    try {
      let dateLimit = new Date();
      if (filter === "today") dateLimit.setHours(0, 0, 0, 0);
      if (filter === "week") dateLimit.setDate(dateLimit.getDate() - 7);
      if (filter === "month") dateLimit.setMonth(dateLimit.getMonth() - 1);

      // 1. Fetch SALES for ACTIVE STORE only
      const salesQuery = supabase.from("sales").select("*").eq("store_id", activeStoreId);
      if (filter !== "all") salesQuery.gte("created_at", dateLimit.toISOString());
      
      const { data: salesData, error: salesError } = await salesQuery;

      // 2. Fetch Inventory for ACTIVE STORE (For Stock Levels)
      const { data: currentStoreInv, error: invError } = await supabase
        .from("inventory")
        .select("*")
        .eq("store_id", activeStoreId);

      // 3. Fetch ALL Inventory (For Cost Price Lookup - needed for historical profit calculation)
      // We fetch global inventory here because a sold item might have been moved or is archived, 
      // but we still need its buying_price for the report.
      const { data: allInventory } = await supabase.from("inventory").select("id, buying_price, gst_rate, name");

      // 4. Fetch Sale Items
      const { data: saleItems, error: itemsError } = await supabase.from("sale_items").select("*");

      if (salesError || itemsError || invError) {
        console.error("Database Error:", salesError || itemsError || invError);
        return;
      }

      if (salesData && currentStoreInv && saleItems && allInventory) {
        let revenue = 0;
        let profit = 0;
        let tax = 0;
        let savings = 0;

        // --- CALCULATION LOOP ---
        salesData.forEach((sale: any) => {
          revenue += Number(sale.total_amount || 0);
          savings += Number(sale.total_savings || 0);
          
          // Filter items that belong to this specific sale
          const currentItems = saleItems.filter(item => item.sale_id === sale.id);
          
          currentItems.forEach((item: any) => {
            // Find product details (Cost Price & GST) from global inventory lookup
            const product = allInventory.find(p => p.id === item.product_id);
            
            // Safe Numbers
            const sellPrice = Number(item.price_at_sale) || Number(item.price) || 0;
            const qty = Number(item.quantity || 0);
            
            // 🔥 BUG FIX: Fallback to 0 if buying_price is missing
            const buyPrice = product ? Number(product.buying_price || 0) : 0;
            
            // GST Logic (Inclusive Calculation)
            let gstPercent = product ? Number(product.gst_rate) : 18; 
            if (isNaN(gstPercent)) gstPercent = 18; 
            
            // Formula: Price = Base + Tax
            // Base = Price / (1 + GST%)
            const gstDecimal = gstPercent / 100;
            const basePricePerItem = sellPrice / (1 + gstDecimal);
            const taxPerItem = sellPrice - basePricePerItem;
            
            // Profit = Base Price - Buying Price
            const profitPerItem = basePricePerItem - buyPrice;

            // Add to totals
            tax += (taxPerItem * qty);
            profit += (profitPerItem * qty);
          });
        });

        console.log(`✅ STORE STATS -> Revenue: ${revenue}, Profit: ${profit}, Tax: ${tax}`);

        setStats({
          totalRevenue: Number(revenue.toFixed(2)),
          totalSales: salesData.length,
          totalProfit: Number(profit.toFixed(2)), // 🔥 Now shows correct profit
          totalTax: Number(tax.toFixed(2)),       // 🔥 Now shows correct GST
          totalSavings: Number(savings.toFixed(2)),
          lowStockCount: currentStoreInv.filter(i => i.stock < 10).length // 🔥 Filtered by store
        });
        
        // Chart Data (Top 8 items by stock from current store)
        setProductData(currentStoreInv.slice(0, 8).map(i => ({ 
          name: i.name, 
          stock: i.stock 
        })));
      }
    } catch (err) {
      console.error("Critical Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const profitMargin = stats.totalRevenue > 0 
    ? ((stats.totalProfit / stats.totalRevenue) * 100).toFixed(1) 
    : 0;

  if (!isMounted) return null;

  return (
    <div className="p-8 bg-[#020617] min-h-screen text-white font-sans">
      {/* Header */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <TrendingUp className="text-blue-500" size={32} /> PROFIT ANALYTICS
          </h1>
          <p className="text-slate-500 text-sm mt-1">
             Performance for: <span className="text-blue-400 font-bold uppercase">{activeStoreId ? "Selected Store" : "Loading..."}</span>
          </p>
        </div>
        
        <div className="flex items-center gap-2 bg-slate-900/50 p-2 rounded-2xl border border-slate-800 backdrop-blur-md">
          <Calendar size={18} className="text-blue-500 ml-2" />
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="bg-transparent outline-none p-1 text-sm font-bold cursor-pointer text-slate-300">
            <option value="all">Lifetime</option>
            <option value="today">Today</option>
            <option value="week">Past 7 Days</option>
            <option value="month">Past 30 Days</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatCard title="Gross Revenue" val={stats.totalRevenue} color="text-blue-500" label="TOTAL BILLING" icon={<IndianRupee size={12}/>} />
        <StatCard title="Net Profit" val={stats.totalProfit} color="text-green-500" label={`MARGIN: ${profitMargin}%`} icon={<Percent size={12}/>} />
        <StatCard title="GST Collected" val={stats.totalTax} color="text-amber-500" label="TAX PAYABLE" icon={<Wallet size={12}/>} />
        <StatCard title="Customer Savings" val={stats.totalSavings} color="text-purple-400" label="DISCOUNT GIVEN" icon={<ShoppingBag size={12}/>} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-slate-900 p-8 rounded-[2rem] border border-slate-800 h-[450px]">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">Stock Levels</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip cursor={{fill: '#1e293b'}} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px' }} />
                <Bar dataKey="stock" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900 p-8 rounded-[2rem] border border-slate-800 flex flex-col items-center justify-center">
           <div className="grid grid-cols-2 gap-10 w-full text-center">
             <div>
               <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Total Orders</p>
               <p className="text-5xl font-black text-blue-500">{stats.totalSales}</p>
             </div>
             <div>
               <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Low Stock</p>
               <p className="text-5xl font-black text-red-500">{stats.lowStockCount}</p>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, val, color, label, icon }: any) {
  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2.5rem] hover:border-slate-700 transition-all">
      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">{title}</p>
      <p className={`text-2xl font-black ${color}`}>₹{val.toLocaleString()}</p>
      <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-400 font-bold bg-slate-800 w-fit px-2 py-1 rounded-lg">
        {icon} {label}
      </div>
    </div>
  );
}