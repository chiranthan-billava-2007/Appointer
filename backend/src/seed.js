import mongoose from "mongoose";
import dotenv from "dotenv";
import Doctor from "./models/Doctor.js";
import { connectDB } from "./config/db.js";

dotenv.config();

const doctors = [
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

const seedData = async () => {
  try {
    await connectDB();
    await Doctor.deleteMany({});
    await Doctor.insertMany(doctors);
    console.log("Database seeded successfully with initial doctors!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
};

seedData();
