import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Auth.css";

export default function CollectorHome() {
  const navigate = useNavigate();

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: "600px", textAlign: "center" }}>
        <div className="card-header">
          <div className="logo-mark" style={{ fontSize: "4rem" }}>🚚</div>
          <h1>Ridit Collector</h1>
          <p className="tagline">Collect and recycle waste, earn rewards</p>
        </div>

        <div style={{ marginBottom: "24px" }}>
          <p style={{ fontSize: "1rem", lineHeight: "1.6", color: "#555" }}>
            Welcome to Ridit! Join thousands of collectors making a difference in waste management.
          </p>
          <ul style={{ textAlign: "left", marginTop: "16px", fontSize: "0.95rem", color: "#666" }}>
            <li>✅ Find nearby waste items to collect</li>
            <li>✅ Get paid for collecting and recycling</li>
            <li>✅ Track your collections and earnings</li>
            <li>✅ Build your reputation as a trusted collector</li>
          </ul>
        </div>

        <div style={{ display: "flex", gap: "12px", flexDirection: "column" }}>
          <button 
            type="button"
            className="btn-primary" 
            onClick={() => navigate("/collector/register")}
            style={{ width: "100%", cursor: "pointer" }}
          >
            🎯 Create Collector Account
          </button>
          <button 
            type="button"
            className="btn-primary" 
            onClick={() => navigate("/collector/login")}
            style={{ width: "100%", cursor: "pointer", opacity: 0.8 }}
          >
            ✨ Have an Account? Sign In
          </button>
        </div>

        <div style={{ marginTop: "32px", paddingTop: "16px", borderTop: "1px solid #ccc" }}>
        </div>
      </div>
    </div>
  );
}
