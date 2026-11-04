import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import PublicLayout from "../layouts/PublicLayout";
import { useAuth } from "../context/useAuth";

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login({ email, password }, "admin");
      const destination = location.state?.from?.pathname || "/admin/dashboard";
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.message || "Failed to log in to Admin Portal");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PublicLayout>
      <section className="auth-page">
        <div className="auth-card">
          <p className="eyebrow" style={{ color: "#b91c1c" }}>RESTRICTED · ADMIN PORTAL</p>
          <h1>Administrator Login</h1>
          <p className="muted">Authenticate to access platform administration and provider onboarding.</p>

          {error && (
            <div style={{ backgroundColor: "#fee2e2", color: "#b91c1c", padding: "10px 14px", borderRadius: "8px", marginBottom: "16px", fontSize: "0.9rem" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <label>
              Administrator Email
              <input
                type="email"
                placeholder="admin@appointer.internal"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label>
              Master Password
              <input
                type="password"
                placeholder="Enter administrator password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>

            <button className="primary-button" type="submit" disabled={submitting} style={{ backgroundColor: "#0f172a" }}>
              {submitting ? "Authenticating..." : "Authorize Admin Session"}
            </button>
          </form>

          <p className="auth-switch" style={{ fontSize: "0.85rem" }}>
            Admin accounts are provisioned exclusively via backend CLI configuration.
          </p>

          <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #e2e8f0", fontSize: "0.85rem", color: "#64748b", textAlign: "center", display: "flex", justifyContent: "center", gap: "16px", flexWrap: "wrap" }}>
            <Link to="/login" style={{ color: "var(--primary, #0284c7)" }}>← Patient Portal</Link>
            <Link to="/doctor/login" style={{ color: "var(--primary, #0284c7)" }}>Doctor Portal →</Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

export default AdminLogin;
