// layouts/AdminLayout.jsx — PESO AI
// pesir/src/layouts/AdminLayout.jsx
// Admin shell layout for authenticated sessions, maintenance controls, and profile actions.
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { LayoutDashboard, Users, ShieldCheck, ChevronDown } from 'lucide-react';
import logo from '../assets/logo.png';

import { ConfirmModal, Toast, useConfirm } from "../components/GlobalConfirmModal";
import GlobalNotificationModal from '../components/GlobalNotificationModal';

import { ProfileDropdown }                        from '../components/hub/ProfileDropdown';
import { HubModal }                               from '../components/hub/HubModal';
import { ProfilePanel, SecurityPanel }            from '../components/hub/ProfilePanels';
import { LogsPanel, AuditPanel, AdminMgmtPanel }  from '../components/hub/SystemPanels';
import { apiFetch } from '../utils/authClient';
import {
  getCurrentUser,
  setCurrentUser as persistCurrentUser,
  clearSensitiveSessionData,
} from '../utils/clientSession';

const BASE = ''; // ← Vite proxy — do NOT use http://localhost:5000

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
  const [maintenance,   setMaintenance]   = useState({ active: false, endsAt: null });
  const [maintRemaining,setMaintRemaining]= useState(null);
  const forcedRef    = useRef(false);
  const maintFetchRef = useRef(0);

  const [currentUser, setCurrentUser] = useState(
    () => getCurrentUser() || { name: 'Admin', role: 'System Access' }
  );

  const isMainAdmin  = currentUser.role === 'Main Admin';
  const isSuperAdmin = currentUser.role === 'Super Admin' || currentUser.role === 'Main Admin';
  const isStaffAdmin = currentUser.role === 'Staff Admin';
  const lastLogin    = localStorage.getItem('lastLogin') || 'No data';

  // ── FIX: fetchProfile — stable ref, no currentUser dependency ──
  const fetchProfile = useCallback(async () => {
    try {
      const res = await apiFetch('/api/auth/admins/me');
      if (!res.ok) return;
      const data = await res.json();
      setCurrentUser(prev => {
        const updated = {
          ...prev,
          id:           data.userId      || prev.id,
          name:         data.displayName || prev.name,
          role:         data.role        || prev.role,
          avatar:       data.avatar      || prev.avatar || null, // ← DB avatar first
          display_name: data.displayName || null,
          displayName:  data.displayName || prev.displayName || prev.name,
        };
        persistCurrentUser(updated);
        return updated;
      });
    } catch { /* silently fail */ }
  }, []); // ← empty deps = no infinite loop

  // Runs ONCE on mount only
  useEffect(() => { fetchProfile(); }, []); // eslint-disable-line

  const syncMaintenance = useCallback(() => {
    const active = localStorage.getItem('pesoai_maint') === 'true';
    const endsAt = Number(localStorage.getItem('pesoai_maint_until'));
    setMaintenance({ active, endsAt: Number.isFinite(endsAt) ? endsAt : null });
    if (!active) {
      setMaintRemaining(null);
      forcedRef.current = false;
    }

    const now = Date.now();
    if (now - maintFetchRef.current < 4000) return;
    maintFetchRef.current = now;
    apiFetch('/api/maintenance')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data || typeof data.active !== 'boolean') return;
        localStorage.setItem('pesoai_maint', data.active ? 'true' : 'false');
        if (data.active && data.endsAt) {
          localStorage.setItem('pesoai_maint_until', String(data.endsAt));
        } else {
          localStorage.removeItem('pesoai_maint_until');
        }
        localStorage.setItem('pesoai_maint_trigger', String(Date.now()));
        window.dispatchEvent(new Event('pesoai_maint_change'));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    syncMaintenance();
    const onStorage = (e) => { if (e.key?.startsWith('pesoai_maint')) syncMaintenance(); };
    const onLocal   = () => syncMaintenance();
    window.addEventListener('storage', onStorage);
    window.addEventListener('pesoai_maint_change', onLocal);
    let bc;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        bc = new BroadcastChannel('pesoai_maint');
        bc.onmessage = (evt) => {
          const msg = evt?.data || {};
          if (typeof msg.active === 'boolean') {
            localStorage.setItem('pesoai_maint', msg.active ? 'true' : 'false');
            if (msg.active && msg.endsAt) localStorage.setItem('pesoai_maint_until', String(msg.endsAt));
            else localStorage.removeItem('pesoai_maint_until');
            localStorage.setItem('pesoai_maint_trigger', String(Date.now()));
            window.dispatchEvent(new Event('pesoai_maint_change'));
          }
        };
      } catch {}
    }
    const poll = setInterval(syncMaintenance, 1500);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('pesoai_maint_change', onLocal);
      if (bc) bc.close();
      clearInterval(poll);
    };
  }, [syncMaintenance]);

  useEffect(() => {
    if (!currentUser?.role) return;
    const key = 'pesoai_sessions';
    const upsert = () => {
      try {
        const list = JSON.parse(sessionStorage.getItem(key)) || [];
        const id   = currentUser.id || currentUser.name || 'unknown';
        const now  = new Date().toISOString();
        const ua   = navigator.userAgent || 'Unknown';
        const platform = navigator.platform || 'Unknown';
        const existing = list.find(x => x.id === id);
        if (existing) {
          existing.lastActive = now;
          existing.userAgent  = ua;
          existing.platform   = platform;
        } else {
          list.unshift({
            id,
            name: currentUser.display_name || currentUser.displayName || currentUser.name || 'Admin',
            role: currentUser.role,
            userAgent: ua,
            platform,
            lastActive: now,
          });
        }
        sessionStorage.setItem(key, JSON.stringify(list.slice(0, 50)));
      } catch {}
    };
    upsert();
    const interval = setInterval(upsert, 60_000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const clearMaintenance = useCallback(() => {
    localStorage.setItem('pesoai_maint', 'false');
    localStorage.removeItem('pesoai_maint_until');
    localStorage.setItem('pesoai_maint_trigger', String(Date.now()));
    window.dispatchEvent(new Event('pesoai_maint_change'));
    setMaintenance({ active: false, endsAt: null });
    setMaintRemaining(null);
    forcedRef.current = false;
    apiFetch('/api/maintenance', {
      method: 'POST',
      body: JSON.stringify({ active: false }),
    }).catch(() => {});
  }, []);

  const confirmMaintenanceOn = useCallback(async () => {
    const ok = await confirm({
      variant:  'maintenance',
      title:    'Activate Maintenance Mode?',
      subtitle: 'This will pause access for all Staff Admins and users.',
      subject:  currentUser.display_name || currentUser.displayName || currentUser.name,
    });
    return ok;
  }, [confirm, currentUser]);

  const forceLogout = useCallback(async () => {
    if (!isStaffAdmin) return;
    try { await apiFetch('/api/auth/logout', { method: 'POST' }); } catch {}
    clearSensitiveSessionData();
    sessionStorage.clear();
    localStorage.setItem('lastLogout', new Date().toLocaleString());
    try {
      const kicks = JSON.parse(sessionStorage.getItem('pesoai_maint_kicks')) || [];
      kicks.unshift({
        name: currentUser.display_name || currentUser.displayName || currentUser.name || 'Staff Admin',
        role: currentUser.role,
        time: new Date().toLocaleString(),
      });
      sessionStorage.setItem('pesoai_maint_kicks', JSON.stringify(kicks.slice(0, 50)));
    } catch {}
    navigate('/login', { replace: true });
  }, [navigate, isStaffAdmin, currentUser]);

  useEffect(() => {
    if (!maintenance.active || !maintenance.endsAt) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((maintenance.endsAt - Date.now()) / 1000));
      setMaintRemaining(remaining);
      if (remaining <= 0 && !forcedRef.current) {
        forcedRef.current = true;
        if (!isSuperAdmin) forceLogout();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [maintenance.active, maintenance.endsAt, forceLogout, isSuperAdmin, clearMaintenance]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    const onKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        clearMaintenance();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSuperAdmin, clearMaintenance]);

  const openHub = (view) => {
    setHubView(view);
    setIsProfileOpen(false);
    if (view === 'profile') fetchProfile(); // refresh avatar when opening profile
  };

  const handleAvatarUpdate = (base64, displayName) => {
    const updated = {
      ...currentUser,
      avatar: base64,
      ...(displayName !== undefined && { displayName, display_name: displayName }),
    };
    setCurrentUser(updated);
    persistCurrentUser(updated);
  };

  if (location.pathname === '/admin/users' && !isMainAdmin && !isSuperAdmin)
    return <Navigate to="/admin" replace />;

  const handleLogout = async () => {
    const ok = await confirm({
      variant: 'logout', title: 'Sign Out?',
      subtitle: 'Your session will end.', subject: currentUser.name,
    });
    if (!ok) return;
    try { await apiFetch('/api/auth/logout', { method: 'POST' }); } catch {}
    clearSensitiveSessionData();
    sessionStorage.clear();
    localStorage.setItem('lastLogout', new Date().toLocaleString());
    navigate('/login', { replace: true });
  };

  const handleSwitchAccount = async () => {
    const ok = await confirm({
      variant: 'switch', title: 'Switch Account?',
      subtitle: "You'll be logged out.", subject: currentUser.name,
    });
    if (!ok) return;
    clearSensitiveSessionData();
    sessionStorage.clear();
    navigate('/login', { state: { fromSwitch: true }, replace: true });
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

  const displayName = currentUser.display_name || currentUser.displayName || currentUser.name;

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Toast toasts={toasts} />
      <ConfirmModal modal={modal} onConfirm={handleConfirm} onCancel={handleCancel} />
      <GlobalNotificationModal
        open={showNotif}
        onClose={() => setShowNotif(false)}
        maintenance={{
          active: maintenance.active,
          secondsLeft: maintRemaining,
          role: currentUser.role,
          onOverride: clearMaintenance,
          onForceLogout: forceLogout,
        }}
      />

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
            if (item.adminOnly && !(isMainAdmin || isSuperAdmin)) return null;
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

              {maintenance.active && isSuperAdmin && (
                <span className="absolute -top-2 -right-2 text-[8px] font-black uppercase tracking-widest bg-rose-50 text-rose-600 border border-rose-200 px-2 py-0.5 rounded-full shadow-sm">
                  ⚠️ SYSTEM PAUSED FOR STAFF
                </span>
              )}

              {isProfileOpen && (
                <ProfileDropdown
                  currentUser={{ ...currentUser, displayName }}
                  lastLogin={lastLogin}
                  onOpenHub={openHub}
                  onNotif={() => setShowNotif(true)}
                  onSwitchAccount={handleSwitchAccount}
                  onLogout={handleLogout}
                  onToast={showToast}
                  onConfirmMaintenance={confirmMaintenanceOn}
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