import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

// Pages
import UserDashboard from "./pages/UserDashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import SellerDashboard from "./pages/SellerDashboard";
import CollectorDashboard from "./pages/CollectorDashboard";
import AdminLogin from "./admin/AdminLogin";
import AdminDashboard from "./admin/AdminDashboard";

// Collector-specific pages
import CollectorHome from "./pages/collector/CollectorHome";
import CollectorRegister from "./pages/collector/CollectorRegister";
import CollectorLogin from "./pages/collector/CollectorLogin";

// Seller-specific pages
// import SellerHome from "./pages/seller/SellerHome";

// Components
import AddItem from "./components/AddItem";

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<UserDashboard />} />
          
          {/* Seller Auth (default) */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login/seller" element={<Login />} />
          <Route path="/register/seller" element={<Register />} />

          {/* Seller Landing
          <Route path="/seller" element={<SellerHome />} /> */}

          {/* Collector Landing & Auth */}
          <Route path="/collector" element={<CollectorHome />} />
          <Route path="/collector/register" element={<CollectorRegister />} />
          <Route path="/collector/login" element={<CollectorLogin />} />

          {/* Seller Routes */}
          <Route path="/seller/dashboard" element={<SellerDashboard />} />
          <Route path="/seller/add-item" element={<AddItem />} />

          {/* Collector Routes */}
          <Route path="/collector/dashboard" element={<CollectorDashboard />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
