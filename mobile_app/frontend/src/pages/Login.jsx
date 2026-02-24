import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authApi, sellerApi } from "../api";
import { useAuth } from "../context/AuthContext";
import { auth } from "../firebase";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from "firebase/auth";
import "styles/Auth.css";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  // Always seller for this page
  const userType = "seller";

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
        user_type: "seller",
      });

      login(response.data);

      // Print token to console after login
      const token = localStorage.getItem("token");
      if (token) {
        console.log("Your JWT token:", token);
      }

      // Prefetch likely-needed data to make dashboard load feel instant
      (async () => {
        try {
          const itemsRes = await sellerApi.getItems(response.data.id);
          localStorage.setItem('prefetch_seller_items', JSON.stringify(itemsRes.data?.items || []));
        } catch (e) {
          // ignore prefetch errors
          console.debug('Prefetch failed', e);
        }
      })();

      navigate("/seller/dashboard");
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
          user_type: "seller",
        });

        if (!mounted) return;

        login(response.data);

        // Print token to console after login
        const token = localStorage.getItem("token");
        if (token) {
          console.log("Your JWT token:", token);
        }

        // Prefetch likely-needed data to make dashboard load feel instant
        (async () => {
          try {
            const itemsRes = await sellerApi.getItems(response.data.id);
            localStorage.setItem('prefetch_seller_items', JSON.stringify(itemsRes.data?.items || []));
          } catch (e) {
            console.debug('Prefetch failed', e);
          }
        })();

        navigate("/seller/dashboard");
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
          const itemsRes = await sellerApi.getItems(response.data.id);
          localStorage.setItem('prefetch_seller_items', JSON.stringify(itemsRes.data?.items || []));
        } catch (e) {
          console.debug('Prefetch failed', e);
        }
      })();
      navigate("/seller/dashboard");
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
          <div className="logo-mark">♻️</div>
          <h1>Welcome Back</h1>
          <p className="tagline">Sign in to your Ridit account</p>
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
          Don't have an account? <a href="/#/register/seller">Create a seller account</a>
        </div>
      </div>
    </div>
  );
}