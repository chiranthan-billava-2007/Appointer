import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import PublicLayout from "../layouts/PublicLayout";
import { useAuth } from "../context/useAuth";
import { api } from "../services/api";

const SUGGESTIONS = [
  "Find a dermatologist",
  "My upcoming appointments",
  "Book an appointment with Dr. Ananya Sharma",
  "Reschedule my appointment",
  "Check dentist availability",
];

function AIAssistant() {
  const { user, isAuthenticated } = useAuth();
  const [messages, setMessages] = useState([
    {
      id: "msg-init",
      sender: "assistant",
      text: "Hello! I am Appointer's AI Appointment Assistant. I can help you find verified doctors, check real-time open slots, and manage your appointments (book, reschedule, or cancel). How can I help you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, actionLoading]);

  // Send a conversational message to backend AI assistant
  const handleSendMessage = async (textToSend) => {
    const queryText = (textToSend || input).trim();
    if (!queryText || loading || actionLoading) return;

    setError("");
    const userMessageId = `user-${Date.now()}`;
    const newMessages = [
      ...messages,
      { id: userMessageId, sender: "user", text: queryText },
    ];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      // Build conversation history for context
      const history = newMessages.slice(-6).map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text,
      }));

      const res = await api.assistantChat(queryText, history);

      const assistantMsg = {
        id: `asst-${Date.now()}`,
        sender: "assistant",
        text: res.reply || "I have processed your request.",
        payload: {
          intent: res.intent,
          actionRequired: res.actionRequired,
          pendingAction: res.pendingAction,
          doctors: res.doctors || (res.selectedDoctor ? [res.selectedDoctor] : []),
          appointments: res.appointments || (res.appointmentToReschedule ? [res.appointmentToReschedule] : []),
          availableSlots: res.availableSlots,
          requiresAuth: res.requiresAuth,
          disclaimer: res.disclaimer,
          recommendedDoctors: res.recommendedDoctors,
          suggestedSpecialty: res.suggestedSpecialty,
        },
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error("[AI Assistant Error]", err);
      setMessages((prev) => [
        ...prev,
        {
          id: `asst-err-${Date.now()}`,
          sender: "assistant",
          text: `I'm having trouble processing that right now: ${err.message || "Network error"}. Please try again or rephrase your question.`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Explicit confirmation execution for modifications (Requirement 6)
  const handleExecutePendingAction = async (pendingAction, messageId) => {
    if (!pendingAction || actionLoading) return;

    setActionLoading(true);
    setError("");

    try {
      if (pendingAction.type === "BOOK") {
        const appointmentData = {
          doctorId: pendingAction.doctorId,
          slot: pendingAction.slot,
          notes: pendingAction.notes || "Booked via AI Appointment Assistant",
        };

        const result = await api.bookAppointment(appointmentData);

        // Remove the action prompt from previous message so it cannot be double-clicked
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, payload: { ...m.payload, actionRequired: null, completed: true } }
              : m
          )
        );

        setMessages((prev) => [
          ...prev,
          {
            id: `success-${Date.now()}`,
            sender: "assistant",
            text: `🎉 Appointment confirmed! Your visit with **${pendingAction.doctorName}** has been scheduled for **${pendingAction.slot}** at ${pendingAction.clinicName}.`,
            payload: {
              type: "ACTION_SUCCESS",
              appointment: result,
              message: "Your appointment is confirmed and added to your care dashboard.",
            },
          },
        ]);
      } else if (pendingAction.type === "RESCHEDULE") {
        const result = await api.rescheduleAppointment(
          pendingAction.appointmentId,
          pendingAction.newSlot
        );

        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, payload: { ...m.payload, actionRequired: null, completed: true } }
              : m
          )
        );

        setMessages((prev) => [
          ...prev,
          {
            id: `success-${Date.now()}`,
            sender: "assistant",
            text: `✅ Appointment rescheduled! Your visit with **${pendingAction.doctorName}** is now confirmed for **${pendingAction.newSlot}**.`,
            payload: {
              type: "ACTION_SUCCESS",
              appointment: result.appointment || result,
              message: "Your rescheduled time has been verified with the clinic.",
            },
          },
        ]);
      } else if (pendingAction.type === "CANCEL") {
        await api.cancelAppointment(pendingAction.appointmentId);

        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, payload: { ...m.payload, actionRequired: null, completed: true } }
              : m
          )
        );

        setMessages((prev) => [
          ...prev,
          {
            id: `success-${Date.now()}`,
            sender: "assistant",
            text: `Your appointment with **${pendingAction.doctorName}** on **${pendingAction.slot}** has been cancelled.`,
            payload: {
              type: "ACTION_SUCCESS",
              cancelled: true,
              message: "The slot has been released in the schedule.",
            },
          },
        ]);
      }
    } catch (err) {
      console.error("[Action Execution Error]", err);
      setError(err.message || "Failed to complete the appointment modification.");
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: "assistant",
          text: `⚠️ Could not complete this request: ${err.message || "An unexpected error occurred"}. Please try choosing another time or check your connection.`,
        },
      ]);
    } finally {
      setActionLoading(false);
    }
  };

  // Cancel/Dismiss a pending confirmation prompt
  const handleDismissPendingAction = (messageId) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, payload: { ...m.payload, actionRequired: null, dismissed: true } }
          : m
      )
    );
    setMessages((prev) => [
      ...prev,
      {
        id: `dismiss-${Date.now()}`,
        sender: "assistant",
        text: "Understood, that action was cancelled. Let me know what else I can help you with.",
      },
    ]);
  };

  return (
    <PublicLayout>
      <section className="assistant-page" style={{ padding: "40px 0 60px" }}>
        <div className="assistant-header" style={{ marginBottom: "25px" }}>
          <p className="eyebrow">AI APPOINTMENT ASSISTANT</p>
          <h1 style={{ marginBottom: "8px" }}>Your care, organized seamlessly.</h1>
          <p className="muted" style={{ maxWidth: "680px", margin: "0 auto", fontSize: "14px" }}>
            Chat naturally to find verified doctors, check real open slots, and schedule, reschedule, or cancel your appointments.
          </p>
          <div
            style={{
              display: "inline-block",
              background: "#f1fbfb",
              border: "1px solid #cceced",
              borderRadius: "8px",
              padding: "8px 16px",
              marginTop: "14px",
              fontSize: "12px",
              color: "#385766",
            }}
          >
            🛡️ <strong>Appointment Scheduling Only:</strong> This assistant schedules care with registered doctors. It does not provide medical diagnoses, treatment plans, or prescriptions.
          </div>
        </div>

        <div className="chat-panel" style={{ minHeight: "450px", display: "flex", flexDirection: "column" }}>
          {/* Messages Stream */}
          <div
            className="chat-stream"
            style={{
              flex: 1,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "18px",
              marginBottom: "20px",
              paddingRight: "6px",
            }}
          >
            {messages.map((msg) => (
              <div key={msg.id} style={{ display: "flex", flexDirection: "column" }}>
                {msg.sender === "user" ? (
                  <div className="user-message">
                    <p style={{ fontSize: "14px", padding: "12px 18px", borderRadius: "16px 16px 2px 16px" }}>
                      {msg.text}
                    </p>
                  </div>
                ) : (
                  <div className="assistant-message" style={{ flexDirection: "column", width: "100%" }}>
                    <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", width: "100%" }}>
                      <span style={{ fontSize: "22px", color: "#1683a0", lineHeight: "1" }}>✦</span>
                      <div style={{ flex: 1, color: "#2d4855", fontSize: "14px", lineHeight: "1.6" }}>
                        <p style={{ margin: "0 0 8px 0" }}>{msg.text}</p>

                        {/* Payload 1: Medical Advice Guardrail Notice (Requirement 9) */}
                        {msg.payload?.intent === "MEDICAL_ADVICE" && (
                          <div
                            style={{
                              background: "#fff9e6",
                              border: "1px solid #f2dfa7",
                              borderRadius: "8px",
                              padding: "14px",
                              marginTop: "10px",
                              fontSize: "13px",
                              color: "#7a5c12",
                            }}
                          >
                            <strong>⚠️ Clinical Disclaimer:</strong>
                            <p style={{ margin: "6px 0 0" }}>
                              {msg.payload.disclaimer || "Please consult a qualified doctor for medical diagnoses or contact emergency services in urgent situations."}
                            </p>
                          </div>
                        )}

                        {/* Payload 2: Authentication Required Callout (Requirement 7) */}
                        {msg.payload?.requiresAuth && !isAuthenticated && (
                          <div
                            style={{
                              background: "#f0f9ff",
                              border: "1px solid #b9e3fd",
                              borderRadius: "8px",
                              padding: "14px 18px",
                              marginTop: "12px",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              gap: "15px",
                              flexWrap: "wrap",
                            }}
                          >
                            <div>
                              <strong style={{ color: "#0369a1" }}>Patient Login Required</strong>
                              <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#385766" }}>
                                To access your personal appointments and confirm bookings, please log in.
                              </p>
                            </div>
                            <div style={{ display: "flex", gap: "8px" }}>
                              <Link to="/login" className="primary-button" style={{ padding: "8px 16px", fontSize: "13px" }}>
                                Log in
                              </Link>
                              <Link to="/register" className="outline-button" style={{ padding: "8px 16px", fontSize: "13px" }}>
                                Register
                              </Link>
                            </div>
                          </div>
                        )}

                        {/* Payload 3: Doctor Cards Grid with Real Unbooked Slots (Requirements 3 & 4) */}
                        {msg.payload?.doctors?.length > 0 && (
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 240px), 1fr))",
                              gap: "12px",
                              marginTop: "14px",
                            }}
                          >
                            {msg.payload.doctors.map((doc) => {
                              const initials = doc.name
                                ? doc.name.split(" ").slice(-2).map((w) => w[0]).join("")
                                : "DR";
                              return (
                                <article
                                  key={doc._id}
                                  className="listing-card"
                                  style={{ padding: "16px", background: "#fbfefe", border: "1px solid #d9e9ea" }}
                                >
                                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                                    <div className="listing-avatar" style={{ width: "40px", height: "40px", fontSize: "14px", margin: 0 }}>
                                      {initials}
                                    </div>
                                    <div>
                                      <h3 style={{ margin: 0, fontSize: "15px", color: "#17394d" }}>{doc.name}</h3>
                                      <span style={{ color: "#1683a0", fontSize: "12px", fontWeight: "700" }}>{doc.specialty}</span>
                                    </div>
                                  </div>

                                  <p style={{ margin: "4px 0", fontSize: "11px", color: "#647f8c" }}>
                                    📍 {doc.clinicName} · {doc.location}
                                  </p>
                                  <p style={{ margin: "2px 0 8px", fontSize: "11px", color: "#db9e24" }}>
                                    ★ {doc.rating || 4.9} ({doc.reviewsCount || 150} reviews)
                                  </p>

                                  <div style={{ borderTop: "1px solid #ebf4f4", paddingTop: "8px" }}>
                                    <small style={{ color: "#4f6e7c", fontWeight: "600", display: "block", marginBottom: "6px" }}>
                                      Verified Available Slots:
                                    </small>
                                    {doc.realAvailableSlots?.length > 0 ? (
                                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                                        {doc.realAvailableSlots.map((slot) => (
                                          <button
                                            key={slot}
                                            type="button"
                                            className="tag-list"
                                            onClick={() =>
                                              handleSendMessage(`Book appointment with ${doc.name} for ${slot}`)
                                            }
                                            style={{
                                              padding: "5px 10px",
                                              fontSize: "11px",
                                              background: "#e4f5f5",
                                              color: "#12748e",
                                              border: "1px solid #bde7e8",
                                              borderRadius: "14px",
                                              cursor: "pointer",
                                              fontWeight: "500",
                                            }}
                                            title="Click to request this time slot"
                                          >
                                            {slot}
                                          </button>
                                        ))}
                                      </div>
                                    ) : (
                                      <span style={{ fontSize: "11px", color: "#d9534f" }}>
                                        All current slots booked for this provider
                                      </span>
                                    )}
                                  </div>
                                </article>
                              );
                            })}
                          </div>
                        )}

                        {/* Payload 4: Appointments List Cards (Requirement 7) */}
                        {msg.payload?.appointments?.length > 0 && !msg.payload?.actionRequired && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "12px" }}>
                            {msg.payload.appointments.map((apt) => (
                              <article
                                key={apt._id}
                                style={{
                                  background: "#fdfefe",
                                  border: "1px solid #dcefee",
                                  borderRadius: "8px",
                                  padding: "14px 18px",
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  gap: "15px",
                                  flexWrap: "wrap",
                                }}
                              >
                                <div>
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <span
                                      className={`status-pill ${
                                        apt.status === "upcoming" ? "upcoming" : apt.status === "completed" ? "complete" : ""
                                      }`}
                                      style={{ textTransform: "capitalize" }}
                                    >
                                      {apt.status}
                                    </span>
                                    <strong style={{ color: "#17394d", fontSize: "15px" }}>{apt.doctorName}</strong>
                                    <span style={{ color: "#1683a0", fontSize: "13px" }}>({apt.specialty})</span>
                                  </div>
                                  <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#3d5d6c" }}>
                                    🕒 <strong>{apt.slot}</strong> · 📍 {apt.clinicName}, {apt.location}
                                  </p>
                                </div>
                                {apt.status === "upcoming" && (
                                  <div style={{ display: "flex", gap: "8px" }}>
                                    <button
                                      type="button"
                                      className="outline-button"
                                      onClick={() => handleSendMessage(`Reschedule my appointment with ${apt.doctorName}`)}
                                      style={{ padding: "6px 12px", fontSize: "12px" }}
                                    >
                                      Reschedule
                                    </button>
                                    <button
                                      type="button"
                                      className="text-button"
                                      onClick={() => handleSendMessage(`Cancel my appointment with ${apt.doctorName}`)}
                                      style={{ padding: "6px 10px", fontSize: "12px", color: "#d9534f" }}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                )}
                              </article>
                            ))}
                          </div>
                        )}

                        {/* Payload 5: Reschedule Slot Selection */}
                        {msg.payload?.availableSlots?.length > 0 && !msg.payload?.actionRequired && (
                          <div style={{ marginTop: "12px", background: "#f8fdfd", padding: "12px", borderRadius: "8px", border: "1px solid #e2eeee" }}>
                            <p style={{ margin: "0 0 8px 0", fontSize: "12px", fontWeight: "600", color: "#365565" }}>
                              Select a new time slot to reschedule:
                            </p>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                              {msg.payload.availableSlots.map((s) => (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => handleSendMessage(`Reschedule to ${s}`)}
                                  className="outline-button"
                                  style={{ padding: "7px 14px", fontSize: "12px" }}
                                >
                                  {s}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Payload 6: REQUIRE EXPLICIT USER CONFIRMATION (Requirement 6) */}
                        {msg.payload?.actionRequired && msg.payload?.pendingAction && (
                          <div
                            className="pending-action-card"
                            style={{
                              marginTop: "16px",
                              padding: "16px 20px",
                              background: "#f0fbfb",
                              border: "2px solid #1683a0",
                              borderRadius: "10px",
                              boxShadow: "0 4px 15px rgba(22, 131, 160, 0.08)",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                              <span style={{ fontSize: "18px" }}>📋</span>
                              <strong style={{ color: "#125a6e", fontSize: "15px" }}>
                                {msg.payload.pendingAction.type === "BOOK"
                                  ? "Confirm Appointment Booking"
                                  : msg.payload.pendingAction.type === "RESCHEDULE"
                                  ? "Confirm Appointment Reschedule"
                                  : "Confirm Appointment Cancellation"}
                              </strong>
                            </div>

                            <div style={{ fontSize: "13px", color: "#2c4856", lineHeight: "1.7", marginBottom: "14px" }}>
                              <p style={{ margin: "2px 0" }}>
                                <strong>Doctor:</strong> {msg.payload.pendingAction.doctorName} ({msg.payload.pendingAction.specialty || "Specialist"})
                              </p>
                              {msg.payload.pendingAction.currentSlot && (
                                <p style={{ margin: "2px 0", color: "#69828e" }}>
                                  <strong>Current Time:</strong> <del>{msg.payload.pendingAction.currentSlot}</del>
                                </p>
                              )}
                              <p style={{ margin: "2px 0", color: "#0e6b82" }}>
                                <strong>
                                  {msg.payload.pendingAction.type === "RESCHEDULE" ? "New Requested Slot:" : "Selected Slot:"}
                                </strong>{" "}
                                {msg.payload.pendingAction.newSlot || msg.payload.pendingAction.slot}
                              </p>
                              {msg.payload.pendingAction.clinicName && (
                                <p style={{ margin: "2px 0" }}>
                                  <strong>Clinic Location:</strong> {msg.payload.pendingAction.clinicName}
                                  {msg.payload.pendingAction.location ? `, ${msg.payload.pendingAction.location}` : ""}
                                </p>
                              )}
                            </div>

                            <p style={{ fontSize: "12px", color: "#547382", fontStyle: "italic", margin: "0 0 12px" }}>
                              ⚠️ In accordance with healthcare scheduling standards, your explicit confirmation is required before modifying your appointment.
                            </p>

                            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                              <button
                                type="button"
                                className="primary-button"
                                disabled={actionLoading}
                                onClick={() => handleExecutePendingAction(msg.payload.pendingAction, msg.id)}
                                style={{
                                  padding: "9px 20px",
                                  fontSize: "13px",
                                  fontWeight: "700",
                                  background: msg.payload.pendingAction.type === "CANCEL" ? "#c82333" : "#1683a0",
                                }}
                              >
                                {actionLoading
                                  ? "Processing..."
                                  : msg.payload.pendingAction.type === "BOOK"
                                  ? "✓ Confirm Booking"
                                  : msg.payload.pendingAction.type === "RESCHEDULE"
                                  ? "✓ Confirm Reschedule"
                                  : "✓ Confirm Cancellation"}
                              </button>
                              <button
                                type="button"
                                className="outline-button"
                                disabled={actionLoading}
                                onClick={() => handleDismissPendingAction(msg.id)}
                                style={{ padding: "9px 16px", fontSize: "13px" }}
                              >
                                ✕ Cancel
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Payload 7: Successful Modification Receipt */}
                        {msg.payload?.type === "ACTION_SUCCESS" && (
                          <div
                            style={{
                              marginTop: "12px",
                              padding: "12px 16px",
                              background: "#edfdf5",
                              border: "1px solid #a3e6cd",
                              borderRadius: "8px",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              gap: "12px",
                            }}
                          >
                            <span style={{ fontSize: "13px", color: "#146c43" }}>
                              {msg.payload.message || "Action updated in database."}
                            </span>
                            <Link to="/patient/appointments" className="text-button" style={{ fontWeight: "700" }}>
                              View My Appointments →
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Assistant Thinking / Loading Indicator */}
            {loading && (
              <div className="assistant-message" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <span style={{ fontSize: "20px", color: "#1683a0" }}>✦</span>
                <p style={{ margin: 0, fontStyle: "italic", color: "#698793", fontSize: "13px" }}>
                  Assistant is checking verified doctor schedules and MongoDB records...
                </p>
              </div>
            )}

            {/* Action Execution Indicator */}
            {actionLoading && (
              <div className="assistant-message" style={{ display: "flex", gap: "10px", alignItems: "center", background: "#fdf8ee" }}>
                <span style={{ fontSize: "20px", color: "#d97706" }}>⏳</span>
                <p style={{ margin: 0, fontStyle: "italic", color: "#92400e", fontSize: "13px" }}>
                  Recording appointment update in MongoDB through authenticated API...
                </p>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Quick Interactive Suggestions */}
          <div className="suggestion-row" style={{ margin: "10px 0 15px", borderTop: "1px solid #e8f2f2", paddingTop: "12px" }}>
            <span style={{ fontSize: "11px", color: "#7b97a2", alignSelf: "center", marginRight: "4px" }}>
              Suggested prompts:
            </span>
            {SUGGESTIONS.map((suggestion) => (
              <button
                type="button"
                key={suggestion}
                onClick={() => handleSendMessage(suggestion)}
                disabled={loading || actionLoading}
              >
                {suggestion}
              </button>
            ))}
          </div>

          {/* Error Banner */}
          {error && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#b91c1c",
                padding: "8px 14px",
                borderRadius: "6px",
                fontSize: "12px",
                marginBottom: "10px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError("")}
                style={{ background: "none", border: 0, color: "#b91c1c", cursor: "pointer", fontWeight: "bold" }}
              >
                ✕
              </button>
            </div>
          )}

          {/* Chat Input Form */}
          <form
            className="chat-input"
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask to book, reschedule, cancel, or search doctors (e.g. 'Book dermatologist for tomorrow')..."
              aria-label="Ask AI Appointment Assistant"
              disabled={loading || actionLoading}
            />
            <button
              type="submit"
              aria-label="Send message"
              disabled={!input.trim() || loading || actionLoading}
              style={{ cursor: !input.trim() || loading || actionLoading ? "not-allowed" : "pointer" }}
            >
              {loading || actionLoading ? "…" : "→"}
            </button>
          </form>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "20px", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <Link to="/doctors" className="back-link" style={{ margin: 0 }}>
            Prefer to browse the directory directly? Explore Doctors →
          </Link>
          {isAuthenticated && (
            <Link to="/patient/appointments" className="back-link" style={{ margin: 0, color: "#2b788c" }}>
              View all scheduled appointments ({user?.name}) →
            </Link>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}

export default AIAssistant;
