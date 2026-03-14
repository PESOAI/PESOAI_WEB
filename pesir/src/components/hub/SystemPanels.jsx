// components/hub/SystemPanels.jsx — PESO AI
// Panels: LogsPanel, AuditPanel, AdminMgmtPanel
import React, { useState, useEffect, useRef } from 'react';
import {
  RefreshCw, Trash2, Printer, FileSpreadsheet,
  UserMinus, ShieldCheck, Eye, EyeOff,
  LogIn, LogOut, Edit3, PlusCircle, Trash,
  Image, Key, User, Shield,
} from 'lucide-react';
import { Badge } from '../UIAtoms';
import { generateAuditPDF }  from '../../pdf/auditPDF';
import { generateAuditXLSX } from '../../pdf/auditExport';
import logo from '../../assets/logo.png';

const BASE = 'http://localhost:5000';

const gf = (log, ...keys) => {
  for (const k of keys) if (log[k] != null && log[k] !== '') return String(log[k]);
  return '—';
};

const actionCfg = (action = '') => {
  const a = action.toLowerCase();
  if (/^login/.test(a))                       return { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE', icon: <LogIn      size={9} /> };
  if (/^logout/.test(a))                      return { bg: '#F8FAFC', text: '#475569', border: '#CBD5E1', icon: <LogOut     size={9} /> };
  if (/(creat|add)/.test(a))                  return { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0', icon: <PlusCircle size={9} /> };
  if (/(delet|remov|clear)/.test(a))          return { bg: '#FFF5F5', text: '#B91C1C', border: '#FECACA', icon: <Trash     size={9} /> };
  if (/(password|pw)/.test(a))                return { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA', icon: <Key       size={9} /> };
  if (/(avatar|picture|photo|image)/.test(a)) return { bg: '#FDF4FF', text: '#7E22CE', border: '#E9D5FF', icon: <Image     size={9} /> };
  if (/(display.?name|name|profile)/.test(a)) return { bg: '#F0FDF4', text: '#047857', border: '#6EE7B7', icon: <User      size={9} /> };
  if (/(edit|updat|chang)/.test(a))           return { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A', icon: <Edit3     size={9} /> };
  return                                             { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0', icon: <Shield    size={9} /> };
};

const ActionBadge = ({ action }) => {
  const { bg, text, border, icon } = actionCfg(action);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 99, fontSize: 9, fontWeight: 800, letterSpacing: '0.03em', textTransform: 'uppercase', background: bg, color: text, border: `1px solid ${border}`, lineHeight: 1.4, maxWidth: '100%', overflow: 'hidden' }}>
      <span style={{ flexShrink: 0 }}>{icon}</span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{action}</span>
    </span>
  );
};

const RoleChip = ({ role }) => {
  const isMain = /main/i.test(role || '');
  return (
    <span style={{ display: 'inline-block', fontSize: 8, fontWeight: 800, padding: '2px 6px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: '0.05em', background: isMain ? '#EEF2FF' : '#F1F5F9', color: isMain ? '#4338CA' : '#64748B', border: `1px solid ${isMain ? '#C7D2FE' : '#E2E8F0'}`, whiteSpace: 'nowrap', marginTop: 3 }}>
      {isMain ? 'Main' : 'Staff'}
    </span>
  );
};

const FILTER_DEFS = [
  { key: 'all',     label: 'All'     },
  { key: 'today',   label: 'Today'   },
  { key: 'Login',   label: 'Login'   },
  { key: 'Logout',  label: 'Logout'  },
  { key: 'Created', label: 'Created' },
  { key: 'Deleted', label: 'Deleted' },
  { key: 'Updated', label: 'Updated' },
];

const filterMatch = (log, filter) => {
  if (filter === 'all') return true;
  if (filter === 'today') return String(gf(log, 'created_at', 'time', 'timestamp')).startsWith(new Date().toISOString().slice(0, 10));
  return gf(log, 'action').toLowerCase().includes(filter.toLowerCase());
};

/* ══════════════════════════════════════════════════════════════
   ACTIVITY LOGS PANEL
══════════════════════════════════════════════════════════════ */
export const LogsPanel = ({ showToast }) => {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const currentUser = JSON.parse(localStorage.getItem('currentUser')) || {};
  const isMain      = currentUser.role === 'Main Admin';

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(`${BASE}/api/logs`, { headers: { Authorization: `Bearer ${token}` } });
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
    await fetch(`${BASE}/api/logs`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    setLogs([]);
    showToast('All logs cleared.', 'warning');
  };

  const typeStyle = {
    FAILED:  { bg: '#FFF5F5', text: '#B91C1C', dot: '#EF4444' },
    SYSTEM:  { bg: '#EFF6FF', text: '#1D4ED8', dot: '#3B82F6' },
    SUCCESS: { bg: '#F0FDF4', text: '#15803D', dot: '#22C55E' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '65vh', overflowY: 'auto', paddingRight: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8' }}>{logs.length} records</span>
          <button onClick={fetchLogs} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: '#3B82F6', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <RefreshCw size={9} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />Refresh
          </button>
        </div>
        {isMain && (
          <button onClick={handleClear} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, fontWeight: 900, color: '#EF4444', textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <Trash2 size={10} />Clear All
          </button>
        )}
      </div>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
          <RefreshCw size={20} style={{ color: '#CBD5E1', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : logs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8', fontSize: 12, fontStyle: 'italic' }}>No logs yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {logs.map((log, i) => {
            const s = typeStyle[log.type] || typeStyle.SUCCESS;
            return (
              <div key={log.id ?? i} style={{ padding: '10px 12px', borderRadius: 12, background: s.bg, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 9, fontWeight: 900, textTransform: 'uppercase', color: s.text }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, display: 'inline-block' }} />{log.type}
                  </span>
                  <span style={{ fontSize: 9, color: '#94A3B8', fontWeight: 500 }}>
                    {new Date(log.timestamp).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                  </span>
                </div>
                <p style={{ fontSize: 11, fontWeight: 800, color: '#0F172A', margin: 0 }}>{log.user_name}</p>
                <p style={{ fontSize: 10, color: '#64748B', margin: 0, lineHeight: 1.4 }}>{log.message}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   AUDIT TRAIL PANEL
══════════════════════════════════════════════════════════════ */
export const AuditPanel = () => {
  const [logs,     setLogs]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [pdfBusy,  setPdfBusy]  = useState(false);
  const [xlsxBusy, setXlsxBusy] = useState(false);
  const [filter,   setFilter]   = useState('all');

  const fetchAudit = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const r     = await fetch(`${BASE}/api/auth/audit-logs`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error();
      const d = await r.json();
      setLogs(Array.isArray(d) ? d : []);
    } catch { setLogs([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAudit(); }, []);

  const handleExportXLSX = async () => {
    setXlsxBusy(true);
    try { await generateAuditXLSX(logs, { filter }); }
    catch (e) { console.error('Audit Excel error:', e); }
    finally { setXlsxBusy(false); }
  };

  const handleExportPDF = async () => {
    setPdfBusy(true);
    try { await generateAuditPDF(logs, { filter }, logo); }
    catch (e) { console.error('Audit PDF error:', e); }
    finally { setPdfBusy(false); }
  };

  const visible  = logs.filter(l => filterMatch(l, filter));
  const countFor = (key) => key === 'all' ? logs.length : logs.filter(l => filterMatch(l, key)).length;
  const anyBusy  = pdfBusy || xlsxBusy;

  return (
    /* key fix: overflow: hidden on wrapper kills the horizontal scrollbar */
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '65vh', overflow: 'hidden' }}>

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8' }}>{logs.length} records</span>
          <button onClick={fetchAudit} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: '#3B82F6', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <RefreshCw size={9} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />Refresh
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
          <button onClick={handleExportXLSX} disabled={anyBusy || logs.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', fontSize: 10, fontWeight: 900, color: xlsxBusy ? '#94A3B8' : '#15803D', background: 'none', border: 'none', borderRight: '1px solid #E2E8F0', cursor: anyBusy || logs.length === 0 ? 'not-allowed' : 'pointer', opacity: anyBusy || logs.length === 0 ? 0.5 : 1 }}>
            {xlsxBusy ? <><RefreshCw size={10} style={{ animation: 'spin 0.8s linear infinite' }} />Exporting…</> : <><FileSpreadsheet size={11} />Excel</>}
          </button>
          <button onClick={handleExportPDF} disabled={anyBusy || logs.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', fontSize: 10, fontWeight: 900, color: pdfBusy ? '#94A3B8' : '#1D4ED8', background: 'none', border: 'none', cursor: anyBusy || logs.length === 0 ? 'not-allowed' : 'pointer', opacity: anyBusy || logs.length === 0 ? 0.5 : 1 }}>
            {pdfBusy ? <><RefreshCw size={10} style={{ animation: 'spin 0.8s linear infinite' }} />Generating…</> : <><Printer size={10} />PDF</>}
          </button>
        </div>
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, flexShrink: 0 }}>
        {FILTER_DEFS.map(({ key, label }) => {
          const cnt    = countFor(key);
          const active = filter === key;
          const { bg, text, border } = actionCfg(key === 'all' || key === 'today' ? '' : key);
          return (
            <button key={key} onClick={() => setFilter(key)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 99, fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', cursor: 'pointer', transition: 'all 0.15s', background: active ? '#0F172A' : key === 'today' ? '#F0FDFA' : bg, color: active ? '#fff' : key === 'today' ? '#0F766E' : text, border: `1.5px solid ${active ? '#0F172A' : key === 'today' ? '#99F6E4' : border}` }}>
              {label}
              <span style={{ background: active ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.07)', color: active ? '#fff' : 'inherit', borderRadius: 99, padding: '1px 5px', fontSize: 8, fontWeight: 900 }}>{cnt}</span>
            </button>
          );
        })}
      </div>

      {/* Table — overflowX hidden, no horizontal scrollbar ever */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', borderRadius: 12, border: '1px solid #E2E8F0', background: '#fff' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <RefreshCw size={22} style={{ color: '#CBD5E1', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : visible.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#94A3B8', fontSize: 12, fontStyle: 'italic' }}>
            No entries match this filter.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '44%' }} />
              <col style={{ width: '26%' }} />
              <col style={{ width: '30%' }} />
            </colgroup>
            <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
              <tr style={{ background: '#0F172A' }}>
                <th style={{ padding: '10px 12px', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748B', textAlign: 'left',  borderBottom: '2px solid #1E293B' }}>Action</th>
                <th style={{ padding: '10px 12px', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748B', textAlign: 'left',  borderBottom: '2px solid #1E293B' }}>Admin</th>
                <th style={{ padding: '10px 12px', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748B', textAlign: 'right', borderBottom: '2px solid #1E293B' }}>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((entry, i) => {
                const action = gf(entry, 'action');
                const admin  = gf(entry, 'admin_name', 'admin', 'user');
                const role   = gf(entry, 'admin_role', 'role');
                const ts     = gf(entry, 'created_at', 'time', 'timestamp');
                const rowBg  = i % 2 === 0 ? '#FFFFFF' : '#F8FAFC';

                let tsDate = '—', tsTime = '';
                try {
                  const d = new Date(ts);
                  if (!isNaN(d)) {
                    tsDate = d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
                    tsTime = d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true });
                  }
                } catch {}

                return (
                  <tr key={entry.id ?? i}
                    style={{ background: rowBg, transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#EEF2FF'}
                    onMouseLeave={e => e.currentTarget.style.background = rowBg}>

                    {/* Action */}
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #F1F5F9', overflow: 'hidden' }}>
                      <ActionBadge action={action} />
                    </td>

                    {/* Admin + Role */}
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #F1F5F9', overflow: 'hidden' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{admin}</div>
                      <RoleChip role={role} />
                    </td>

                    {/* Timestamp — two lines, right-aligned */}
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #F1F5F9', textAlign: 'right' }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: '#334155', whiteSpace: 'nowrap' }}>{tsDate}</div>
                      <div style={{ fontSize: 9,  fontWeight: 500, color: '#94A3B8',  whiteSpace: 'nowrap' }}>{tsTime}</div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      <div style={{ flexShrink: 0, textAlign: 'right' }}>
        <span style={{ fontSize: 9, color: '#94A3B8', fontWeight: 600 }}>Showing {visible.length} of {logs.length} records</span>
      </div>

    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   PASSWORD REQUIREMENTS
══════════════════════════════════════════════════════════════ */
const pwChecks = [
  { key: 'length',  label: '8+ characters',   test: p => p.length >= 8 },
  { key: 'upper',   label: 'Uppercase letter', test: p => /[A-Z]/.test(p) },
  { key: 'number',  label: 'Number',           test: p => /[0-9]/.test(p) },
  { key: 'special', label: 'Special char',     test: p => /[^A-Za-z0-9]/.test(p) },
];

const PasswordRequirements = ({ password }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', padding: '10px 12px', background: '#F8FAFC', borderRadius: 12, border: '1px solid #F1F5F9' }}>
    {pwChecks.map(({ key, label, test }) => {
      const passed = test(password);
      return (
        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: passed ? '#22C55E' : '#CBD5E1', transition: 'background 0.2s' }} />
          <span style={{ fontSize: 10, fontWeight: 600, color: passed ? '#16A34A' : '#94A3B8', transition: 'color 0.2s' }}>{label}</span>
        </div>
      );
    })}
  </div>
);

/* ══════════════════════════════════════════════════════════════
   ADMIN MANAGEMENT PANEL
══════════════════════════════════════════════════════════════ */
export const AdminMgmtPanel = ({ currentUser, showToast }) => {
  const [view,     setView]     = useState('list');
  const [admins,   setAdmins]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [form,     setForm]     = useState({ username: '', password: '' });
  const [busy,     setBusy]     = useState(false);
  const [msg,      setMsg]      = useState({ text: '', type: '' });
  const [showPass, setShowPass] = useState(false);
  const pollRef   = useRef(null);
  const allPassed = pwChecks.every(({ test }) => test(form.password));

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const r     = await fetch(`${BASE}/api/auth/admins`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error();
      setAdmins(await r.json());
    } catch { setAdmins([]); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchAdmins();
    pollRef.current = setInterval(fetchAdmins, 30_000);
    return () => clearInterval(pollRef.current);
  }, []);

  useEffect(() => {
    clearInterval(pollRef.current);
    if (view !== 'add') pollRef.current = setInterval(fetchAdmins, 30_000);
    return () => clearInterval(pollRef.current);
  }, [view]);

  const handleDelete = async admin => {
    const name = admin.username || admin.name;
    if (name === currentUser.name) { showToast('Cannot remove your own account.', 'error'); return; }
    if (!window.confirm(`Remove admin "${name}"? This cannot be undone.`)) return;
    try {
      const token = localStorage.getItem('token');
      const res   = await fetch(`${BASE}/api/auth/admins/${admin.admin_id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const data  = await res.json();
      if (!res.ok) throw new Error(data.message);
      showToast(`Removed: ${name}`, 'warning');
      fetchAdmins();
    } catch (err) { showToast(`❌ ${err.message}`, 'error'); }
  };

  const handleCreate = async e => {
    e.preventDefault();
    setMsg({ text: '', type: '' });
    if (!allPassed) { setMsg({ text: '❌ Password does not meet all requirements.', type: 'error' }); return; }
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '65vh', overflowY: 'auto', paddingRight: 4 }}>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        {[{ k: 'list', label: `Admins (${admins.length})` }, { k: 'add', label: '+ Add New' }].map(({ k, label }) => (
          <button key={k} onClick={() => { setView(k); setMsg({ text: '', type: '' }); setForm({ username: '', password: '' }); setShowPass(false); }}
            style={{ flex: 1, padding: '8px 0', borderRadius: 12, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', background: k === view ? '#0F172A' : '#F1F5F9', color: k === view ? '#FFFFFF' : '#64748B', border: 'none' }}>
            {label}
          </button>
        ))}
      </div>

      {view === 'list' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8' }}>{admins.length} accounts</span>
            <button onClick={fetchAdmins} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: '#3B82F6', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <RefreshCw size={9} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />Refresh
            </button>
          </div>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
              <RefreshCw size={18} style={{ color: '#CBD5E1', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : admins.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#94A3B8', fontSize: 12 }}>No admins found.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {admins.map((a, i) => {
                const username  = a.username || a.name || '?';
                const label     = a.display_name || username;
                const role      = a.role || 'Staff Admin';
                const isSelf    = username === currentUser.name;
                const isMainAcc = role === 'Main Admin';
                return (
                  <div key={a.admin_id ?? i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 12, border: '1px solid #F1F5F9', background: '#F8FAFC', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 10, background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                        {a.avatar ? <img src={a.avatar} alt={username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ShieldCheck size={14} color="#fff" />}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#1E293B' }}>{label}</span>
                          {isSelf && <Badge color="green">You</Badge>}
                        </div>
                        {a.display_name && a.display_name !== username && (
                          <span style={{ fontSize: 9, color: '#94A3B8', fontWeight: 500, display: 'block' }}>@{username}</span>
                        )}
                        <div style={{ marginTop: 3 }}><Badge color={isMainAcc ? 'blue' : 'slate'}>{role}</Badge></div>
                      </div>
                    </div>
                    {!isSelf && !isMainAcc
                      ? <button onClick={() => handleDelete(a)} style={{ padding: 6, borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#F87171', flexShrink: 0 }} onMouseEnter={e => e.currentTarget.style.background = '#FFF5F5'} onMouseLeave={e => e.currentTarget.style.background = 'none'}><UserMinus size={13} /></button>
                      : <span style={{ fontSize: 9, color: '#CBD5E1', fontWeight: 700, flexShrink: 0 }}>Protected</span>}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {view === 'add' && (
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 10, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.15em', display: 'block', marginBottom: 6 }}>Username</label>
            <input type="text" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: '1.5px solid #E2E8F0', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} placeholder="Enter username" required />
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.15em', display: 'block', marginBottom: 6 }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} style={{ width: '100%', padding: '10px 40px 10px 12px', borderRadius: 12, border: '1.5px solid #E2E8F0', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} placeholder="Enter password" required />
              <button type="button" onClick={() => setShowPass(p => !p)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex', alignItems: 'center' }}>
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          {form.password.length > 0 && <PasswordRequirements password={form.password} />}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: '#F8FAFC', borderRadius: 12, border: '1px solid #F1F5F9' }}>
            <ShieldCheck size={14} color="#3B82F6" />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Role: <span style={{ color: '#3B82F6' }}>Staff Admin</span></span>
            <span style={{ fontSize: 9, color: '#CBD5E1', marginLeft: 'auto' }}>(fixed)</span>
          </div>
          <button type="submit" disabled={busy || !allPassed || !form.username.trim()} style={{ padding: '12px 0', background: '#2563EB', color: '#fff', borderRadius: 12, fontWeight: 700, fontSize: 13, border: 'none', cursor: busy || !allPassed || !form.username.trim() ? 'not-allowed' : 'pointer', opacity: busy || !allPassed || !form.username.trim() ? 0.5 : 1, fontFamily: 'inherit' }}>
            {busy ? 'Creating…' : 'Create Staff Admin'}
          </button>
          {msg.text && <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: msg.type === 'success' ? '#2563EB' : '#EF4444', margin: 0 }}>{msg.text}</p>}
        </form>
      )}
    </div>
  );
};