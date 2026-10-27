import { Link } from "react-router-dom";
import logoMark from "../assets/logo-mark.png";

function Navbar() {
  return <header className="navbar appointer-navbar">
    <Link to="/" className="logo" aria-label="Appointer home"><span className="logo-mark"><img src={logoMark} alt="Appointer symbol" className="app-logo" /></span><span>Appointer</span></Link>
    <nav aria-label="Main navigation"><Link to="/doctors">Find doctors</Link><Link to="/ai-doctor-finder">AI Doctor Finder</Link><Link to="/ai-assistant">AI Assistant</Link></nav>
    <div className="nav-actions"><Link to="/login">Log in</Link><Link to="/register" className="register-button">Get started</Link></div>
  </header>;
}

export default Navbar;
