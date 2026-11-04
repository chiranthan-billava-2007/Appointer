import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PublicLayout from "../layouts/PublicLayout";
import { api } from "../services/api";

const specialtiesList = [
  "All specialties",
  "Dermatologist",
  "Dentist",
  "General physician",
  "Cardiologist",
  "Eye specialist",
  "Gynecologist",
];

function FindDoctors() {
  const [searchParams] = useSearchParams();
  const urlSpecialty = searchParams.get("specialty") || "All specialties";
  const urlQuery = searchParams.get("search") || "";

  const [query, setQuery] = useState(urlQuery);
  const [specialty, setSpecialty] = useState(urlSpecialty);
  const [doctorsList, setDoctorsList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    api.getDoctors(query, specialty)
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          setDoctorsList(data);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch doctors:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [query, specialty]);

  return (
    <PublicLayout>
      <section className="page-hero">
        <p className="eyebrow">FIND YOUR CARE TEAM</p>
        <h1>Find the right doctor for you.</h1>
        <p>Browse specialists, compare care options, and choose an appointment that fits your day.</p>
        <div className="page-search">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by doctor or specialty"
            aria-label="Search doctors"
          />
          <select
            value={specialty}
            onChange={(event) => setSpecialty(event.target.value)}
            aria-label="Specialty"
          >
            {specialtiesList.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <button className="primary-button" type="button">
            Search
          </button>
        </div>
      </section>

      <section className="listing-section">
        <div className="listing-heading">
          <div>
            <p className="eyebrow">TOP RATED CARE</p>
            <h2>Doctors near you</h2>
          </div>
          <span>{loading ? "Searching..." : `${doctorsList.length} doctors available`}</span>
        </div>

        {doctorsList.length ? (
          <div className="doctor-list-grid">
            {doctorsList.map((doc, index) => {
              const initials = doc.name
                ? doc.name.split(" ").slice(-2).map((w) => w[0]).join("")
                : "DR";
              const docId = doc._id || index + 1;

              return (
                <article className="listing-card" key={docId}>
                  <div className="listing-avatar">{initials}</div>
                  <h3>{doc.name}</h3>
                  <p>{doc.specialty}</p>
                  <p className="muted">
                    ★ {doc.rating || 4.9} · {doc.reviewsCount || 120 + index * 34} patient reviews
                  </p>
                  <hr />
                  <small>Available today · {doc.location || "Bengaluru"}</small>
                  <Link to={`/doctors/${docId}`} className="outline-button">
                    View profile
                  </Link>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <h3>No doctors found</h3>
            <p>Try another name or specialty.</p>
            <button
              type="button"
              className="outline-button"
              onClick={() => {
                setQuery("");
                setSpecialty("All specialties");
              }}
            >
              Clear filters
            </button>
          </div>
        )}
      </section>
    </PublicLayout>
  );
}

export default FindDoctors;
