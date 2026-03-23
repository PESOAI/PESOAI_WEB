import React, { useEffect, useState } from 'react';
import {
  ChevronLeft, ChevronRight, Clock3, History, ShieldAlert, Smartphone, Wallet, X,
} from 'lucide-react';
import { apiFetch } from '../../utils/authClient';

const PAGE_SIZE = 10;

const emptyMeta = {
  page: 1,
  limit: PAGE_SIZE,
  total: 0,
  totalPages: 1,
};

const money = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
});

const formatDateTime = (value) => {
  if (!value) return 'N/A';
  return new Date(value).toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatAmount = (value) => {
  const amount = Number(value || 0);
  return money.format(Number.isFinite(amount) ? amount : 0);
};

const renderPagination = (meta, setPage, loading) => (
  <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 text-xs text-slate-500">
    <span>
      Page <strong className="text-slate-700">{meta.page}</strong> of{' '}
      <strong className="text-slate-700">{Math.max(meta.totalPages, 1)}</strong>
    </span>
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
        disabled={loading || meta.page <= 1}
        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ChevronLeft size={14} />
        Prev
      </button>
      <button
        type="button"
        onClick={() => setPage((prev) => Math.min(prev + 1, Math.max(meta.totalPages, 1)))}
        disabled={loading || meta.page >= meta.totalPages}
        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Next
        <ChevronRight size={14} />
      </button>
    </div>
  </div>
);

const DataState = ({ loading, error, emptyMessage }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center px-6 py-12 text-sm font-medium text-slate-500">
        Loading records...
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-6 py-10 text-center text-sm text-rose-600">
        {error}
      </div>
    );
  }

  return (
    <div className="px-6 py-10 text-center text-sm text-slate-400">
      {emptyMessage}
    </div>
  );
};

const UserAuditModal = ({ user, onClose }) => {
  const [activeTab, setActiveTab] = useState('transactions');
  const [transactions, setTransactions] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [txPage, setTxPage] = useState(1);
  const [sessionPage, setSessionPage] = useState(1);
  const [txMeta, setTxMeta] = useState(emptyMeta);
  const [sessionMeta, setSessionMeta] = useState(emptyMeta);
  const [txLoading, setTxLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [txError, setTxError] = useState('');
  const [sessionError, setSessionError] = useState('');

  useEffect(() => {
    if (!user?.id) return;
    setActiveTab('transactions');
    setTxPage(1);
    setSessionPage(1);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return undefined;
    let cancelled = false;

    const loadTransactions = async () => {
      setTxLoading(true);
      setTxError('');
      try {
        const res = await apiFetch(`/api/superadmin/users/${user.id}/transactions?page=${txPage}&limit=${PAGE_SIZE}`);
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(payload.message || 'Failed to load transaction history.');
        if (cancelled) return;

        const data = payload.data || {};
        setTransactions(Array.isArray(data.transactions) ? data.transactions : []);
        setTxMeta({
          page: Number(data.page || txPage),
          limit: Number(data.limit || PAGE_SIZE),
          total: Number(data.total || 0),
          totalPages: Math.max(Number(data.totalPages || 1), 1),
        });
      } catch (err) {
        if (cancelled) return;
        setTransactions([]);
        setTxMeta({ ...emptyMeta });
        setTxError(err.message || 'Failed to load transaction history.');
      } finally {
        if (!cancelled) setTxLoading(false);
      }
    };

    loadTransactions();
    return () => { cancelled = true; };
  }, [user?.id, txPage]);

  useEffect(() => {
    if (!user?.id) return undefined;
    let cancelled = false;

    const loadSessions = async () => {
      setSessionLoading(true);
      setSessionError('');
      try {
        const res = await apiFetch(`/api/superadmin/users/${user.id}/sessions?page=${sessionPage}&limit=${PAGE_SIZE}`);
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(payload.message || 'Failed to load session history.');
        if (cancelled) return;

        const data = payload.data || {};
        setSessions(Array.isArray(data.sessions) ? data.sessions : []);
        setSessionMeta({
          page: Number(data.page || sessionPage),
          limit: Number(data.limit || PAGE_SIZE),
          total: Number(data.total || 0),
          totalPages: Math.max(Number(data.totalPages || 1), 1),
        });
      } catch (err) {
        if (cancelled) return;
        setSessions([]);
        setSessionMeta({ ...emptyMeta });
        setSessionError(err.message || 'Failed to load session history.');
      } finally {
        if (!cancelled) setSessionLoading(false);
      }
    };

    loadSessions();
    return () => { cancelled = true; };
  }, [user?.id, sessionPage]);

  if (!user) return null;

  const isDisabled = user.is_disabled || user.is_active === false;
  const displayName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || user.email || 'User';

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-6xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-900 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white">
                  User Audit
                </span>
                <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${
                  isDisabled ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {isDisabled ? 'Disabled' : 'Active'}
                </span>
              </div>
              <h2 className="text-2xl font-black tracking-tight text-slate-900">{displayName}</h2>
              <p className="mt-1 text-sm text-slate-500">{user.email || 'No email on file'}</p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Username</div>
              <div className="mt-1 text-sm font-semibold text-slate-700">{user.username || 'N/A'}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Token Version</div>
              <div className="mt-1 text-sm font-semibold text-slate-700">
                {user.token_version !== undefined && user.token_version !== null
                  ? Number(user.token_version)
                  : 'Not loaded'}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Joined</div>
              <div className="mt-1 text-sm font-semibold text-slate-700">{formatDateTime(user.created_at)}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Disable Reason</div>
              <div className="mt-1 text-sm font-semibold text-slate-700">
                {user.disabled_reason || 'None recorded'}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-6 py-4">
          <button
            type="button"
            onClick={() => setActiveTab('transactions')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${
              activeTab === 'transactions'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-100'
                : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Wallet size={16} />
            Transactions
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sessions')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${
              activeTab === 'sessions'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-100'
                : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <History size={16} />
            Sessions
          </button>
        </div>

        <div className="max-h-[68vh] overflow-y-auto bg-slate-50">
          {activeTab === 'transactions' && (
            <div className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Transaction History</h3>
                  <p className="text-sm text-slate-500">
                    Latest recorded transactions for this account. Results are paginated.
                  </p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3 text-right shadow-sm ring-1 ring-slate-200">
                  <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Total Records</div>
                  <div className="text-lg font-black text-slate-900">{txMeta.total}</div>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {transactions.length === 0 ? (
                  <DataState loading={txLoading} error={txError} emptyMessage="No transactions found for this user." />
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200 text-left">
                        <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                          <tr>
                            <th className="px-5 py-4">Date</th>
                            <th className="px-5 py-4">Category</th>
                            <th className="px-5 py-4">Description</th>
                            <th className="px-5 py-4">Type</th>
                            <th className="px-5 py-4 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
                          {transactions.map((tx) => (
                            <tr key={tx.id}>
                              <td className="px-5 py-4 font-medium text-slate-700">{formatDateTime(tx.transaction_date || tx.created_at)}</td>
                              <td className="px-5 py-4">{tx.category || 'Uncategorized'}</td>
                              <td className="px-5 py-4">{tx.description || 'No description'}</td>
                              <td className="px-5 py-4">
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold uppercase text-slate-600">
                                  {tx.transaction_type || 'expense'}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-right font-bold text-slate-900">{formatAmount(tx.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {renderPagination(txMeta, setTxPage, txLoading)}
                  </>
                )}
              </div>
            </div>
          )}

          {activeTab === 'sessions' && (
            <div className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Session History</h3>
                  <p className="text-sm text-slate-500">
                    Login and logout activity captured by the backend session log.
                  </p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3 text-right shadow-sm ring-1 ring-slate-200">
                  <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Total Sessions</div>
                  <div className="text-lg font-black text-slate-900">{sessionMeta.total}</div>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {sessions.length === 0 ? (
                  <DataState loading={sessionLoading} error={sessionError} emptyMessage="No session logs found for this user." />
                ) : (
                  <>
                    <div className="divide-y divide-slate-100">
                      {sessions.map((session) => (
                        <div key={session.id} className="grid gap-3 px-5 py-4 md:grid-cols-[1.3fr_1.3fr_0.9fr_2fr]">
                          <div>
                            <div className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                              <Clock3 size={12} />
                              Login Time
                            </div>
                            <div className="text-sm font-semibold text-slate-800">{formatDateTime(session.login_time)}</div>
                          </div>

                          <div>
                            <div className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                              <ShieldAlert size={12} />
                              Logout Time
                            </div>
                            <div className="text-sm font-semibold text-slate-800">
                              {session.logout_time ? formatDateTime(session.logout_time) : 'Active session'}
                            </div>
                          </div>

                          <div>
                            <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">IP Address</div>
                            <div className="text-sm font-semibold text-slate-800">{session.ip_address || 'Unknown'}</div>
                          </div>

                          <div>
                            <div className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                              <Smartphone size={12} />
                              Device / User Agent
                            </div>
                            <div className="text-sm text-slate-700">{session.user_agent || 'Unknown device'}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {renderPagination(sessionMeta, setSessionPage, sessionLoading)}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserAuditModal;
