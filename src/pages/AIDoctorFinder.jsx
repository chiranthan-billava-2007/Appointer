import { useState } from "react";
import { Link } from "react-router-dom";
import PublicLayout from "../layouts/PublicLayout";
import { api } from "../services/api";

const options = [
  "General check-up",
  "Skin & hair",
  "Dental care",
  "Heart health",
  "Women's health",
  "Eye care",
];

const optionQueryMap = {
  "General check-up": "Need a general check-up for fever, cold, or routine wellness",
  "Skin & hair": "Consultation for skin problems, acne, hair fall or rash",
  "Dental care": "Dentist consultation for toothache, cavity, or dental cleaning",
  "Heart health": "Heart health checkup, blood pressure, or cardiovascular consultation",
  "Women's health": "Women's reproductive health, prenatal guidance, or gynecologist consultation",
  "Eye care": "Eye specialist consultation for vision testing, dry eyes, or eye strain",
};

function AIDoctorFinder() {
  const [selected, setSelected] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchResult, setSearchResult] = useState(null);

  const handleSelectOption = (option) => {
    if (selected === option) {
      setSelected("");
      setQuery("");
    } else {
      setSelected(option);
      setQuery(optionQueryMap[option] || option);
      setError("");
    }
  };

  const handleSearch = async (event) => {
    if (event) event.preventDefault();

    const queryToSearch = query.trim() || optionQueryMap[selected] || selected;
    if (!queryToSearch) {
      setError("Please describe what kind of care or symptoms you are experiencing.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await api.aiDoctorFinder(queryToSearch);
      setSearchResult(data);
    } catch (err) {
      console.error("AI Doctor Finder request failed:", err);
      setError(err.message || "Failed to find matching doctors. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <section className="tool-page">
        <div className="tool-intro">
          <p className="eyebrow">AI DOCTOR FINDER</p>
          <h1>A calmer way to find care.</h1>
          <p>
            Tell us what you’re looking for and our AI will match your symptoms and preferences with verified registered doctors.
          </p>
          <p className="muted" style={{ fontSize: "12px", marginTop: "12px" }}>
            ℹ️ <strong>Doctor Discovery Notice:</strong> This assistant helps you find suitable specialists on Appointer. It does not provide medical diagnoses or treatment plans.
          </p>
        </div>

        <div className="tool-panel">
          <h2>What kind of care do you need?</h2>

          <form className="chat-input" onSubmit={handleSearch} style={{ marginTop: "16px", marginBottom: "16px" }}>
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (selected && e.target.value !== optionQueryMap[selected]) {
                  setSelected("");
                }
                setError("");
              }}
              placeholder="Describe symptoms or care needs (e.g. acne rash, tooth pain, heart checkup)..."
              aria-label="Describe care needs"
              disabled={loading}
            />
            <button
              aria-label="Search doctors"
              type="submit"
              disabled={loading || (!query.trim() && !selected)}
            >
              {loading ? "…" : "→"}
            </button>
          </form>

          <div className="choice-grid">
            {options.map((option) => (
              <button
                className={selected === option ? "selected" : ""}
                type="button"
                onClick={() => handleSelectOption(option)}
                key={option}
                disabled={loading}
              >
                {option}
                {selected === option && <span> ✓</span>}
              </button>
            ))}
          </div>

          <p className="selection-note">
            {error ? (
              <span style={{ color: "#d9534f" }}>{error}</span>
            ) : selected ? (
              `Selected: ${selected}`
            ) : query.trim() ? (
              `Custom search: "${query.trim().slice(0, 40)}${query.trim().length > 40 ? "…" : ""}"`
            ) : (
              "Type a description or choose an option to continue."
            )}
          </p>

          <button
            type="button"
            className={`primary-button ${(!query.trim() && !selected) || loading ? "disabled-button" : ""}`}
            onClick={handleSearch}
            disabled={(!query.trim() && !selected) || loading}
          >
            {loading ? "Finding doctors..." : "Show matching doctors →"}
          </button>
        </div>
      </section>

      {/* AI Search Results & Doctor Discovery */}
      {searchResult && (
        <section className="listing-section" style={{ borderTop: "1px solid #e1eeee" }}>
          <div className="listing-heading">
            <div>
              <p className="eyebrow">AI CARE MATCHING INSIGHT</p>
              <h2>Matching Specialists</h2>
              {searchResult.criteria && (
                <div style={{ marginTop: "8px" }}>
                  <p style={{ color: "#365565", margin: "4px 0", fontSize: "14px" }}>
                    <strong>Recommended Specialty:</strong> {searchResult.criteria.specialty || "General Care"}
                    {searchResult.criteria.location ? ` in ${searchResult.criteria.location}` : ""}
                  </p>
                  <p className="muted" style={{ margin: "4px 0", fontSize: "13px" }}>
                    {searchResult.criteria.reasoning}
                  </p>
                  {searchResult.criteria.keywords?.length > 0 && (
                    <div className="tag-list" style={{ marginTop: "8px" }}>
                      {searchResult.criteria.keywords.map((kw, idx) => (
                        <span key={idx}>{kw}</span>
                      ))}
                    </div>
                  )}
                  <p className="muted" style={{ fontSize: "11px", marginTop: "10px", fontStyle: "italic" }}>
                    {searchResult.criteria.disclaimer}
                  </p>
                </div>
              )}
            </div>
            <span>
              {searchResult.totalMatches} registered doctor{searchResult.totalMatches === 1 ? "" : "s"} found
            </span>
          </div>

          {searchResult.doctors && searchResult.doctors.length > 0 ? (
            <div className="doctor-list-grid">
              {searchResult.doctors.map((doc, index) => {
                const initials = doc.name
                  ? doc.name
                      .split(" ")
                      .slice(-2)
                      .map((w) => w[0])
                      .join("")
                  : "DR";
                const docId = doc._id || index + 1;

                return (
                  <article className="listing-card" key={docId}>
                    <div className="listing-avatar">{initials}</div>
                    <h3>{doc.name}</h3>
                    <p style={{ color: "#1683a0", fontWeight: 700 }}>{doc.specialty}</p>
                    <p className="muted">
                      ★ {doc.rating || 4.8} · {doc.reviewsCount || 120} patient reviews
                    </p>
                    {doc.clinicName && (
                      <p style={{ margin: "6px 0 0", color: "#466673", fontSize: "12px" }}>
                        🏥 {doc.clinicName}
                      </p>
                    )}
                    <hr />
                    <small>
                      {doc.availableSlots?.[0] ? `${doc.availableSlots[0]} · ` : "Available today · "}
                      {doc.location || "Bengaluru"}
                    </small>
                    <Link to={`/doctors/${docId}`} className="outline-button">
                      View profile
                    </Link>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <h3>No registered doctors match your criteria</h3>
              <p>
                {searchResult.message || "We could not find a verified doctor matching your exact search. Try adjusting your description or explore our full directory."}
              </p>
              <Link to="/doctors" className="outline-button">
                Browse all doctors
              </Link>
            </div>
          )}
        </section>
      )}
    </PublicLayout>
  );
}

export default AIDoctorFinder;
