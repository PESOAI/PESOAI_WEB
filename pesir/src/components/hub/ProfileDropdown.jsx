  // components/hub/ProfileDropdown.jsx — PESO AI
  import React, { useState, useEffect } from 'react';
  import {
    User, Settings, Activity, Wrench, Shield,
    UserCheck, Smartphone, UserPlus, Bell, LogOut,
    ShieldCheck,
  } from 'lucide-react';
  import { ToggleSwitch, SectionLabel, Divider, DropItem, Badge } from '../UIAtoms';

  export const ProfileDropdown = ({ currentUser, lastLogin, onOpenHub, onNotif, onSwitchAccount, onLogout, onClose }) => {
    const [maint, setMaint] = useState(() => localStorage.getItem('pesoai_maint') === 'true');
    const isMain = currentUser.role === 'Main Admin';

    useEffect(() => { localStorage.setItem('pesoai_maint', maint); }, [maint]);

    const go = view => { onOpenHub(view); onClose(); };

    return (
      <>
        <div className="fixed inset-0 z-10" onClick={onClose} />
        <div
          className="absolute right-0 mt-3 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 z-20 overflow-hidden"
          style={{ boxShadow: '0 20px 60px -10px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.04)' }}
        >
          {/* Header */}
          <div className="px-4 pt-4 pb-3 bg-gradient-to-br from-slate-900 to-blue-900">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {currentUser.avatar
                  ? <img src={currentUser.avatar} alt="" className="w-full h-full object-cover" />
                  : <ShieldCheck size={20} className="text-white" />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-white leading-tight truncate">{currentUser.displayName || currentUser.name}</p>
                <span className="inline-block text-[9px] font-black uppercase tracking-widest bg-blue-500/30 text-blue-200 border border-blue-400/30 px-2 py-0.5 rounded-full mt-0.5">
                  {currentUser.role}
                </span>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
              <p className="text-[10px] text-white/50 font-medium truncate">Last login: {lastLogin}</p>
            </div>
          </div>

          {/* Items */}
          <div className="p-2 max-h-[72vh] overflow-y-auto">
            <SectionLabel>Profile</SectionLabel>
            <DropItem icon={<User size={15} />}     label="My Profile"        onClick={() => go('profile')} />
            <DropItem icon={<Settings size={15} />} label="Security Settings" onClick={() => go('security')} />

            {isMain && <>
              <DropItem icon={<Bell size={15} />} label="Send Notification" onClick={() => { onNotif(); onClose(); }} />
              <Divider />
              <SectionLabel>System</SectionLabel>
              <DropItem icon={<Activity size={15} />} label="Activity Logs" onClick={() => go('logs')} />
              <DropItem icon={<Shield size={15} />}   label="Audit Trail"   onClick={() => go('audit')} />

              {/* Maintenance Mode toggle */}
              <div
                className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
                onClick={() => setMaint(m => !m)}
              >
                <div className="flex items-center gap-3">
                  <Wrench size={15} className={maint ? 'text-amber-500' : 'text-slate-400'} />
                  <div>
                    <p className={`text-sm font-semibold leading-tight ${maint ? 'text-amber-600' : 'text-slate-700'}`}>Maintenance Mode</p>
                    {maint && <p className="text-[9px] font-bold text-amber-500 uppercase tracking-wider">Active — app paused</p>}
                  </div>
                </div>
                <ToggleSwitch enabled={maint} onChange={setMaint} colorOn="bg-amber-500" />
              </div>

              <Divider />
              <SectionLabel>Admin Controls</SectionLabel>
              <DropItem icon={<UserCheck size={15} />}  label="Admin Management"  onClick={() => go('adminMgmt')} />
              </>}

            <Divider />
            <SectionLabel>Account</SectionLabel>
            <button
              onClick={() => { onSwitchAccount(); onClose(); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-all group"
            >
              <UserPlus size={15} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
              <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900">Switch Account</span>
            </button>
            <div className="px-2 pt-1 pb-1">
              <button
                onClick={() => { onLogout(); onClose(); }}
                className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl bg-red-50 border border-red-100 text-red-600 font-bold text-sm hover:bg-red-600 hover:text-white hover:border-red-600 transition-all duration-200 group"
              >
                <LogOut size={14} className="transition-transform group-hover:-translate-x-0.5" />Sign Out System
              </button>
            </div>
          </div>
        </div>
      </>
    );
  };