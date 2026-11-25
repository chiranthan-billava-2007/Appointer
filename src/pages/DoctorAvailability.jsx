import { useEffect, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import { api } from "../services/api";
import { useAuth } from "../context/useAuth";

const emptyWindow = () => ({ dayOfWeek: 1, startTime: "09:00", endTime: "17:00", slotDurationMinutes: 30 });

function DoctorAvailability() {
  const { user } = useAuth();
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [windows, setWindows] = useState([emptyWindow()]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api.getDashboard()
      .then((dashboard) => {
        if (dashboard.timezone) setTimezone(dashboard.timezone);
        if (Array.isArray(dashboard.weeklyAvailability) && dashboard.weeklyAvailability.length > 0) setWindows(dashboard.weeklyAvailability);
      })
      .catch((err) => setError(err.message || "Could not load availability."))
      .finally(() => setLoading(false));
  }, []);

  const updateWindow = (index, field, value) => setWindows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: field === "dayOfWeek" || field === "slotDurationMinutes" ? Number(value) : value } : item));
  const save = async (event) => {
    event.preventDefault();
    setSaving(true); setMessage(""); setError("");
    try {
      await api.updateMyAvailability({ timezone, weeklyAvailability: windows });
      setMessage("Availability saved successfully.");
    } catch (err) { setError(err.message || "Could not save availability."); } finally { setSaving(false); }
  };

  return <DashboardLayout role="doctor"><div className="dashboard-page">
    <p className="eyebrow">DOCTOR PORTAL</p><h1>Availability</h1>
    <p className="muted">Configure your recurring appointment windows, {user?.name ? `Dr. ${user.name.replace(/^Dr\.\s*/i, "")}` : "doctor"}.</p>
    {loading && <p className="muted">Loading availability…</p>}
    {error && <p className="dashboard-error" role="alert">{error}</p>}
    {message && <p className="success" role="status">{message}</p>}
    {!loading && <form className="dashboard-panel availability-form" onSubmit={save}>
      <label>Timezone<input value={timezone} onChange={(event) => setTimezone(event.target.value)} placeholder="Asia/Kolkata" required /></label>
      {windows.map((window, index) => <div className="availability-row" key={index}>
        <label>Day<select value={window.dayOfWeek} onChange={(event) => updateWindow(index, "dayOfWeek", event.target.value)}>{["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day, dayIndex) => <option value={dayIndex} key={day}>{day}</option>)}</select></label>
        <label>Start<input type="time" value={window.startTime} onChange={(event) => updateWindow(index, "startTime", event.target.value)} required /></label>
        <label>End<input type="time" value={window.endTime} onChange={(event) => updateWindow(index, "endTime", event.target.value)} required /></label>
        <label>Slot minutes<input type="number" min="5" max="480" value={window.slotDurationMinutes} onChange={(event) => updateWindow(index, "slotDurationMinutes", event.target.value)} required /></label>
      </div>)}
      <div><button type="button" className="outline-button" onClick={() => setWindows((current) => [...current, emptyWindow()])}>Add window</button> <button type="submit" className="primary-button" disabled={saving}>{saving ? "Saving…" : "Save availability"}</button></div>
    </form>}
  </div></DashboardLayout>;
}

export default DoctorAvailability;
