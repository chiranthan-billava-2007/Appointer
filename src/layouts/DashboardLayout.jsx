import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";

function DashboardLayout({ role, children }) {
  const location = useLocation();
  const { user, logout } = useAuth();

  const links =
    role === "patient"
      ? [
          ["/patient/dashboard", "Overview"],
          ["/patient/appointments", "My appointments"],
          ["/doctors", "Find a doctor"],
        ]
      : role === "doctor"
      ? [
          ["/doctor/dashboard", "Overview"],
          ["/doctor/dashboard", "Appointments"],
          ["/doctor/dashboard", "Availability"],
        ]
      : [
          ["/admin/dashboard", "Overview"],
          ["/admin/dashboard", "Users"],
          ["/admin/dashboard", "Reports"],
        ];

  return (
    <div className="dashboard-layout">
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand-wrapper">
          <Link to="/" className="dashboard-brand">✚ Appointer</Link>
          <span className="sidebar-badge">{role} portal</span>
        </div>
        <p className="sidebar-label">{role} portal</p>
        <nav className="dashboard-nav-container">
          {links.map(([to, label]) => (
            <Link
              className={`dashboard-nav-link ${location.pathname === to ? "active" : ""}`}
              to={to}
              key={label}
            >
              {label}
            </Link>
          ))}
          <Link to="/" className="sidebar-home-mobile">← Home</Link>
        </nav>
        <Link to="/" className="sidebar-home">← Back to home</Link>
      </aside>
      <section className="dashboard-content">
        <header className="dashboard-topbar">
          <div className="dashboard-user-greeting">
            <span>Welcome, <strong>{user?.name || "User"}</strong></span>
          </div>
          <button
            type="button"
            onClick={logout}
            className="dashboard-signout-btn"
          >
            Sign out
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

export default DashboardLayout;
