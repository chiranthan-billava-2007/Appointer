import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: function () {
        return !this.isLegacy;
      },
    },
    patientName: {
      type: String,
      required: true,
      trim: true,
    },
    patientEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: function () {
        return !this.isLegacy;
      },
    },
    doctorName: {
      type: String,
      required: true,
      trim: true,
    },
    specialty: {
      type: String,
      required: true,
      trim: true,
    },
    clinicName: {
      type: String,
      default: "Appointer Partner Clinic",
    },
    location: {
      type: String,
      default: "Bengaluru",
    },
    slot: {
      type: String,
      required: true,
      trim: true,
    },
    // Optional for legacy display-only records. New bookings always set both fields.
    scheduledAt: {
      type: Date,
    },
    timezone: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["upcoming", "completed", "cancelled"],
      default: "upcoming",
    },
    notes: {
      type: String,
      default: "",
    },
    isLegacy: {
      type: Boolean,
      default: false,
    },
    legacyPreservedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Partial unique index: Only enforce slot uniqueness when status is "upcoming" and doctor is populated
// Cancelled or completed appointments do not block re-booking the slot!
appointmentSchema.index(
  { doctor: 1, slot: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "upcoming", doctor: { $exists: true } },
    name: "unique_upcoming_doctor_slot",
  }
);

// Date-based uniqueness is separate so old appointments without a real instant remain readable.
appointmentSchema.index(
  { doctor: 1, scheduledAt: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: "upcoming",
      doctor: { $exists: true },
      scheduledAt: { $type: "date" },
    },
    name: "unique_upcoming_doctor_scheduled_at",
  }
);

export default mongoose.model("Appointment", appointmentSchema);
