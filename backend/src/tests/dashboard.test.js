import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Appointment from "../models/Appointment.js";
import Doctor from "../models/Doctor.js";
import User from "../models/User.js";
import { getDashboardSummary } from "../controllers/dashboardController.js";

const baseUri = process.env.APPOINTER_TEST_MONGODB_URI;
if (!baseUri) throw new Error("Set APPOINTER_TEST_MONGODB_URI to run dashboard tests.");
const uri = new URL(baseUri);
const databaseName = decodeURIComponent(uri.pathname.replace(/^\//, ""));
if (!/test/i.test(databaseName)) throw new Error("APPOINTER_TEST_MONGODB_URI must name a disposable test database.");
uri.pathname = `/${databaseName}_dashboard_${process.pid}_${Date.now()}`;

let patient;
let otherPatient;
let emptyPatient;
let doctor;
let admin;

function response() {
  return { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}

async function summary(user) {
  const res = response();
  await getDashboardSummary({ user }, res);
  return res;
}

describe("Dashboard summaries", () => {
  before(async () => {
    await mongoose.connect(uri.toString());
    patient = await User.create({ name: "Dashboard Patient", email: `patient-${Date.now()}@example.test`, password: "password-hash", role: "patient" });
    otherPatient = await User.create({ name: "Other Patient", email: `other-${Date.now()}@example.test`, password: "password-hash", role: "patient" });
    emptyPatient = await User.create({ name: "Empty Patient", email: `empty-${Date.now()}@example.test`, password: "password-hash", role: "patient" });
    admin = await User.create({ name: "Dashboard Admin", email: `admin-${Date.now()}@example.test`, password: "password-hash", role: "admin" });
    const doctorUser = await User.create({ name: "Dashboard Doctor", email: `doctor-${Date.now()}@example.test`, password: "password-hash", role: "doctor" });
    doctor = await Doctor.create({ user: doctorUser._id, name: "Dr. Dashboard", specialty: "General physician", location: "Bengaluru", availableSlots: [] });
    const common = { doctor: doctor._id, doctorName: doctor.name, specialty: doctor.specialty, patientName: patient.name, patientEmail: patient.email, clinicName: doctor.clinicName, location: doctor.location };
    await Appointment.create([
      { ...common, patient: patient._id, slot: "2030-01-01 · 9:00 AM", scheduledAt: new Date("2030-01-01T03:30:00.000Z"), timezone: "Asia/Kolkata", status: "upcoming" },
      { ...common, patient: patient._id, slot: "2030-01-02 · 9:00 AM", scheduledAt: new Date("2030-01-02T03:30:00.000Z"), timezone: "Asia/Kolkata", status: "completed" },
      { ...common, patient: otherPatient._id, patientName: otherPatient.name, patientEmail: otherPatient.email, slot: "2030-01-03 · 9:00 AM", scheduledAt: new Date("2030-01-03T03:30:00.000Z"), timezone: "Asia/Kolkata", status: "cancelled" },
    ]);
  });

  after(async () => { await mongoose.disconnect(); });

  it("returns patient-owned appointments only", async () => {
    const res = await summary({ id: patient._id.toString(), role: "patient" });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.appointments.length, 2);
    assert.ok(res.body.appointments.every((appointment) => appointment.patient.toString() === patient._id.toString()));
  });

  it("returns a usable empty patient dashboard", async () => {
    const res = await summary({ id: emptyPatient._id.toString(), role: "patient" });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.appointments.length, 0);
    assert.equal(res.body.stats.upcoming, 0);
  });

  it("returns doctor-owned appointments only", async () => {
    const res = await summary({ id: doctor.user.toString(), role: "doctor" });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.appointments.length, 3);
    assert.equal(res.body.stats.upcoming, 1);
    assert.equal(res.body.stats.completed, 1);
    assert.equal(res.body.stats.cancelled, 1);
  });

  it("returns accurate administrator counts and recent appointment activity", async () => {
    const res = await summary({ id: admin._id.toString(), role: "admin" });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.stats.patients, 3);
    assert.equal(res.body.stats.doctors, 1);
    assert.equal(res.body.stats.totalAppointments, 3);
    assert.equal(res.body.recentAppointments.length, 3);
    assert.equal(res.body.users.length, 5);
    assert.ok(res.body.users.every((user) => !Object.hasOwn(user, "password")));
  });
});
