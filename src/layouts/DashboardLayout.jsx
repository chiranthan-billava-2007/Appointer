import { Link, NavLink } from "react-router-dom";
import logoMark from "../assets/logo-mark.png";
import { useAuth } from "../context/useAuth";

function DashboardLayout({ role, children }) {
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
          ["/doctor/availability", "Availability"],
        ]
      : [
          ["/admin/dashboard", "Overview"],
          ["/admin/users", "Users"],
          ["/admin/reports", "Reports"],
        ];

  return (
    <div className="dashboard-layout">
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand-wrapper">
          <Link to="/" className="dashboard-brand" aria-label="Appointer home">
            <span className="dashboard-logo-mark">
              <img src={logoMark} alt="Appointer logo" className="dashboard-logo-img" />
            </span>
            <span>Appointer</span>
          </Link>
          <span className="sidebar-badge">{role} portal</span>
        </div>
        <p className="sidebar-label">{role} portal</p>
        <nav className="dashboard-nav-container">
          {links.map(([to, label]) => (
            <NavLink
              className={({ isActive }) => `dashboard-nav-link ${isActive ? "active" : ""}`}
              to={to}
              key={label}
            >
              {label}
            </NavLink>
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
