import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authApi, collectorApi } from "../api";
import { useAuth } from "../context/AuthContext";
import { auth } from "../firebase";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from "firebase/auth";
import "../styles/Auth.css";

export default function CollectorLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const idToken = await user.getIdToken();

      const response = await authApi.googleLogin({
        id_token: idToken,
        name: user.displayName || "Google User",
        email: user.email,
        user_type: "collector",
      });

      login(response.data);

      // Prefetch likely-needed data to make dashboard load feel instant
      (async () => {
        try {
          const [availRes, acceptedRes] = await Promise.all([
            collectorApi.getAvailableItems(response.data.id),
            collectorApi.getMyAcceptedItems(response.data.id)
          ]);
          localStorage.setItem('prefetch_collector_available', JSON.stringify(availRes.data?.items || []));
          localStorage.setItem('prefetch_collector_accepted', JSON.stringify(acceptedRes.data?.items || []));
        } catch (e) {
          console.debug('Prefetch failed', e);
        }
      })();

      navigate("/collector/dashboard");
    } catch (err) {
      const code = err?.code || "";
      if (
        code === "auth/popup-blocked" ||
        code === "auth/operation-not-supported-in-this-environment"
      ) {
        await signInWithRedirect(auth, provider);
      } else {
        setError(err.response?.data?.detail || err.message || "Google login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const processRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (!result?.user) return;

        const user = result.user;
        const idToken = await user.getIdToken();

        const response = await authApi.googleLogin({
          id_token: idToken,
          name: user.displayName || "Google User",
          email: user.email,
          user_type: "collector",
        });

        if (!mounted) return;

        login(response.data);

        // Prefetch likely-needed data to make dashboard load feel instant
        (async () => {
          try {
            const [availRes, acceptedRes] = await Promise.all([
              collectorApi.getAvailableItems(response.data.id),
              collectorApi.getMyAcceptedItems(response.data.id)
            ]);
            localStorage.setItem('prefetch_collector_available', JSON.stringify(availRes.data?.items || []));
            localStorage.setItem('prefetch_collector_accepted', JSON.stringify(acceptedRes.data?.items || []));
          } catch (e) {
            console.debug('Prefetch failed', e);
          }
        })();

        navigate("/collector/dashboard");
      } catch (err) {
        console.warn("Redirect login error:", err);
      }
    };

    processRedirect();
    return () => (mounted = false);
  }, [navigate, login]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await authApi.login(formData);
      login(response.data);
      
      // Prefetch likely-needed data to make dashboard load feel instant
      (async () => {
        try {
          const [availRes, acceptedRes] = await Promise.all([
            collectorApi.getAvailableItems(response.data.id),
            collectorApi.getMyAcceptedItems(response.data.id)
          ]);
          localStorage.setItem('prefetch_collector_available', JSON.stringify(availRes.data?.items || []));
          localStorage.setItem('prefetch_collector_accepted', JSON.stringify(acceptedRes.data?.items || []));
        } catch (e) {
          console.debug('Prefetch failed', e);
        }
      })();

      navigate("/collector/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="card-header">
          <div className="logo-mark">🚚</div>
          <h1>Collector Login</h1>
          <p className="tagline">Sign in to your collector account</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <button
          type="button"
          className="btn-google"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          <span className="google-icon">🔔</span> Sign in with Google
        </button>

        <div className="divider">Or continue with email</div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Phone or Email</label>
            <input
              type="text"
              name="identifier"
              value={formData.identifier}
              onChange={handleChange}
              placeholder="Enter your phone or email"
              required
            />
          </div>

          <div className="form-group password-group">
            <label>Password</label>
            <div className="password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary btn-register">
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="auth-link">
          Don't have an account? <a href="/collector/register">Create a collector account</a>
        </div>

        <div style={{ textAlign: 'center', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #ccc' }}>
          <p style={{ fontSize: '0.85rem', color: '#666' }}>
            Seller? <a href="/login/seller">Seller login</a>
          </p>
        </div>
      </div>
    </div>
  );
}
