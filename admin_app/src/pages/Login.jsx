import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
// import "styles/Admin.css";
import '../styles/Admin.css';
const AdminLogin = () => {
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	const handleLogin = async (e) => {
		e.preventDefault();
		setError("");
		if (!email || !password) return setError("Please enter email and password");
		setLoading(true);

		try {
			const apiBase = process.env.REACT_APP_API_URL || "https://ridit.onrender.com";
			const res = await fetch(`${apiBase}/admin/login`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, password })
			});

			const data = await res.json();
			if (!res.ok) throw new Error(data.detail || "Admin login failed");

			localStorage.setItem("token", data.token);
			localStorage.setItem("admin_user_id", data.user_id);
			localStorage.setItem("user_type", "admin");

			navigate("/admin/dashboard");
		} catch (err) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="login-wrap">
			<div className="admin-card card">
				<div style={{ marginBottom: 12 }}>
					<div className="admin-brand">
						<div className="brand-logo">A</div>
						<div>
							<div style={{ fontWeight: 700 }}>Ridit Admin</div>
							<div className="small muted">Admin portal — manage users & items</div>
						</div>
					</div>
				</div>

				<form onSubmit={handleLogin} aria-label="Admin login form">
					{error && <div className="error">{error}</div>}

					<div className="form-group">
						<label className="form-label">Email</label>
						<input
							className="form-input"
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="admin@example.com"
							required
						/>
					</div>

					<div className="form-group">
						<label className="form-label">Password</label>
						<input
							className="form-input"
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							placeholder="••••••••"
							required
						/>
					</div>

					<div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 8 }}>
						<button className="btn" type="submit" disabled={loading}>
							{loading ? "Signing in..." : "Sign in"}
						</button>
						<button type="button" className="btn secondary" onClick={() => { setEmail(''); setPassword(''); setError(''); }}>
							Clear
						</button>
					</div>

					<div style={{ marginTop: 12 }} className="form-help small muted">
						Use the admin credentials to sign in. For production, secure credentials with env vars.
					</div>
				</form>
			</div>
		</div>
	);
};

export default AdminLogin;
