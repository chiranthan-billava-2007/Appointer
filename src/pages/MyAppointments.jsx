import { Link } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";

function MyAppointments() {
  return (
    <DashboardLayout role="patient">
      <div className="dashboard-page">
        <p className="eyebrow">PATIENT DASHBOARD</p>
        <h1>My appointments</h1>
        <p className="muted">Review your upcoming visits and appointment history.</p>

        <div className="appointment-list">
          <article>
            <div>
              <span className="status-pill upcoming">Upcoming</span>
              <h2>Dr. Ananya Sharma</h2>
              <p>Dermatology · Tomorrow, 4:30 PM</p>
              <small>ClearSkin Dermatology Clinic · Indiranagar</small>
            </div>
            <div className="appointment-actions">
              <button type="button" className="outline-button">
                Reschedule
              </button>
              <button type="button" className="text-button" style={{ color: "#d9534f" }}>
                Cancel
              </button>
            </div>
          </article>

          <article>
            <div>
              <span className="status-pill complete">Completed</span>
              <h2>Dr. Rohan Mehta</h2>
              <p>Dentistry · 12 September 2026</p>
              <small>Bright Smile Dental Care · Koramangala</small>
            </div>
            <div className="appointment-actions">
              <button type="button" className="outline-button">
                View summary
              </button>
            </div>
          </article>
        </div>

        <Link to="/doctors" className="primary-button" style={{ marginTop: "12px" }}>
          Book another appointment
        </Link>
      </div>
    </DashboardLayout>
  );
}

export default MyAppointments;
