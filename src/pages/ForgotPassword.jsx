import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PublicLayout from "../layouts/PublicLayout";
import { api } from "../services/api";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);
    try {
      const result = await api.forgotPassword(email);
      setMessage(result.message);
      navigate("/verify-reset-otp", {
        state: {
          email: email.trim().toLowerCase(),
          message: result.message,
          demoMode: result.demoMode === true,
        },
      });
    } catch (err) {
      setError(err.message || "Unable to request a password reset");
    } finally {
      setSubmitting(false);
    }
  };

  return <PublicLayout><section className="auth-page"><div className="auth-card">
    <p className="eyebrow">ACCOUNT RECOVERY</p><h1>Forgot password?</h1>
    <p className="muted">Enter your registered email address and we’ll send a six-digit verification code.</p>
    {error && <div className="auth-status auth-status-error">{error}</div>}
    {message && <div className="auth-status auth-status-success">{message}</div>}
    <form onSubmit={handleSubmit}><label>Email address<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email" /></label>
      <button className="primary-button" type="submit" disabled={submitting}>{submitting ? "Sending code..." : "Send verification code"}</button></form>
    <p className="auth-switch"><Link to="/login">← Back to login</Link></p>
  </div></section></PublicLayout>;
}

export default ForgotPassword;
