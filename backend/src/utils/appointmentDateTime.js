export const DEFAULT_TIMEZONE = "Asia/Kolkata";

export function getDoctorTimezone(doctor) {
  const location = String(doctor?.location || "").toLowerCase();
  const timezone = doctor?.timezone || (/\b(india|bengaluru|bangalore)\b/.test(location) ? DEFAULT_TIMEZONE : "");
  if (!timezone) {
    const error = new Error("Configure an IANA timezone for this doctor before managing appointments.");
    error.status = 400;
    throw error;
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return timezone;
  } catch {
    const error = new Error("Doctor timezone must be a valid IANA timezone.");
    error.status = 400;
    throw error;
  }
}

export function parseLocalDate(date) {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const error = new Error("Date must use YYYY-MM-DD format.");
    error.status = 400;
    throw error;
  }
  const [year, month, day] = date.split("-").map(Number);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (year < 1000 || check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
    const error = new Error("Date is invalid.");
    error.status = 400;
    throw error;
  }
  return { year, month, day };
}

export function parseLocalTime(time) {
  if (typeof time !== "string" || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    const error = new Error("Time must use 24-hour HH:mm format.");
    error.status = 400;
    throw error;
  }
  const [hour, minute] = time.split(":").map(Number);
  return { hour, minute };
}

function getZonedParts(instant, timezone) {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(instant).map(({ type, value }) => [type, value])
  );
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

function sameLocalMinute(parts, expected) {
  return parts.year === expected.year
    && parts.month === expected.month
    && parts.day === expected.day
    && parts.hour === expected.hour
    && parts.minute === expected.minute
    && parts.second === 0;
}

export function localDateTimeToUtc(date, time, timezone) {
  const dateParts = parseLocalDate(date);
  const timeParts = parseLocalTime(time);
  const zone = getDoctorTimezone({ timezone });
  const expected = { ...dateParts, ...timeParts };
  const wallClockMs = Date.UTC(expected.year, expected.month - 1, expected.day, expected.hour, expected.minute);
  const offsets = new Set();

  // Sample offsets around the target to account for timezone transitions near the appointment.
  for (let hours = -36; hours <= 36; hours += 3) {
    const sample = wallClockMs + hours * 60 * 60 * 1000;
    const parts = getZonedParts(new Date(sample), zone);
    const representedAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    offsets.add(representedAsUtc - sample);
  }

  const candidates = [...offsets]
    .map((offset) => wallClockMs - offset)
    .filter((candidate) => sameLocalMinute(getZonedParts(new Date(candidate), zone), expected));
  const uniqueCandidates = [...new Set(candidates)];

  if (uniqueCandidates.length === 0) {
    const error = new Error("That local time does not exist because of a timezone clock change.");
    error.status = 400;
    throw error;
  }
  if (uniqueCandidates.length > 1) {
    const error = new Error("That local time is ambiguous because of a timezone clock change.");
    error.status = 400;
    throw error;
  }
  return new Date(uniqueCandidates[0]);
}

export function getLocalDateTime(instant, timezone) {
  const parts = getZonedParts(new Date(instant), getDoctorTimezone({ timezone }));
  return {
    date: String(parts.year).padStart(4, "0") + "-" + String(parts.month).padStart(2, "0") + "-" + String(parts.day).padStart(2, "0"),
    time: String(parts.hour).padStart(2, "0") + ":" + String(parts.minute).padStart(2, "0"),
    weekday: new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay(),
  };
}

export function formatAppointmentSlot(date, time) {
  const { hour, minute } = parseLocalTime(time);
  const suffix = hour < 12 ? "AM" : "PM";
  const displayHour = hour % 12 || 12;
  return date + " · " + displayHour + ":" + String(minute).padStart(2, "0") + " " + suffix;
}

function parseDisplayTime(text) {
  const match = text.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 1 || hour > 12 || minute > 59) return null;
  if (match[3].toUpperCase() === "AM") hour %= 12;
  else hour = (hour % 12) + 12;
  return String(hour).padStart(2, "0") + ":" + String(minute).padStart(2, "0");
}

function addLocalDays(date, days) {
  const { year, month, day } = parseLocalDate(date);
  const value = new Date(Date.UTC(year, month - 1, day + days));
  return String(value.getUTCFullYear()).padStart(4, "0") + "-" + String(value.getUTCMonth() + 1).padStart(2, "0") + "-" + String(value.getUTCDate()).padStart(2, "0");
}

function parseLegacySlot(slot, now, timezone) {
  const match = typeof slot === "string"
    ? slot.trim().match(/^(.+?)\s*[·,]\s*(\d{1,2}:\d{2}\s*(?:AM|PM))$/i)
    : null;
  if (!match) return null;
  const time = parseDisplayTime(match[2].replace(/\s+/g, " "));
  if (!time) return null;

  const localNow = getLocalDateTime(now, timezone);
  const label = match[1].trim();
  let date;
  if (/^\d{4}-\d{2}-\d{2}$/.test(label)) date = label;
  else if (/^today$/i.test(label)) date = localNow.date;
  else if (/^tomorrow$/i.test(label)) date = addLocalDays(localNow.date, 1);
  else {
    const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const weekday = weekdayNames.findIndex((name) => name.toLowerCase() === label.toLowerCase());
    if (weekday < 0) return null;
    let days = (weekday - localNow.weekday + 7) % 7;
    if (days === 0 && time <= localNow.time) days = 7;
    date = addLocalDays(localNow.date, days);
  }
  return { date, time };
}

function dateWeekday(date) {
  const { year, month, day } = parseLocalDate(date);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function slotsFromWeeklySchedule(doctor, date, timezone, now) {
  const day = dateWeekday(date);
  const windows = (doctor.weeklyAvailability || []).filter((window) => Number(window.dayOfWeek) === day);
  const slots = [];

  for (const window of windows) {
    const start = parseLocalTime(window.startTime);
    const end = parseLocalTime(window.endTime);
    const duration = Number(window.slotDurationMinutes || 30);
    const startMinute = start.hour * 60 + start.minute;
    const endMinute = end.hour * 60 + end.minute;
    if (!Number.isInteger(duration) || duration < 5 || duration > 480 || endMinute <= startMinute) continue;

    for (let minute = startMinute; minute + duration <= endMinute; minute += duration) {
      const time = String(Math.floor(minute / 60)).padStart(2, "0") + ":" + String(minute % 60).padStart(2, "0");
      try {
        const scheduledAt = localDateTimeToUtc(date, time, timezone);
        if (scheduledAt.getTime() > now.getTime()) {
          slots.push({ date, time, timezone, scheduledAt, slot: formatAppointmentSlot(date, time) });
        }
      } catch (error) {
        if (error.status !== 400) throw error;
      }
    }
  }
  return slots;
}

export function getSlotsForLocalDate(doctor, date, now = new Date()) {
  const timezone = getDoctorTimezone(doctor);
  parseLocalDate(date);
  const today = getLocalDateTime(now, timezone).date;
  if (date < today) {
    const error = new Error("Appointments cannot be booked for a past date.");
    error.status = 400;
    throw error;
  }

  if (doctor.weeklyAvailability?.length) {
    return slotsFromWeeklySchedule(doctor, date, timezone, now);
  }

  return (doctor.availableSlots || []).flatMap((legacySlot) => {
    const parsed = parseLegacySlot(legacySlot, now, timezone);
    if (!parsed || parsed.date !== date) return [];
    try {
      const scheduledAt = localDateTimeToUtc(parsed.date, parsed.time, timezone);
      if (scheduledAt.getTime() <= now.getTime()) return [];
      return [{ ...parsed, timezone, scheduledAt, slot: formatAppointmentSlot(parsed.date, parsed.time) }];
    } catch {
      return [];
    }
  });
}

export function resolveAppointmentSlot({ doctor, date, time, slot, now = new Date() }) {
  const timezone = getDoctorTimezone(doctor);
  let requestedDate = date;
  let requestedTime = time;

  if ((!requestedDate || !requestedTime) && typeof slot === "string") {
    const legacyConfigured = (doctor.availableSlots || []).some((value) => value.trim().toLowerCase() === slot.trim().toLowerCase());
    const parsed = parseLegacySlot(slot, now, timezone);
    if (legacyConfigured && parsed) {
      requestedDate = parsed.date;
      requestedTime = parsed.time;
    } else {
      const canonical = slot.trim().match(/^(\d{4}-\d{2}-\d{2})\s*[·,]\s*(\d{1,2}:\d{2}\s*(?:AM|PM))$/i);
      const parsedTime = canonical ? parseDisplayTime(canonical[2].replace(/\s+/g, " ")) : null;
      if (!canonical || !parsedTime) {
        const error = new Error("Provide a date and time, or a configured legacy slot.");
        error.status = 400;
        throw error;
      }
      requestedDate = canonical[1];
      requestedTime = parsedTime;
    }
  }

  const dateParts = parseLocalDate(requestedDate);
  const timeParts = parseLocalTime(requestedTime);
  const slots = getSlotsForLocalDate(doctor, requestedDate, now);
  const matching = slots.find((candidate) => candidate.time === requestedTime);
  if (!matching) {
    const error = new Error("The requested date/time is not in the doctor's configured schedule.");
    error.status = 400;
    throw error;
  }
  const scheduledAt = localDateTimeToUtc(requestedDate, requestedTime, timezone);
  if (scheduledAt.getTime() <= now.getTime()) {
    const error = new Error("Appointments must be scheduled in the future.");
    error.status = 400;
    throw error;
  }

  return {
    date: String(dateParts.year).padStart(4, "0") + "-" + String(dateParts.month).padStart(2, "0") + "-" + String(dateParts.day).padStart(2, "0"),
    time: String(timeParts.hour).padStart(2, "0") + ":" + String(timeParts.minute).padStart(2, "0"),
    timezone,
    scheduledAt,
    slot: formatAppointmentSlot(requestedDate, requestedTime),
  };
}
