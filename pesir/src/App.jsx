// src/App.jsx – PESO AI (JWT Protected Routes)
import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import LandingPage from "./pages/LandingPage";
import AdminLayout from "./components/AdminLayout";
import AdminDashboard from "./pages/AdminDashboard";
import UserManagement from "./pages/UserManagement";

// ─────────────────────────────────────────────────────────────
// ProtectedRoute: verifies JWT token with backend before allowing access
// ─────────────────────────────────────────────────────────────
const ProtectedRoute = ({ children }) => {
  const [status, setStatus] = useState('checking'); // 'checking' | 'valid' | 'invalid'

  useEffect(() => {
    const verify = async () => {
      const token = localStorage.getItem('token');
      if (!token) { 
        setStatus('invalid'); 
        return; 
      }

      try {
        const res = await fetch('http://localhost:5000/api/verify', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.ok) {
          setStatus('valid');
        } else {
          // Token is expired or tampered with
          localStorage.removeItem('token');
          localStorage.removeItem('currentUser');
          setStatus('invalid');
        }
      } catch (error) {
        console.error("Auth verification failed:", error);
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

  // Kung invalid ang status, ibabalik sa Landing Page (Login)
  return status === 'valid' ? children : <Navigate to="/" replace />;
};

// ─────────────────────────────────────────────────────────────
function App() {
  return (
    <Router>
      <Routes>
        {/* Public Route */}
        <Route path="/" element={<LandingPage />} />

        {/* Protected Admin Routes */}
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          {/* Ang index element ay lalabas sa /admin path */}
          <Route index element={<AdminDashboard />} />
          {/* Lalabas ito sa /admin/users path */}
          <Route path="users" element={<UserManagement />} />
        </Route>

        {/* Catch all — redirect to home if route doesn't exist */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;