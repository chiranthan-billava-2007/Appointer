export function appointmentDateTime(appointment) {
  if (appointment.scheduledAt) {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: appointment.timezone || undefined,
    }).format(new Date(appointment.scheduledAt));
  }
  return appointment.slot || "Date to be confirmed";
}

export function initials(name = "") {
  return name.split(" ").filter(Boolean).slice(-2).map((word) => word[0]).join("") || "AP";
}

export function statusClass(status) {
  return status === "completed" ? "complete" : status === "cancelled" ? "cancelled" : "upcoming";
}
