import React, { useState, useMemo, useEffect } from 'react';
import { Users, Activity, Wallet, ArrowDownCircle, PieChart } from 'lucide-react';
// AdminDashboard component that displays system monitoring metrics such as user count, activeness, average income, expenses, and savings, along with sections for top spending categories and high-risk users, using data fetched from the server and styled with Tailwind CSS
const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Monitoring states based on the image
  const [financials, setFinancials] = useState({
    avgIncome: null, // NaN sa pic mo
    avgExpenses: null,
    avgSavings: null
  });
// Fetch user data from the server when the component mounts, and handle loading state and potential errors by setting the users state to an empty array if the fetch fails
  useEffect(() => {
    fetch('http://localhost:5000/api/users')
      .then(res => res.json())
      .then(data => {
        setUsers(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setUsers([]);
        setLoading(false);
      });
  }, []);
// Use useMemo to calculate the total user count and average activeness percentage based on the users data, ensuring that these calculations are only performed when the users state changes for performance optimization
  const metrics = useMemo(() => {
    const total = users.length;
    // Calculate activeness (example logic)
    const activeCount = users.filter(u => u.account_status === 'Active').length;
    const activeness = total > 0 ? ((activeCount / total) * 100).toFixed(1) : "0.0";

    return { total, activeness };
  }, [users]);

  if (loading) return <div className="p-10 font-bold text-slate-400">Loading System...</div>;

  return (
    <div className="p-8 bg-[#F8FAFC] min-h-screen">
      {/* SECTION TITLE */}
      <div className="mb-6">
        <h1 className="text-4xl font-black text-[#1E293B] mb-1">System Monitoring</h1>
        <p className="text-slate-500 font-medium">Live analytics for user activity and financial health.</p>
      </div>

      {/* KPI GRID - EXACTLY LIKE THE PHOTO */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-10">
        <KPICard 
          title="USER COUNT" 
          value={metrics.total} 
          icon={<Users size={24} />} 
          iconColor="bg-[#6366F1]" 
        />
        <KPICard 
          title="AVG. ACTIVENESS" 
          value={`${metrics.activeness}%`} 
          icon={<Activity size={24} />} 
          iconColor="bg-[#22C55E]" 
          isChartIcon
        />
        <KPICard 
          title="AVG. INCOME" 
          value={financials.avgIncome ?? "NaN"} 
          icon={<Wallet size={24} />} 
          iconColor="bg-[#3B82F6]" 
          isCurrency
        />
        <KPICard 
          title="AVG. EXPENSES" 
          value={financials.avgExpenses ?? "NaN"} 
          icon={<ArrowDownCircle size={24} />} 
          iconColor="bg-[#EF4444]" 
          isCurrency
        />
        <KPICard 
          title="AVG. SAVINGS" 
          value={financials.avgSavings ?? "NaN"} 
          icon={<PieChart size={24} />} 
          iconColor="bg-[#F59E0B]" 
          isCurrency
        />
      </div>

      {/* LOWER SECTION (Spending Categories & High Risk) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
           <h3 className="text-xl font-black mb-6">Top Spending Categories</h3>
           {/* Dito papasok yung Donut Chart mo */}
           <div className="flex items-center gap-10">
              <div className="w-32 h-32 rounded-full border-[15px] border-orange-400"></div>
              <div className="space-y-4">
                <CategoryItem label="FOOD" color="bg-red-500" />
                <CategoryItem label="TRANSPORT" color="bg-blue-500" />
                <CategoryItem label="BILLS" color="bg-orange-500" />
              </div>
           </div>
        </div>

        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 flex flex-col items-center justify-center text-slate-400">
           <div className="flex items-center gap-2 mb-2 font-bold text-slate-900 self-start">
              <span className="text-red-500">⚠️</span> High-Risk Users
           </div>
           <p className="mt-10">No users at risk found.</p>
        </div>
      </div>
    </div>
  );
};

/* UPDATED KPI CARD COMPONENT */
const KPICard = ({ title, value, icon, iconColor, isCurrency }) => (
  <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-50 flex flex-col justify-between min-h-[180px]">
    <div className="flex justify-between items-start">
      <span className="text-[10px] font-black text-slate-400 tracking-widest leading-tight w-20">
        {title}
      </span>
      <div className={`${iconColor} p-2.5 rounded-2xl text-white shadow-lg`}>
        {icon}
      </div>
    </div>
    <div className="text-4xl font-black text-slate-900 flex items-baseline">
      {isCurrency && <span className="text-3xl mr-1">₱</span>}
      {value}
    </div>
  </div>
);

const CategoryItem = ({ label, color }) => (
  <div>
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${color}`}></div>
      <span className="text-[10px] font-black text-slate-400">{label}</span>
    </div>
    <div className="font-black text-lg ml-5">₱NaN</div>
  </div>
);

export default AdminDashboard;