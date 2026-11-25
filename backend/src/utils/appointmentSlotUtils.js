export function normalizeSlot(slot) {
  return typeof slot === "string"
    ? slot.trim().replace(/\s+/g, " ").toLowerCase()
    : "";
}

export function buildNormalizedSlotRegex(slot) {
  const normalizedWhitespace = typeof slot === "string"
    ? slot.trim().replace(/\s+/g, " ")
    : "";

  const escaped = normalizedWhitespace.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const flexibleWhitespace = escaped.replace(/\s+/g, "\\s+");
  return new RegExp(`^\\s*${flexibleWhitespace}\\s*$`, "i");
}

export function findUpcomingSlotConflicts(appointments) {
  const groups = new Map();

  for (const appointment of appointments) {
    // The unique index's partial filter includes doctor: null when the field exists.
    // Match that behavior so the migration won't miss keys that can block index creation.
    if (!Object.hasOwn(appointment, "doctor")) continue;
    const doctorId = appointment.doctor == null ? "<null>" : appointment.doctor.toString();
    const normalizedSlot = normalizeSlot(appointment.slot);

    const groupKey = `${doctorId}\u0000${normalizedSlot}`;
    const group = groups.get(groupKey) || {
      doctor: doctorId,
      normalizedSlot,
      appointments: [],
      rawSlots: new Set(),
    };

    group.appointments.push({
      id: appointment._id?.toString() || "unknown",
      slot: appointment.slot,
    });
    group.rawSlots.add(appointment.slot);
    groups.set(groupKey, group);
  }

  return [...groups.values()]
    .filter((group) => group.appointments.length > 1)
    .map(({ rawSlots, ...group }) => ({
      ...group,
      exact: rawSlots.size === 1,
    }));
}

export function findScheduledAtConflicts(appointments) {
  const groups = new Map();

  for (const appointment of appointments) {
    if (!Object.hasOwn(appointment, "doctor") || !(appointment.scheduledAt instanceof Date)) continue;
    if (Number.isNaN(appointment.scheduledAt.getTime())) continue;
    const doctorId = appointment.doctor == null ? "<null>" : appointment.doctor.toString();
    const instant = appointment.scheduledAt.toISOString();
    const key = doctorId + "\u0000" + instant;
    const group = groups.get(key) || { doctor: doctorId, scheduledAt: instant, appointmentIds: [] };
    group.appointmentIds.push(appointment._id?.toString() || "unknown");
    groups.set(key, group);
  }

  return [...groups.values()].filter((group) => group.appointmentIds.length > 1);
}
