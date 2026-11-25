import { useCallback, useEffect, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import { api } from "../services/api";
import { appointmentDateTime } from "../utils/appointmentDisplay";
import { useAppointmentRealtime } from "../hooks/useAppointmentRealtime";

function AdminDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const load = useCallback(async () => {
    setError("");
    try { setDashboard(await api.getDashboard()); } catch (err) { setError(err.message || "Could not load platform data."); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(load, 0); return () => window.clearTimeout(timer); }, [load]);
  useAppointmentRealtime(load);
  const updateStatus = async (id, status) => {
    setBusyId(id); setError("");
    try { await api.updateAppointmentStatus(id, status); await load(); } catch (err) { setError(err.message || "Status update failed."); } finally { setBusyId(""); }
  };
  const cancelAppointment = async (id) => {
    setBusyId(id); setError("");
    try { await api.cancelAppointment(id); await load(); } catch (err) { setError(err.message || "Cancellation failed."); } finally { setBusyId(""); }
  };
  const stats = dashboard?.stats;
  return (
    <DashboardLayout role="admin">
      <div className="dashboard-page">
        <p className="eyebrow">ADMIN PORTAL</p>
        <h1>Platform overview</h1>
        <p className="muted">Monitor the Appointer experience as it grows.</p>

        <div className="stats-grid">
          <div>
            <span>Registered patients</span>
            <strong>{stats?.patients ?? "—"}</strong>
          </div>
          <div>
            <span>Verified doctors</span>
            <strong>{stats?.doctors ?? "—"}</strong>
          </div>
          <div>
            <span>Total appointments</span>
            <strong>{stats?.totalAppointments ?? "—"}</strong>
          </div>
        </div>

        {error && <p className="dashboard-error" role="alert">{error}</p>}
        {dashboard && <p className="muted">{stats.upcoming} pending · {stats.completed} completed · {stats.cancelled} cancelled</p>}

        <section className="dashboard-panel wide-panel">
          <div className="panel-heading">
            <h2>Recent platform activity</h2>
            <span className="muted">Latest 20 appointments</span>
          </div>
          <div className="activity-table">
            {!dashboard && <p className="muted">Loading platform activity…</p>}
            {dashboard?.recentAppointments.length === 0 && <p className="muted">No appointments yet.</p>}
            {dashboard?.recentAppointments.map((appointment) => <div key={appointment._id}>
              <b>{appointment.patientName} with {appointment.doctorName}</b>
              <span>{appointmentDateTime(appointment)} · {appointment.specialty}</span>
              {appointment.status === "upcoming" ? <span className="appointment-actions"><button className="outline-button" disabled={busyId === appointment._id} onClick={() => updateStatus(appointment._id, "completed")}>Mark completed</button><button className="text-button" disabled={busyId === appointment._id} onClick={() => cancelAppointment(appointment._id)}>Cancel</button></span> : <em className={appointment.status === "completed" ? "success" : ""}>{appointment.status}</em>}
            </div>)}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}

export default AdminDashboard;
