// pages/UserManagement.jsx  –  PESO AI
import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Mail, Clock, Calendar, CheckCircle, XCircle, Keyboard, FileText } from 'lucide-react';

const UserManagement = () => {
  const [users,        setUsers]        = useState([]);
  const [searchTerm,   setSearchTerm]   = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [loading,      setLoading]      = useState(true);

  const searchInputRef = useRef(null);

  useEffect(() => {
    fetchUsers();
    searchInputRef.current?.focus();

    const handleKeyDown = (e) => {
      if (e.altKey && e.key.toLowerCase() === 's') { e.preventDefault(); searchInputRef.current?.focus(); }
      if (e.altKey && e.key.toLowerCase() === 'a') { e.preventDefault(); setFilterStatus('Active'); }
      if (e.altKey && e.key.toLowerCase() === 'i') { e.preventDefault(); setFilterStatus('Inactive'); }
      if (e.key === 'Escape') { setSearchTerm(''); setFilterStatus('All'); }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchUsers = async () => {
    try {
      const res  = await fetch('http://localhost:5000/api/users');
      const data = await res.json();
      // Filter out any Suspended users — only show Active and Inactive
      setUsers((Array.isArray(data) ? data : []).filter(u => u.account_status !== 'Suspended'));
      setLoading(false);
    } catch (err) {
      console.error('Error fetching users:', err);
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  };

  // Toggle: Active → Inactive, Inactive → Active only
  const handleStatusChange = async (userId, currentStatus, userName) => {
    const newStatus  = currentStatus === 'Active' ? 'Inactive' : 'Active';
    const actionText = newStatus === 'Active' ? 'ENABLE' : 'DISABLE';

    const confirmed = window.confirm(
      `SYSTEM CONFIRMATION:\n\nAre you sure you want to ${actionText} the account for ${userName}?`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`http://localhost:5000/api/users/${userId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ account_status: newStatus }),
      });

      if (res.ok) {
        setUsers(prev =>
          prev.map(u => u.user_id === userId ? { ...u, account_status: newStatus } : u)
        );
      } else {
        alert('Failed to update status. Please try again.');
      }
    } catch (err) {
      alert('Server Error');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.city?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'All' || user.account_status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handlePrintReport = () => {
    const reportWindow = window.open('', '_blank');
    const reportDate   = new Date().toLocaleDateString();
    reportWindow.document.write(`
      <html>
        <head>
          <title>User Report - ${reportDate}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .active   { color: green; font-weight: bold; }
            .inactive { color: red;   font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>User Database Report</h1>
          <p>Generated: ${reportDate}</p>
          <p>Filters — Search: "${searchTerm}", Status: "${filterStatus}"</p>
          <table>
            <thead>
              <tr><th>Name</th><th>Email</th><th>City</th><th>Status</th></tr>
            </thead>
            <tbody>
              ${filteredUsers.map(u => `
                <tr>
                  <td>${u.full_name}</td>
                  <td>${u.email}</td>
                  <td>${u.city || 'N/A'}</td>
                  <td class="${u.account_status === 'Active' ? 'active' : 'inactive'}">${u.account_status}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `);
    reportWindow.document.close();
    reportWindow.print();
  };

  // Summary counts
  const activeCount   = users.filter(u => u.account_status === 'Active').length;
  const inactiveCount = users.filter(u => u.account_status === 'Inactive').length;

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      <p className="text-slate-500 font-medium">Fetching User Database...</p>
    </div>
  );

  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans">

      {/* HEADER */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">User Access Control</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1.5 px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-[10px] font-bold uppercase tracking-wider">
              <Keyboard size={12} /> Hotkeys Active
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              <kbd className="bg-white border px-1 rounded shadow-sm">Esc</kbd> All |{' '}
              <kbd className="bg-white border px-1 rounded shadow-sm">Alt+S</kbd> Search |{' '}
              <kbd className="bg-white border px-1 rounded shadow-sm">Alt+A</kbd> Active |{' '}
              <kbd className="bg-white border px-1 rounded shadow-sm">Alt+I</kbd> Inactive
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search name, email, or city..."
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={handlePrintReport}
            className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm text-sm font-bold text-slate-700 hover:bg-slate-100 transition-all"
          >
            <FileText size={18} /> Print
          </button>
        </div>
      </div>

      {/* SUMMARY + STATUS FILTER PILLS */}
      <div className="flex items-center gap-3 mb-5">
        {[
          { label: 'All',      count: users.length,   color: 'bg-slate-100 text-slate-600 border-slate-200'       },
          { label: 'Active',   count: activeCount,    color: 'bg-emerald-50 text-emerald-600 border-emerald-200'  },
          { label: 'Inactive', count: inactiveCount,  color: 'bg-rose-50 text-rose-600 border-rose-200'           },
        ].map(({ label, count, color }) => (
          <button
            key={label}
            onClick={() => setFilterStatus(label)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all
              ${filterStatus === label
                ? 'ring-2 ring-offset-1 ring-blue-400 ' + color
                : color + ' opacity-60 hover:opacity-100'}`}
          >
            {label}
            <span className="bg-white/60 px-1.5 py-0.5 rounded-full text-[10px] font-black">{count}</span>
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-400 font-medium">
          Showing <strong className="text-slate-600">{filteredUsers.length}</strong> of {users.length} users
        </span>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider">User Profile</th>
                <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Contact Info</th>
                <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Activity</th>
                <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Current Status</th>
                <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length > 0 ? filteredUsers.map((user) => (
                <tr key={user.user_id} className="hover:bg-slate-50/50 transition-colors group">

                  {/* USER PROFILE */}
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm border border-slate-200">
                        {user.full_name?.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 text-sm">{user.full_name}</div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                          <Calendar size={10} />
                          Joined: {user.join_date ? new Date(user.join_date).toLocaleDateString() : 'N/A'}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* CONTACT */}
                  <td className="px-6 py-5">
                    <div className="flex flex-col space-y-1 text-xs text-slate-500">
                      <div className="flex items-center gap-2"><Mail size={12} className="text-slate-300" />{user.email}</div>
                      <div className="flex items-center gap-2"><MapPin size={12} className="text-slate-300" />{user.city || 'No Data'}</div>
                    </div>
                  </td>

                  {/* ACTIVITY */}
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase mb-1">Last Online</span>
                      <div className="flex items-center text-xs text-slate-600 font-medium gap-2">
                        <Clock size={14} className="text-blue-500" />
                        {formatDate(user.last_active_at)}
                      </div>
                    </div>
                  </td>

                  {/* STATUS BADGE */}
                  <td className="px-6 py-5 text-center">
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-[10px] font-bold uppercase border
                      ${user.account_status === 'Active'
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                        : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${
                        user.account_status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                      }`} />
                      {user.account_status}
                    </span>
                  </td>

                  {/* ACTION BUTTON */}
                  <td className="px-6 py-5 text-center">
                    <button
                      onClick={() => handleStatusChange(user.user_id, user.account_status, user.full_name)}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm border
                        ${user.account_status === 'Active'
                          ? 'bg-white text-rose-600 border-rose-200 hover:bg-rose-50'
                          : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 shadow-md'}`}
                    >
                      {user.account_status === 'Active'
                        ? <><XCircle size={14} /> Disable</>
                        : <><CheckCircle size={14} /> Enable</>}
                    </button>
                  </td>

                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="px-6 py-10 text-center text-slate-400 text-sm italic">
                    No users found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;