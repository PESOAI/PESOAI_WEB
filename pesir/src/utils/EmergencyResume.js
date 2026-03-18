// utils/EmergencyResume.js — PESO AI
// Global emergency key listener for Super Admins.
export const initEmergencyResume = () => {
  const onKeyDown = (e) => {
    if (!(e.shiftKey && e.altKey && e.key.toLowerCase() === 'r')) return;
    const currentUser = JSON.parse(localStorage.getItem('currentUser')) || {};
    if (!(currentUser.role === 'Super Admin' || currentUser.role === 'Main Admin')) return;
    e.preventDefault();
    localStorage.setItem('pesoai_maint', 'false');
    localStorage.removeItem('pesoai_maint_until');
    localStorage.setItem('pesoai_maint_trigger', String(Date.now()));
    window.dispatchEvent(new Event('pesoai_maint_change'));
    window.location.reload();
  };
  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
};
