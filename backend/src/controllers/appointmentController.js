import mongoose from "mongoose";
import Appointment from "../models/Appointment.js";
import Doctor from "../models/Doctor.js";

// Helper to sanitize slot string: collapse multiple spaces, trim whitespace
function normalizeSlot(slot) {
  if (!slot || typeof slot !== "string") return "";
  return slot.trim().replace(/\s+/g, " ");
}

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
    const { doctorId, slot, notes } = req.body;

    if (!doctorId || !slot) {
      return res.status(400).json({ message: "doctorId and slot are required" });
    }

    const normalizedSlot = normalizeSlot(slot);
    if (!normalizedSlot) {
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

    // Canonicalize slot to doctor's official schedule if matched
    const canonicalSlot = doctorDoc.availableSlots?.find(
      (s) => normalizeSlot(s).toLowerCase() === normalizedSlot.toLowerCase()
    );
    const slotToSave = canonicalSlot || normalizedSlot;

    // Check if slot is already booked for this doctor (defense-in-depth check)
    const existing = await Appointment.findOne({
      doctor: doctorDoc._id,
      slot: { $regex: new RegExp(`^${slotToSave.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
      status: "upcoming",
    });
    if (existing) {
      return res.status(409).json({
        message: `The slot '${slotToSave}' with ${doctorDoc.name} is already booked. Please choose another time.`,
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
        slot: slotToSave,
        status: "upcoming",
        notes: notes ? notes.trim() : "",
      });

      return res.status(201).json(newAppointment);
    } catch (dbErr) {
      // Catch MongoDB duplicate key error (code 11000) from partial unique index
      if (dbErr.code === 11000) {
        return res.status(409).json({
          message: `The slot '${slotToSave}' with ${doctorDoc.name} is already booked. Please choose another time.`,
        });
      }
      throw dbErr;
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
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

    res.json({ message: "Appointment cancelled successfully", appointment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Reschedule an upcoming appointment to a new available slot
export const rescheduleAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { slot } = req.body;

    if (!slot || typeof slot !== "string" || !slot.trim()) {
      return res.status(400).json({ message: "A new slot is required for rescheduling" });
    }

    const normalizedSlot = normalizeSlot(slot);
    if (!normalizedSlot) {
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

    // Verify new slot is in doctor's scheduled availableSlots and canonicalize casing
    const canonicalSlot = doctorDoc.availableSlots.find(
      (s) => normalizeSlot(s).toLowerCase() === normalizedSlot.toLowerCase()
    );
    if (!canonicalSlot) {
      return res.status(400).json({
        message: `Slot '${normalizedSlot}' is not in ${doctorDoc.name}'s schedule. Available slots: ${doctorDoc.availableSlots.join(", ")}`,
      });
    }

    // Check if slot is already booked by another upcoming appointment for this doctor
    const conflicting = await Appointment.findOne({
      _id: { $ne: appointment._id },
      doctor: appointment.doctor,
      slot: { $regex: new RegExp(`^${canonicalSlot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
      status: "upcoming",
    });

    if (conflicting) {
      return res.status(409).json({
        message: `The slot '${canonicalSlot}' with ${doctorDoc.name} is already booked. Please choose another time.`,
      });
    }

    appointment.slot = canonicalSlot;
    await appointment.save();

    res.json({
      message: "Appointment rescheduled successfully",
      appointment,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "The slot is already booked. Please choose another time.",
      });
    }
    res.status(500).json({ message: error.message });
  }
};
