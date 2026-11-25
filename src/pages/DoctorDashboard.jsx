import { useCallback, useEffect, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import { useAuth } from "../context/useAuth";
import { api } from "../services/api";
import { appointmentDateTime, initials, statusClass } from "../utils/appointmentDisplay";
import { useAppointmentRealtime } from "../hooks/useAppointmentRealtime";

function DoctorDashboard() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const load = useCallback(async () => {
    setError("");
    try { setDashboard(await api.getDashboard()); } catch (err) { setError(err.message || "Could not load your schedule."); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(load, 0); return () => window.clearTimeout(timer); }, [load]);
  useAppointmentRealtime(load);
  const setStatus = async (id, status) => {
    setBusyId(id); setError("");
    try { await api.updateAppointmentStatus(id, status); await load(); } catch (err) { setError(err.message || "Status update failed."); } finally { setBusyId(""); }
  };
  const cancelAppointment = (id) => setStatus(id, "cancelled");
  const stats = dashboard?.stats;
  const upcoming = dashboard?.appointments.filter((appointment) => appointment.status === "upcoming") || [];
  return <DashboardLayout role="doctor"><div className="dashboard-page">
    <p className="eyebrow">DOCTOR PORTAL</p><h1>Welcome, {user?.name || "Doctor"}</h1>
    <p className="muted">Your practice schedule is shown in {dashboard?.timezone || "your configured timezone"}.</p>
    <div className="stats-grid"><div><span>Today’s appointments</span><strong>{stats?.today ?? "—"}</strong></div><div><span>Upcoming appointments</span><strong>{stats?.upcoming ?? "—"}</strong></div><div><span>Completed appointments</span><strong>{stats?.completed ?? "—"}</strong></div></div>
    {error && <p className="dashboard-error" role="alert">{error}</p>}
    <section className="dashboard-panel wide-panel"><div className="panel-heading"><h2>Today’s schedule</h2><span className="muted">{stats?.cancelled ?? 0} cancelled</span></div>
      {!dashboard && <p className="muted">Loading your schedule…</p>}{dashboard?.todayAppointments.length === 0 && <p className="muted">No appointments scheduled today.</p>}
      {dashboard?.todayAppointments.map((appointment) => <AppointmentRow key={appointment._id} appointment={appointment} busy={busyId === appointment._id} onComplete={() => setStatus(appointment._id, "completed")} onCancel={() => cancelAppointment(appointment._id)} />)}
    </section>
    <section className="dashboard-panel wide-panel"><div className="panel-heading"><h2>Upcoming appointments</h2><span className="muted">{upcoming.length} scheduled</span></div>
      {dashboard && upcoming.length === 0 && <p className="muted">No upcoming appointments.</p>}{upcoming.slice(0, 12).map((appointment) => <AppointmentRow key={appointment._id} appointment={appointment} busy={busyId === appointment._id} onComplete={() => setStatus(appointment._id, "completed")} onCancel={() => cancelAppointment(appointment._id)} />)}
    </section>
    <section className="dashboard-panel wide-panel"><div className="panel-heading"><h2>Appointment history</h2><span className="muted">Completed and cancelled</span></div>
      {dashboard && dashboard.appointments.filter((appointment) => appointment.status !== "upcoming").length === 0 && <p className="muted">No past appointments yet.</p>}
      {dashboard?.appointments.filter((appointment) => appointment.status !== "upcoming").map((appointment) => <AppointmentRow key={appointment._id} appointment={appointment} busy={busyId === appointment._id} />)}
    </section>
  </div></DashboardLayout>;
}

function AppointmentRow({ appointment, busy, onComplete, onCancel }) {
  return <div className="schedule-row"><strong>{appointmentDateTime(appointment)}</strong><span className="listing-avatar">{initials(appointment.patientName)}</span><div><h3>{appointment.patientName}</h3><p>{appointment.patientEmail}{appointment.notes ? ` · ${appointment.notes}` : ""}</p></div><span className={`status-pill ${statusClass(appointment.status)}`}>{appointment.status}</span>{appointment.status === "upcoming" && <><button type="button" className="outline-button" disabled={busy} onClick={onComplete}>Complete</button><button type="button" className="text-button" disabled={busy} onClick={onCancel}>Cancel</button></>}</div>;
}

export default DoctorDashboard;
