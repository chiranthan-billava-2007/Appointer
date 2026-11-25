import { Link } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import { api } from "../services/api";
import { appointmentDateTime, statusClass } from "../utils/appointmentDisplay";
import { useAppointmentRealtime } from "../hooks/useAppointmentRealtime";

function PatientDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setError("");
    try { setDashboard(await api.getDashboard()); } catch (err) { setError(err.message || "Could not load your appointments."); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(load, 0); return () => window.clearTimeout(timer); }, [load]);
  useAppointmentRealtime(load);
  const nextAppointment = dashboard?.upcomingAppointments[0];
  const stats = dashboard?.stats;
  return (
    <DashboardLayout role="patient">
      <div className="dashboard-page">
        <p className="eyebrow">PATIENT DASHBOARD</p>
        <h1>Your care overview</h1>
        <p className="muted">Welcome back. Here’s what’s happening with your appointments.</p>

        <div className="stats-grid">
          <div>
            <span>Upcoming appointments</span>
            <strong>{stats?.upcoming ?? "—"}</strong>
          </div>
          <div>
            <span>Completed visits</span>
            <strong>{stats?.completed ?? "—"}</strong>
          </div>
          <div>
            <span>Cancelled appointments</span>
            <strong>{stats?.cancelled ?? "—"}</strong>
          </div>
        </div>

        <div className="dashboard-columns">
          <section className="dashboard-panel">
            <div className="panel-heading">
              <h2>Next appointment</h2>
              <Link to="/patient/appointments" className="section-link">
                View all
              </Link>
            </div>
            {error && <p className="dashboard-error" role="alert">{error}</p>}
            {!dashboard && <p className="muted">Loading your care overview…</p>}
            {dashboard && !nextAppointment && <p className="muted">No upcoming appointments. Find a doctor to book your next visit.</p>}
            {nextAppointment && <div className="appointment-row">
              <span className="listing-avatar">AS</span>
              <div>
                <h3>{nextAppointment.doctorName}</h3>
                <p>{nextAppointment.specialty} · {appointmentDateTime(nextAppointment)}</p>
                <small>{nextAppointment.clinicName}</small>
              </div>
              <span className={`status-pill ${statusClass(nextAppointment.status)}`}>{nextAppointment.status}</span>
              <Link to="/patient/appointments" className="outline-button">
                Details
              </Link>
            </div>}
          </section>

          <section className="dashboard-panel">
            <h2>Quick actions</h2>
            <div className="quick-actions">
              <Link to="/doctors">Find a doctor →</Link>
              <Link to="/patient/appointments">Manage appointments →</Link>
              <Link to="/ai-assistant">Ask the assistant →</Link>
            </div>
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default PatientDashboard;
