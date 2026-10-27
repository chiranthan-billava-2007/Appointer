import { useState } from "react";
import { Link } from "react-router-dom";
import PublicLayout from "../layouts/PublicLayout";

const options = ["General check-up", "Skin & hair", "Dental care", "Heart health", "Women's health", "Eye care"];

function AIDoctorFinder() {
  const [selected, setSelected] = useState("");
  return <PublicLayout><section className="tool-page"><div className="tool-intro"><p className="eyebrow">AI DOCTOR FINDER</p><h1>A calmer way to find care.</h1><p>Tell us what you’re looking for and we’ll help you organize your next search. This frontend preview does not make medical diagnoses or connect to a backend yet.</p></div><div className="tool-panel"><h2>What kind of care do you need?</h2><div className="choice-grid">{options.map(option => <button className={selected === option ? "selected" : ""} type="button" onClick={() => setSelected(option)} key={option}>{option}{selected === option && <span> ✓</span>}</button>)}</div><p className="selection-note">{selected ? `Selected: ${selected}` : "Choose one option to continue."}</p><Link to="/doctors" className={`primary-button ${selected ? "" : "disabled-button"}`} onClick={event => { if (!selected) event.preventDefault(); }}>Show matching doctors →</Link></div></section></PublicLayout>;
}

export default AIDoctorFinder;
