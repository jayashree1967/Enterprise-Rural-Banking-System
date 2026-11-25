
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";


function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = await login(email, password);

      if (user.role === "ADMIN" || user.role === "STAFF") {
        navigate("/staff-dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      const data = err.response?.data;

      setError(
        data?.detail ||
        data?.email?.[0] ||
        data?.non_field_errors?.[0] ||
        "Login failed. Check your email and password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">

        <div className="login-brand">
          <div className="login-logo">ER</div>
          <span>RuralBank</span>
        </div>

        <div className="login-heading">
          <span className="login-eyebrow">
            ENTERPRISE RURAL BANKING
          </span>

          <h1>Welcome Back!</h1>

          <p>
            Sign in to access your secure banking dashboard.
          </p>
        </div>

        {error && (
          <div className="login-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">

          <div className="login-field">
            <label htmlFor="email">Email Address</label>

            <input
              id="email"
              type="email"
              placeholder="Enter your registered email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div className="login-field">
            <label htmlFor="password">Password</label>

            <div className="password-wrapper">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="login-submit"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
            {!loading && <span>→</span>}
          </button>

        </form>

        <div style={{ textAlign: "center", marginTop: "18px", fontSize: "14px" }}>
          New to RuralBank? <a href="/register" style={{ color: "#0b9c8e", fontWeight: 600 }}>Create an account</a>
        </div>

        <div className="login-security">
          <span>✓</span>
          Secure and protected banking access
        </div>

        <div className="login-footer">
          © 2026 RuralBank. Enterprise Rural Banking System.
        </div>

      </div>
    </div>
  );
}

export default Login;
