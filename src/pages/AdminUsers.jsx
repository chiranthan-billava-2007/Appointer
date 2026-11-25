import { useCallback, useEffect, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import { api } from "../services/api";

function AdminUsers() {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setError("");
    try { setDashboard(await api.getDashboard()); } catch (err) { setError(err.message || "Could not load user totals."); }
  }, []);

  useEffect(() => { const timer = window.setTimeout(load, 0); return () => window.clearTimeout(timer); }, [load]);

  return (
    <DashboardLayout role="admin">
      <div className="dashboard-page">
        <p className="eyebrow">ADMIN PORTAL</p>
        <h1>Users</h1>
        <p className="muted">A quick view of registered patients and doctors.</p>
        {error && <p className="dashboard-error" role="alert">{error}</p>}
        {!dashboard && !error && <p className="muted">Loading user totals…</p>}
        {dashboard && <>
          <div className="stats-grid">
            <div><span>Registered patients</span><strong>{dashboard.stats.patients}</strong></div>
            <div><span>Registered doctors</span><strong>{dashboard.stats.doctors}</strong></div>
          </div>
          <section className="dashboard-panel wide-panel">
            <div className="panel-heading"><h2>Registered users</h2><span className="muted">Latest 100</span></div>
            {dashboard.users.length === 0 && <p className="muted">No users registered yet.</p>}
            {dashboard.users.map((registeredUser) => (
              <div className="activity-table" key={registeredUser._id}>
                <b>{registeredUser.name}</b>
                <span>{registeredUser.email} · {registeredUser.role}</span>
              </div>
            ))}
          </section>
        </>}
      </div>
    </DashboardLayout>
  );
}

export default AdminUsers;
