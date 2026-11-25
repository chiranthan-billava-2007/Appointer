import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import http from "http";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { io as socketClient } from "socket.io-client";
import User from "../models/User.js";
import Doctor from "../models/Doctor.js";
import { attachSocketServer, emitAppointmentEvent } from "../realtime/socketServer.js";

const baseUri = process.env.APPOINTER_TEST_MONGODB_URI;
if (!baseUri) throw new Error("Set APPOINTER_TEST_MONGODB_URI to run socket tests.");
const uri = new URL(baseUri);
const databaseName = decodeURIComponent(uri.pathname.replace(/^\//, ""));
if (!/test/i.test(databaseName)) throw new Error("APPOINTER_TEST_MONGODB_URI must name a disposable test database.");
uri.pathname = `/${databaseName}_socket_${process.pid}_${Date.now()}`;
process.env.JWT_SECRET ||= "local-socket-test-secret-01234567890123456789";

const waitFor = (socket, event) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${event}`)), 2500);
  socket.once(event, (...args) => { clearTimeout(timer); resolve(args); });
});
const tokenFor = (user) => jwt.sign({ id: user._id.toString(), role: user.role }, process.env.JWT_SECRET, { expiresIn: "1h" });

let ioServer;
let httpServer;
let patient;
let otherPatient;
let doctorUser;
let admin;
let doctor;

describe("Socket.IO authentication, room isolation, and appointment events", () => {
  before(async () => {
    await mongoose.connect(uri.toString());
    const password = await bcrypt.hash("Password123!", 10);
    patient = await User.create({ name: "Socket Patient", email: "socket-patient@example.test", password, role: "patient" });
    otherPatient = await User.create({ name: "Other Socket Patient", email: "socket-other@example.test", password, role: "patient" });
    doctorUser = await User.create({ name: "Socket Doctor", email: "socket-doctor@example.test", password, role: "doctor" });
    admin = await User.create({ name: "Socket Admin", email: "socket-admin@example.test", password, role: "admin" });
    doctor = await Doctor.create({ user: doctorUser._id, name: "Dr Socket", specialty: "General physician", timezone: "UTC" });
    httpServer = http.createServer();
    ioServer = attachSocketServer(httpServer, { allowedOrigins: ["http://localhost:5173"] });
    await new Promise((resolve) => httpServer.listen(0, resolve));
  });

  after(async () => {
    ioServer.close();
    await new Promise((resolve) => httpServer.close(resolve));
    await mongoose.disconnect();
  });

  it("accepts valid users and rejects invalid or expired JWTs", async () => {
    const port = httpServer.address().port;
    const valid = socketClient(`http://127.0.0.1:${port}`, { auth: { token: tokenFor(patient) }, reconnection: false });
    await waitFor(valid, "connect");
    valid.disconnect();
    for (const token of ["invalid", jwt.sign({ id: patient._id.toString() }, process.env.JWT_SECRET, { expiresIn: -1 })]) {
      const invalid = socketClient(`http://127.0.0.1:${port}`, { auth: { token }, reconnection: false });
      await waitFor(invalid, "connect_error");
      invalid.disconnect();
    }
  });

  it("isolates patient, doctor, and admin rooms and rejects client room subscriptions", async () => {
    const port = httpServer.address().port;
    const clients = [patient, otherPatient, doctorUser, admin].map((user) => socketClient(`http://127.0.0.1:${port}`, { auth: { token: tokenFor(user) }, reconnection: false }));
    await Promise.all(clients.map((client) => waitFor(client, "connect")));
    const [patientSocket, otherSocket, doctorSocket, adminSocket] = clients;
    const denied = new Promise((resolve) => patientSocket.emit("room:join", "role:admin", resolve));
    assert.deepEqual(await denied, { ok: false, message: "Rooms are assigned by the server." });

    const event = { _id: new mongoose.Types.ObjectId(), patient: patient._id, doctor: doctor._id, status: "upcoming", slot: "2030-01-01 · 09:00 AM", scheduledAt: new Date("2030-01-01T09:00:00Z"), timezone: "UTC" };
    const patientEvent = waitFor(patientSocket, "appointment:created");
    const doctorEvent = waitFor(doctorSocket, "appointment:created");
    const adminEvent = waitFor(adminSocket, "appointment:created");
    const otherEvent = new Promise((resolve) => { const timer = setTimeout(() => resolve(null), 300); otherSocket.once("appointment:created", resolve); });
    emitAppointmentEvent("appointment:created", event);
    const patientPayload = (await patientEvent)[0];
    assert.equal(patientPayload.appointmentId, event._id.toString());
    assert.equal(Object.hasOwn(patientPayload, "patientEmail"), false);
    assert.equal(Object.hasOwn(patientPayload, "notes"), false);
    assert.equal((await doctorEvent)[0].doctorId, doctor._id.toString());
    assert.equal((await adminEvent)[0].patientId, patient._id.toString());
    assert.equal(await otherEvent, null);
    for (const eventName of ["appointment:updated", "appointment:cancelled", "appointment:rescheduled", "appointment:completed"]) {
      const received = waitFor(patientSocket, eventName);
      emitAppointmentEvent(eventName, event);
      assert.equal((await received)[0].appointmentId, event._id.toString());
    }
    clients.forEach((client) => client.disconnect());
  });
});
