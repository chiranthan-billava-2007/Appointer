import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PublicLayout from "../layouts/PublicLayout";

const doctors = [
  ["Dr. Ananya Sharma", "Dermatologist"], ["Dr. Rohan Mehta", "Dentist"], ["Dr. Kavya Nair", "General physician"],
  ["Dr. Arjun Rao", "Cardiologist"], ["Dr. Meera Iyer", "Eye specialist"], ["Dr. Nisha Kapoor", "Gynecologist"],
];

function FindDoctors() {
  const [query, setQuery] = useState("");
  const [specialty, setSpecialty] = useState("All specialties");
  const filteredDoctors = useMemo(() => doctors.filter(([name, type]) => {
    const matchesQuery = `${name} ${type}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (specialty === "All specialties" || type === specialty);
  }), [query, specialty]);

  return <PublicLayout><section className="page-hero"><p className="eyebrow">FIND YOUR CARE TEAM</p><h1>Find the right doctor for you.</h1><p>Browse specialists, compare care options, and choose an appointment that fits your day.</p><div className="page-search"><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search by doctor or specialty" aria-label="Search doctors" /><select value={specialty} onChange={event => setSpecialty(event.target.value)} aria-label="Specialty"><option>All specialties</option>{doctors.map(([, type]) => <option key={type}>{type}</option>)}</select><button className="primary-button" type="button">Search</button></div></section><section className="listing-section"><div className="listing-heading"><div><p className="eyebrow">TOP RATED CARE</p><h2>Doctors near you</h2></div><span>{filteredDoctors.length} doctors available</span></div>{filteredDoctors.length ? <div className="doctor-list-grid">{filteredDoctors.map(([name, type], index) => <article className="listing-card" key={name}><div className="listing-avatar">{name.split(" ").slice(-2).map(word => word[0]).join("")}</div><h3>{name}</h3><p>{type}</p><p className="muted">★ 4.9 · {120 + index * 34} patient reviews</p><hr /><small>Available today · Bengaluru</small><Link to={`/doctors/${index + 1}`} className="outline-button">View profile</Link></article>)}</div> : <div className="empty-state"><h3>No doctors found</h3><p>Try another name or specialty.</p><button type="button" className="outline-button" onClick={() => { setQuery(""); setSpecialty("All specialties"); }}>Clear filters</button></div>}</section></PublicLayout>;
}

export default FindDoctors;
