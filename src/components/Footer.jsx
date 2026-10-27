import { Link } from "react-router-dom";

function Footer() {
  return <footer className="footer simple-footer"><Link to="/" className="footer-brand">Appointer</Link><p>Healthcare appointments, made simpler.</p><div><Link to="/doctors">Find Doctors</Link><Link to="/login">Login</Link><Link to="/register">Register</Link></div><small>© 2026 Appointer. All rights reserved.</small></footer>;
}

export default Footer;
