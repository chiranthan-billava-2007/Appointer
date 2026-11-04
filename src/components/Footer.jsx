import { Link } from "react-router-dom";
import logoMark from "../assets/logo-mark.png";

function Footer() {
  return (
    <footer className="footer simple-footer">
      <Link to="/" className="footer-brand" aria-label="Appointer home">
        <span className="footer-logo-mark">
          <img src={logoMark} alt="Appointer logo" className="footer-logo-img" />
        </span>
        <span>Appointer</span>
      </Link>
      <p>Healthcare appointments, made simpler.</p>
      <div>
        <Link to="/doctors">Find Doctors</Link>
        <Link to="/login">Login</Link>
        <Link to="/register">Register</Link>
      </div>
      <small>© 2026 Appointer. All rights reserved.</small>
    </footer>
  );
}

export default Footer;
