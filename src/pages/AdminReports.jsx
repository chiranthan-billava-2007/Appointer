import { useCallback, useEffect, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import { api } from "../services/api";
import { appointmentDateTime } from "../utils/appointmentDisplay";

function AdminReports() {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setError("");
    try { setDashboard(await api.getDashboard()); } catch (err) { setError(err.message || "Could not load reports."); }
  }, []);

  useEffect(() => { const timer = window.setTimeout(load, 0); return () => window.clearTimeout(timer); }, [load]);

  return (
    <DashboardLayout role="admin">
      <div className="dashboard-page">
        <p className="eyebrow">ADMIN PORTAL</p>
        <h1>Reports</h1>
        <p className="muted">Appointment activity and current platform totals.</p>
        {error && <p className="dashboard-error" role="alert">{error}</p>}
        {!dashboard && !error && <p className="muted">Loading reports…</p>}
        {dashboard && <>
          <div className="stats-grid">
            <div><span>Total appointments</span><strong>{dashboard.stats.totalAppointments}</strong></div>
            <div><span>Pending</span><strong>{dashboard.stats.upcoming}</strong></div>
            <div><span>Completed</span><strong>{dashboard.stats.completed}</strong></div>
            <div><span>Cancelled</span><strong>{dashboard.stats.cancelled}</strong></div>
          </div>
          <section className="dashboard-panel wide-panel">
            <div className="panel-heading"><h2>Recent appointments</h2><span className="muted">Latest 20</span></div>
            {dashboard.recentAppointments.length === 0 && <p className="muted">No appointments yet.</p>}
            {dashboard.recentAppointments.map((appointment) => (
              <div className="activity-table" key={appointment._id}>
                <b>{appointment.patientName} with {appointment.doctorName}</b>
                <span>{appointmentDateTime(appointment)} · {appointment.status}</span>
              </div>
            ))}
          </section>
        </>}
      </div>
    </DashboardLayout>
  );
}

export default AdminReports;
