// components/hub/StaffActivityMonitor.jsx — PESO AI
import React, { useEffect, useState } from 'react';

export const StaffActivityMonitor = () => {
  const [kicks, setKicks] = useState([]);

  useEffect(() => {
    const load = () => {
      try {
        const raw = JSON.parse(localStorage.getItem('pesoai_maint_kicks')) || [];
        setKicks(raw);
      } catch { setKicks([]); }
    };
    load();
    const onStorage = (e) => { if (e.key === 'pesoai_maint_kicks') load(); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return (
    <div className="mb-6 bg-white border border-rose-100 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-rose-400">Maintenance Kicks</p>
          <h2 className="text-lg font-bold text-slate-800">Staff Activity Monitor</h2>
        </div>
        <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-1 rounded-full">
          {kicks.length} events
        </span>
      </div>

      {kicks.length === 0 ? (
        <p className="text-sm text-slate-500">No staff admins are currently locked out.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                {['Staff Admin', 'Role', 'Last Active'].map(h => (
                  <th key={h} className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {kicks.slice(0, 8).map((k, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 text-sm font-bold text-slate-800">{k.name || 'Staff Admin'}</td>
                  <td className="px-4 py-3 text-xs font-semibold text-slate-500">{k.role || 'Staff Admin'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{k.time || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

