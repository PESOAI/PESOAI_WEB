// pesir/src/utils/EmergencyResume.js
// Global emergency maintenance-resume key listener for Main/Super Admin sessions.
import { apiFetch } from './authClient';
import { getCurrentUser } from './clientSession';

export const initEmergencyResume = () => {
  const onKeyDown = (e) => {
    if (!(e.shiftKey && e.altKey && e.key.toLowerCase() === 'r')) return;
    const currentUser = getCurrentUser() || {};
    if (!(currentUser.role === 'Super Admin' || currentUser.role === 'Main Admin')) return;
    e.preventDefault();
    localStorage.setItem('pesoai_maint', 'false');
    localStorage.removeItem('pesoai_maint_until');
    localStorage.setItem('pesoai_maint_trigger', String(Date.now()));
    window.dispatchEvent(new Event('pesoai_maint_change'));
    apiFetch('/api/maintenance', {
      method: 'POST',
      body: JSON.stringify({ active: false }),
    }).catch(() => {});
    window.location.reload();
  };
  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
};

