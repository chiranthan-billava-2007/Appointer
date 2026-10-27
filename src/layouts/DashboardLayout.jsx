import { Link, useLocation } from "react-router-dom";

function DashboardLayout({ role, children }) {
  const location = useLocation();
  const links = role === "patient" ? [["/patient/dashboard", "Overview"], ["/patient/appointments", "My appointments"], ["/doctors", "Find a doctor"]] : role === "doctor" ? [["/doctor/dashboard", "Overview"], ["/doctor/dashboard", "Appointments"], ["/doctor/dashboard", "Availability"]] : [["/admin/dashboard", "Overview"], ["/admin/dashboard", "Users"], ["/admin/dashboard", "Reports"]];
  return <div className="dashboard-layout"><aside className="dashboard-sidebar"><Link to="/" className="dashboard-brand">✚ Appointer</Link><p className="sidebar-label">{role} portal</p><nav>{links.map(([to, label]) => <Link className={location.pathname === to ? "active" : ""} to={to} key={label}>{label}</Link>)}</nav><Link to="/" className="sidebar-home">← Back to home</Link></aside><section className="dashboard-content"><header className="dashboard-topbar"><span>Good morning</span><Link to="/login">Sign out</Link></header>{children}</section></div>;
}

export default DashboardLayout;
