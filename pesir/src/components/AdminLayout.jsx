import React, { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom';
import {  LayoutDashboard,  Users,  LogOut,  ShieldCheck, ChevronDown, ShieldAlert, X, ArrowLeft, UserPlus, History, PlusCircle} from 'lucide-react';

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsView, setSettingsView] = useState('menu');
  const [systemLogs, setSystemLogs] = useState([]);
  
  const [newAdmin, setNewAdmin] = useState({ username: '', password: '' });
  const [adminMessage, setAdminMessage] = useState({ text: '', type: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasFetchedLogs = useRef(false);

  const currentUser = JSON.parse(localStorage.getItem('currentUser')) || { name: 'Admin', role: 'System Access' };
  const isMainAdmin = currentUser.role === 'Main Admin';

  useEffect(() => {
    if (showSettingsModal && !hasFetchedLogs.current) {
      hasFetchedLogs.current = true;
      fetch('http://localhost:5000/api/logs')
        .then(res => res.json())
        .then(data => setSystemLogs(Array.isArray(data) ? data : []))
        .catch(() => setSystemLogs([]));
    }

    // Reset ang flag kapag nagsara ang modal
    if (!showSettingsModal) {
      hasFetchedLogs.current = false;
    }
  }, [showSettingsModal]);

  const menuItems = [
    { name: 'Analytics Dashboard', path: '/admin', icon: <LayoutDashboard size={18} />, public: true },
    { name: 'User Management', path: '/admin/users', icon: <Users size={18} />, public: false },
  ];

  if (location.pathname === '/admin/users' && !isMainAdmin) {
    return <Navigate to="/admin" replace />;
  }

  const handleLogout = () => {
    if (window.confirm("Confirm system logout?")) {
      localStorage.setItem('lastLogout', new Date().toLocaleString());
      localStorage.removeItem('currentUser');
      navigate('/');
    }
  };

  const handleSwitchAccount = () => {
    if (window.confirm("Switch account?")) {
      sessionStorage.removeItem('currentUser'); 
      navigate('/', { state: { fromSwitch: true } }); 
    }
  };

  const isLoggingRef = useRef(false);

  const postLog = async (type, user_name, message) => {
    if (isLoggingRef.current) return; // Prevent double call
    isLoggingRef.current = true;
    try {
      await fetch('http://localhost:5000/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, user_name, message })
      });
    } catch (err) {
      console.error('Failed to post log:', err);
    } finally {
      setTimeout(() => { isLoggingRef.current = false; }, 1000);
    }
  };

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    setAdminMessage({ text: '', type: '' });
    setIsSubmitting(true);

    try {
      const response = await fetch('http://localhost:5000/api/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newAdmin.username,
          password: newAdmin.password,
          role: 'Staff Admin',
          creatorRole: currentUser.role
        })
      });

      const data = await response.json();

      if (response.ok) {
        setAdminMessage({ text: `✅ Staff Admin "${newAdmin.username}" created!`, type: 'success' });
        setNewAdmin({ username: '', password: '' });

        await postLog('SYSTEM', currentUser.name, `Created new staff admin: ${newAdmin.username}`);

        const logsRes = await fetch('http://localhost:5000/api/logs');
        const logsData = await logsRes.json();
        setSystemLogs(Array.isArray(logsData) ? logsData : []);
      } else {
        setAdminMessage({ text: `❌ ${data.message}`, type: 'error' });
      }
    } catch (err) {
      setAdminMessage({ text: '❌ Server unreachable. Is the server running?', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- CLEAR LOGS FROM DB ---
  const handleClearLogs = async () => {
    if (!window.confirm("Clear all security logs?")) return;
    await fetch('http://localhost:5000/api/logs', { method: 'DELETE' });
    setSystemLogs([]);
  };

  const getHeaderTitle = () => {
    if (location.pathname === '/admin') return "Financial Overview";
    if (location.pathname === '/admin/users') return "Client Database";
    return "Admin Control Center";
  };

  const lastLogin = localStorage.getItem('lastLogin') || 'No data';

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <aside className="w-72 border-r border-slate-200 fixed h-full bg-white flex flex-col z-20 shadow-sm">
        <div className="p-8 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-100">
            <span className="text-white text-lg font-black italic">₱</span>
          </div>
          <div className="flex flex-col">
            <span className="font-black text-lg text-slate-900 leading-none text-green-600">PESO AI</span>
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Administrator</span>
          </div>
        </div>

        <nav className="p-4 flex-1 space-y-1.5 mt-4">
          <p className="px-4 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4">Main Menu</p>
          {menuItems.map((item) => {
            if (!item.public && !isMainAdmin) return null;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 ${
                  isActive 
                  ? 'bg-green-600 text-white shadow-xl shadow-green-100 translate-x-1' 
                  : 'text-slate-500 hover:bg-green-50 hover:text-green-600'
                }`}
              >
                {item.icon}
                <span className="text-sm font-bold tracking-tight">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex-1 ml-72">
        <header className="h-24 bg-white/80 backdrop-blur-xl border-b border-slate-100 sticky top-0 z-10 px-10 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tighter">{getHeaderTitle()}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></div>
              <p className="text-[10px] text-green-600 font-black uppercase tracking-[0.15em]">Live Security Protocol Active</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6 relative">
            <div className="text-right hidden md:block">
              <p className="text-sm font-bold text-slate-900">Welcome, {currentUser.name}</p>
              <div className="flex items-center gap-1 justify-end">
                <span className="text-[10px] text-slate-500">Last Login: {lastLogin}</span>
                <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></div>
              </div>
            </div>

            <div className="relative">
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className={`flex items-center gap-3 p-1.5 pr-4 rounded-2xl border transition-all ${
                  isProfileOpen ? 'bg-green-50 border-green-200 shadow-inner' : 'bg-white border-slate-100 shadow-sm hover:shadow-md'
                }`}
              >
                <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg">
                  <ShieldCheck size={20} />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[11px] font-black text-slate-900 leading-none">{currentUser.name}</span>
                  <span className="text-[9px] font-bold text-green-600 uppercase">{currentUser.role}</span>
                </div>
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
              </button>

              {isProfileOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsProfileOpen(false)}></div>
                  <div className="absolute right-0 mt-3 w-60 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-20 animate-in zoom-in-95 duration-200">
                    
                    {isMainAdmin && (
                      <button 
                        onClick={() => { setShowSettingsModal(true); setIsProfileOpen(false); setSettingsView('menu'); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-slate-600 hover:bg-green-50 hover:text-green-600 rounded-xl transition-all"
                      >
                        <History size={18} /> Security Hub
                      </button>
                    )}
                    
                    <button 
                      onClick={handleSwitchAccount}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-slate-600 hover:bg-green-50 hover:text-green-600 rounded-xl transition-all"
                    >
                      <UserPlus size={18} /> Switch Account
                    </button>

                    <div className="my-1 border-t border-slate-50"></div>
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 rounded-xl transition-all">
                      <LogOut size={18} /> Sign Out System
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="p-10"><Outlet /></main>
      </div>

      {showSettingsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowSettingsModal(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl p-8 animate-in zoom-in-95 duration-300 overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              {settingsView !== 'menu' ? (
                <button onClick={() => { setSettingsView('menu'); setAdminMessage({ text: '', type: '' }); }} className="p-2 -ml-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                  <ArrowLeft size={20} />
                </button>
              ) : ( <div /> )}
              <h3 className="text-xl font-black text-slate-900 tracking-tight flex-1 ml-2">Security Hub</h3>
              <button onClick={() => setShowSettingsModal(false)} className="p-2 -mr-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            {settingsView === 'menu' && (
              <div className="space-y-4">
                <div 
                  onClick={() => setSettingsView('logs')}
                  className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:border-green-200 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-900 text-white rounded-xl group-hover:bg-green-600 transition-all">
                      <ShieldAlert size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">System Audit Trail</h4>
                      <p className="text-[10px] text-slate-500">View login successes & failed attempts</p>
                    </div>
                  </div>
                </div>

                <div 
                  onClick={() => setSettingsView('addAdmin')}
                  className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:border-green-200 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-900 text-white rounded-xl group-hover:bg-green-600 transition-all">
                      <PlusCircle size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Add Staff Admin</h4>
                      <p className="text-[10px] text-slate-500">Create new monitoring accounts</p>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setShowSettingsModal(false)}
                  className="w-full mt-4 py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-green-600 transition-all shadow-lg"
                >
                  Close Security Hub
                </button>
              </div>
            )}

            {settingsView === 'addAdmin' && (
              <form onSubmit={handleAddAdmin} className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                <h4 className="text-sm font-bold text-slate-900 mb-4">Create New Staff Account</h4>
                <div className="text-left space-y-1">
                  <label className="text-[10px] font-black text-indigo-600 ml-1 uppercase tracking-tighter">Username</label>
                  <input 
                    type="text" 
                    placeholder="Enter username" 
                    value={newAdmin.username}
                    onChange={e => setNewAdmin({...newAdmin, username: e.target.value})}
                    className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-green-400"
                    required
                  />
                </div>
                <div className="text-left space-y-1">
                  <label className="text-[10px] font-black text-indigo-600 ml-1 uppercase tracking-tighter">Password</label>
                  <input 
                    type="password" 
                    placeholder="••••••••" 
                    value={newAdmin.password}
                    onChange={e => setNewAdmin({...newAdmin, password: e.target.value})}
                    className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-green-400"
                    required
                  />
                </div>

                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
                  <ShieldCheck size={14} className="text-green-600" />
                  <span className="text-xs font-bold text-slate-600">Role: <span className="text-green-600">Staff Admin</span></span>
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full py-3 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                >
                  {isSubmitting ? 'Creating...' : 'Create Staff Admin'}
                </button>

                {adminMessage.text && (
                  <p className={`text-center text-xs font-bold ${
                    adminMessage.type === 'success' ? 'text-green-600' : 'text-red-500'
                  }`}>
                    {adminMessage.text}
                  </p>
                )}
              </form>
            )}

            {settingsView === 'logs' && (
              <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-bold text-slate-900">Live Access Logs</h4>
                  <button 
                    onClick={handleClearLogs}
                    className="text-[9px] font-black text-red-500 uppercase hover:underline"
                  >
                    Clear History
                  </button>
                </div>
                
                <div className="space-y-3 h-80 overflow-y-auto pr-2">
                  {systemLogs.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs italic">No security logs recorded yet.</div>
                  ) : (
                    systemLogs.map((log, index) => (
                      <div key={log.id ?? index} className={`p-3 rounded-2xl border flex flex-col gap-1 ${
                        log.type === 'FAILED' ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'
                      }`}>
                        <div className="flex justify-between items-center">
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                            log.type === 'FAILED' ? 'bg-red-500 text-white' : 'bg-green-600 text-white'
                          }`}>
                            {log.type}
                          </span>
                          <span className="text-[9px] text-slate-400 font-medium">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs font-black text-slate-900">{log.user_name}</p>
                        <p className="text-[10px] text-slate-500 leading-tight">{log.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>  
      )}
    </div>
  );
};

export default AdminLayout;