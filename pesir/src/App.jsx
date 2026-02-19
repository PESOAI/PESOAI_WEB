import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// SIGURADUHIN NA TAMA ANG SPELLING NG PATHS MO
import LandingPage from "./pages/LandingPage";
import AdminLayout from "./components/AdminLayout"; // Check if nasa 'components' folder
import AdminDashboard from "./pages/AdminDashboard";
import UserManagement from "./pages/UserManagement"; 

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        {/* ETO YUNG IMPORTANTE: Nested Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<UserManagement />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;