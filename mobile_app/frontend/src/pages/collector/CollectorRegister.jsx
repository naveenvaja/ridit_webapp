import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../../api";
import { auth } from "../../firebase";
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from "firebase/auth";
import "styles/Auth.css";

export default function CollectorRegister() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [touched, setTouched] = useState({
    name: false,
    phone: false,
    email: false,
    password: false,
    confirmPassword: false,
  });

  const phoneValid = useMemo(() => /^\d{10,}$/.test(formData.phone), [formData.phone]);
  const passwordMatch = useMemo(() => formData.password === formData.confirmPassword, [formData.password, formData.confirmPassword]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((s) => ({ ...s, [name]: value }));
    setError("");
    setSuccess("");
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched((s) => ({ ...s, [name]: true }));
  };

  const canSubmit = () => {
    return (
      formData.name.trim().length > 0 &&
      phoneValid &&
      formData.password.length >= 6 &&
      formData.password === formData.confirmPassword
    );
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setSuccess("");
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const idToken = await user.getIdToken();

      const payload = {
        id_token: idToken,
        name: user.displayName || "Google User",
        email: user.email,
        user_type: "collector",
      };

      await authApi.googleRegister(payload);
      setSuccess("Registration successful — redirecting to dashboard...");
      setTimeout(() => navigate("/collector/dashboard", { state: { registered: true } }), 900);
    } catch (err) {
      console.error("Google sign-in error:", err);
      const code = err?.code || '';
      if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
        try {
          localStorage.setItem('ridit_google_user_type', 'collector');
          await signInWithRedirect(auth, provider);
          return;
        } catch (redirErr) {
          setError(redirErr.message || 'Redirect sign-in failed');
        }
      } else {
        const errorMsg = err.message || String(err);
        const fullError = err.response?.data?.detail || errorMsg;
        
        if (code === 'auth/configuration-not-found') {
          setError("Firebase auth not configured. Check Firebase Console and API key. If problem persists, try email registration.");
        } else {
          setError(fullError);
        }
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
        if (!result || !result.user) return;
        localStorage.removeItem('ridit_google_user_type');
        const user = result.user;
        const idToken = await user.getIdToken();
        const payload = {
          id_token: idToken,
          name: user.displayName || 'Google User',
          email: user.email,
          user_type: 'collector',
        };

        await authApi.googleRegister(payload);
        if (!mounted) return;
        setSuccess('Registration successful — redirecting to dashboard...');
        setTimeout(() => navigate('/collector/dashboard', { state: { registered: true } }), 900);
      } catch (err) {
        console.warn('Redirect sign-in processing error:', err);
      }
    };

    processRedirect();
    return () => { mounted = false; };
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!canSubmit()) {
      setError("Please fix the errors in the form before continuing.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email?.trim() || null,
        password: formData.password,
        user_type: "collector",
      };

      await authApi.register(payload);
      setSuccess("Registration successful — redirecting to login...");
      setTimeout(() => navigate("/collector/login", { state: { registered: true } }), 900);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card register-card">
        <div className="card-header">
          <div className="logo-mark">🚚</div>
          <h1>Join as a Collector</h1>
          <p className="tagline">Start collecting and recycling waste</p>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <button
          type="button"
          className="btn-google"
          onClick={handleGoogleSignIn}
          disabled={loading}
        >
          <span className="google-icon">🔔</span> Sign up with Google
        </button>

        <div className="divider">Or continue with email</div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Your full name"
              required
            />
          </div>

          <div className="form-group">
            <label>Phone Number *</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="10-digit phone number"
              pattern="[0-9]{10,}"
              required
            />
            {touched.phone && !phoneValid && formData.phone && (
              <small style={{ color: '#e74c3c' }}>Enter a valid 10+ digit number</small>
            )}
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="your@email.com"
            />
          </div>

          <div className="form-group">
            <label>Password *</label>
            <div className="password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Minimum 6 characters"
                minLength="6"
                required
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {touched.password && formData.password.length < 6 && formData.password && (
              <small style={{ color: '#e74c3c' }}>Minimum 6 characters required</small>
            )}
          </div>

          <div className="form-group">
            <label>Confirm Password *</label>
            <input
              type={showPassword ? "text" : "password"}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Re-enter password"
              required
            />
            {touched.confirmPassword && !passwordMatch && formData.confirmPassword && (
              <small style={{ color: '#e74c3c' }}>Passwords do not match</small>
            )}
          </div>

          <button type="submit" disabled={loading || !canSubmit()} className="btn-primary btn-register">
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="auth-link">
          Already have an account? <a href="/collector/login">Sign in</a>
        </p>

        <div style={{ textAlign: 'center', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #ccc' }}>
          <p style={{ fontSize: '0.85rem', color: '#666' }}>
            Looking for a seller account? <a href="/register/seller">Seller registration</a>
          </p>
        </div>
      </div>
    </div>
  );
}
