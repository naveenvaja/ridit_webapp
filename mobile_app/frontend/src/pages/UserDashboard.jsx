import React from "react";
import { useNavigate } from "react-router-dom";
import "styles/Home.css";

export default function UserDashboard() {
  const navigate = useNavigate();

  return (
    <div className="home-container">
      <header className="home-header">
        <div className="header-logo-large">♻️</div>
        <h1>Ridit</h1>
        <p className="tagline">Smart Waste Collection Platform</p>
      </header>

      <section className="home-hero">
        <div className="hero-content">
          <h2>Turn Your Waste Into Value</h2>
          <p className="hero-subtitle">Connect waste sellers and collectors in a sustainable ecosystem</p>

          <div className="cta-buttons">
            <button onClick={() => navigate("/register")} className="btn-primary btn-large">
              🚀 Get Started
            </button>
            <button onClick={() => navigate("/login")} className="btn-secondary btn-large">
              📌 Sign In
            </button>
          </div>
        </div>
      </section>

      <section className="home-features">
        <h2 className="features-title">How It Works</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">📦</div>
            <h3>For Sellers</h3>
            <p>List your waste materials in seconds. Get instant quotes from collectors and track real-time pickups.</p>
            <ul className="feature-list">
              <li>✓ Easy listing creation</li>
              <li>✓ Real-time quotes</li>
              <li>✓ Payment tracking</li>
              <li>✓ Pickup scheduling</li>
            </ul>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🚚</div>
            <h3>For Collectors</h3>
            <p>Find high-value waste materials nearby. Manage collections, negotiate prices, and grow your business.</p>
            <ul className="feature-list">
              <li>✓ Location-based matching</li>
              <li>✓ Material filtering</li>
              <li>✓ Instant negotiations</li>
              <li>✓ Payment integration</li>
            </ul>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🌍</div>
            <h3>For Environment</h3>
            <p>Be part of the waste reduction movement. Every collection contributes to a cleaner planet.</p>
            <ul className="feature-list">
              <li>✓ Reduce landfill waste</li>
              <li>✓ Promote recycling</li>
              <li>✓ Track impact</li>
              <li>✓ Build community</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="home-stats">
        <div className="stat-item">
          <div className="stat-number">2000+</div>
          <div className="stat-label">Active Users</div>
        </div>
        <div className="stat-item">
          <div className="stat-number">15K+</div>
          <div className="stat-label">Items Collected</div>
        </div>
        <div className="stat-item">
          <div className="stat-number">500T</div>
          <div className="stat-label">Waste Recycled</div>
        </div>
      </section>

      <section className="home-cta">
        <h2>Ready to Make a Difference?</h2>
        <p>Join thousands of users already transforming waste into value</p>
        <button onClick={() => navigate("/register")} className="btn-primary btn-large">
          Start Now
        </button>
      </section>
    </div>
  );
}
