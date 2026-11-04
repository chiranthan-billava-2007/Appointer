import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Doctor from "../models/Doctor.js";
import Appointment from "../models/Appointment.js";
import User from "../models/User.js";
import {
  extractAppointmentIntent,
  processAssistantMessage,
  getDoctorRealAvailableSlots,
  getFallbackAppointmentIntent,
} from "../services/appointmentAiService.js";
import { rescheduleAppointment } from "../controllers/appointmentController.js";
import { getDoctorAvailability } from "../controllers/doctorController.js";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/appointer";

describe("AI Appointment Assistant - Integration & Safety Tests", () => {
  let testPatient1;
  let testPatient2;
  let testDoctor;
  let testAppointment;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
    }

    // Find or create test doctor
    testDoctor = await Doctor.findOne({ specialty: "Dermatologist" });
    if (!testDoctor) {
      testDoctor = await Doctor.create({
        user: new mongoose.Types.ObjectId(),
        name: "Dr. Ananya Sharma",
        specialty: "Dermatologist",
        experienceYears: 12,
        clinicName: "ClearSkin Dermatology Clinic",
        location: "Indiranagar, Bengaluru",
        availableSlots: ["Today · 4:30 PM", "Tomorrow · 10:00 AM", "Friday · 2:15 PM"],
      });
    }

    // Create unique test users for patient data isolation tests
    const timestamp = Date.now();
    testPatient1 = await User.create({
      name: `Patient One ${timestamp}`,
      email: `patient1_${timestamp}@example.com`,
      password: "HashedPassword123!",
      role: "patient",
    });

    testPatient2 = await User.create({
      name: `Patient Two ${timestamp}`,
      email: `patient2_${timestamp}@example.com`,
      password: "HashedPassword123!",
      role: "patient",
    });

    // Create an initial upcoming appointment for Patient 1
    testAppointment = await Appointment.create({
      patient: testPatient1._id,
      patientName: testPatient1.name,
      patientEmail: testPatient1.email,
      doctor: testDoctor._id,
      doctorName: testDoctor.name,
      specialty: testDoctor.specialty,
      clinicName: testDoctor.clinicName,
      location: testDoctor.location,
      slot: "Today · 4:30 PM",
      status: "upcoming",
      notes: "Test consultation",
    });
  });

  after(async () => {
    // Clean up test data
    if (testAppointment?._id) {
      await Appointment.deleteOne({ _id: testAppointment._id });
    }
    if (testPatient1?._id) {
      await User.deleteOne({ _id: testPatient1._id });
    }
    if (testPatient2?._id) {
      await User.deleteOne({ _id: testPatient2._id });
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  describe("1. Medical Safety & Guardrails (Requirement 9: No diagnosis or prescriptions)", () => {
    it("should refuse to diagnose and disclaim medical advice when symptoms/diagnosis asked", async () => {
      const res = await processAssistantMessage({
        message: "Can you diagnose what sickness I have? I have a severe skin rash.",
        user: { id: testPatient1._id.toString(), role: "patient" },
      });

      assert.equal(res.intent, "MEDICAL_ADVICE");
      assert.ok(res.reply.includes("cannot diagnose") || res.reply.includes("cannot provide medical diagnoses"));
      assert.ok(!res.reply.toLowerCase().includes("you have dermatitis") && !res.reply.toLowerCase().includes("you have eczema"));
      assert.ok(res.disclaimer.includes("does not provide medical diagnoses"));
      assert.equal(res.suggestedSpecialty, "Dermatologist");
    });

    it("should refuse to prescribe medications or dosages", async () => {
      const res = await processAssistantMessage({
        message: "What antibiotic pill should I take for my toothache?",
        user: { id: testPatient1._id.toString(), role: "patient" },
      });

      assert.equal(res.intent, "MEDICAL_ADVICE");
      assert.ok(res.reply.includes("cannot") && (res.reply.includes("prescribe") || res.reply.includes("medication")));
      assert.equal(res.suggestedSpecialty, "Dentist");
    });
  });

  describe("2. Real MongoDB Doctor Discovery (Requirements 3 & 8)", () => {
    it("should return actual registered doctors from MongoDB without fabricating", async () => {
      const res = await processAssistantMessage({
        message: "Find a dermatologist in Indiranagar",
        user: null,
      });

      assert.equal(res.success, true);
      assert.ok(Array.isArray(res.doctors));
      assert.ok(res.doctors.length > 0);
      const found = res.doctors.find((d) => d.name === "Dr. Ananya Sharma");
      assert.ok(found, "Dr. Ananya Sharma should be in returned doctors from MongoDB");
      assert.equal(found.specialty, "Dermatologist");
    });
  });

  describe("3. Real Appointment Availability Check (Requirement 4)", () => {
    it("should calculate real unbooked slots excluding slots with upcoming appointments", async () => {
      const realSlots = await getDoctorRealAvailableSlots(testDoctor);

      // "Today · 4:30 PM" is booked by testAppointment
      const isBookedSlotPresent = realSlots.some((s) => s.toLowerCase().includes("today · 4:30 pm"));
      assert.equal(isBookedSlotPresent, false, "Booked slot 'Today · 4:30 PM' must NOT be in availableSlots");

      // "Tomorrow · 10:00 AM" and "Friday · 2:15 PM" should be available
      const isTomorrowPresent = realSlots.some((s) => s.toLowerCase().includes("tomorrow · 10:00 am"));
      assert.equal(isTomorrowPresent, true, "Unbooked slot 'Tomorrow · 10:00 AM' must be available");
    });

    it("should return availability breakdown via getDoctorAvailability controller", async () => {
      let responseData = null;
      const mockReq = { params: { id: testDoctor._id.toString() } };
      const mockRes = {
        json: (data) => {
          responseData = data;
          return mockRes;
        },
        status: () => mockRes,
      };

      await getDoctorAvailability(mockReq, mockRes);
      assert.ok(responseData);
      assert.equal(responseData.doctorName, testDoctor.name);
      assert.ok(responseData.bookedSlots.some((s) => s.includes("4:30 PM")));
      assert.ok(responseData.availableSlots.some((s) => s.includes("10:00 AM")));
    });
  });

  describe("4. Explicit User Confirmation Requirement (Requirement 6)", () => {
    it("should prompt for explicit confirmation before booking rather than booking immediately", async () => {
      const res = await processAssistantMessage({
        message: "Book appointment with Dr. Ananya Sharma for Tomorrow · 10:00 AM",
        user: { id: testPatient1._id.toString(), role: "patient" },
      });

      assert.equal(res.success, true);
      assert.equal(res.actionRequired, "CONFIRM_BOOKING");
      assert.ok(res.pendingAction);
      assert.equal(res.pendingAction.type, "BOOK");
      assert.equal(res.pendingAction.doctorName, "Dr. Ananya Sharma");
      assert.ok(res.pendingAction.slot.includes("10:00 AM"));

      // Verify no new appointment was prematurely inserted in MongoDB
      const count = await Appointment.countDocuments({
        patient: testPatient1._id,
        slot: "Tomorrow · 10:00 AM",
      });
      assert.equal(count, 0, "No appointment must be created before explicit user confirmation");
    });

    it("should prompt for explicit confirmation before rescheduling", async () => {
      const res = await processAssistantMessage({
        message: "Reschedule my appointment with Dr. Ananya Sharma to Friday · 2:15 PM",
        user: { id: testPatient1._id.toString(), role: "patient" },
      });

      assert.equal(res.success, true);
      assert.equal(res.actionRequired, "CONFIRM_RESCHEDULE");
      assert.ok(res.pendingAction);
      assert.equal(res.pendingAction.type, "RESCHEDULE");
      assert.equal(res.pendingAction.currentSlot, "Today · 4:30 PM");
      assert.equal(res.pendingAction.newSlot, "Friday · 2:15 PM");

      // Verify slot has NOT changed yet in database
      const unchanged = await Appointment.findById(testAppointment._id);
      assert.equal(unchanged.slot, "Today · 4:30 PM");
    });

    it("should prompt for explicit confirmation before cancelling", async () => {
      const res = await processAssistantMessage({
        message: "Cancel my appointment with Dr. Ananya Sharma",
        user: { id: testPatient1._id.toString(), role: "patient" },
      });

      assert.equal(res.success, true);
      assert.equal(res.actionRequired, "CONFIRM_CANCEL");
      assert.ok(res.pendingAction);
      assert.equal(res.pendingAction.type, "CANCEL");
      assert.equal(res.pendingAction.appointmentId, testAppointment._id.toString());

      // Verify status has NOT changed to cancelled yet
      const unchanged = await Appointment.findById(testAppointment._id);
      assert.equal(unchanged.status, "upcoming");
    });
  });

  describe("5. JWT Authentication & Patient Data Isolation (Requirement 7)", () => {
    it("should require authentication when an unauthenticated guest requests appointments", async () => {
      const res = await processAssistantMessage({
        message: "Show my upcoming appointments",
        user: null, // Unauthenticated
      });

      assert.equal(res.requiresAuth, true);
      assert.ok(res.reply.includes("log in"));
    });

    it("should strictly isolate patient data: Patient 2 cannot see Patient 1's appointments", async () => {
      const res = await processAssistantMessage({
        message: "Show my appointments",
        user: { id: testPatient2._id.toString(), role: "patient" },
      });

      assert.equal(res.success, true);
      assert.equal(res.appointments.length, 0, "Patient 2 must see 0 appointments");
    });

    it("should show own appointments for authenticated Patient 1", async () => {
      const res = await processAssistantMessage({
        message: "Show my upcoming appointments",
        user: { id: testPatient1._id.toString(), role: "patient" },
      });

      assert.equal(res.success, true);
      assert.equal(res.appointments.length, 1);
      assert.equal(res.appointments[0]._id.toString(), testAppointment._id.toString());
    });
  });

  describe("6. Rescheduling API Functionality (Requirement 5)", () => {
    it("should successfully reschedule appointment when requested by owner patient", async () => {
      let statusResult = 200;
      let bodyResult = null;

      const mockReq = {
        params: { id: testAppointment._id.toString() },
        body: { slot: "Friday · 2:15 PM" },
        user: { id: testPatient1._id.toString(), role: "patient" },
      };

      const mockRes = {
        status: (code) => {
          statusResult = code;
          return mockRes;
        },
        json: (data) => {
          bodyResult = data;
          return mockRes;
        },
      };

      await rescheduleAppointment(mockReq, mockRes);
      assert.equal(statusResult, 200);
      assert.ok(bodyResult.appointment);
      assert.equal(bodyResult.appointment.slot, "Friday · 2:15 PM");

      // Verify persistence in MongoDB
      const updated = await Appointment.findById(testAppointment._id);
      assert.equal(updated.slot, "Friday · 2:15 PM");
    });

    it("should reject rescheduling when attempted by a different patient (403 Forbidden)", async () => {
      let statusResult = 200;
      let bodyResult = null;

      const mockReq = {
        params: { id: testAppointment._id.toString() },
        body: { slot: "Tomorrow · 10:00 AM" },
        user: { id: testPatient2._id.toString(), role: "patient" },
      };

      const mockRes = {
        status: (code) => {
          statusResult = code;
          return mockRes;
        },
        json: (data) => {
          bodyResult = data;
          return mockRes;
        },
      };

      await rescheduleAppointment(mockReq, mockRes);
      assert.equal(statusResult, 403);
      assert.ok(bodyResult.message.includes("Forbidden") || bodyResult.message.includes("do not own"));
    });
  });

  describe("7. Route Registration & Mounting Compatibility (Prevent Route Mismatches)", () => {
    let appServer;
    let serverPort;

    before(async () => {
      // Dynamically mount an express instance with assistant routes to test route mounting
      const express = (await import("express")).default;
      const assistantRoutes = (await import("../routes/assistantRoutes.js")).default;

      const app = express();
      app.use(express.json());
      app.use("/api/assistant", assistantRoutes);
      app.use("/api/appointments/assistant", assistantRoutes);

      await new Promise((resolve) => {
        appServer = app.listen(0, () => {
          serverPort = appServer.address().port;
          resolve();
        });
      });
    });

    after(async () => {
      if (appServer) {
        await new Promise((resolve) => appServer.close(resolve));
      }
    });

    it("should successfully respond to POST /api/assistant/chat with HTTP 200", async () => {
      const res = await fetch(`http://127.0.0.1:${serverPort}/api/assistant/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Check dentist availability" }),
      });

      assert.equal(res.status, 200, "POST /api/assistant/chat must return 200 OK");
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(data.reply);
      assert.ok(Array.isArray(data.doctors));
      assert.ok(data.doctors.some((d) => d.specialty === "Dentist"));
    });

    it("should successfully respond to POST /api/assistant root mount with HTTP 200", async () => {
      const res = await fetch(`http://127.0.0.1:${serverPort}/api/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Check dentist availability" }),
      });

      assert.equal(res.status, 200, "POST /api/assistant must return 200 OK");
      const data = await res.json();
      assert.equal(data.success, true);
    });

    it("should successfully respond to alias POST /api/appointments/assistant with HTTP 200", async () => {
      const res = await fetch(`http://127.0.0.1:${serverPort}/api/appointments/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Check dentist availability" }),
      });

      assert.equal(res.status, 200, "POST /api/appointments/assistant must return 200 OK");
    });

    it("should successfully respond to GET /api/assistant probe with HTTP 200", async () => {
      const res = await fetch(`http://127.0.0.1:${serverPort}/api/assistant`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, "ok");
    });
  });
});
