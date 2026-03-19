// pesir/src/App.jsx
// Root app routes with cookie-based auth verification and one-time sensitive storage cleanup.
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { initEmergencyResume } from './utils/EmergencyResume';
import { apiFetch } from './utils/authClient';
import { migrateSensitiveStorage, clearSensitiveSessionData, setCurrentUser, getCurrentUser } from './utils/clientSession';

import LandingPage from './pages/LandingPage';
import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/AdminDashboard';
import UserManagement from './pages/UserManagement';

const ProtectedRoute = ({ children }) => {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    const verify = async () => {
      try {
        const response = await apiFetch('/api/auth/verify', { method: 'GET' });
        if (!response.ok) {
          clearSensitiveSessionData();
          setStatus('invalid');
          return;
        }
        const data = await response.json();
        if (data?.userId) {
          setCurrentUser({
            id: data.userId,
            displayName: data.displayName,
            role: data.role,
            name: data.displayName,
          });
        }
        setStatus('valid');
      } catch {
        clearSensitiveSessionData();
        setStatus('invalid');
      }
    };

    verify();
  }, []);

  if (status === 'checking') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F0F4FF]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Verifying session...</p>
        </div>
      </div>
    );
  }

  return status === 'valid' ? children : <Navigate to="/" replace />;
};

function App() {
  useEffect(() => {
    migrateSensitiveStorage();
    const cleanup = initEmergencyResume();
    return () => cleanup && cleanup();
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (!(e.ctrlKey && e.shiftKey && e.altKey && e.key.toLowerCase() === 'u')) return;
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
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LandingPage />} />

        <Route
          path="/admin"
          element={(
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          )}
        >
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<UserManagement />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
