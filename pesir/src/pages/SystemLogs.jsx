import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivitySquare,
  AlertTriangle,
  RefreshCw,
  Search,
  ShieldAlert,
  Smartphone,
  Trash2,
} from 'lucide-react';

import { ConfirmModal, Toast, useConfirm } from '../components/GlobalConfirmModal';
import { apiFetch } from '../utils/authClient';

const TYPE_STYLES = {
  FAILED: 'bg-rose-50 text-rose-700 border-rose-200',
  SYSTEM: 'bg-blue-50 text-blue-700 border-blue-200',
  SUCCESS: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const SOURCE_STYLES = {
  mobile: 'bg-amber-50 text-amber-700 border-amber-200',
  backend: 'bg-slate-100 text-slate-600 border-slate-200',
};

const safeJsonParse = (value) => {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const normalizeLog = (entry) => {
  const metadata = safeJsonParse(entry.metadata);
  const source = String(entry.source || metadata?.source || 'backend').toLowerCase();
  const severity = String(metadata?.severity || '').toLowerCase();
  const category = String(metadata?.category || '').toLowerCase();
  const occurredAt = metadata?.occurredAt || entry.timestamp || null;

  return {
    ...entry,
    metadata,
    source,
    severity,
    category,
    occurredAt,
    searchableText: [
      entry.type,
      entry.user_name,
      entry.message,
      entry.error_code,
      entry.user_id,
      entry.status_code,
      metadata?.message,
      metadata?.code,
      metadata?.details,
      metadata?.deviceModel,
      metadata?.osVersion,
      metadata?.appVersion,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase(),
  };
};

const formatDateTime = (value) => {
  if (!value) return { date: 'Unknown', time: '' };
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return { date: 'Unknown', time: '' };
  return {
    date: parsed.toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    time: parsed.toLocaleTimeString('en-PH', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }),
  };
};

const StatusPill = ({ children, tone }) => (
  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${tone}`}>
    <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
    {children}
  </span>
);

const MetricCard = ({ label, value, accent, icon, active = false, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-[1.6rem] border bg-white p-5 text-left shadow-sm transition ${
      active
        ? 'border-blue-300 ring-4 ring-blue-100'
        : 'border-slate-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md'
    }`}
  >
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</p>
        <p className="mt-3 text-3xl font-black tracking-tight text-slate-900">{value}</p>
      </div>
      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${accent}`}>
        {icon}
      </div>
    </div>
  </button>
);

const EmptyLogsState = ({ hasFilters }) => (
  <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-8 py-16 text-center shadow-sm">
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
      <ActivitySquare size={22} />
    </div>
    <h2 className="mt-5 text-xl font-black tracking-tight text-slate-900">
      {hasFilters ? 'No logs matched your filters' : 'No logs captured yet'}
    </h2>
    <p className="mt-2 text-sm leading-relaxed text-slate-500">
      {hasFilters
        ? 'Try a broader search or switch the source filter back to all events.'
        : 'System, backend, and mobile errors will appear here once the API records them.'}
    </p>
  </div>
);

const SystemLogs = () => {
  const { modal, toasts, confirm, showToast, handleConfirm, handleCancel } = useConfirm();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');

  const isMainAdmin = currentUser?.role === 'Main Admin';

  const fetchCurrentUser = useCallback(async () => {
    try {
      const response = await apiFetch('/api/auth/admins/me');
      if (!response.ok) return;
      const data = await response.json();
      setCurrentUser({
        id: data.userId || null,
        displayName: data.displayName || data.username || 'Admin',
        role: data.role || 'Staff Admin',
      });
    } catch {
      setCurrentUser(null);
    }
  }, []);

  const fetchLogs = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await apiFetch('/api/logs');
      if (!response.ok) throw new Error('Failed to fetch logs');
      const data = await response.json();
      const nextLogs = Array.isArray(data)
        ? data
            .map(normalizeLog)
            .sort((left, right) => new Date(right.timestamp || 0) - new Date(left.timestamp || 0))
        : [];
      setLogs(nextLogs);
    } catch {
      setLogs([]);
      if (silent) showToast('Unable to refresh logs right now.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchCurrentUser();
    fetchLogs();
  }, [fetchCurrentUser, fetchLogs]);

  const filteredLogs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return logs.filter((entry) => {
      const matchesSource =
        sourceFilter === 'all' ||
        (sourceFilter === 'mobile' && entry.source === 'mobile') ||
        (sourceFilter === 'backend' && entry.source !== 'mobile') ||
        (sourceFilter === 'failed' && entry.type === 'FAILED');
      const matchesSearch = !term || entry.searchableText.includes(term);
      return matchesSource && matchesSearch;
    });
  }, [logs, searchTerm, sourceFilter]);

  const metrics = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return {
      total: logs.length,
      mobile: logs.filter((entry) => entry.source === 'mobile').length,
      failed: logs.filter((entry) => entry.type === 'FAILED').length,
      today: logs.filter((entry) => String(entry.timestamp || '').startsWith(today)).length,
    };
  }, [logs]);

  const handleClearLogs = useCallback(async () => {
    if (!isMainAdmin) {
      showToast('Only Main Admin can clear logs.', 'error');
      return;
    }

    const approved = await confirm({
      variant: 'clear',
      title: 'Clear All Logs?',
      subtitle: 'This will permanently remove system and mobile error history.',
      subject: currentUser?.displayName || 'Main Admin',
    });
    if (!approved) return;

    setClearing(true);
    try {
      const response = await apiFetch('/api/logs', { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Failed to clear logs');
      setLogs([]);
      showToast('System logs cleared.', 'warning');
    } catch (error) {
      showToast(error.message || 'Unable to clear logs.', 'error');
    } finally {
      setClearing(false);
    }
  }, [confirm, currentUser?.displayName, isMainAdmin, showToast]);

  const hasFilters = Boolean(searchTerm.trim()) || sourceFilter !== 'all';

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Loading system logs...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toast toasts={toasts} />
      <ConfirmModal modal={modal} onConfirm={handleConfirm} onCancel={handleCancel} />

      <div className="min-h-screen bg-slate-50">
        <div className="space-y-8">
          <section className="rounded-[2rem] border border-slate-200 bg-white px-7 py-7 shadow-sm">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-blue-700">
                  <ShieldAlert size={12} />
                  Admin Monitoring
                </div>
                <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900">System Error Logs</h1>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">
                  Super Admin, Main Admin, and Staff Admin accounts can review captured activity here. Mobile errors are tagged separately so admin can inspect app failures without exposing raw payloads to users.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => fetchLogs({ silent: true })}
                  disabled={refreshing}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
                <button
                  onClick={handleClearLogs}
                  disabled={!isMainAdmin || clearing}
                  className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition ${
                    isMainAdmin
                      ? 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                      : 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400'
                  }`}
                >
                  <Trash2 size={16} />
                  {clearing ? 'Clearing...' : 'Clear Logs'}
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Total Entries"
                value={metrics.total}
                active={sourceFilter === 'all'}
                onClick={() => setSourceFilter('all')}
                accent="border-slate-200 bg-slate-100 text-slate-700"
                icon={<ActivitySquare size={18} />}
              />
              <MetricCard
                label="Mobile Errors"
                value={metrics.mobile}
                active={sourceFilter === 'mobile'}
                onClick={() => setSourceFilter('mobile')}
                accent="border-amber-200 bg-amber-50 text-amber-700"
                icon={<Smartphone size={18} />}
              />
              <MetricCard
                label="Failed Events"
                value={metrics.failed}
                active={sourceFilter === 'failed'}
                onClick={() => setSourceFilter('failed')}
                accent="border-rose-200 bg-rose-50 text-rose-700"
                icon={<AlertTriangle size={18} />}
              />
              <MetricCard
                label="Logged Today"
                value={metrics.today}
                active={sourceFilter === 'backend'}
                onClick={() => setSourceFilter('backend')}
                accent="border-blue-200 bg-blue-50 text-blue-700"
                icon={<ShieldAlert size={18} />}
              />
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search message, code, user, device, version..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {[
                  { key: 'all', label: 'All Events' },
                  { key: 'mobile', label: 'Mobile Only' },
                  { key: 'backend', label: 'Backend Only' },
                  { key: 'failed', label: 'Failed Only' },
                ].map((option) => (
                  <button
                    key={option.key}
                    onClick={() => setSourceFilter(option.key)}
                    className={`rounded-2xl border px-4 py-2 text-xs font-black uppercase tracking-[0.16em] transition ${
                      sourceFilter === option.key
                        ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-100'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-blue-200 hover:text-blue-700'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {filteredLogs.length === 0 ? (
            <EmptyLogsState hasFilters={hasFilters} />
          ) : (
            <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-lg font-black tracking-tight text-slate-900">Event Feed</h2>
                    <p className="text-sm text-slate-500">
                      Showing {filteredLogs.length} of {logs.length} stored events.
                    </p>
                  </div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    Clear logs remains restricted to Main Admin
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-slate-50">
                    <tr>
                      {['Source', 'Status', 'Message', 'User / Device', 'Timestamp'].map((heading) => (
                        <th
                          key={heading}
                          className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.18em] text-slate-400"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLogs.map((entry, index) => {
                      const metadata = entry.metadata || {};
                      const timestamp = formatDateTime(entry.occurredAt || entry.timestamp);
                      const userLabel = entry.user_name || entry.user_id || 'System';
                      const deviceBits = [metadata.deviceModel, metadata.osVersion, metadata.appVersion]
                        .filter(Boolean)
                        .join(' • ');
                      const rowTone = index % 2 === 0 ? 'bg-white' : 'bg-slate-50/40';

                      return (
                        <tr key={entry.id || `${entry.timestamp}-${index}`} className={`${rowTone} align-top transition hover:bg-slate-50`}>
                          <td className="px-6 py-5">
                            <div className="space-y-2">
                              <StatusPill tone={SOURCE_STYLES[entry.source] || SOURCE_STYLES.backend}>
                                {entry.source === 'mobile' ? 'Mobile' : 'Backend'}
                              </StatusPill>
                              <div className="text-[11px] font-semibold text-slate-500">
                                {entry.category || 'system event'}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="space-y-2">
                              <StatusPill tone={TYPE_STYLES[entry.type] || TYPE_STYLES.SYSTEM}>
                                {entry.type || 'SYSTEM'}
                              </StatusPill>
                              <div className="flex flex-wrap gap-2">
                                {entry.error_code && (
                                  <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">
                                    {entry.error_code}
                                  </span>
                                )}
                                {entry.status_code && (
                                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                                    HTTP {entry.status_code}
                                  </span>
                                )}
                                {entry.severity && (
                                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                                    {entry.severity}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="max-w-xl">
                              <p className="text-sm font-bold leading-relaxed text-slate-900">{entry.message}</p>
                              {metadata.details && (
                                <p className="mt-2 text-xs leading-relaxed text-slate-500">{metadata.details}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="space-y-1">
                              <p className="text-sm font-bold text-slate-800">{userLabel}</p>
                              <p className="text-xs text-slate-500">{deviceBits || 'No device details recorded'}</p>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="space-y-1 text-right">
                              <p className="text-sm font-bold text-slate-800">{timestamp.date}</p>
                              <p className="text-xs text-slate-500">{timestamp.time || 'No time'}</p>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
};

export default SystemLogs;
