// layouts/AdminLayout.jsx — PESO AI
import React, { useState, useEffect, useCallback } from 'react';
import { Link, Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { LayoutDashboard, Users, ShieldCheck, ChevronDown } from 'lucide-react';
import logo from '../assets/logo.png';

import { ConfirmModal, Toast, useConfirm } from "../components/GlobalConfirmModal";
import GlobalNotificationModal from '../components/GlobalNotificationModal';

import { ProfileDropdown }                        from '../components/hub/ProfileDropdown';
import { HubModal }                               from '../components/hub/HubModal';
import { ProfilePanel, SecurityPanel }            from '../components/hub/ProfilePanels';
import { LogsPanel, AuditPanel, AdminMgmtPanel }  from '../components/hub/SystemPanels';

const BASE = 'http://localhost:5000';

const HUB_TITLES = {
  profile:   'My Profile',
  security:  'Security Settings',
  logs:      'Activity Logs',
  audit:     'Audit Trail',
  adminMgmt: 'Admin Management',
};

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { modal, toasts, confirm, showToast, handleConfirm, handleCancel } = useConfirm();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [hubView,       setHubView]       = useState(null);
  const [showNotif,     setShowNotif]     = useState(false);

  const [currentUser, setCurrentUser] = useState(
    () => JSON.parse(localStorage.getItem('currentUser')) || { name: 'Admin', role: 'System Access' }
  );

  const isMainAdmin = currentUser.role === 'Main Admin';
  const lastLogin   = localStorage.getItem('lastLogin') || 'No data';

  // ── Helper: fetch fresh profile + avatar from server ───────
  // ── FIX: extracted to useCallback so it can be called on hub open too ──
  const fetchProfile = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`${BASE}/api/auth/admins/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      // data fields: { id, name, role, avatar, display_name, created_at }

      // ── FIX: prefer DB display_name; fall back to localStorage; then username ──
      const displayName =
        data.display_name ||
        localStorage.getItem(`displayName_${data.name}`) ||
        data.name;

      const updated = {
        ...currentUser,
        id:           data.id,
        name:         data.name,
        role:         data.role,
        avatar:       data.avatar       || null,
        display_name: data.display_name || null,
        displayName,
      };
      setCurrentUser(updated);
      localStorage.setItem('currentUser', JSON.stringify(updated));
    } catch { /* silently fail — use cached data */ }
  }, []); // eslint-disable-line

  // Fetch profile on mount
  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  // ── FIX: also refresh profile whenever the hub modal opens so the
  //         logged-in admin always sees their latest data from the DB ──
  const openHub = (view) => {
    setHubView(view);
    setIsProfileOpen(false);
    if (view === 'profile') fetchProfile();
  };

  const handleAvatarUpdate = (base64, displayName) => {
    const updated = {
      ...currentUser,
      avatar: base64,
      ...(displayName !== undefined && {
        displayName,
        display_name: displayName,
      }),
    };
    setCurrentUser(updated);
    localStorage.setItem('currentUser', JSON.stringify(updated));
  };

  // Guard: only Main Admin can access /admin/users
  if (location.pathname === '/admin/users' && !isMainAdmin)
    return <Navigate to="/admin" replace />;

  const handleLogout = async () => {
    const ok = await confirm({
      variant:  'logout',
      title:    'Sign Out?',
      subtitle: 'Your session will end.',
      subject:  currentUser.name,
    });
    if (!ok) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`${BASE}/api/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch { /* ignore */ }
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    localStorage.setItem('lastLogout', new Date().toLocaleString());
    navigate('/', { replace: true });
  };

  const handleSwitchAccount = async () => {
    const ok = await confirm({
      variant:  'switch',
      title:    'Switch Account?',
      subtitle: "You'll be logged out.",
      subject:  currentUser.name,
    });
    if (!ok) return;
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    navigate('/', { state: { fromSwitch: true }, replace: true });
  };

  const menuItems = [
    { name: 'Analytics Dashboard', path: '/admin',       icon: <LayoutDashboard size={18} />, adminOnly: false },
    { name: 'User Management',     path: '/admin/users', icon: <Users size={18} />,           adminOnly: true  },
  ];

  const getHeaderTitle = () => {
    if (location.pathname === '/admin')       return 'Financial Overview';
    if (location.pathname === '/admin/users') return 'Client Database';
    return 'Admin Control Center';
  };

  // ── Avatar helper (reusable) ────────────────────────────────
  const AdminAvatar = ({ avatar, size = 10, rounded = 'xl' }) => {
    const sizeMap = { 10: 'w-10 h-10', 8: 'w-8 h-8', 20: 'w-20 h-20' };
    const cls = `${sizeMap[size] || 'w-10 h-10'} rounded-${rounded} bg-slate-900 flex items-center justify-center text-white shadow-lg overflow-hidden flex-shrink-0`;
    return (
      <div className={cls}>
        {avatar
          ? <img src={avatar} alt="" className="w-full h-full object-cover" />
          : <ShieldCheck size={size === 20 ? 32 : size === 8 ? 14 : 20} />}
      </div>
    );
  };

  const renderHub = () => {
    switch (hubView) {
      case 'profile':   return <ProfilePanel   currentUser={currentUser} showToast={showToast} onAvatarUpdate={handleAvatarUpdate} />;
      case 'security':  return <SecurityPanel  currentUser={currentUser} showToast={showToast} />;
      case 'logs':      return <LogsPanel      showToast={showToast} />;
      case 'audit':     return <AuditPanel />;
      case 'adminMgmt': return <AdminMgmtPanel currentUser={currentUser} showToast={showToast} />;
      default:          return null;
    }
  };

  // ── Resolved display name: DB value wins, then localStorage, then username ──
  const displayName = currentUser.display_name || currentUser.displayName || currentUser.name;

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Toast toasts={toasts} />
      <ConfirmModal modal={modal} onConfirm={handleConfirm} onCancel={handleCancel} />
      <GlobalNotificationModal open={showNotif} onClose={() => setShowNotif(false)} />

      {/* ── SIDEBAR ───────────────────────────────────────────── */}
      <aside className="w-72 border-r border-slate-200 fixed h-full bg-white flex flex-col z-20 shadow-sm">
        <div className="p-8 flex items-center gap-3">
          <img src={logo} alt="PESO AI" className="w-10 h-10 object-contain drop-shadow-md" />
          <div className="flex flex-col">
            <span className="font-black text-lg text-blue-600 leading-none">PESO AI</span>
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Administrator</span>
          </div>
        </div>
        <nav className="p-4 flex-1 space-y-1.5 mt-4">
          <p className="px-4 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4">Main Menu</p>
          {menuItems.map(item => {
            if (item.adminOnly && !isMainAdmin) return null;
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 ${isActive
                  ? 'bg-blue-600 text-white shadow-xl shadow-blue-100 translate-x-1'
                  : 'text-slate-500 hover:bg-blue-50 hover:text-blue-600'}`}>
                {item.icon}
                <span className="text-sm font-bold tracking-tight">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* ── MAIN ──────────────────────────────────────────────── */}
      <div className="flex-1 ml-72">
        <header className="h-24 bg-white/80 backdrop-blur-xl border-b border-slate-100 sticky top-0 z-10 px-10 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tighter">{getHeaderTitle()}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
              <p className="text-[10px] text-blue-600 font-black uppercase tracking-[0.15em]">Live Security Protocol Active</p>
            </div>
          </div>

          <div className="flex items-center gap-6 relative">
            <div className="text-right hidden md:block">
              <p className="text-sm font-bold text-slate-900">Welcome, {displayName}</p>
              <div className="flex items-center gap-1 justify-end">
                <span className="text-[10px] text-slate-500">Last Login: {lastLogin}</span>
                <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
              </div>
            </div>

            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(o => !o)}
                className={`flex items-center gap-3 p-1.5 pr-4 rounded-2xl border transition-all ${
                  isProfileOpen
                    ? 'bg-blue-50 border-blue-200 shadow-inner'
                    : 'bg-white border-slate-100 shadow-sm hover:shadow-md'
                }`}
              >
                <AdminAvatar avatar={currentUser.avatar} size={10} rounded="xl" />
                <div className="flex flex-col text-left">
                  <span className="text-[11px] font-black text-slate-900 leading-none">{displayName}</span>
                  <span className="text-[9px] font-bold text-blue-600 uppercase">{currentUser.role}</span>
                </div>
                <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} />
              </button>

              {isProfileOpen && (
                <ProfileDropdown
                  currentUser={{ ...currentUser, displayName }}
                  lastLogin={lastLogin}
                  onOpenHub={openHub}
                  onNotif={() => setShowNotif(true)}
                  onSwitchAccount={handleSwitchAccount}
                  onLogout={handleLogout}
                  onClose={() => setIsProfileOpen(false)}
                />
              )}
            </div>
          </div>
        </header>

        <main className="p-10"><Outlet /></main>
      </div>

      {/* ── HUB MODAL ─────────────────────────────────────────── */}
      {hubView && (
        <HubModal title={HUB_TITLES[hubView] || 'Settings'} onClose={() => setHubView(null)}>
          {renderHub()}
        </HubModal>
      )}
    </div>
  );
};

export default AdminLayout;