import { Link, useLocation } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import { api } from "../services/api";
import { appointmentDateTime, statusClass } from "../utils/appointmentDisplay";

const defaultDate = () => {
  const value = new Date();
  value.setDate(value.getDate() + 1);
  return [value.getFullYear(), String(value.getMonth() + 1).padStart(2, "0"), String(value.getDate()).padStart(2, "0")].join("-");
};

function MyAppointments() {
  const location = useLocation();
  const requestedDoctor = location.state?.doctorId ? { id: location.state.doctorId, name: location.state.doctorName } : null;
  const [appointments, setAppointments] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [editor, setEditor] = useState(requestedDoctor ? { type: "book", doctor: requestedDoctor, date: defaultDate(), slots: [], time: "" } : null);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setAppointments(await api.getAppointments()); } catch (err) { setError(err.message || "Could not load appointments."); } finally { setLoading(false); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(load, 0); return () => window.clearTimeout(timer); }, [load]);
  useEffect(() => {
    if (!editor?.doctor?.id || !editor.date) return undefined;
    let active = true;
    api.getDoctorAvailability(editor.doctor.id, editor.date)
      .then((availability) => {
        if (active) setEditor((current) => current && current.doctor.id === editor.doctor.id && current.date === editor.date ? { ...current, slots: availability.slots || [], time: "" } : current);
      })
      .catch((err) => { if (active) setError(err.message || "Could not load available slots."); });
    return () => { active = false; };
  }, [editor?.doctor?.id, editor?.date]);
  const cancel = async (id) => {
    setBusyId(id); setError("");
    try { await api.cancelAppointment(id); await load(); } catch (err) { setError(err.message || "Could not cancel appointment."); } finally { setBusyId(""); }
  };
  const submitEditor = async () => {
    if (!editor?.time) return setError("Select an available time before continuing.");
    setBusyId(editor.type === "reschedule" ? editor.appointment._id : "booking"); setError("");
    try {
      if (editor.type === "book") await api.bookAppointment({ doctorId: editor.doctor.id, date: editor.date, time: editor.time });
      else await api.rescheduleAppointment(editor.appointment._id, { date: editor.date, time: editor.time });
      setEditor(null); await load();
    } catch (err) { setError(err.message || "Could not save appointment changes."); } finally { setBusyId(""); }
  };
  const upcoming = appointments.filter((appointment) => appointment.status === "upcoming");
  const history = appointments.filter((appointment) => appointment.status !== "upcoming");
  return (
    <DashboardLayout role="patient">
      <div className="dashboard-page">
        <p className="eyebrow">PATIENT DASHBOARD</p>
        <h1>My appointments</h1>
        <p className="muted">Review your upcoming visits and appointment history.</p>

        {error && <p className="dashboard-error" role="alert">{error}</p>}
        {editor && <section className="dashboard-panel appointment-editor"><div className="panel-heading"><h2>{editor.type === "book" ? `Book with ${editor.doctor.name || "doctor"}` : `Reschedule with ${editor.doctor.name}`}</h2><button type="button" className="text-button" onClick={() => setEditor(null)}>Close</button></div><label>Date<input type="date" min={new Date().toISOString().slice(0, 10)} value={editor.date} onChange={(event) => setEditor({ ...editor, date: event.target.value, slots: [], time: "" })} /></label><div className="slot-picker">{editor.slots.length === 0 ? <p className="muted">No available times for this date.</p> : editor.slots.map((slot) => <button type="button" key={slot.time} className={`time-slot ${editor.time === slot.time ? "selected-slot" : ""}`} onClick={() => setEditor({ ...editor, time: slot.time })}>{slot.slot}</button>)}</div><button type="button" className="primary-button" disabled={!editor.time || Boolean(busyId)} onClick={submitEditor}>{busyId ? "Saving…" : editor.type === "book" ? "Confirm booking" : "Confirm reschedule"}</button></section>}
        <div className="appointment-list">
          {loading && <p className="muted">Loading appointments…</p>}
          {!loading && appointments.length === 0 && <p className="muted">No appointments yet.</p>}
          {upcoming.map((appointment) => <AppointmentCard key={appointment._id} appointment={appointment} busy={busyId === appointment._id} onCancel={() => cancel(appointment._id)} onReschedule={() => setEditor({ type: "reschedule", appointment, doctor: { id: appointment.doctor, name: appointment.doctorName }, date: defaultDate(), slots: [], time: "" })} />)}
          {history.map((appointment) => <AppointmentCard key={appointment._id} appointment={appointment} />)}
        </div>

        <Link to="/doctors" className="primary-button" style={{ marginTop: "12px" }}>
          Book another appointment
        </Link>
      </div>
    </DashboardLayout>
  );
}

function AppointmentCard({ appointment, busy, onCancel, onReschedule }) {
  return <article><div><span className={`status-pill ${statusClass(appointment.status)}`}>{appointment.status}</span><h2>{appointment.doctorName}</h2><p>{appointment.specialty} · {appointmentDateTime(appointment)}</p><small>{appointment.clinicName} · {appointment.location}</small></div>{appointment.status === "upcoming" && <div className="appointment-actions"><button type="button" className="outline-button" disabled={busy} onClick={onReschedule}>Reschedule</button><button type="button" className="text-button" disabled={busy} style={{ color: "#d9534f" }} onClick={onCancel}>{busy ? "Cancelling…" : "Cancel"}</button></div>}</article>;
}

export default MyAppointments;
