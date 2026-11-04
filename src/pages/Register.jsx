import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PublicLayout from "../layouts/PublicLayout";
import { useAuth } from "../context/useAuth";

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setSubmitting(true);
    try {
      await register({ name, email, password, phone });
      navigate("/patient/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Failed to create patient account");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PublicLayout>
      <section className="auth-page">
        <div className="auth-card">
          <p className="eyebrow">PATIENT REGISTRATION</p>
          <h1>Create your account</h1>
          <p className="muted">Keep appointments and care details organized in one place.</p>

          {error && (
            <div style={{ backgroundColor: "#fee2e2", color: "#b91c1c", padding: "10px 14px", borderRadius: "8px", marginBottom: "16px", fontSize: "0.9rem" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <label>
              Full name
              <input
                placeholder="Your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
            <label>
              Email address
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label>
              Phone number (optional)
              <input
                type="tel"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>
            <label>
              Password
              <input
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            <label className="check-label">
              <input type="checkbox" required /> I agree to the terms of use
            </label>
            <button className="primary-button" type="submit" disabled={submitting}>
              {submitting ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account? <Link to="/login">Log in</Link>
          </p>

          <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #e2e8f0", fontSize: "0.85rem", color: "#64748b", textAlign: "center" }}>
            <span>Healthcare provider? </span>
            <Link to="/doctor/login" style={{ color: "var(--primary, #0284c7)" }}>Doctor Portal Log In →</Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

export default Register;
