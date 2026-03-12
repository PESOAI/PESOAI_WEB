// src/App.jsx – PESO AI (JWT Protected Routes) - FIXED

import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import LandingPage from "./pages/LandingPage";
import AdminLayout from "./layouts/AdminLayout";
import AdminDashboard from "./pages/AdminDashboard";
import UserManagement from "./pages/UserManagement";

// ─────────────────────────────────────────────────────────────
// Helper: check if JWT token is expired (without backend call)
// ─────────────────────────────────────────────────────────────
const isTokenExpired = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
};

// ─────────────────────────────────────────────────────────────
// ProtectedRoute
// ─────────────────────────────────────────────────────────────
const ProtectedRoute = ({ children }) => {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    const verify = async () => {
      const token = localStorage.getItem('token');

      if (!token) {
        setStatus('invalid');
        return;
      }

      if (isTokenExpired(token)) {
        console.warn('[AUTH] Token expired — clearing session');
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
        setStatus('invalid');
        return;
      }

      setStatus('valid');

      try {
        const res = await fetch('http://localhost:5000/api/auth/verify', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) {
          console.warn('[AUTH] Backend rejected token — logging out');
          localStorage.removeItem('token');
          localStorage.removeItem('currentUser');
          setStatus('invalid');
        }
      } catch (error) {
        console.warn('[AUTH] Backend unreachable — trusting local token:', error.message);
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

// ─────────────────────────────────────────────────────────────
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
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