import { useRef } from "react";
import { Link } from "react-router-dom";
import logoMark from "../assets/logo-mark.png";
import doctorHero from "../assets/doctor-hero.png";
import "../App.css";

const specialties = [
  ["🩺", "General physician", "Everyday care", "#e8f7fb"], ["🦷", "Dentist", "Teeth & gums", "#fff0e9"],
  ["💊", "Dermatologist", "Skin & hair", "#f2efff"], ["♡", "Cardiologist", "Heart health", "#eaf8f1"],
  ["◉", "Eye specialist", "Vision & eyes", "#fff8e7"], ["✿", "Gynecologist", "Women's health", "#fff0f5"],
];
const doctors = [
  ["AS", "Dr. Ananya Sharma", "Dermatologist", "ClearSkin Dermatology Clinic", "₹600", "Indiranagar"], ["RM", "Dr. Rohan Mehta", "Dentist", "Bright Smile Dental Care", "₹500", "Koramangala"], ["KN", "Dr. Kavya Nair", "General physician", "WellSpring Family Clinic", "₹700", "Jayanagar"], ["AR", "Dr. Arjun Rao", "Cardiologist", "HeartFirst Cardiac Centre", "₹850", "HSR Layout"], ["MI", "Dr. Meera Iyer", "Eye specialist", "Vision Care Eye Clinic", "₹650", "Whitefield"], ["NK", "Dr. Nisha Kapoor", "Gynecologist", "Bloom Women's Health", "₹750", "Indiranagar"],
];

const orbitPoints = Array.from({ length: 64 }, (_, index) => {
  const angle = index * 0.72;
  const radius = 7 + index * 0.72;
  return {
  left: `${50 + Math.cos(angle) * radius}%`,
  top: `${50 + Math.sin(angle) * radius * 0.72}%`,
  delay: `${(index % 8) * -0.45}s`,
  size: `${index % 9 === 0 ? 4 : index % 3 === 0 ? 3 : 2}px`,
  };
});

function InteractiveCareOrbit() {
  const orbitRef = useRef(null);

  function handlePointerMove(event) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
    const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
    orbitRef.current?.style.setProperty("--pointer-x", `${x * 18}px`);
    orbitRef.current?.style.setProperty("--pointer-y", `${y * 18}px`);
  }

  function resetPointer() {
    orbitRef.current?.style.setProperty("--pointer-x", "0px");
    orbitRef.current?.style.setProperty("--pointer-y", "0px");
  }

  return <section className="care-orbit" ref={orbitRef} onPointerMove={handlePointerMove} onPointerLeave={resetPointer} aria-label="Interactive care network">
    <div className="orbit-copy"><p className="eyebrow">A CONNECTED CARE EXPERIENCE</p><h2>Every care journey<br /><span>starts with a connection.</span></h2><p>Move your pointer across the network to explore the people and support around your health.</p><Link to="/doctors" className="orbit-button">Explore care network →</Link></div>
    <div className="orbit-visual"><div className="orbit-ring ring-one" /><div className="orbit-ring ring-two" /><div className="orbit-core">✚</div>{orbitPoints.map((point, index) => <span className="orbit-point" key={index} style={{ left: point.left, top: point.top, animationDelay: point.delay, width: point.size, height: point.size }} />)}</div>
  </section>;
}

function Home() {
  return <div className="app redesigned-home">
    <header className="navbar"><Link to="/" className="logo" aria-label="Appointer home"><span className="logo-mark"><img src={logoMark} alt="Appointer symbol" className="app-logo" /></span><span>Appointer</span></Link><nav aria-label="Main navigation"><Link to="/doctors">Find doctors</Link><Link to="/ai-doctor-finder">AI Doctor Finder</Link><Link to="/ai-assistant">AI Assistant</Link><Link to="/doctors">Health articles</Link></nav><div className="nav-actions"><span className="provider-link">For providers</span><Link to="/login">Log in</Link><Link to="/register" className="register-button">Get started</Link></div></header>
    <main>
      <section className="reference-hero"><div className="reference-hero-copy"><p className="eyebrow">✳ &nbsp; CARE THAT WORKS AROUND YOU</p><h1>Your health,<br /><span>in good hands.</span></h1><p className="description">Find the right doctor and book an appointment, all in one place.</p><div className="doctor-search"><div><small>⌖ &nbsp; Location</small><strong>Bengaluru</strong></div><div><small>⌕ &nbsp; Find a doctor</small><strong>Speciality, doctor or clinic</strong></div><Link to="/doctors" className="primary-button">⌕ &nbsp; Search</Link></div><p className="popular-searches">Popular: &nbsp; Dentist &nbsp; Dermatologist &nbsp; General physician</p></div><div className="doctor-hero-art"><img src={doctorHero} alt="Friendly doctor illustration" /><div className="floating-rating">★ &nbsp; <strong>4.9/5</strong><small>Patient rating</small></div><div className="floating-care"><span>✓</span><div><strong>Care, made easy</strong><small>Appointments that fit your day</small></div></div></div></section>
      <section className="trust-strip"><span>♧ &nbsp; Verified doctors</span><span>◷ &nbsp; Easy appointment booking</span><span>♡ &nbsp; Care you can count on</span></section>
      <InteractiveCareOrbit />
      <section className="home-section specialty-section"><div className="section-heading"><div><p className="eyebrow">HERE FOR EVERY YOU</p><h2>What are you looking for?</h2></div><Link to="/doctors" className="section-link">Explore all doctors →</Link></div><div className="specialty-grid">{specialties.map(([icon, name, detail, color]) => <Link to="/doctors" className="specialty-card" style={{ "--card-color": color }} key={name}><span>{icon}</span><strong>{name}</strong><small>{detail}</small></Link>)}</div></section>
      <section className="home-section doctor-section"><div className="section-heading"><div><p className="eyebrow">PERSONALIZED FOR YOU</p><h2>Doctors you can count on</h2><p className="section-note">Top-rated doctors in Bengaluru</p></div><Link to="/doctors" className="section-link">Refine your search ↗</Link></div><div className="filter-row"><button className="filter active">All doctors</button><button className="filter">Available today</button><button className="filter">Top rated</button></div><div className="doctor-grid">{doctors.map(([initials, name, specialty, clinic, fee, area]) => <article className="doctor-card" key={name}><div className="doctor-card-head"><span className="doctor-avatar">{initials}</span><div><h3>{name}</h3><p>{specialty} · 10 years experience</p></div></div><p className="doctor-rating">★ 4.9 &nbsp; <small>248 patient reviews</small></p><hr /><strong>{clinic}</strong><p>{area} · Available today</p><div className="doctor-card-foot"><div><b>{fee}</b><small>Consultation fee</small></div><Link to="/doctors/1" className="outline-button">Book appointment</Link></div></article>)}</div></section>
      <section className="home-cta"><div><p className="eyebrow">CARE, ON YOUR TERMS</p><h2>Good care starts<br />with a good connection.</h2><p>From finding a specialist to choosing a time that works, your next step is simple.</p><Link to="/doctors" className="primary-button">Find your doctor →</Link></div><div className="cta-heart">♡</div></section>
    </main>
    <footer className="footer reference-footer"><section className="team-section"><p className="eyebrow">THE TEAM</p><h2>Meet Our Team</h2><p>Building Appointer together.</p><div className="team-members"><span><b>C</b>Chiranthan<small>USN: 1WA25CS061</small></span><span><b>CUK</b>Chirag Uday Kawari<small>USN: 1WA25CS060</small></span><span><b>CL</b>Charuvaka L<small>USN: 1WA25CS059</small></span><span><b>JDS</b>Jay Deepakakumar Salunke<small>USN: 1WA25CS099</small></span></div></section><div className="footer-bottom"><span>APPOINTER</span><span>Full Stack Web Development Project</span><span>© 2026 Appointer. All rights reserved.</span></div></footer>
  </div>;
}
export default Home;
