// pages/AdminDashboard.jsx  –  PESO AI
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users, Activity, Wallet, ArrowDownCircle, PieChart as PieIcon,
  AlertTriangle, TrendingUp, TrendingDown, RefreshCw, ChevronDown, Info
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  Tooltip, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer
} from 'recharts';

const API = 'http://localhost:5000/api/admin';

/* ══════════════════════════════════════════════════════════════
   FIXED FORMULAS — edit thresholds here to apply everywhere
   ══════════════════════════════════════════════════════════════

   1. RISK LEVEL  (based on expense-to-income ratio)
      expense_ratio = (total_expenses / total_income) × 100

      High   → expense_ratio ≥ RISK_THRESHOLDS.HIGH   (≥ 80 %)
      Medium → expense_ratio ≥ RISK_THRESHOLDS.MEDIUM (≥ 50 %)
      Low    → expense_ratio <  RISK_THRESHOLDS.MEDIUM (< 50 %)

   2. SAVINGS RATE  (used in distribution buckets)
      savings_rate = ((income − expenses) / income) × 100

      Negative Saver → savings_rate < 0
      Low Saver      → 0  ≤ savings_rate < SAVINGS_THRESHOLDS.LOW
      Mid Saver      → SAVINGS_THRESHOLDS.LOW ≤ savings_rate < SAVINGS_THRESHOLDS.HIGH
      High Saver     → savings_rate ≥ SAVINGS_THRESHOLDS.HIGH

   3. CATEGORY SHARE
      pct = (category_total / all_categories_total) × 100

   4. SPENDING THRESHOLD  (per category, as % of total spending)
      category_share = (category_total / all_categories_total) × 100

      Over Limit → category_share ≥ SPENDING_THRESHOLDS.CRITICAL (≥ 40 %)
      Caution    → category_share ≥ SPENDING_THRESHOLDS.CAUTION  (≥ 25 %)
      Normal     → category_share <  SPENDING_THRESHOLDS.CAUTION  (< 25 %)

      NOTE: thresholds are relative to the top-6 combined total so they
      are consistent with what's shown in the category bars.
   ══════════════════════════════════════════════════════════════ */

export const RISK_THRESHOLDS = {
  HIGH:   80,   // expense_ratio >= 80 % → High Risk
  MEDIUM: 50,   // expense_ratio >= 50 % → Medium Risk
                // expense_ratio <  50 % → Low Risk
};

export const SAVINGS_THRESHOLDS = {
  LOW:  10,   // savings_rate < 10 % → Low Saver
  HIGH: 30,   // savings_rate >= 30 % → High Saver
              // 10–30 % → Mid Saver
};

/** Fixed risk classifier — single source of truth */
export const computeRisk = (expense_ratio) => {
  const r = Number(expense_ratio);
  if (isNaN(r))         return 'Low';
  if (r >= RISK_THRESHOLDS.HIGH)   return 'High';
  if (r >= RISK_THRESHOLDS.MEDIUM) return 'Medium';
  return 'Low';
};

/** Fixed savings-rate classifier */
export const computeSavingsRate = (income, expenses) => {
  const i = Number(income), e = Number(expenses);
  if (!i || isNaN(i) || isNaN(e)) return 0;
  return ((i - e) / i) * 100;
};

export const SPENDING_THRESHOLDS = {
  CRITICAL: 40,  // category_share >= 40 % of total → Over Limit  🔴
  CAUTION:  25,  // category_share >= 25 % of total → Caution     🟡
                 // category_share <  25 %           → Normal      ✅
};

/** Fixed per-category spending classifier */
export const classifySpending = (category_share) => {
  const s = Number(category_share);
  if (isNaN(s))                              return 'Normal';
  if (s >= SPENDING_THRESHOLDS.CRITICAL)     return 'Over Limit';
  if (s >= SPENDING_THRESHOLDS.CAUTION)      return 'Caution';
  return 'Normal';
};

export const classifySaver = (savings_rate) => {
  const r = Number(savings_rate);
  if (r < 0)                        return 'Negative Saver';
  if (r < SAVINGS_THRESHOLDS.LOW)   return 'Low Saver';
  if (r < SAVINGS_THRESHOLDS.HIGH)  return 'Mid Saver';
  return 'High Saver';
};

/* ─── helpers ──────────────────────────────────────────────── */

const peso = (v) => {
  const n = Number(v);
  if (!v || isNaN(n)) return '—';
  return n >= 1_000_000 ? `₱${(n/1_000_000).toFixed(1)}M`
       : n >= 1000      ? `₱${(n/1000).toFixed(1)}k`
       : `₱${n.toFixed(0)}`;
};

const pct = (num, den) => {
  const n = Number(num), d = Number(den);
  if (!d || isNaN(n) || isNaN(d)) return 0;
  return Math.round((n / d) * 100);
};

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

function useClickOutside(ref, cb) {
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) cb(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [ref, cb]);
}

const riskColor  = (l) => ({ High: '#EF4444', Medium: '#F59E0B', Low: '#22C55E' })[l] ?? '#94A3B8';
const riskBg     = (l) => ({ High: '#FEF2F2', Medium: '#FFFBEB', Low: '#F0FDF4' })[l] ?? '#F8FAFC';
const riskBorder = (l) => ({ High: '#FECACA', Medium: '#FDE68A', Low: '#BBF7D0' })[l] ?? '#E2E8F0';

/* ══════════════════════════════════════════════════════════════ */

const AdminDashboard = () => {
  const [kpis,         setKpis]         = useState(null);
  const [categories,   setCategories]   = useState([]);
  const [allRiskUsers, setAllRiskUsers]  = useState([]);
  const [trend,        setTrend]         = useState([]);
  const [savingsDist,  setSavingsDist]   = useState([]);
  const [initLoading,  setInitLoading]   = useState(true);
  const [trendLoading, setTrendLoading]  = useState(false);
  const [lastUpdate,   setLastUpdate]    = useState(null);
  const [trendFilter,  setTrendFilter]   = useState('monthly');
  const [riskFilter,   setRiskFilter]    = useState('all');
  const [trendOpen,    setTrendOpen]     = useState(false);
  const [riskOpen,     setRiskOpen]      = useState(false);
  const [showFormula,  setShowFormula]   = useState(false);

  const trendRef   = useRef(null);
  const riskRef    = useRef(null);
  const mountedRef = useRef(false);
  useClickOutside(trendRef, () => setTrendOpen(false));
  useClickOutside(riskRef,  () => setRiskOpen(false));

  // ── Fetch everything except trend ──────────────────────────
  const fetchBase = useCallback(async (period = 'monthly') => {
    try {
      const [k, c, h, s] = await Promise.all([
        fetch(`${API}/kpis`).then(r => r.json()),
        fetch(`${API}/top-categories`).then(r => r.json()),
        fetch(`${API}/high-risk`).then(r => r.json()),
        fetch(`${API}/savings-distribution?period=${period}`).then(r => r.json()),
      ]);
      setKpis(k);
      setCategories(Array.isArray(c) ? c : []);

      /*
       * FIXED FORMULA APPLIED HERE:
       * Re-classify every user client-side using computeRisk()
       * so the label always matches the fixed threshold formula
       * regardless of what the backend stored.
       * expense_ratio = (total_expenses / total_income) × 100
       */
      setAllRiskUsers(
        (Array.isArray(h) ? h : []).map(u => {
          const ratio = Number(u.expense_ratio) ||
            pct(u.total_expenses, u.total_income);     // fallback if raw fields present
          return {
            ...u,
            expense_ratio: isNaN(ratio) ? 0 : ratio,
            risk_level: computeRisk(ratio),            // ← fixed formula
          };
        })
      );

      /*
       * FIXED FORMULA APPLIED HERE:
       * If backend returns raw user rows instead of pre-bucketed counts,
       * we re-bucket using computeSavingsRate + classifySaver.
       * If backend already returns [{name, value, color}], pass through.
       */
      const rawS = Array.isArray(s) ? s : [];
      const isPreBucketed = rawS.every(d => 'value' in d && 'name' in d);
      if (isPreBucketed) {
        setSavingsDist(rawS);
      } else {
        // Re-bucket from raw user rows
        const BUCKET_COLORS = {
          'Negative Saver': '#EF4444',
          'Low Saver':      '#F59E0B',
          'Mid Saver':      '#6366F1',
          'High Saver':     '#22C55E',
        };
        const counts = { 'Negative Saver': 0, 'Low Saver': 0, 'Mid Saver': 0, 'High Saver': 0 };
        rawS.forEach(u => {
          const sr = computeSavingsRate(u.total_income, u.total_expenses);
          const bucket = classifySaver(sr);
          counts[bucket] = (counts[bucket] || 0) + 1;
        });
        setSavingsDist(
          Object.entries(counts).map(([name, value]) => ({
            name, value, color: BUCKET_COLORS[name],
          }))
        );
      }

      setLastUpdate(new Date().toLocaleTimeString());
    } catch (e) {
      console.error('Base fetch error:', e);
    }
  }, []);

  // ── Fetch trend only ────────────────────────────────────────
  const fetchTrend = useCallback(async (period) => {
    setTrendLoading(true);
    try {
      const t = await fetch(`${API}/monthly-trend?period=${period}`).then(r => r.json());
      setTrend(Array.isArray(t) ? t : []);
    } catch (e) {
      console.error('Trend fetch error:', e);
    }
    setTrendLoading(false);
  }, []);

  // ── Initial load ────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      setInitLoading(true);
      await Promise.all([fetchBase('monthly'), fetchTrend('monthly')]);
      setInitLoading(false);
    };
    init();
  }, [fetchBase, fetchTrend]);

  // ── Re-fetch when period changes (skip mount) ───────────────
  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return; }
    fetchTrend(trendFilter);
    fetchBase(trendFilter);
  }, [trendFilter, fetchTrend, fetchBase]);

  const handleRefresh = async () => {
    setInitLoading(true);
    await Promise.all([fetchBase(trendFilter), fetchTrend(trendFilter)]);
    setInitLoading(false);
  };

  // ── Client-side risk filter ─────────────────────────────────
  const filteredRisk = riskFilter === 'all'
    ? allRiskUsers
    : allRiskUsers.filter(u => u.risk_level === riskFilter);

  const riskCount = (level) => allRiskUsers.filter(u => u.risk_level === level).length;

  if (initLoading) return (
    <div className="flex items-center justify-center min-h-screen bg-[#F0F4FF]">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-slate-400 font-bold tracking-[0.2em] text-[11px] uppercase">Loading System</p>
      </div>
    </div>
  );

  return (
    <div className="p-8 bg-[#F0F4FF] min-h-screen" style={{ fontFamily: "'Sora', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* HEADER */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold text-indigo-400 tracking-[0.2em] uppercase mb-1">Admin Panel</p>
          <h1 className="text-3xl font-extrabold text-slate-800 leading-tight">System Monitoring</h1>
        </div>
        <button onClick={handleRefresh}
          className="flex items-center gap-2 bg-white border border-slate-200 text-slate-500 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 transition shadow-sm">
          <RefreshCw size={12} />
          {lastUpdate ? `Updated ${lastUpdate}` : 'Refresh'}
        </button>
      </div>

      {/* ── FORMULA LEGEND BANNER ────────────────────────────── */}
      <div className="mb-5">
        <button
          onClick={() => setShowFormula(f => !f)}
          className="flex items-center gap-2 text-[11px] font-bold text-indigo-400 hover:text-indigo-600 transition mb-2">
          <Info size={12} />
          {showFormula ? 'Hide' : 'Show'} Formula Reference
          <ChevronDown size={11} className={`transition-transform duration-200 ${showFormula ? 'rotate-180' : ''}`} />
        </button>

        {showFormula && (
          <div className="bg-white border border-indigo-100 rounded-2xl p-5 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Risk Formula */}
            <div className="space-y-2">
              <p className="text-[10px] font-black text-indigo-400 tracking-widest uppercase">Risk Level Formula</p>
              <code className="block text-[11px] text-slate-600 bg-slate-50 rounded-xl px-3 py-2 leading-relaxed">
                expense_ratio = (expenses ÷ income) × 100
              </code>
              <div className="space-y-1">
                {[
                  { label: `High   ≥ ${RISK_THRESHOLDS.HIGH}%`,                                          color: '#EF4444' },
                  { label: `Medium ${RISK_THRESHOLDS.MEDIUM}% – ${RISK_THRESHOLDS.HIGH - 1}%`,           color: '#F59E0B' },
                  { label: `Low    < ${RISK_THRESHOLDS.MEDIUM}%`,                                        color: '#22C55E' },
                ].map(r => (
                  <div key={r.label} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: r.color }} />
                    <span className="text-[11px] font-semibold text-slate-600">{r.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Savings Formula */}
            <div className="space-y-2">
              <p className="text-[10px] font-black text-indigo-400 tracking-widest uppercase">Savings Rate Formula</p>
              <code className="block text-[11px] text-slate-600 bg-slate-50 rounded-xl px-3 py-2 leading-relaxed">
                savings_rate = ((income − expenses) ÷ income) × 100
              </code>
              <div className="space-y-1">
                {[
                  { label: `Negative  < 0%`,                                                       color: '#EF4444' },
                  { label: `Low       0% – ${SAVINGS_THRESHOLDS.LOW - 1}%`,                        color: '#F59E0B' },
                  { label: `Mid       ${SAVINGS_THRESHOLDS.LOW}% – ${SAVINGS_THRESHOLDS.HIGH - 1}%`, color: '#6366F1' },
                  { label: `High      ≥ ${SAVINGS_THRESHOLDS.HIGH}%`,                              color: '#22C55E' },
                ].map(r => (
                  <div key={r.label} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: r.color }} />
                    <span className="text-[11px] font-semibold text-slate-600">{r.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Category Share */}
            <div className="space-y-2">
              <p className="text-[10px] font-black text-indigo-400 tracking-widest uppercase">Category Share Formula</p>
              <code className="block text-[11px] text-slate-600 bg-slate-50 rounded-xl px-3 py-2 leading-relaxed">
                share = (category_total ÷ all_categories_total) × 100
              </code>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Top 6 categories shown. Percentages are relative to the total of those 6 categories combined.
              </p>
            </div>

            {/* Spending Threshold — NEW */}
            <div className="space-y-2">
              <p className="text-[10px] font-black text-indigo-400 tracking-widest uppercase">Spending Threshold</p>
              <code className="block text-[11px] text-slate-600 bg-slate-50 rounded-xl px-3 py-2 leading-relaxed">
                same share % applied against fixed limits
              </code>
              <div className="space-y-1">
                {[
                  { label: `Over Limit  ≥ ${SPENDING_THRESHOLDS.CRITICAL}% of spending`, color: '#EF4444' },
                  { label: `Caution     ≥ ${SPENDING_THRESHOLDS.CAUTION}% of spending`,  color: '#F59E0B' },
                  { label: `Normal      < ${SPENDING_THRESHOLDS.CAUTION}% of spending`,  color: '#22C55E' },
                ].map(r => (
                  <div key={r.label} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: r.color }} />
                    <span className="text-[11px] font-semibold text-slate-600">{r.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-5">
        {[
          { title: 'Total Users',   value: kpis?.total_users ?? '—',    icon: <Users size={17}/>,           accent: '#6366F1', bg: '#EEF2FF' },
          { title: 'Active Users',  value: `${kpis?.pct_active ?? 0}%`, icon: <Activity size={17}/>,        accent: '#22C55E', bg: '#F0FDF4' },
          { title: 'Avg. Income',   value: peso(kpis?.avg_income),       icon: <Wallet size={17}/>,          accent: '#3B82F6', bg: '#EFF6FF' },
          { title: 'Avg. Expenses', value: peso(kpis?.avg_expenses),     icon: <ArrowDownCircle size={17}/>, accent: '#EF4444', bg: '#FEF2F2' },
          { title: 'Avg. Savings',  value: peso(kpis?.avg_savings),      icon: <PieIcon size={17}/>,         accent: '#F59E0B', bg: '#FFFBEB' },
        ].map(({ title, value, icon, accent, bg }) => (
          <div key={title} className="bg-white rounded-2xl p-5 shadow-sm border border-white flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase leading-tight">{title}</span>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                <span style={{ color: accent }}>{icon}</span>
              </div>
            </div>
            <div className="text-2xl font-extrabold text-slate-800">{value}</div>
            <div className="h-1 rounded-full w-8" style={{ background: accent, opacity: 0.4 }} />
          </div>
        ))}
      </div>

      {/* ROW 2: Trend + Savings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">

        {/* FINANCIAL TREND */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-white">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <TrendingUp size={15} className="text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-700">Financial Trend</h3>
              {trendLoading && (
                <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              )}
            </div>
            <div className="relative" ref={trendRef}>
              <button onClick={() => setTrendOpen(o => !o)}
                className="flex items-center gap-2 bg-slate-50 border border-slate-200 text-slate-600 px-3 py-1.5 rounded-xl text-[11px] font-bold hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition">
                {TREND_FILTERS.find(f => f.value === trendFilter)?.label}
                <ChevronDown size={11} className={`transition-transform duration-200 ${trendOpen ? 'rotate-180' : ''}`} />
              </button>
              {trendOpen && (
                <div className="absolute right-0 top-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 overflow-hidden min-w-[130px]">
                  {TREND_FILTERS.map(f => (
                    <button key={f.value}
                      onClick={() => { setTrendFilter(f.value); setTrendOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-xs font-bold transition
                        ${trendFilter === f.value ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}>
                      {f.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {trend.length === 0 ? <EmptyState msg="No trend data available." /> : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  {[['gInc','#22C55E'],['gExp','#EF4444'],['gSav','#6366F1']].map(([id,c]) => (
                    <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={c} stopOpacity={0.2}/>
                      <stop offset="95%" stopColor={c} stopOpacity={0}/>
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={v => `₱${v/1000}k`} />
                <Tooltip formatter={(v, n) => [peso(v), n.replace('avg_','').toUpperCase()]}
                  contentStyle={{ borderRadius: 14, border: '1px solid #E2E8F0', fontSize: 11 }} />
                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
                <Area type="monotone" dataKey="avg_income"   name="Income"   stroke="#22C55E" fill="url(#gInc)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="avg_expenses" name="Expenses" stroke="#EF4444" fill="url(#gExp)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="avg_savings"  name="Savings"  stroke="#6366F1" fill="url(#gSav)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* SAVINGS DISTRIBUTION */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-white">
          <div className="flex items-center gap-2 mb-1">
            <PieIcon size={15} className="text-indigo-400" />
            <h3 className="text-sm font-bold text-slate-700">Savings Distribution</h3>
          </div>
          {/* Formula hint */}
          <p className="text-[10px] text-slate-400 font-medium mb-4">
            savings_rate = (income − expenses) ÷ income × 100
          </p>
          {savingsDist.every(d => d.value === 0) ? <EmptyState /> : (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={savingsDist} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                    {savingsDist.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip
                    formatter={(v, _n, { payload }) => {
                      const total = savingsDist.reduce((s, d) => s + d.value, 0);
                      /*
                       * FIXED FORMULA: show both count AND percentage of total users
                       * share = (bucket_count / total_users) × 100
                       */
                      const sharePct = total > 0 ? Math.round((v / total) * 100) : 0;
                      return [`${v} users (${sharePct}%)`, payload.name];
                    }}
                    contentStyle={{ borderRadius: 12, fontSize: 11, border: '1px solid #E2E8F0' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-3">
                {savingsDist.map((d, i) => {
                  const total = savingsDist.reduce((s, x) => s + x.value, 0);
                  const sharePct = pct(d.value, total);
                  return (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                        <span className="text-[11px] font-semibold text-slate-500">{d.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-extrabold text-slate-700">{d.value} users</span>
                        <span className="text-[10px] text-slate-400 ml-1">({sharePct}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ROW 3: Categories + Bar + Risk */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* TOP SPENDING CATEGORIES */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-white">
          <div className="flex items-center gap-2 mb-1">
            <ArrowDownCircle size={15} className="text-indigo-400" />
            <h3 className="text-sm font-bold text-slate-700">Top Spending Categories</h3>
          </div>
          <p className="text-[10px] text-slate-400 font-medium mb-4">
            share = category_total ÷ all_categories_total × 100 &nbsp;·&nbsp;
            Over Limit ≥ {SPENDING_THRESHOLDS.CRITICAL}% &nbsp;·&nbsp;
            Caution ≥ {SPENDING_THRESHOLDS.CAUTION}%
          </p>
          {categories.length === 0 ? <EmptyState /> : (() => {
            const top6 = categories.slice(0, 6);
            // FIXED FORMULA: denominator is sum of top-6 only (consistent with what's displayed)
            const totalSpent = top6.reduce((sum, c) => sum + Number(c.total_spent || 0), 0);
            return (
              <div className="space-y-4">
                {top6.map((c, i) => {
                  const share = pct(c.total_spent, totalSpent);   // ← fixed formula helper
                  const spendStatus = classifySpending(share);    // ← spending threshold
                  const badgeColor = { 'Over Limit': '#EF4444', 'Caution': '#F59E0B', 'Normal': null }[spendStatus];
                  const badgeBg    = { 'Over Limit': '#FEF2F2', 'Caution': '#FFFBEB', 'Normal': null }[spendStatus];
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.color_hex }} />
                          <span className="text-xs font-semibold text-slate-600">{c.category}</span>
                          {/* Spending threshold badge */}
                          {spendStatus !== 'Normal' && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full border"
                              style={{ color: badgeColor, background: badgeBg, borderColor: badgeColor + '55' }}>
                              {spendStatus}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-extrabold"
                          style={{ color: badgeColor ?? '#475569' }}>
                          {share}%
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-2 rounded-full transition-all duration-500"
                          style={{ width: share + '%', background: badgeColor ?? c.color_hex }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* EXPENSE BAR */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-white">
          <div className="flex items-center gap-2 mb-5">
            <TrendingDown size={15} className="text-indigo-400" />
            <h3 className="text-sm font-bold text-slate-700">Expense by Category</h3>
          </div>
          {categories.length === 0 ? <EmptyState /> : (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={categories.slice(0,6)} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 9, fill: '#94A3B8' }} axisLine={false} tickLine={false}
                  tickFormatter={v => `₱${v/1000}k`} />
                <YAxis type="category" dataKey="category" tick={{ fontSize: 9, fontWeight: 700, fill: '#64748B' }}
                  axisLine={false} tickLine={false} width={95} />
                <Tooltip formatter={(v, _n, { payload }) => {
                    const top6total = categories.slice(0,6).reduce((s,c) => s + Number(c.total_spent||0), 0);
                    const share = pct(v, top6total);
                    const status = classifySpending(share);
                    return [`${peso(v)}  (${share}% — ${status})`, 'Total'];
                  }}
                  contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 11 }} />
                <Bar dataKey="total_spent" radius={[0, 8, 8, 0]} barSize={14}>
                  {categories.map((c, i) => <Cell key={i} fill={c.color_hex} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* RISK USERS */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-white">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <AlertTriangle size={15} className="text-red-400" />
              <h3 className="text-sm font-bold text-slate-700">Risk Users</h3>
              <span className="bg-slate-100 text-slate-500 text-[9px] font-black px-1.5 py-0.5 rounded-full border border-slate-200">
                {filteredRisk.length}
              </span>
            </div>
            <div className="relative" ref={riskRef}>
              <button onClick={() => setRiskOpen(o => !o)}
                className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 text-slate-600 px-3 py-1.5 rounded-xl text-[11px] font-bold hover:bg-slate-100 transition">
                {riskFilter !== 'all' && (
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: riskColor(riskFilter) }} />
                )}
                {RISK_FILTERS.find(f => f.value === riskFilter)?.label}
                <ChevronDown size={11} className={`transition-transform duration-200 ${riskOpen ? 'rotate-180' : ''}`} />
              </button>
              {riskOpen && (
                <div className="absolute right-0 top-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 overflow-hidden min-w-[150px]">
                  {RISK_FILTERS.map(f => (
                    <button key={f.value}
                      onClick={() => { setRiskFilter(f.value); setRiskOpen(false); }}
                      className={`w-full flex items-center gap-2.5 text-left px-4 py-2.5 text-xs font-bold transition
                        ${riskFilter === f.value ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}>
                      {f.value !== 'all' && (
                        <div className="w-2 h-2 rounded-full" style={{ background: riskColor(f.value) }} />
                      )}
                      {f.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Formula hint under title */}
          <p className="text-[10px] text-slate-400 font-medium mb-3">
            expense_ratio = expenses ÷ income × 100 &nbsp;·&nbsp;
            High ≥ {RISK_THRESHOLDS.HIGH}% &nbsp;·&nbsp;
            Med ≥ {RISK_THRESHOLDS.MEDIUM}%
          </p>

          {/* Quick-tap pills with live counts */}
          <div className="flex gap-2 mb-4">
            {['High','Medium','Low'].map(l => (
              <button key={l}
                onClick={() => setRiskFilter(riskFilter === l ? 'all' : l)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-extrabold border transition"
                style={{
                  background:  riskFilter === l ? riskColor(l) : riskBg(l),
                  borderColor: riskFilter === l ? riskColor(l) : riskBorder(l),
                  color:       riskFilter === l ? '#fff'        : riskColor(l),
                }}>
                {l}
                <span className="opacity-80">{riskCount(l)}</span>
              </button>
            ))}
          </div>

          {filteredRisk.length === 0 ? (
            <EmptyState msg={`No ${riskFilter === 'all' ? '' : riskFilter + ' '}risk users found.`} />
          ) : (
            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
              {filteredRisk.map((u) => (
                <div key={u.user_id}
                  className="flex items-center justify-between p-3.5 rounded-2xl border transition hover:shadow-sm"
                  style={{ background: riskBg(u.risk_level), borderColor: riskBorder(u.risk_level) }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center font-extrabold text-xs text-white flex-shrink-0"
                      style={{ background: riskColor(u.risk_level) }}>
                      {u.full_name?.[0] ?? '?'}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 leading-tight">{u.full_name}</p>
                      <p className="text-[10px] text-slate-400 leading-tight">{u.email}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <div className="text-sm font-extrabold" style={{ color: riskColor(u.risk_level) }}>
                      {Number(u.expense_ratio).toFixed(1)}%
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-wider block"
                      style={{ color: riskColor(u.risk_level) }}>
                      {u.risk_level}
                    </span>
                    <span className="text-[8px] text-slate-400 font-medium">of income</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

const EmptyState = ({ msg = 'No data available.' }) => (
  <div className="flex items-center justify-center h-32 text-slate-300 text-sm font-medium">{msg}</div>
);

export default AdminDashboard;