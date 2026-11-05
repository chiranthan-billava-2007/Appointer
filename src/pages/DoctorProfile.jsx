import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PublicLayout from "../layouts/PublicLayout";
import { api } from "../services/api";

function DoctorProfile() {
  const { id = "1" } = useParams();
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError("");

    api.getDoctorById(id)
      .then((data) => {
        if (isMounted) {
          setDoctor(data);
          if (data.availableSlots && data.availableSlots.length > 0) {
            setSelectedSlot(data.availableSlots[0]);
          }
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || "Failed to load doctor profile");
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <PublicLayout>
        <div style={{ textAlign: "center", padding: "80px 20px" }}>
          <p style={{ color: "#64748b" }}>Loading doctor profile...</p>
        </div>
      </PublicLayout>
    );
  }

  if (error || !doctor) {
    return (
      <PublicLayout>
        <div style={{ textAlign: "center", padding: "80px 20px" }}>
          <h2>Doctor Not Found</h2>
          <p style={{ color: "#d9534f" }}>{error || "Could not retrieve doctor details."}</p>
          <Link to="/doctors" className="outline-button" style={{ marginTop: "16px" }}>
            ← Back to Doctors
          </Link>
        </div>
      </PublicLayout>
    );
  }

  const initials = doctor.name
    ? doctor.name.split(" ").slice(-2).map((w) => w[0]).join("")
    : "DR";

  return (
    <PublicLayout>
      <section className="profile-page">
        <Link to="/doctors" className="back-link">
          ← Back to doctors
        </Link>
        <div className="profile-card">
          <div className="profile-avatar">{initials}</div>
          <div className="profile-intro">
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <p className="eyebrow" style={{ margin: 0 }}>
                DOCTOR PROFILE · #{doctor._id || id}
              </p>
              {doctor.isDemo && (
                <span
                  style={{
                    fontSize: "11px",
                    background: "#fef3c7",
                    color: "#92400e",
                    padding: "2px 8px",
                    borderRadius: "12px",
                    fontWeight: "600",
                    border: "1px solid #fde68a",
                  }}
                >
                  Fictional Demo Record
                </span>
              )}
            </div>
            <h1 style={{ marginTop: "6px" }}>{doctor.name}</h1>
            <p className="profile-specialty">
              {doctor.specialty} {doctor.qualifications ? `(${doctor.qualifications})` : ""} · {doctor.experienceYears || 5} years experience
            </p>
            <p className="muted">
              {doctor.clinicName || "City Health Clinic"} · {doctor.location || "Bengaluru"}
            </p>
            <div className="profile-rating">
              ★ {doctor.rating || 4.9} <span>{doctor.reviewsCount || 150} patient reviews</span>
              {doctor.consultationFee && (
                <span style={{ marginLeft: "14px", fontWeight: "600", color: "#0f766e" }}>
                  · ₹{doctor.consultationFee} Consultation Fee
                </span>
              )}
            </div>
          </div>
          <Link
            to="/patient/appointments"
            className="primary-button"
            state={{ doctorId: doctor._id, doctorName: doctor.name, slot: selectedSlot }}
          >
            Book appointment
          </Link>
        </div>
        <div className="profile-columns">
          <article className="content-panel">
            <h2>About the doctor</h2>
            <p>{doctor.about || "Dedicated healthcare professional committed to comprehensive patient wellness."}</p>
            <h2>Areas of care</h2>
            <div className="tag-list">
              {doctor.areasOfCare && doctor.areasOfCare.length > 0 ? (
                doctor.areasOfCare.map((area) => <span key={area}>{area}</span>)
              ) : (
                <span>General consultation</span>
              )}
            </div>
          </article>
          <aside className="content-panel">
            <h2>Available times</h2>
            {doctor.availableSlots && doctor.availableSlots.length > 0 ? (
              doctor.availableSlots.map((time) => (
                <button
                  className={`time-slot ${selectedSlot === time ? "selected-slot" : ""}`}
                  type="button"
                  key={time}
                  onClick={() => setSelectedSlot(time)}
                  style={{
                    borderColor: selectedSlot === time ? "#0284c7" : undefined,
                    background: selectedSlot === time ? "#f0f9ff" : undefined,
                  }}
                >
                  {time}
                  <span>{selectedSlot === time ? "Selected ✓" : "Choose"}</span>
                </button>
              ))
            ) : (
              <p style={{ color: "#64748b", fontSize: "14px" }}>No open slots currently available for this doctor.</p>
            )}
          </aside>
        </div>
      </section>
    </PublicLayout>
  );
}

export default DoctorProfile;
