import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users, Activity, Wallet, ArrowDownCircle, PieChart as PieIcon,
  AlertTriangle, TrendingUp, TrendingDown, RefreshCw, FileText,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  Tooltip, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer,
} from 'recharts';
import logo from '../assets/logo.png';

import {
  computeExpenseRatio, computeRisk, computeSavingsRate, classifySaver, classifySpending,
  peso, pct,
} from '../utils/formulaEngine';

import { generatePDF } from '../pdf/pdfHelpers';
import { generateDashboardXLSX } from '../pdf/dashboardAnalyticsExport';

import PdfExportModal from '../components/PdfExportModal';
import { EmptyState, Card, Dropdown } from '../components/UIAtoms';
import { detectAnomalies } from '../utils/AnomalyDetector';

const API = 'http://localhost:5000/api/admin';

const TREND_FILTERS = [
  { label: 'Daily',   value: 'daily'   },
  { label: 'Weekly',  value: 'weekly'  },
  { label: 'Monthly', value: 'monthly' },
];
const RISK_FILTERS = [
  { label: 'All Levels',  value: 'all'    },
  { label: 'High Risk',   value: 'High'   },
  { label: 'Medium Risk', value: 'Medium' },
  { label: 'Low Risk',    value: 'Low'    },
];

const CATEGORY_COLORS = [
  '#6366F1', '#EF4444', '#F59E0B', '#22C55E', '#3B82F6', '#EC4899',
];

const riskColor  = (l) => ({ High: '#EF4444', Medium: '#F59E0B', Low: '#22C55E' })[l] ?? '#94A3B8';
const riskBg     = (l) => ({ High: '#FFF5F5', Medium: '#FFFBEB', Low: '#F0FDF4' })[l] ?? '#F8FAFC';
const riskBorder = (l) => ({ High: '#FED7D7', Medium: '#FDE68A', Low: '#BBF7D0' })[l] ?? '#E2E8F0';

const BUCKET_COLORS = {
  'Negative Saver': '#EF4444',
  'Low Saver':      '#F59E0B',
  'Mid Saver':      '#6366F1',
  'High Saver':     '#22C55E',
};

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/* ══════════════════════════════════════════════════════════════
   ADMIN DASHBOARD
══════════════════════════════════════════════════════════════ */
const AdminDashboard = () => {
  const [kpis,         setKpis]         = useState(null);
  const [categories,   setCategories]   = useState([]);
  const [allRiskUsers, setAllRiskUsers] = useState([]);
  const [trend,        setTrend]        = useState([]);
  const [savingsDist,  setSavingsDist]  = useState([]);
  const [initLoading,  setInitLoading]  = useState(true);
  const [trendLoading, setTrendLoading] = useState(false);
  const [lastUpdate,   setLastUpdate]   = useState(null);
  const [trendFilter,  setTrendFilter]  = useState('monthly');
  const [riskFilter,   setRiskFilter]   = useState('all');
  const [showPdf,      setShowPdf]      = useState(false);
  const [pdfGen,       setPdfGen]       = useState(false);
  const [xlsxGen,      setXlsxGen]      = useState(false);
  const [maint,        setMaint]        = useState({ active: false, endsAt: null });
  const [maintLeft,    setMaintLeft]    = useState(null);
  const [maintDurVal,  setMaintDurVal]  = useState(1);
  const [maintDurUnit, setMaintDurUnit] = useState('hours'); // 'minutes' | 'hours'
  const [maintMode,    setMaintMode]    = useState('extend'); // 'set' | 'extend'

  const trendRef   = useRef(null);
  const riskRef    = useRef(null);
  const mountedRef = useRef(false);

  const isMainOrSuper = (() => {
    const u = JSON.parse(localStorage.getItem('currentUser')) || {};
    return u.role === 'Main Admin' || u.role === 'Super Admin';
  })();

  const fetchBase = useCallback(async (period = 'monthly') => {
    try {
      const headers = getAuthHeaders();
      const [k, c, h, s] = await Promise.all([
        fetch(`${API}/kpis`,                                    { headers }).then(r => r.json()),
        fetch(`${API}/top-categories`,                          { headers }).then(r => r.json()),
        fetch(`${API}/high-risk`,                               { headers }).then(r => r.json()),
        fetch(`${API}/savings-distribution?period=${period}`,   { headers }).then(r => r.json()),
      ]);
      setKpis(k);
      setCategories((Array.isArray(c) ? c : []).map((cat, i) => ({
        ...cat,
        color_hex: cat.color_hex || CATEGORY_COLORS[i % CATEGORY_COLORS.length],
      })));
      setAllRiskUsers((Array.isArray(h) ? h : []).map(u => {
        const ratio = Number(u.expense_ratio) || computeExpenseRatio(u.total_income, u.total_expenses);
        return { ...u, expense_ratio: isNaN(ratio) ? 0 : ratio, risk_level: computeRisk(ratio) };
      }));
      const rawS = Array.isArray(s) ? s : [];
      if (rawS.every(d => 'value' in d && 'name' in d)) {
        setSavingsDist(rawS);
      } else {
        const counts = { 'Negative Saver': 0, 'Low Saver': 0, 'Mid Saver': 0, 'High Saver': 0 };
        rawS.forEach(u => { const sr = computeSavingsRate(u.total_income, u.total_expenses); counts[classifySaver(sr)]++; });
        setSavingsDist(Object.entries(counts).map(([name, value]) => ({ name, value, color: BUCKET_COLORS[name] })));
      }
      setLastUpdate(new Date().toLocaleTimeString());
    } catch (e) { console.error('Base fetch error:', e); }
  }, []);

  const fetchTrend = useCallback(async (period) => {
    setTrendLoading(true);
    try {
      const t = await fetch(`${API}/monthly-trend?period=${period}`, { headers: getAuthHeaders() }).then(r => r.json());
      setTrend(Array.isArray(t) ? t : []);
    } catch (e) { console.error('Trend fetch error:', e); }
    setTrendLoading(false);
  }, []);

  useEffect(() => {
    const init = async () => {
      setInitLoading(true);
      await Promise.all([fetchBase('monthly'), fetchTrend('monthly')]);
      setInitLoading(false);
    };
    init();
  }, [fetchBase, fetchTrend]);

  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return; }
    fetchTrend(trendFilter);
    fetchBase(trendFilter);
  }, [trendFilter, fetchTrend, fetchBase]);

  useEffect(() => {
    const sync = () => {
      const active = localStorage.getItem('pesoai_maint') === 'true';
      const endsAt = Number(localStorage.getItem('pesoai_maint_until'));
      setMaint({ active, endsAt: Number.isFinite(endsAt) ? endsAt : null });
    };
    sync();
    const onStorage = (e) => { if (e.key && e.key.startsWith('pesoai_maint')) sync(); };
    const onLocal = () => sync();
    window.addEventListener('storage', onStorage);
    window.addEventListener('pesoai_maint_change', onLocal);
    const poll = setInterval(sync, 1500);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('pesoai_maint_change', onLocal);
      clearInterval(poll);
    };
  }, []);

  useEffect(() => {
    if (!maint.active || !maint.endsAt) { setMaintLeft(null); return; }
    const tick = () => {
      const sec = Math.max(0, Math.ceil((maint.endsAt - Date.now()) / 1000));
      setMaintLeft(sec);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [maint.active, maint.endsAt]);


  const resumeMaintenance = () => {
    localStorage.setItem('pesoai_maint', 'false');
    localStorage.removeItem('pesoai_maint_until');
    localStorage.setItem('pesoai_maint_trigger', String(Date.now()));
    window.dispatchEvent(new Event('pesoai_maint_change'));
  };

  const updateMaintenanceTimer = () => {
    const v = Number(maintDurVal);
    if (!Number.isFinite(v) || v <= 0) return;
    const ms = maintDurUnit === 'minutes' ? v * 60 * 1000 : v * 60 * 60 * 1000;
    if (maintMode === 'extend' && (!Number.isFinite(maint.endsAt) || !maintLeft || maintLeft <= 0)) return;
    const base = maintMode === 'extend' && Number.isFinite(maint.endsAt) ? maint.endsAt : Date.now();
    const endsAt = base + ms;
    localStorage.setItem('pesoai_maint_until', String(endsAt));
    localStorage.setItem('pesoai_maint_trigger', String(Date.now()));
    const token = localStorage.getItem('token');
    if (token) {
      fetch('http://localhost:5000/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ active: true, endsAt }),
      }).catch(() => {});
    }
    window.dispatchEvent(new Event('pesoai_maint_change'));
  };

  const handleRefresh = async () => {
    setInitLoading(true);
    await Promise.all([fetchBase(trendFilter), fetchTrend(trendFilter)]);
    setInitLoading(false);
  };

  const handleExportPdf = async (selected) => {
    setPdfGen(true);
    try {
      if (selected.length > 0) {
        await generatePDF(selected, { kpis, allRiskUsers, trendFilter, trend, savingsDist, categories }, logo);
      }
    } catch (e) { console.error('PDF error:', e); }
    setPdfGen(false);
    setShowPdf(false);
  };

  const handleExportXLSX = async () => {
    setXlsxGen(true);
    try {
      await generateDashboardXLSX({ kpis, allRiskUsers, trendFilter, trend, savingsDist, categories });
    } catch (e) { console.error('Excel export error:', e); }
    setXlsxGen(false);
  };

  const filteredRisk = riskFilter === 'all' ? allRiskUsers : allRiskUsers.filter(u => u.risk_level === riskFilter);
  const riskCount    = (level) => allRiskUsers.filter(u => u.risk_level === level).length;
  const top6         = categories.slice(0, 6);
  const top6Total    = top6.reduce((s, c) => s + Number(c.total_spent || 0), 0);
  const fullName     = (u) => [u.first_name, u.last_name].filter(Boolean).join(' ') || '—';
  const anomalies = detectAnomalies({
    transactions: kpis?.recent_transactions ?? [],
    expensesTrend: trend,
    logins: kpis?.recent_logins ?? [],
    authorizedIps: kpis?.authorized_ips ?? [],
  });

  if (initLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#F8FAFC' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 44, height: 44, border: '3px solid #E0E7FF', borderTopColor: '#6366F1', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.2em', color: '#94A3B8', textTransform: 'uppercase' }}>Loading Dashboard</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: "'Sora', 'Plus Jakarta Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 99px; }
        .action-btn {
          display: flex; align-items: center; gap: 7px;
          padding: 9px 16px; border-radius: 10px;
          border: 1.5px solid #E2E8F0; background: #fff;
          color: #334155; font-size: 12px; font-weight: 700;
          cursor: pointer; font-family: inherit;
          transition: background 0.15s, border-color 0.15s;
        }
        .action-btn:hover { background: #F8FAFC; border-color: #CBD5E1; }
        .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>

      <PdfExportModal open={showPdf} onClose={() => setShowPdf(false)} onExport={handleExportPdf} generating={pdfGen} />

      <div style={{ padding: '24px 28px', maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── HEADER ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#6366F1', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 4 }}>Admin Panel</div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.03em', lineHeight: 1.2 }}>System Monitoring</h1>
            {lastUpdate && <p style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500, marginTop: 4 }}>Last updated at {lastUpdate}</p>}
            {anomalies.hasAnomalies && (
              <div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: '#FFF5F5', border: '1px solid #FECACA', color: '#B91C1C', fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                <AlertTriangle size={10} />
                High-Risk Alert
              </div>
            )}
          </div>

          {/* ── ACTION BUTTONS ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

            {/* Export PDF */}
            <button className="action-btn" onClick={() => setShowPdf(true)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              Export PDF
            </button>

            {/* Export Excel */}
            <button className="action-btn" onClick={handleExportXLSX} disabled={xlsxGen}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <path d="M3 9h18M9 21V9"/>
              </svg>
              {xlsxGen ? 'Exporting…' : 'Export Excel'}
            </button>

            {/* Refresh */}
            <button className="action-btn" onClick={handleRefresh} style={{ color: '#64748B' }}>
              <RefreshCw size={13} color="#64748B" />
              Refresh
            </button>

          </div>
        </div>

        {maint.active && isMainOrSuper && (
          <div className="rounded-2xl border border-rose-100 bg-rose-50/60 px-5 py-4 flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600">
                  <AlertTriangle size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-400">Maintenance Live</p>
                  <p className="text-sm font-bold text-rose-700">System paused for Staff Admins & users</p>
                </div>
              </div>
              <div className="px-3 py-2 rounded-xl bg-white border border-rose-100 text-rose-600 text-xs font-black">
                {maintLeft != null ? `TIME LEFT ${Math.floor(maintLeft / 3600)}h ${Math.floor((maintLeft % 3600) / 60)}m` : 'TIME LEFT —'}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_auto] gap-3 items-center">
              {/* Step 1: Choose action */}
              <div className="flex flex-col gap-2 px-3 py-2 rounded-xl bg-white border border-rose-100">
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-400"> Action</span>
                <div className="flex items-center gap-2">
                  {['set','extend'].map(m => (
                    <button
                      key={m}
                      onClick={() => setMaintMode(m)}
                      disabled={m === 'extend' && (!Number.isFinite(maint.endsAt) || !maintLeft || maintLeft <= 0)}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border transition ${
                        maintMode === m
                          ? 'bg-rose-600 text-white border-rose-600'
                          : 'bg-white text-rose-600 border-rose-200'
                      } ${m === 'extend' && (!Number.isFinite(maint.endsAt) || !maintLeft || maintLeft <= 0) ? 'opacity-40 cursor-not-allowed' : 'hover:bg-rose-50'}`}
                    >
                      {m === 'set' ? 'Set Time' : 'Extend Time'}
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-rose-300 font-semibold">
                  {(!Number.isFinite(maint.endsAt) || !maintLeft || maintLeft <= 0) ? 'Extend disabled until timer starts.' : ' '}
                </span>
              </div>

              {/* Step 2: Duration */}
              <div className="flex flex-col gap-2 px-3 py-2 rounded-xl bg-white border border-rose-100">
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-400"> Duration</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={maintDurVal}
                    onChange={e => setMaintDurVal(Number(e.target.value))}
                    className="w-16 px-2 py-1 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                  <select
                    value={maintDurUnit}
                    onChange={e => setMaintDurUnit(e.target.value)}
                    className="px-2 py-1 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                  </select>
                  <button
                    onClick={updateMaintenanceTimer}
                    disabled={maintMode === 'extend' && (!Number.isFinite(maint.endsAt) || !maintLeft || maintLeft <= 0)}
                    className="px-3 py-1.5 rounded-lg bg-rose-100 text-rose-700 text-[10px] font-black hover:bg-rose-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Apply
                  </button>
                </div>
              </div>

              {/* Resume */}
              <div className="flex items-center justify-end">
                <button
                  onClick={resumeMaintenance}
                  className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-black hover:bg-rose-700 transition"
                >
                  Resume System
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── KPI CARDS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
          {[
            { title: 'Total Users',   value: kpis?.total_users ?? '—',    icon: <Users size={15}/>,           accent: '#6366F1', bg: '#EEF2FF', trend: null },
            { title: 'Active Users',  value: `${kpis?.pct_active ?? 0}%`, icon: <Activity size={15}/>,        accent: '#22C55E', bg: '#F0FDF4', trend: 'up' },
            { title: 'Avg. Income',   value: peso(kpis?.avg_income),       icon: <Wallet size={15}/>,          accent: '#3B82F6', bg: '#EFF6FF', trend: 'up' },
            { title: 'Avg. Expenses', value: peso(kpis?.avg_expenses),     icon: <ArrowDownCircle size={15}/>, accent: '#EF4444', bg: '#FFF5F5', trend: 'down' },
            { title: 'Avg. Savings',  value: peso(kpis?.avg_savings),      icon: <PieIcon size={15}/>,         accent: '#F59E0B', bg: '#FFFBEB', trend: 'up' },
          ].map(({ title, value, icon, accent, bg, trend: tdir }) => (
            <Card key={title} style={{ padding: '18px 20px', position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 11, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: accent }}>{icon}</span>
                </div>
                {tdir && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 800, padding: '3px 7px', borderRadius: 99, background: tdir === 'up' ? '#F0FDF4' : '#FFF5F5', color: tdir === 'up' ? '#22C55E' : '#EF4444' }}>
                    {tdir === 'up' ? <TrendingUp size={9}/> : <TrendingDown size={9}/>}
                  </div>
                )}
              </div>
              {anomalies.hasAnomalies && title === 'Total Users' && (
                <div style={{ position: 'absolute', top: 10, right: 10, padding: '3px 8px', borderRadius: 999, background: '#FFF5F5', border: '1px solid #FECACA', color: '#B91C1C', fontSize: 8.5, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <AlertTriangle size={9} />
                  High-Risk
                </div>
              )}
              <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>{title}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>{value}</div>
              <div style={{ marginTop: 12, height: 3, borderRadius: 99, background: bg }}>
                <div style={{ height: 3, borderRadius: 99, width: '60%', background: accent, opacity: 0.6 }} />
              </div>
            </Card>
          ))}
        </div>

        {/* ── ROW 2: Trend + Savings ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
          <Card style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: 9, background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><TrendingUp size={14} color="#6366F1" /></div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Financial Trend</div>
                  <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 500 }}>Avg. income, expenses &amp; savings</div>
                </div>
                {trendLoading && <div style={{ width: 14, height: 14, border: '2px solid #E0E7FF', borderTopColor: '#6366F1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />}
              </div>
              <Dropdown options={TREND_FILTERS} value={trendFilter} onChange={setTrendFilter} dropRef={trendRef} />
            </div>
            {trend.length === 0 ? <EmptyState /> : (
              <ResponsiveContainer width="100%" height={215}>
                <AreaChart data={trend} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <defs>
                    {[['gInc','#22C55E'],['gExp','#EF4444'],['gSav','#6366F1']].map(([id,c]) => (
                      <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={c} stopOpacity={0.15}/>
                        <stop offset="95%" stopColor={c} stopOpacity={0}/>
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={v => `₱${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
                  <Tooltip formatter={(v, n) => [peso(v), n.replace('avg_', '').charAt(0).toUpperCase() + n.replace('avg_','').slice(1)]} contentStyle={{ borderRadius: 12, border: '1.5px solid #F1F5F9', fontSize: 11, boxShadow: '0 8px 24px rgba(0,0,0,0.08)', fontFamily: 'Sora, sans-serif' }} />
                  <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
                  <Area type="monotone" dataKey="avg_income"   name="Income"   stroke="#22C55E" fill="url(#gInc)" strokeWidth={2.5} dot={false} />
                  <Area type="monotone" dataKey="avg_expenses" name="Expenses" stroke="#EF4444" fill="url(#gExp)" strokeWidth={2.5} dot={false} />
                  <Area type="monotone" dataKey="avg_savings"  name="Savings"  stroke="#6366F1" fill="url(#gSav)" strokeWidth={2.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><PieIcon size={14} color="#6366F1" /></div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Savings Distribution</div>
                <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 500 }}>By saver classification</div>
              </div>
            </div>
            {savingsDist.every(d => d.value === 0) ? <EmptyState /> : (
              <>
                <ResponsiveContainer width="100%" height={148}>
                  <PieChart>
                    <Pie data={savingsDist} cx="50%" cy="50%" innerRadius={40} outerRadius={62} paddingAngle={3} dataKey="value" strokeWidth={0}>
                      {savingsDist.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip formatter={(v, _n, { payload }) => { const total = savingsDist.reduce((s, d) => s + d.value, 0); return [`${v} users (${total > 0 ? Math.round((v / total) * 100) : 0}%)`, payload.name]; }} contentStyle={{ borderRadius: 12, fontSize: 11, border: '1.5px solid #F1F5F9' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {savingsDist.map((d, i) => {
                    const total = savingsDist.reduce((s, x) => s + x.value, 0);
                    const share = pct(d.value, total);
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: 99, background: d.color, flexShrink: 0 }} />
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>{d.name}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 60, height: 4, borderRadius: 99, background: '#F1F5F9', overflow: 'hidden' }}>
                            <div style={{ width: share + '%', height: '100%', background: d.color, borderRadius: 99 }} />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#0F172A', minWidth: 28, textAlign: 'right' }}>{d.value}</span>
                          <span style={{ fontSize: 10, color: '#94A3B8', minWidth: 30 }}>({share}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </Card>
        </div>

        {/* ── ROW 3: Categories + Bar + Risk ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
          <Card style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: '#FFF5F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ArrowDownCircle size={14} color="#EF4444" /></div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Top Spending Categories</div>
                <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 500 }}>Share of total spend per category</div>
              </div>
            </div>
            <div style={{ height: 1, background: '#F1F5F9', margin: '12px 0' }} />
            {top6.length === 0 ? <EmptyState /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {top6.map((c, i) => {
                  const share  = pct(c.total_spent, top6Total);
                  const status = classifySpending(share);
                  const statusColor = { 'Over Limit': '#EF4444', 'Caution': '#F59E0B', 'Normal': '#22C55E' }[status];
                  const statusBg    = { 'Over Limit': '#FFF5F5', 'Caution': '#FFFBEB', 'Normal': '#F0FDF4' }[status];
                  return (
                    <div key={i}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <div style={{ width: 8, height: 8, borderRadius: 99, background: c.color_hex, flexShrink: 0 }} />
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#334155' }}>{c.category}</span>
                          {status !== 'Normal' && <span style={{ fontSize: 8.5, fontWeight: 800, padding: '2px 7px', borderRadius: 99, background: statusBg, color: statusColor, border: `1px solid ${statusColor}33` }}>{status}</span>}
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 800, color: statusColor }}>{share}%</span>
                      </div>
                      <div style={{ height: 5, borderRadius: 99, background: '#F1F5F9', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 99, width: share + '%', background: statusColor, transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: '#F0F9FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><TrendingDown size={14} color="#0EA5E9" /></div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Expense by Category</div>
                <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 500 }}>Total spend per category</div>
              </div>
            </div>
            {top6.length === 0 ? <EmptyState /> : (
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={top6} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 9, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={v => `₱${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
                  <YAxis type="category" dataKey="category" tick={{ fontSize: 9, fontWeight: 700, fill: '#64748B' }} axisLine={false} tickLine={false} width={88} />
                  <Tooltip formatter={(v, _n, { payload }) => { const share = pct(v, top6Total); return [`${peso(v)}  ·  ${share}% (${classifySpending(share)})`, 'Spent']; }} contentStyle={{ borderRadius: 12, border: '1.5px solid #F1F5F9', fontSize: 11, fontFamily: 'Sora, sans-serif' }} />
                  <Bar dataKey="total_spent" radius={[0, 6, 6, 0]} barSize={12}>
                    {top6.map((c, i) => <Cell key={i} fill={c.color_hex} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: 9, background: '#FFF5F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><AlertTriangle size={14} color="#EF4444" /></div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                    Risk Users
                    <span style={{ marginLeft: 7, fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 99, background: '#F1F5F9', color: '#64748B', verticalAlign: 'middle' }}>{filteredRisk.length}</span>
                  </div>
                  <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 500 }}>Classified by expense ratio</div>
                </div>
              </div>
              <Dropdown options={RISK_FILTERS} value={riskFilter} onChange={setRiskFilter} dropRef={riskRef} />
            </div>
            <div style={{ display: 'flex', gap: 6, margin: '12px 0' }}>
              {['High','Medium','Low'].map(l => (
                <button key={l} onClick={() => setRiskFilter(riskFilter === l ? 'all' : l)} style={{ flex: 1, padding: '6px 4px', borderRadius: 10, cursor: 'pointer', border: '1.5px solid', borderColor: riskFilter === l ? riskColor(l) : riskBorder(l), background: riskFilter === l ? riskColor(l) : riskBg(l), color: riskFilter === l ? '#fff' : riskColor(l), fontSize: 10, fontWeight: 800, transition: 'all 0.15s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                  <span style={{ fontSize: 14, fontWeight: 800 }}>{riskCount(l)}</span>
                  <span style={{ opacity: 0.8 }}>{l}</span>
                </button>
              ))}
            </div>
            {filteredRisk.length === 0
              ? <EmptyState msg={`No ${riskFilter === 'all' ? '' : riskFilter + ' '}risk users`} />
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 210, overflowY: 'auto' }}>
                  {filteredRisk.map(u => (
                    <div key={u.user_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 12, background: riskBg(u.risk_level), border: `1.5px solid ${riskBorder(u.risk_level)}`, transition: 'transform 0.1s' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: riskColor(u.risk_level), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff' }}>
                          {u.first_name?.[0] ?? '?'}
                        </div>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#1E293B', lineHeight: 1.3 }}>{fullName(u)}</div>
                          <div style={{ fontSize: 9.5, color: '#94A3B8', lineHeight: 1.3 }}>{u.email}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: riskColor(u.risk_level), lineHeight: 1.2 }}>{Number(u.expense_ratio).toFixed(1)}%</div>
                        <div style={{ fontSize: 8.5, fontWeight: 800, color: riskColor(u.risk_level), textTransform: 'uppercase', letterSpacing: '0.05em' }}>{u.risk_level}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            }
          </Card>
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;
