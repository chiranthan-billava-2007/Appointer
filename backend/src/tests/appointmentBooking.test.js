import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Appointment from "../models/Appointment.js";
import Doctor from "../models/Doctor.js";
import User from "../models/User.js";
import {
  createAppointment,
  deleteAppointment,
  rescheduleAppointment,
} from "../controllers/appointmentController.js";
import { getDoctorAvailability } from "../controllers/doctorController.js";
import { findScheduledAtConflicts, findUpcomingSlotConflicts } from "../utils/appointmentSlotUtils.js";
import {
  getDoctorTimezone,
  getSlotsForLocalDate,
  localDateTimeToUtc,
} from "../utils/appointmentDateTime.js";

const configuredTestUri = process.env.APPOINTER_TEST_MONGODB_URI;
if (!configuredTestUri) {
  throw new Error(
    "Set APPOINTER_TEST_MONGODB_URI to a disposable MongoDB test server before running appointmentBooking.test.js."
  );
}

const uri = new URL(configuredTestUri);
const baseDbName = decodeURIComponent(uri.pathname.replace(/^\//, ""));
if (!/test/i.test(baseDbName)) {
  throw new Error("APPOINTER_TEST_MONGODB_URI must use a database name containing 'test'.");
}
uri.pathname = `/${baseDbName}_${process.pid}_${Date.now()}`;
const testMongoUri = uri.toString();

function dateAfterDays(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

const dateOne = dateAfterDays(10);
const dateTwo = dateAfterDays(11);
const dateThree = dateAfterDays(12);
const dateFour = dateAfterDays(13);
const slotOne = dateOne + " · 9:00 AM";
const slotTwo = dateOne + " · 10:00 AM";
const slotThree = dateOne + " · 11:00 AM";
const slotFour = dateTwo + " · 9:00 AM";
const slotFive = dateTwo + " · 10:00 AM";
const slotSix = dateTwo + " · 11:00 AM";
const slotSeven = dateThree + " · 9:00 AM";
const slotEight = dateThree + " · 10:00 AM";
const slotNine = dateThree + " · 11:00 AM";
const slotTen = dateFour + " · 9:00 AM";
const slotEleven = dateFour + " · 10:00 AM";
const slotTwelve = dateFour + " · 11:00 AM";
const slotThirteen = dateAfterDays(14) + " · 9:00 AM";

let patient;
let doctor;

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function bookingRequest(slot) {
  return {
    body: { doctorId: doctor._id.toString(), slot },
    user: {
      id: patient._id.toString(),
      name: patient.name,
      email: patient.email,
      role: "patient",
    },
  };
}

async function book(slot) {
  const response = responseRecorder();
  await createAppointment(bookingRequest(slot), response);
  return response;
}

async function bookAt(date, time) {
  const response = responseRecorder();
  await createAppointment({
    body: { doctorId: doctor._id.toString(), date, time },
    user: {
      id: patient._id.toString(),
      name: patient.name,
      email: patient.email,
      role: "patient",
    },
  }, response);
  return response;
}

async function createExistingAppointment(slot, status = "upcoming") {
  return Appointment.create({
    patient: patient._id,
    patientName: patient.name,
    patientEmail: patient.email,
    doctor: doctor._id,
    doctorName: doctor.name,
    specialty: doctor.specialty,
    clinicName: doctor.clinicName,
    location: doctor.location,
    slot,
    status,
  });
}

describe("Appointment booking integrity", () => {
  before(async () => {
    await mongoose.connect(testMongoUri);
    await Appointment.init();

    patient = await User.create({
      name: "Booking Test Patient",
      email: `booking-test-${process.pid}-${Date.now()}@example.test`,
      password: "test-password-hash",
      role: "patient",
    });
    doctor = await Doctor.create({
      user: patient._id,
      name: "Booking Test Doctor",
      specialty: "General physician",
      availableSlots: [slotOne, slotTwo, slotThree, slotFour, slotFive, slotSix, slotSeven, slotEight, slotNine, slotTen, slotEleven, slotTwelve, slotThirteen],
    });
  });

  after(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  });

  it("accepts a configured slot and saves its canonical schedule spelling", async () => {
    const result = await book(slotOne.replace(" · ", "   ·   "));
    assert.equal(result.statusCode, 201);
    assert.equal(result.body.slot, slotOne);
  });

  it("builds the partial unique index used as the concurrency safeguard", async () => {
    const indexes = await Appointment.collection.indexes();
    const slotIndex = indexes.find((index) => index.name === "unique_upcoming_doctor_slot");
    assert.ok(slotIndex);
    assert.equal(slotIndex.unique, true);
    assert.deepEqual(slotIndex.key, { doctor: 1, slot: 1 });
    assert.deepEqual(slotIndex.partialFilterExpression, {
      status: "upcoming",
      doctor: { $exists: true },
    });
  });

  it("converts local appointment times to UTC for UTC, India, and a different doctor timezone", () => {
    assert.equal(localDateTimeToUtc("2026-11-30", "09:00", "UTC").toISOString(), "2026-11-30T09:00:00.000Z");
    assert.equal(localDateTimeToUtc("2026-11-30", "09:00", "Asia/Kolkata").toISOString(), "2026-11-30T03:30:00.000Z");
    assert.equal(localDateTimeToUtc("2026-11-30", "09:00", "America/New_York").toISOString(), "2026-11-30T14:00:00.000Z");
  });

  it("rejects an invalid local date and a nonexistent daylight-saving time", () => {
    assert.throws(() => localDateTimeToUtc("2026-02-30", "09:00", "UTC"), /Date is invalid/);
    assert.throws(() => localDateTimeToUtc("2026-03-08", "02:30", "America/New_York"), /does not exist/);
  });

  it("rejects past dates and past appointment instants", async () => {
    assert.throws(() => getSlotsForLocalDate(doctor, "2020-01-01"), /past date/);
    const result = await bookAt("2020-01-01", "09:00");
    assert.equal(result.statusCode, 400);
  });

  it("returns date-specific availability with booked slots removed and cancelled slots reusable", async () => {
    const bookedAt = localDateTimeToUtc(dateTwo, "11:00", getDoctorTimezone(doctor));
    await createExistingAppointment(slotSix, "upcoming").then((appointment) => {
      appointment.scheduledAt = bookedAt;
      appointment.timezone = getDoctorTimezone(doctor);
      return appointment.save();
    });
    await createExistingAppointment(slotFive, "cancelled").then((appointment) => {
      appointment.scheduledAt = localDateTimeToUtc(dateTwo, "10:00", getDoctorTimezone(doctor));
      appointment.timezone = getDoctorTimezone(doctor);
      return appointment.save();
    });

    const response = responseRecorder();
    await getDoctorAvailability(
      { params: { id: doctor._id.toString() }, query: { date: dateTwo } },
      response
    );
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.timezone, "Asia/Kolkata");
    assert.ok(response.body.bookedSlots.includes(slotSix));
    assert.ok(response.body.availableSlots.includes(slotFive));
  });

  it("generates date-specific slots from a recurring schedule in the doctor's timezone", async () => {
    const originalTimezone = doctor.timezone;
    const originalSchedule = doctor.weeklyAvailability;
    const weekday = new Date(dateOne + "T12:00:00.000Z").getUTCDay();
    try {
      doctor.timezone = "America/New_York";
      doctor.weeklyAvailability = [{
        dayOfWeek: weekday,
        startTime: "09:00",
        endTime: "11:00",
        slotDurationMinutes: 30,
      }];
      await doctor.save();

      const response = responseRecorder();
      await getDoctorAvailability(
        { params: { id: doctor._id.toString() }, query: { date: dateOne } },
        response
      );
      assert.equal(response.statusCode, 200);
      assert.equal(response.body.timezone, "America/New_York");
      assert.equal(response.body.availableSlots.length, 4);

      const booked = await bookAt(dateOne, "10:30");
      assert.equal(booked.statusCode, 201);
      assert.equal(booked.body.scheduledAt.toISOString(), localDateTimeToUtc(dateOne, "10:30", "America/New_York").toISOString());
    } finally {
      doctor.timezone = originalTimezone;
      doctor.weeklyAvailability = originalSchedule;
      await doctor.save();
    }
  });

  it("rejects invalid dates through the availability endpoint", async () => {
    const response = responseRecorder();
    await getDoctorAvailability(
      { params: { id: doctor._id.toString() }, query: { date: "2026-02-30" } },
      response
    );
    assert.equal(response.statusCode, 400);
  });

  it("safely handles concurrent reschedules into the same slot", async () => {
    const originalOne = await createExistingAppointment(slotNine);
    const originalTwo = await createExistingAppointment(slotTen);
    const requests = [originalOne, originalTwo].map(async (appointment) => {
      const response = responseRecorder();
      await rescheduleAppointment(
        {
          params: { id: appointment._id.toString() },
          body: { date: dateOne, time: "10:00" },
          user: { id: patient._id.toString(), role: "patient" },
        },
        response
      );
      return { appointment, response };
    });
    const results = await Promise.all(requests);
    assert.deepEqual(results.map(({ response }) => response.statusCode).sort(), [200, 409]);
    const targetAt = localDateTimeToUtc(dateOne, "10:00", getDoctorTimezone(doctor));
    assert.equal(await Appointment.countDocuments({ doctor: doctor._id, status: "upcoming", scheduledAt: targetAt }), 1);
  });

  it("keeps legacy display-only appointments readable without inventing a date", async () => {
    const legacy = await Appointment.create({
      patientName: "Preserved Legacy Patient",
      patientEmail: "legacy@example.test",
      doctorName: "Legacy Doctor",
      specialty: "General physician",
      slot: "Tomorrow · 10:00 AM",
      status: "upcoming",
      isLegacy: true,
    });
    const stored = await Appointment.findById(legacy._id).lean();
    assert.equal(stored.slot, "Tomorrow · 10:00 AM");
    assert.equal(stored.scheduledAt, undefined);
    assert.equal(stored.timezone, undefined);
  });

  it("returns 409 when the requested slot is already booked", async () => {
    await createExistingAppointment(slotThree);
    const result = await book(slotThree);
    assert.equal(result.statusCode, 409);
  });

  it("rejects a malformed or empty slot", async () => {
    const result = await book("   ");
    assert.equal(result.statusCode, 400);
  });

  it("rejects a valid-looking slot outside the doctor's configured schedule", async () => {
    const result = await book(dateOne + " · 12:00 PM");
    assert.equal(result.statusCode, 400);
    assert.match(result.body.message, /not in the doctor.s configured schedule/i);
  });

  it("allows only one of two simultaneous requests for the same slot", async () => {
    const results = await Promise.all([book(slotThirteen), book(slotThirteen)]);
    assert.deepEqual(results.map((result) => result.statusCode).sort(), [201, 409]);
    assert.equal(await Appointment.countDocuments({ doctor: doctor._id, slot: slotThirteen, status: "upcoming" }), 1);
  });

  it("releases a cancelled slot for a later booking", async () => {
    const initial = await book(slotFour);
    assert.equal(initial.statusCode, 201);

    const cancellation = responseRecorder();
    await deleteAppointment(
      {
        params: { id: initial.body._id.toString() },
        user: { id: patient._id.toString(), role: "patient" },
      },
      cancellation
    );
    assert.equal(cancellation.statusCode, 200);
    assert.equal(cancellation.body.appointment.status, "cancelled");

    const replacement = await book(slotFour);
    assert.equal(replacement.statusCode, 201);
  });

  it("returns 409 and keeps the original slot when rescheduling into an occupied slot", async () => {
    const original = await createExistingAppointment(slotEleven);
    await createExistingAppointment(slotTwelve);
    const response = responseRecorder();

    await rescheduleAppointment(
      {
        params: { id: original._id.toString() },
        body: { slot: slotTwelve },
        user: { id: patient._id.toString(), role: "patient" },
      },
      response
    );

    assert.equal(response.statusCode, 409);
    const unchanged = await Appointment.findById(original._id);
    assert.equal(unchanged.slot, slotEleven);
  });

  it("detects exact and whitespace/case-normalized migration conflicts", () => {
    const conflicts = findUpcomingSlotConflicts([
      { _id: "a", doctor: "doctor-1", slot: "Tomorrow · 4:30 PM" },
      { _id: "b", doctor: "doctor-1", slot: "Tomorrow · 4:30 PM" },
      { _id: "c", doctor: "doctor-2", slot: "Tomorrow · 4:30 PM" },
      { _id: "d", doctor: "doctor-2", slot: " tomorrow   ·  4:30 pm " },
      { _id: "e", doctor: null, slot: "legacy slot" },
      { _id: "f", doctor: null, slot: "LEGACY   SLOT" },
    ]);

    assert.equal(conflicts.length, 3);
    assert.equal(conflicts.find((conflict) => conflict.doctor === "doctor-1").exact, true);
    assert.equal(conflicts.find((conflict) => conflict.doctor === "doctor-2").exact, false);
    assert.equal(conflicts.find((conflict) => conflict.doctor === "<null>").exact, false);

    const datedConflicts = findScheduledAtConflicts([
      { _id: "dated-a", doctor: "doctor-3", scheduledAt: new Date("2026-11-30T09:00:00.000Z") },
      { _id: "dated-b", doctor: "doctor-3", scheduledAt: new Date("2026-11-30T09:00:00.000Z") },
      { _id: "legacy", doctor: "doctor-3", slot: "Tomorrow · 10:00 AM" },
    ]);
    assert.equal(datedConflicts.length, 1);
    assert.equal(datedConflicts[0].appointmentIds.length, 2);
  });
});
