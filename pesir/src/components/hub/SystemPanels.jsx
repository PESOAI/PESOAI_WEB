// components/hub/SystemPanels.jsx — PESO AI
// Panels: LogsPanel, AuditPanel, AdminMgmtPanel
import React, { useState, useEffect, useRef } from 'react';
import {
  RefreshCw, Trash2, Download, Printer,
  UserMinus, ShieldCheck, Eye, EyeOff,
} from 'lucide-react';
import { Badge } from '../UIAtoms';
import { generateAuditPDF } from '../../pdf/auditPDF';
import logo from '../../assets/logo.png';

const BASE = 'http://localhost:5000';

// ─── Activity Logs Panel ──────────────────────────────────────
export const LogsPanel = ({ showToast }) => {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const currentUser = JSON.parse(localStorage.getItem('currentUser')) || {};
  const isMain      = currentUser.role === 'Main Admin';

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(`${BASE}/api/logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!r.ok) throw new Error();
      const d = await r.json();
      setLogs(Array.isArray(d) ? d.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)) : []);
    } catch { setLogs([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLogs(); }, []);

  const handleClear = async () => {
    if (!isMain) { showToast('Only Main Admin can clear logs.', 'error'); return; }
    if (!window.confirm('Clear all logs? This cannot be undone.')) return;
    const token = localStorage.getItem('token');
    await fetch(`${BASE}/api/logs`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    setLogs([]);
    showToast('All logs cleared.', 'warning');
  };

  const typeStyle = { FAILED: 'bg-red-500', SYSTEM: 'bg-blue-500', SUCCESS: 'bg-green-600' };
  const rowStyle  = { FAILED: 'bg-red-50 border-red-100', SYSTEM: 'bg-blue-50 border-blue-100', SUCCESS: 'bg-slate-50 border-slate-100' };

  return (
    <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400">{logs.length} records</span>
          <button onClick={fetchLogs} disabled={loading} className="flex items-center gap-1 text-[10px] font-bold text-blue-500 hover:underline disabled:opacity-40">
            <RefreshCw size={9} className={loading ? 'animate-spin' : ''} />Refresh
          </button>
        </div>
        {isMain && (
          <button onClick={handleClear} className="text-[9px] font-black text-red-500 uppercase hover:underline flex items-center gap-1">
            <Trash2 size={10} />Clear All
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><RefreshCw size={20} className="text-slate-300 animate-spin" /></div>
      ) : (
        <div className="space-y-2">
          {logs.length === 0
            ? <div className="text-center py-10 text-slate-400 text-xs italic">No logs yet.</div>
            : logs.map((log, i) => (
              <div key={log.id ?? i} className={`p-3 rounded-2xl border flex flex-col gap-1 ${rowStyle[log.type] || 'bg-slate-50 border-slate-100'}`}>
                <div className="flex justify-between items-center">
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full text-white ${typeStyle[log.type] || 'bg-slate-500'}`}>{log.type}</span>
                  <span className="text-[9px] text-slate-400 font-medium">{new Date(log.timestamp).toLocaleString()}</span>
                </div>
                <p className="text-xs font-black text-slate-900">{log.user_name}</p>
                <p className="text-[10px] text-slate-500 leading-tight">{log.message}</p>
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
};

// ─── Audit Trail Panel ────────────────────────────────────────
export const AuditPanel = () => {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [pdfBusy, setPdfBusy] = useState(false);

  const fetchAudit = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const r     = await fetch(`${BASE}/api/auth/audit-logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!r.ok) throw new Error('fetch failed');
      const d = await r.json();
      setLogs(Array.isArray(d) ? d : []);
    } catch { setLogs([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAudit(); }, []);

  const getColor = action => {
    const a = (action || '').toLowerCase();
    if (/(delet|remov|clear)/.test(a))                return 'bg-red-100 text-red-600';
    if (/(creat|add)/.test(a))                        return 'bg-green-100 text-green-700';
    if (/(edit|updat|chang|password|avatar)/.test(a)) return 'bg-amber-100 text-amber-600';
    if (/(login|logout)/.test(a))                     return 'bg-blue-100 text-blue-600';
    return 'bg-slate-200 text-slate-600';
  };

  const exportCSV = () => {
    const header = ['Admin', 'Role', 'Action', 'Time'];
    const rows   = logs.map(l => [l.admin_name || '', l.admin_role || '', l.action || '', l.created_at || '']);
    const csv    = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a      = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
      download: `audit-${new Date().toISOString().slice(0, 10)}.csv`,
    });
    a.click();
  };

  const handleExportPDF = async () => {
    setPdfBusy(true);
    try { await generateAuditPDF(logs, logo); }
    catch (e) { console.error('Audit PDF error:', e); }
    finally { setPdfBusy(false); }
  };

  return (
    <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400">{logs.length} records</span>
          <button onClick={fetchAudit} disabled={loading} className="flex items-center gap-1 text-[10px] font-bold text-blue-500 hover:underline disabled:opacity-40">
            <RefreshCw size={9} className={loading ? 'animate-spin' : ''} />Refresh
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={exportCSV} className="flex items-center gap-1 text-[10px] font-black text-emerald-600 hover:underline">
            <Download size={10} />CSV
          </button>
          <button
            onClick={handleExportPDF} disabled={pdfBusy || logs.length === 0}
            className="flex items-center gap-1 text-[10px] font-black text-blue-600 hover:underline disabled:opacity-40"
          >
            {pdfBusy
              ? <><RefreshCw size={10} className="animate-spin" />Generating…</>
              : <><Printer size={10} />PDF</>}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><RefreshCw size={20} className="text-slate-300 animate-spin" /></div>
      ) : logs.length === 0 ? (
        <div className="text-center py-10 text-slate-400 text-xs italic">No audit records yet.</div>
      ) : (
        <div className="space-y-2">
          {logs.map((entry, i) => (
            <div key={entry.id ?? i} className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex items-start gap-3">
              <div className={`px-2 py-1 rounded-lg flex-shrink-0 text-[9px] font-black uppercase whitespace-nowrap ${getColor(entry.action)}`}>
                {(entry.action || 'Action').split(' ')[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-black text-slate-900 leading-tight">{entry.action}</p>
                  <p className="text-[9px] text-slate-400 font-medium flex-shrink-0 whitespace-nowrap">{new Date(entry.created_at).toLocaleString()}</p>
                </div>
                <p className="text-[10px] text-slate-500 font-medium">
                  Admin: <span className="text-blue-600 font-bold">{entry.admin_name || '—'}</span>
                  {entry.admin_role && (
                    <span className={`ml-1.5 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full ${entry.admin_role === 'Main Admin' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                      {entry.admin_role}
                    </span>
                  )}
                </p>
                {entry.target_type && entry.target_type !== 'general' && (
                  <p className="text-[10px] text-slate-400">Target: {entry.target_type}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Password Requirements Checker ───────────────────────────
const pwChecks = [
  { key: 'length',  label: '8+ characters',   test: p => p.length >= 8 },
  { key: 'upper',   label: 'Uppercase letter', test: p => /[A-Z]/.test(p) },
  { key: 'number',  label: 'Number',           test: p => /[0-9]/.test(p) },
  { key: 'special', label: 'Special char',     test: p => /[^A-Za-z0-9]/.test(p) },
];

const PasswordRequirements = ({ password }) => (
  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-100">
    {pwChecks.map(({ key, label, test }) => {
      const passed = test(password);
      return (
        <div key={key} className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors duration-200 ${passed ? 'bg-green-500' : 'bg-slate-300'}`} />
          <span className={`text-[10px] font-semibold transition-colors duration-200 ${passed ? 'text-green-600' : 'text-slate-400'}`}>
            {label}
          </span>
        </div>
      );
    })}
  </div>
);

// ─── Admin Management Panel ───────────────────────────────────
export const AdminMgmtPanel = ({ currentUser, showToast }) => {
  const [view,     setView]     = useState('list');
  const [admins,   setAdmins]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [form,     setForm]     = useState({ username: '', password: '' });
  const [busy,     setBusy]     = useState(false);
  const [msg,      setMsg]      = useState({ text: '', type: '' });
  const [showPass, setShowPass] = useState(false);

  // ── FIX: keep a ref to the interval so we can clear it on unmount ──
  const pollRef = useRef(null);

  const allPassed = pwChecks.every(({ test }) => test(form.password));

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const r     = await fetch(`${BASE}/api/auth/admins`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!r.ok) throw new Error();
      setAdmins(await r.json());
    } catch { setAdmins([]); }
    finally { setLoading(false); }
  };

  // ── FIX: auto-refresh every 30 s so Main Admin sees changes made by
  //         other admins (avatar saves, display name updates) without
  //         needing to manually click Refresh. ──────────────────────
  useEffect(() => {
    fetchAdmins();
    pollRef.current = setInterval(fetchAdmins, 30_000);
    return () => clearInterval(pollRef.current);
  }, []);

  // Stop polling while the "Add New" form is open (no need to refresh then)
  useEffect(() => {
    if (view === 'add') {
      clearInterval(pollRef.current);
    } else {
      clearInterval(pollRef.current);
      pollRef.current = setInterval(fetchAdmins, 30_000);
    }
    return () => clearInterval(pollRef.current);
  }, [view]);

  const handleDelete = async admin => {
    const name = admin.username || admin.name;
    if (name === currentUser.name) { showToast('Cannot remove your own account.', 'error'); return; }
    if (!window.confirm(`Remove admin "${name}"? This cannot be undone.`)) return;
    try {
      const token = localStorage.getItem('token');
      const res   = await fetch(`${BASE}/api/auth/admins/${admin.admin_id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data  = await res.json();
      if (!res.ok) throw new Error(data.message);
      showToast(`Removed: ${name}`, 'warning');
      fetchAdmins();
    } catch (err) { showToast(`❌ ${err.message}`, 'error'); }
  };

  const handleCreate = async e => {
    e.preventDefault();
    setMsg({ text: '', type: '' });
    if (!allPassed) {
      setMsg({ text: '❌ Password does not meet all requirements.', type: 'error' });
      return;
    }
    setBusy(true);
    try {
      const token = localStorage.getItem('token');
      const res   = await fetch(`${BASE}/api/auth/admins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username: form.username, password: form.password, role: 'Staff Admin' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setMsg({ text: `✅ "${form.username}" created!`, type: 'success' });
      setForm({ username: '', password: '' });
      fetchAdmins();
    } catch (err) { setMsg({ text: `❌ ${err.message}`, type: 'error' }); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
      <div className="flex gap-2">
        {[{ k: 'list', label: `Admins (${admins.length})` }, { k: 'add', label: '+ Add New' }].map(({ k, label }) => (
          <button key={k} onClick={() => { setView(k); setMsg({ text: '', type: '' }); setForm({ username: '', password: '' }); setShowPass(false); }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${k === view ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
            {label}
          </button>
        ))}
      </div>

      {view === 'list' && (
        <>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400">{admins.length} accounts</span>
            <button onClick={fetchAdmins} disabled={loading} className="flex items-center gap-1 text-[10px] font-bold text-blue-500 hover:underline disabled:opacity-40">
              <RefreshCw size={9} className={loading ? 'animate-spin' : ''} />Refresh
            </button>
          </div>
          {loading
            ? <div className="flex justify-center py-8"><RefreshCw size={18} className="text-slate-300 animate-spin" /></div>
            : admins.length === 0
            ? <div className="text-center py-8 text-slate-400 text-xs">No admins found.</div>
            : (
              <div className="space-y-2">
                {admins.map((a, i) => {
                  const username  = a.username || a.name || '?';
                  // ── FIX: show display_name from DB if set, otherwise fall back to username ──
                  const label     = a.display_name || username;
                  const role      = a.role || 'Staff Admin';
                  const isSelf    = username === currentUser.name;
                  const isMainAcc = role === 'Main Admin';
                  return (
                    <div key={a.admin_id ?? i} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50 gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {a.avatar
                            ? <img src={a.avatar} alt={username} className="w-full h-full object-cover" />
                            : <ShieldCheck size={14} className="text-white" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            {/* Show display name prominently, username as subtitle if different */}
                            <p className="text-xs font-bold text-slate-900">{label}</p>
                            {isSelf && <Badge color="green">You</Badge>}
                          </div>
                          {a.display_name && a.display_name !== username && (
                            <p className="text-[9px] text-slate-400 font-medium">@{username}</p>
                          )}
                          <Badge color={isMainAcc ? 'blue' : 'slate'}>{role}</Badge>
                        </div>
                      </div>
                      {!isSelf && !isMainAcc
                        ? <button onClick={() => handleDelete(a)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all flex-shrink-0"><UserMinus size={13} /></button>
                        : <span className="text-[9px] text-slate-300 font-bold flex-shrink-0">Protected</span>}
                    </div>
                  );
                })}
              </div>
            )
          }
        </>
      )}

      {view === 'add' && (
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-1">Username</label>
            <input
              type="text"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-400 font-medium"
              placeholder="Enter username"
              required
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-1">Password</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full p-3 pr-10 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-400 font-medium"
                placeholder="Enter password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPass(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {form.password.length > 0 && (
            <PasswordRequirements password={form.password} />
          )}

          <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-100">
            <ShieldCheck size={14} className="text-blue-600" />
            <span className="text-xs font-bold text-slate-600">Role: <span className="text-blue-600">Staff Admin</span></span>
            <span className="text-[9px] text-slate-400 ml-auto">(fixed)</span>
          </div>

          <button
            type="submit"
            disabled={busy || !allPassed || !form.username.trim()}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {busy ? 'Creating…' : 'Create Staff Admin'}
          </button>

          {msg.text && (
            <p className={`text-center text-xs font-bold ${msg.type === 'success' ? 'text-blue-600' : 'text-red-500'}`}>
              {msg.text}
            </p>
          )}
        </form>
      )}
    </div>
  );
};