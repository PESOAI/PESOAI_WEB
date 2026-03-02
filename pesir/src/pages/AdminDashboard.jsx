import React, { useState, useMemo, useEffect } from 'react';
import { Users, Activity, UserCheck, UserX, Clock, AlertTriangle } from 'lucide-react';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('http://localhost:5000/api/users')
      .then(res => res.json())
      .then(data => {
        setUsers(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching users:", err);
        setUsers([]); 
        setError("Could not connect to server.");
        setLoading(false);
      });
  }, []);

  const metrics = useMemo(() => {
    const total = users.length;
    if (total === 0) return {
      total: 0,
      active: 0,
      inactive: 0,
      newToday: 0,
      recentUsers: []
    };

    const active = users.filter(u => u.account_status === 'Active').length;
    const inactive = users.filter(u => u.account_status !== 'Active').length;

    const today = new Date().toLocaleDateString('en-PH');
    const newToday = users.filter(u => {
      const joined = new Date(u.join_date).toLocaleDateString('en-PH');
      return joined === today;
    }).length;

    const recentUsers = [...users]
      .sort((a, b) => new Date(b.join_date) - new Date(a.join_date))
      .slice(0, 5);

    return { total, active, inactive, newToday, recentUsers };
  }, [users]);

  if (loading) return (
    <div className="p-8 flex items-center gap-3 text-slate-500">
      <div className="w-4 h-4 rounded-full bg-green-500 animate-pulse"></div>
      Loading System Metrics...
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter">System Monitoring</h1>
          <p className="text-sm text-slate-500">Live analytics for registered users.</p>
          {error && (
            <div className="mt-3 flex items-center gap-2 text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2 text-xs font-bold w-fit">
              <AlertTriangle size={14} /> {error}
            </div>
          )}
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPICard title="TOTAL USERS"    value={metrics.total}    icon={<Users size={22}/>}     iconBg="bg-[#5D5FEF]" />
          <KPICard title="ACTIVE USERS"   value={metrics.active}   icon={<UserCheck size={22}/>} iconBg="bg-green-600" />
          <KPICard title="INACTIVE USERS" value={metrics.inactive} icon={<UserX size={22}/>}     iconBg="bg-red-500"   />
          <KPICard title="NEW TODAY"       value={metrics.newToday} icon={<Activity size={22}/>}  iconBg="bg-blue-600"  />
        </div>

        {/* RECENT USERS TABLE */}
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-50">
            <div className="flex items-center gap-3">
              <Clock size={18} className="text-slate-400" />
              <h3 className="text-lg font-black text-slate-900">Recently Registered Users</h3>
            </div>
          </div>

          {metrics.recentUsers.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Users size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-bold">No users registered yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-50">
                    <th className="text-left px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Name</th>
                    <th className="text-left px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</th>
                    <th className="text-left px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone</th>
                    <th className="text-left px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="text-left px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Join Date</th>
                    <th className="text-left px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.recentUsers.map((user, idx) => (
                    <tr key={user.user_id || idx} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-4 text-sm font-bold text-slate-900">{user.full_name}</td>
                      <td className="px-8 py-4 text-sm text-slate-500">{user.email}</td>
                      <td className="px-8 py-4 text-sm text-slate-500">{user.phone_number || '—'}</td>
                      <td className="px-8 py-4">
                        <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${
                          user.account_status === 'Active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-600'
                        }`}>
                          {user.account_status}
                        </span>
                      </td>
                      <td className="px-8 py-4 text-xs text-slate-400 font-medium">
                        {new Date(user.join_date).toLocaleDateString('en-PH', {
                          year: 'numeric', month: 'short', day: 'numeric'
                        })}
                      </td>
                      <td className="px-8 py-4 text-xs text-slate-400 font-medium">
                        {user.last_active_at ? new Date(user.last_active_at).toLocaleDateString('en-PH', {
                          year: 'numeric', month: 'short', day: 'numeric'
                        }) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

const KPICard = ({ title, value, icon, iconBg }) => (
  <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex flex-col justify-between h-44 relative overflow-hidden hover:shadow-md transition-all">
    <div className="flex justify-between items-start">
      <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{title}</span>
      <div className={`${iconBg} p-3 rounded-2xl text-white`}>{icon}</div>
    </div>
    <div className="text-[40px] font-black text-slate-900 tracking-tight leading-none">{value}</div>
  </div>
);

export default AdminDashboard;