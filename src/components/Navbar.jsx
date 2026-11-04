import { Link } from "react-router-dom";
import logoMark from "../assets/logo-mark.png";
import { useAuth } from "../context/useAuth";

function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();

  const getDashboardPath = () => {
    if (user?.role === "doctor") return "/doctor/dashboard";
    if (user?.role === "admin") return "/admin/dashboard";
    return "/patient/dashboard";
  };

  return (
    <header className="navbar appointer-navbar">
      <Link to="/" className="logo" aria-label="Appointer home">
        <span className="logo-mark">
          <img src={logoMark} alt="Appointer symbol" className="app-logo" />
        </span>
        <span>Appointer</span>
      </Link>
      <nav aria-label="Main navigation">
        <Link to="/doctors">Find doctors</Link>
        <Link to="/ai-doctor-finder">AI Doctor Finder</Link>
        <Link to="/ai-assistant">AI Assistant</Link>
      </nav>
      <div className="nav-actions">
        {isAuthenticated ? (
          <>
            <Link to={getDashboardPath()} className="nav-link-user" style={{ fontWeight: 500, color: "var(--navy-900, #0f172a)" }}>
              {user?.name || "Dashboard"} ({user?.role})
            </Link>
            <button
              type="button"
              onClick={logout}
              className="outline-button"
              style={{ padding: "6px 14px", fontSize: "0.85rem", cursor: "pointer" }}
            >
              Sign out
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Log in</Link>
            <Link to="/register" className="register-button">
              Get started
            </Link>
          </>
        )}
      </div>
    </header>
  );
}

export default Navbar;
