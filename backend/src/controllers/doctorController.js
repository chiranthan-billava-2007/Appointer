import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import Doctor from "../models/Doctor.js";
import User from "../models/User.js";

// Demo/Directory fallback doctors (Directory preview only, direct platform booking not accepted)
const DEFAULT_DOCTORS = [
  {
    name: "Dr. Ananya Sharma",
    specialty: "Dermatologist",
    experienceYears: 12,
    rating: 4.9,
    reviewsCount: 248,
    clinicName: "ClearSkin Dermatology Clinic",
    location: "Indiranagar, Bengaluru",
    about: "Dr. Sharma provides thoughtful, practical care for skin and hair concerns.",
    areasOfCare: ["Acne care", "Skin health", "Hair & scalp", "Preventive care"],
    availableSlots: ["Today · 4:30 PM", "Tomorrow · 10:00 AM", "Friday · 2:15 PM"],
  },
  {
    name: "Dr. Rohan Mehta",
    specialty: "Dentist",
    experienceYears: 8,
    rating: 4.8,
    reviewsCount: 154,
    clinicName: "Bright Smile Dental Care",
    location: "Koramangala, Bengaluru",
    about: "Dr. Mehta specializes in preventive, cosmetic, and restorative dentistry.",
    areasOfCare: ["Teeth cleaning", "Cavity fillings", "Cosmetic whitening", "Root canal"],
    availableSlots: ["Tomorrow · 11:30 AM", "Thursday · 3:00 PM", "Saturday · 10:00 AM"],
  },
  {
    name: "Dr. Kavya Nair",
    specialty: "General physician",
    experienceYears: 10,
    rating: 4.9,
    reviewsCount: 188,
    clinicName: "Wellness First Clinic",
    location: "Whitefield, Bengaluru",
    about: "Dr. Nair treats routine illnesses, chronic lifestyle conditions, and annual wellness checks.",
    areasOfCare: ["Viral fever", "Hypertension", "Diabetes management", "General checkup"],
    availableSlots: ["Today · 5:30 PM", "Tomorrow · 9:00 AM", "Friday · 4:00 PM"],
  },
  {
    name: "Dr. Arjun Rao",
    specialty: "Cardiologist",
    experienceYears: 15,
    rating: 4.9,
    reviewsCount: 222,
    clinicName: "Heart Care Institute",
    location: "Jayanagar, Bengaluru",
    about: "Dr. Rao provides preventive and interventional cardiology diagnostics and patient care.",
    areasOfCare: ["Heart health checkup", "ECG assessment", "Hypertension", "Lipid profiling"],
    availableSlots: ["Wednesday · 2:00 PM", "Friday · 11:00 AM"],
  },
  {
    name: "Dr. Meera Iyer",
    specialty: "Eye specialist",
    experienceYears: 9,
    rating: 4.7,
    reviewsCount: 130,
    clinicName: "Vision Clear Eye Centre",
    location: "HSR Layout, Bengaluru",
    about: "Dr. Iyer offers thorough vision screening, dry eye treatments, and pediatric eye care.",
    areasOfCare: ["Vision testing", "Dry eye relief", "Cataract evaluation", "Computer vision care"],
    availableSlots: ["Today · 6:00 PM", "Tomorrow · 2:30 PM", "Saturday · 11:30 AM"],
  },
  {
    name: "Dr. Nisha Kapoor",
    specialty: "Gynecologist",
    experienceYears: 11,
    rating: 4.9,
    reviewsCount: 210,
    clinicName: "Bloom Women's Clinic",
    location: "MG Road, Bengaluru",
    about: "Dr. Kapoor focuses on reproductive health, prenatal guidance, and preventative wellness.",
    areasOfCare: ["Routine checkup", "Prenatal advice", "PCOS management", "Hormonal health"],
    availableSlots: ["Tomorrow · 1:00 PM", "Thursday · 10:30 AM", "Saturday · 3:00 PM"],
  },
];

export const getDoctors = async (req, res) => {
  try {
    const { search, specialty } = req.query;
    let query = {};

    if (search && typeof search === "string") {
      const sanitized = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { name: { $regex: sanitized, $options: "i" } },
        { specialty: { $regex: sanitized, $options: "i" } },
      ];
    }

    if (specialty && specialty !== "All specialties") {
      query.specialty = specialty;
    }

    let doctors = await Doctor.find(query);

    // If database returned 0 verified doctors, provide demo doctors in memory for directory browsing
    if (!doctors || doctors.length === 0) {
      let filtered = [...DEFAULT_DOCTORS];
      if (search && typeof search === "string") {
        const s = search.toLowerCase();
        filtered = filtered.filter(
          (d) => d.name.toLowerCase().includes(s) || d.specialty.toLowerCase().includes(s)
        );
      }
      if (specialty && specialty !== "All specialties") {
        filtered = filtered.filter((d) => d.specialty === specialty);
      }
      return res.json(filtered.map((d, i) => ({ ...d, _id: `doc-${i + 1}`, isDemo: true })));
    }

    res.json(doctors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getDoctorById = async (req, res) => {
  try {
    const { id } = req.params;
    let doctor = null;

    if (id && mongoose.isValidObjectId(id)) {
      try {
        doctor = await Doctor.findById(id);
      } catch {
        // cast error
      }
    }

    if (!doctor) {
      // Check fallback demo list if id is in format doc-X
      if (typeof id === "string" && id.startsWith("doc-")) {
        const numericIndex = parseInt(id.replace("doc-", ""), 10) - 1;
        if (!isNaN(numericIndex) && DEFAULT_DOCTORS[numericIndex]) {
          doctor = { ...DEFAULT_DOCTORS[numericIndex], _id: id, isDemo: true };
        }
      }
    }

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    res.json(doctor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// CANONICAL DOCTOR ONBOARDING (Admin only, with Hardened Compensating Rollback)
export const createDoctor = async (req, res) => {
  let createdUser = null;
  try {
    const {
      email,
      password,
      name,
      specialty,
      experienceYears,
      clinicName,
      location,
      about,
      areasOfCare,
      availableSlots,
      phone,
    } = req.body;

    if (!email || !password || !name || !specialty) {
      return res.status(400).json({
        message: "Doctor email, password, name, and specialty are required for onboarding.",
      });
    }

    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters long" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: "A user with this email already exists" });
    }

    // Step 1: Create Doctor User Account
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    createdUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: "doctor",
      phone: phone || "",
    });

    // Step 2: Create Doctor Profile linked 1-to-1 with createdUser._id
    let doctorProfile;
    try {
      doctorProfile = await Doctor.create({
        user: createdUser._id,
        name: name.trim(),
        specialty: specialty.trim(),
        experienceYears: experienceYears || 5,
        clinicName: clinicName || "City Health Clinic",
        location: location || "Bengaluru",
        about: about || "Dedicated healthcare professional.",
        areasOfCare: Array.isArray(areasOfCare) ? areasOfCare : ["General consultation"],
        availableSlots: Array.isArray(availableSlots) ? availableSlots : ["Today · 4:30 PM", "Tomorrow · 10:00 AM"],
      });
    } catch (profileError) {
      // HARDENED COMPENSATING ROLLBACK:
      // In standalone MongoDB (no replica set), if doctor profile creation fails,
      // reliably delete the created user account to guarantee zero orphaned user accounts.
      if (createdUser && createdUser._id) {
        try {
          await User.findByIdAndDelete(createdUser._id);
        } catch (rollbackErr) {
          console.error("[Doctor Onboarding] Critical: Rollback user deletion failed:", rollbackErr.message);
        }
      }
      throw profileError;
    }

    res.status(201).json({
      message: "Doctor onboarded successfully",
      user: {
        _id: createdUser._id,
        name: createdUser.name,
        email: createdUser.email,
        role: createdUser.role,
      },
      doctor: doctorProfile,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
