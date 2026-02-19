import React, { useState, useMemo } from 'react';
import { Users, Activity, Wallet, ArrowDownCircle, PieChart as PieIcon } from 'lucide-react';

const AdminDashboard = () => {
  // example MOCKDATA NGANI (confI)
  const [anonymousUsers] = useState([
    { id: "USR-V102", income: 67, balance: 67, goalAmount: 67 },
    { id: "USR-X551", income: 67, balance: 67, goalAmount: 67},
    { id: "USR-M992", income: 67, balance: 67, goalAmount: 67 },
    { id: "USR-M993", income: 67, balance: 67, goalAmount: 67 },
    { id: "USR-Z443", income: 67, balance: 67, goalAmount: 100}
  ]);

  // Analytics Engine
  const metrics = useMemo(() => {
    const total = anonymousUsers.length;
    if (total === 0) return {};

    const totalIncome = anonymousUsers.reduce((sum, u) => sum + u.income, 0);
    const totalSavings = anonymousUsers.reduce((sum, u) => sum + u.balance, 0);
    const totalExpenses = anonymousUsers.reduce((sum, u) => sum + (u.income - u.balance), 0);
    const avgProgress = (anonymousUsers.reduce((sum, u) => sum + (u.balance / u.goalAmount), 0) / total) * 100;

    return {
      userCount: total,
      activeness: avgProgress.toFixed(1) + "%",
      income: (totalIncome / total).toLocaleString(),
      expenses: (totalExpenses / total).toLocaleString(),
      savings: (totalSavings / total).toLocaleString()
    };
  }, [anonymousUsers]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* logo yan sha */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          
          <KPICard 
            title="USER COUNT" 
            value={metrics.userCount} 
            icon={<Users size={24}/>} 
            iconBg="bg-[#5D5FEF]" 
          />
          
          <KPICard 
            title="AVG. ACTIVENESS" 
            value={metrics.activeness} 
            icon={<Activity size={24}/>} 
            iconBg="bg-[#009669]" 
          />
          
          <KPICard 
            title="AVG. INCOME" 
            value={`₱${metrics.income}`} 
            icon={<Wallet size={24}/>} 
            iconBg="bg-[#2563EB]" 
          />
          
          <KPICard 
            title="AVG. EXPENSES" 
            value={`₱${metrics.expenses}`} 
            icon={<ArrowDownCircle size={24}/>} 
            iconBg="bg-[#E11D48]" 
          />
          
          <KPICard 
            title="AVG. SAVINGS" 
            value={`₱${metrics.savings}`} 
            icon={<PieIcon size={24}/>} 
            iconBg="bg-[#D97706]" 
          />

        </div>
      </div>
    </div>
  );
};

// COMPONENT: KPI CARD (picture or logo niya)
const KPICard = ({ title, value, icon, iconBg }) => (
  <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex flex-col justify-between h-48 relative overflow-hidden group hover:shadow-md transition-all">
    <div className="flex justify-between items-start">
      <span className="text-[12px] font-black text-[#94A3B8] uppercase tracking-widest">
        {title}
      </span>
      <div className={`${iconBg} p-3 rounded-2xl text-white shadow-lg shadow-current/20`}>
        {icon}
      </div>
    </div>
    <div className="text-[32px] font-black text-[#1E293B] tracking-tight">
      {value}
    </div>
  </div>
);

export default AdminDashboard;