import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // 1 doctor login account maps to exactly 1 doctor profile
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    specialty: {
      type: String,
      required: true,
      trim: true,
    },
    experienceYears: {
      type: Number,
      default: 5,
    },
    qualifications: {
      type: String,
      default: "MBBS, MD",
      trim: true,
    },
    consultationFee: {
      type: Number,
      default: 600,
    },
    profileImage: {
      type: String,
      default: "",
    },
    isDemo: {
      type: Boolean,
      default: false,
    },
    rating: {
      type: Number,
      default: 4.8,
    },
    reviewsCount: {
      type: Number,
      default: 120,
    },
    clinicName: {
      type: String,
      default: "City Health Clinic",
    },
    location: {
      type: String,
      default: "Bengaluru",
    },
    about: {
      type: String,
      default: "Dedicated healthcare professional committed to comprehensive patient wellness.",
    },
    areasOfCare: {
      type: [String],
      default: ["Preventive care", "General consultation"],
    },
    availableSlots: {
      type: [String],
      default: ["Today · 4:30 PM", "Tomorrow · 10:00 AM", "Friday · 2:15 PM"],
    },
  },
  { timestamps: true }
);

export default mongoose.model("Doctor", doctorSchema);
