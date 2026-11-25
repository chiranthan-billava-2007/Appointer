import mongoose from "mongoose";
import Appointment from "../models/Appointment.js";
import Doctor from "../models/Doctor.js";
import { buildNormalizedSlotRegex, normalizeSlot } from "../utils/appointmentSlotUtils.js";
import { resolveAppointmentSlot } from "../utils/appointmentDateTime.js";
import { emitAppointmentEvent } from "../realtime/socketServer.js";

export const getAppointments = async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === "patient") {
      // Patients can ONLY query appointments they own by User ObjectId
      // Legacy records without a patient ObjectId are strictly restricted from patients
      filter = {
        patient: new mongoose.Types.ObjectId(req.user.id),
      };
    } else if (req.user.role === "doctor") {
      // Doctors can ONLY query appointments assigned to their linked doctor profile ObjectId
      const doctorProfile = await Doctor.findOne({ user: new mongoose.Types.ObjectId(req.user.id) });
      if (!doctorProfile) {
        return res.status(403).json({
          message: "Doctor account has no linked profile. Access denied.",
        });
      }
      filter = {
        doctor: doctorProfile._id,
      };
    } else if (req.user.role === "admin") {
      // Admins have oversight and can view all appointments, including legacy unlinked records
      filter = {};
    }

    const appointments = await Appointment.find(filter).sort({ createdAt: -1 });
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createAppointment = async (req, res) => {
  try {
    const { doctorId, slot, date, time, notes } = req.body;

    if (!doctorId || (!(date && time) && !slot)) {
      return res.status(400).json({ message: "doctorId and either date/time or slot are required" });
    }

    if (slot != null && (typeof slot !== "string" || !normalizeSlot(slot))) {
      return res.status(400).json({ message: "Invalid slot format provided" });
    }

    // REQUIREMENT: Demo doctors are directory-only; reject their bookings
    if (doctorId.startsWith("doc-")) {
      return res.status(400).json({
        message: "This provider is a directory preview profile and is not currently accepting direct platform bookings. Please select a verified doctor.",
      });
    }

    if (!mongoose.isValidObjectId(doctorId)) {
      return res.status(400).json({ message: "Invalid doctorId format provided" });
    }

    const doctorDoc = await Doctor.findById(doctorId);
    if (!doctorDoc) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    // Only allow slots configured by this doctor; persist the schedule's canonical spelling.
    const requested = resolveAppointmentSlot({ doctor: doctorDoc, date, time, slot });

    // Defense-in-depth check; the partial unique index below remains the race-safe guard.
    const existing = await Appointment.findOne({
      doctor: doctorDoc._id,
      status: "upcoming",
      $or: [
        { scheduledAt: requested.scheduledAt },
        {
          scheduledAt: { $exists: false },
          slot: { $regex: buildNormalizedSlotRegex(slot || requested.slot) },
        },
      ],
    });
    if (existing) {
      return res.status(409).json({
        message: `The slot '${requested.slot}' with ${doctorDoc.name} is already booked. Please choose another time.`,
      });
    }

    // Zero-trust patient identity: derived directly from authenticated JWT user
    const patientId = new mongoose.Types.ObjectId(req.user.id);
    const patientName = req.user.name;
    const patientEmail = req.user.email;

    try {
      const newAppointment = await Appointment.create({
        patient: patientId,
        patientName,
        patientEmail,
        doctor: doctorDoc._id,
        doctorName: doctorDoc.name,
        specialty: doctorDoc.specialty,
        clinicName: doctorDoc.clinicName,
        location: doctorDoc.location,
        slot: requested.slot,
        scheduledAt: requested.scheduledAt,
        timezone: requested.timezone,
        status: "upcoming",
        notes: typeof notes === "string" ? notes.trim() : "",
      });

      emitAppointmentEvent("appointment:created", newAppointment);

      return res.status(201).json(newAppointment);
    } catch (dbErr) {
      // Catch MongoDB duplicate key error (code 11000) from partial unique index
      if (dbErr.code === 11000) {
        return res.status(409).json({
          message: `The slot '${requested.slot}' with ${doctorDoc.name} is already booked. Please choose another time.`,
        });
      }
      throw dbErr;
    }
  } catch (error) {
    res.status(error.status || 400).json({ message: error.message });
  }
};

export const updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ["upcoming", "completed", "cancelled"];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: `Status must be one of: [${allowedStatuses.join(", ")}]`,
      });
    }

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid appointment ID" });
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    // Unlinked legacy records restricted exclusively to admins
    if (appointment.isLegacy || !appointment.doctor) {
      if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Legacy unlinked records can only be managed by administrators." });
      }
    } else if (req.user.role === "doctor") {
      const doctorProfile = await Doctor.findOne({ user: new mongoose.Types.ObjectId(req.user.id) });
      if (!doctorProfile || appointment.doctor.toString() !== doctorProfile._id.toString()) {
        return res.status(403).json({ message: "Forbidden: You cannot modify another doctor's appointment." });
      }
    } else if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: Only attending doctors or admins can update status." });
    }

    // State transition rules:
    // Completed and cancelled appointments cannot be modified
    if (appointment.status === "completed" && status !== "completed") {
      return res.status(400).json({
        message: "Invalid transition: A completed appointment cannot be modified.",
      });
    }

    if (appointment.status === "cancelled" && status !== "cancelled") {
      return res.status(400).json({
        message: "Invalid transition: A cancelled appointment cannot be reactivated.",
      });
    }

    appointment.status = status;
    await appointment.save();

    emitAppointmentEvent(status === "completed" ? "appointment:completed" : status === "cancelled" ? "appointment:cancelled" : "appointment:updated", appointment);

    res.json(appointment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Safe cancellation endpoint (Status-based cancellation preferred over permanent deletion)
export const deleteAppointment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid appointment ID" });
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    // Unlinked legacy records restricted exclusively to admins
    if (appointment.isLegacy || !appointment.patient || !appointment.doctor) {
      if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Legacy unlinked records can only be managed by administrators." });
      }
    } else if (req.user.role === "patient") {
      // Patient ownership strictly by User ObjectId
      if (appointment.patient.toString() !== req.user.id) {
        return res.status(403).json({ message: "Forbidden: You do not own this appointment." });
      }
    } else if (req.user.role === "doctor") {
      // Doctor ownership strictly by Doctor ObjectId
      const doctorProfile = await Doctor.findOne({ user: new mongoose.Types.ObjectId(req.user.id) });
      if (!doctorProfile || appointment.doctor.toString() !== doctorProfile._id.toString()) {
        return res.status(403).json({ message: "Forbidden: You are not the attending doctor for this appointment." });
      }
    } else if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: Insufficient privileges." });
    }

    // Cannot cancel a completed appointment
    if (appointment.status === "completed") {
      return res.status(400).json({
        message: "Action rejected: A completed appointment cannot be cancelled.",
      });
    }

    // Status-based cancellation (preserves audit history and releases the partial unique index slot!)
    appointment.status = "cancelled";
    await appointment.save();

    emitAppointmentEvent("appointment:cancelled", appointment);

    res.json({ message: "Appointment cancelled successfully", appointment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Reschedule an upcoming appointment to a new available slot
export const rescheduleAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { slot, date, time } = req.body;

    if (!(date && time) && (typeof slot !== "string" || !slot.trim())) {
      return res.status(400).json({ message: "A new date/time or slot is required for rescheduling" });
    }
    if (slot != null && (typeof slot !== "string" || !normalizeSlot(slot))) {
      return res.status(400).json({ message: "Invalid slot format provided" });
    }

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid appointment ID" });
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    // Ownership check: Patient can only reschedule their own appointment; Admin has oversight
    if (appointment.isLegacy || !appointment.patient || !appointment.doctor) {
      if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Legacy unlinked records can only be managed by administrators." });
      }
    } else if (req.user.role === "patient") {
      if (appointment.patient.toString() !== req.user.id) {
        return res.status(403).json({ message: "Forbidden: You do not own this appointment." });
      }
    } else if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: Insufficient privileges." });
    }

    // State transition rules: only upcoming appointments can be rescheduled
    if (appointment.status !== "upcoming") {
      return res.status(400).json({
        message: `Action rejected: A ${appointment.status} appointment cannot be rescheduled.`,
      });
    }

    // Verify the attending doctor exists
    const doctorDoc = await Doctor.findById(appointment.doctor);
    if (!doctorDoc) {
      return res.status(404).json({ message: "Attending doctor profile not found" });
    }

    const requested = resolveAppointmentSlot({ doctor: doctorDoc, date, time, slot });

    const conflicting = await Appointment.findOne({
      _id: { $ne: appointment._id },
      doctor: appointment.doctor,
      status: "upcoming",
      $or: [
        { scheduledAt: requested.scheduledAt },
        {
          scheduledAt: { $exists: false },
          slot: { $regex: buildNormalizedSlotRegex(slot || requested.slot) },
        },
      ],
    });
    if (conflicting) {
      return res.status(409).json({
        message: `The slot '${requested.slot}' with ${doctorDoc.name} is already booked. Please choose another time.`,
      });
    }

    // Compare-and-swap prevents simultaneous reschedules of this appointment from overwriting each other.
    const originalSlotFilter = appointment.scheduledAt
      ? { scheduledAt: appointment.scheduledAt }
      : { scheduledAt: { $exists: false }, slot: appointment.slot };
    const updatedAppointment = await Appointment.findOneAndUpdate(
      { _id: appointment._id, status: "upcoming", ...originalSlotFilter },
      {
        $set: {
          slot: requested.slot,
          scheduledAt: requested.scheduledAt,
          timezone: requested.timezone,
        },
      },
      { returnDocument: "after", runValidators: true }
    );

    if (!updatedAppointment) {
      return res.status(409).json({
        message: "This appointment changed while you were rescheduling it. Refresh and try again.",
      });
    }

    emitAppointmentEvent("appointment:rescheduled", updatedAppointment);

    res.json({
      message: "Appointment rescheduled successfully",
      appointment: updatedAppointment,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "The slot is already booked. Please choose another time.",
      });
    }
    res.status(error.status || 500).json({ message: error.message });
  }
};
