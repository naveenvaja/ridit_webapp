import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

import CollectorDashboard from "./pages/CollectorDashboard";
import CollectorHome from "./pages/CollectorHome";

import CollectorRegister from "./pages/CollectorRegister";
import CollectorLogin from "./pages/CollectorLogin";

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Home */}
          <Route path="/" element={<CollectorHome />} />
          {/* <Route path="/collector" element={<CollectorHome />} /> */}

          {/* Collector Auth */}
          <Route path="/collector/register" element={<CollectorRegister />} />
          <Route path="/collector/login" element={<CollectorLogin />} />

          {/* Dashboard */}
          <Route path="/collector/dashboard" element={<CollectorDashboard />} />

          {/* Catch-all (ONLY ONE *) */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}