import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import PublicLayout from "../layouts/PublicLayout";
import { api } from "../services/api";

function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { email, resetToken } = location.state || {};

  const handleSubmit = async (event) => {
    event.preventDefault(); setError(""); setSuccess("");
    if (password !== confirmation) return setError("Passwords do not match");
    setSubmitting(true);
    try {
      const result = await api.resetPassword(email, resetToken, password);
      setSuccess(result.message);
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) { setError(err.message || "Unable to reset password"); }
    finally { setSubmitting(false); }
  };

  if (!email || !resetToken) return <PublicLayout><section className="auth-page"><div className="auth-card"><p className="eyebrow">ACCOUNT RECOVERY</p><h1>Start again</h1><p className="muted">Your password reset session is missing or has expired.</p><p className="auth-switch"><Link to="/forgot-password">Request a new code</Link></p></div></section></PublicLayout>;

  return <PublicLayout><section className="auth-page"><div className="auth-card">
    <p className="eyebrow">ACCOUNT RECOVERY</p><h1>Create a new password</h1><p className="muted">Choose a password with at least eight characters.</p>
    {error && <div className="auth-status auth-status-error">{error}</div>}{success && <div className="auth-status auth-status-success">{success}</div>}
    <form onSubmit={handleSubmit}><label>New password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength="8" required autoComplete="new-password" /></label>
      <label>Confirm new password<input type="password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} minLength="8" required autoComplete="new-password" /></label>
      <button className="primary-button" type="submit" disabled={submitting || Boolean(success)}>{submitting ? "Resetting password..." : "Reset password"}</button></form>
  </div></section></PublicLayout>;
}

export default ResetPassword;
