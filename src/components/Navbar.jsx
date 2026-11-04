import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import logoMark from "../assets/logo-mark.png";
import { useAuth } from "../context/useAuth";

function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  // Synchronize menu state when location changes during render
  const [prevPath, setPrevPath] = useState(location.pathname);
  if (prevPath !== location.pathname) {
    setPrevPath(location.pathname);
    setMenuOpen(false);
  }

  const getDashboardPath = () => {
    if (user?.role === "doctor") return "/doctor/dashboard";
    if (user?.role === "admin") return "/admin/dashboard";
    return "/patient/dashboard";
  };

  const toggleMenu = () => {
    setMenuOpen((prev) => !prev);
  };

  return (
    <header className="navbar appointer-navbar">
      <div className="navbar-header-row">
        <Link to="/" className="logo" aria-label="Appointer home" onClick={() => setMenuOpen(false)}>
          <span className="logo-mark">
            <img src={logoMark} alt="Appointer symbol" className="app-logo" />
          </span>
          <span>Appointer</span>
        </Link>

        {/* Mobile Hamburger / Close Button */}
        <button
          type="button"
          className={`mobile-menu-toggle ${menuOpen ? "open" : ""}`}
          onClick={toggleMenu}
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen}
        >
          <span className="hamburger-bar"></span>
          <span className="hamburger-bar"></span>
          <span className="hamburger-bar"></span>
        </button>
      </div>

      {/* Desktop Main Navigation */}
      <nav className="desktop-nav" aria-label="Main navigation">
        <Link to="/doctors">Find doctors</Link>
        <Link to="/ai-doctor-finder">AI Doctor Finder</Link>
        <Link to="/ai-assistant">AI Assistant</Link>
        <Link to="/doctor/login" className="provider-link">For providers</Link>
      </nav>

      {/* Desktop Actions */}
      <div className="nav-actions desktop-actions">
        {isAuthenticated ? (
          <>
            <Link
              to={getDashboardPath()}
              className="nav-link-user"
              style={{ fontWeight: 600, color: "var(--navy-900, #0f172a)" }}
            >
              {user?.name || "Dashboard"} ({user?.role})
            </Link>
            <button
              type="button"
              onClick={logout}
              className="outline-button"
              style={{ padding: "8px 16px", fontSize: "0.85rem", cursor: "pointer" }}
            >
              Sign out
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="login-link">Log in</Link>
            <Link to="/register" className="register-button">
              Get started
            </Link>
          </>
        )}
      </div>

      {/* Mobile Dropdown Menu Drawer */}
      <div className={`mobile-nav-drawer ${menuOpen ? "open" : ""}`} aria-hidden={!menuOpen}>
        <nav className="mobile-nav-links" aria-label="Mobile navigation">
          <Link to="/doctors" onClick={() => setMenuOpen(false)}>
            🔍 Find doctors
          </Link>
          <Link to="/ai-doctor-finder" onClick={() => setMenuOpen(false)}>
            ✨ AI Doctor Finder
          </Link>
          <Link to="/ai-assistant" onClick={() => setMenuOpen(false)}>
            💬 AI Assistant
          </Link>
          <Link to="/doctor/login" onClick={() => setMenuOpen(false)} className="mobile-provider-link">
            🩺 For healthcare providers
          </Link>
        </nav>

        <div className="mobile-nav-divider" />

        <div className="mobile-nav-actions">
          {isAuthenticated ? (
            <>
              <Link
                to={getDashboardPath()}
                className="mobile-dashboard-link"
                onClick={() => setMenuOpen(false)}
              >
                👤 {user?.name || "My Dashboard"} ({user?.role})
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                }}
                className="outline-button mobile-signout-button"
              >
                Sign out
              </button>
            </>
          ) : (
            <div className="mobile-auth-buttons">
              <Link
                to="/login"
                className="outline-button mobile-login-button"
                onClick={() => setMenuOpen(false)}
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="primary-button mobile-register-button"
                onClick={() => setMenuOpen(false)}
              >
                Get started
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
