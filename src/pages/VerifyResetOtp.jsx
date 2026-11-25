import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import PublicLayout from "../layouts/PublicLayout";
import { api } from "../services/api";

function VerifyResetOtp() {
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState(location.state?.email || "");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [message] = useState(location.state?.message || "");
  const [demoMode] = useState(location.state?.demoMode === true);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault(); setError(""); setSubmitting(true);
    try {
      const result = await api.verifyResetOtp(email, otp);
      navigate("/reset-password", { state: { email: email.trim().toLowerCase(), resetToken: result.resetToken } });
    } catch (err) { setError(err.message || "Unable to verify the reset code"); }
    finally { setSubmitting(false); }
  };

  return <PublicLayout><section className="auth-page"><div className="auth-card">
    <p className="eyebrow">ACCOUNT RECOVERY</p><h1>Verify your code</h1>
    <p className="muted">{demoMode ? "Local demonstration mode is enabled. Enter 123456 as your verification code; no email is sent." : "Enter the six-digit code emailed to you. It expires in five minutes."}</p>
    {!demoMode && message && <div className="auth-status auth-status-success">{message}</div>}
    {error && <div className="auth-status auth-status-error">{error}</div>}
    <form onSubmit={handleSubmit}><label>Email address<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></label>
      <label>Verification code<input inputMode="numeric" pattern="[0-9]{6}" maxLength="6" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} placeholder="123456" required autoComplete="one-time-code" /></label>
      <button className="primary-button" type="submit" disabled={submitting}>{submitting ? "Verifying..." : "Verify code"}</button></form>
    <p className="auth-switch"><Link to="/forgot-password">Request a new code</Link></p>
  </div></section></PublicLayout>;
}

export default VerifyResetOtp;
