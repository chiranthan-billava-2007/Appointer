import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import Doctor from "../models/Doctor.js";
import User from "../models/User.js";
import { connectDB } from "../config/db.js";

dotenv.config();

export const DEMO_DOCTORS = [
  // 1. Cardiology (Doctor 1)
  {
    name: "Dr. Rajesh K. Varma",
    email: "rajesh.varma.demo@appointer.internal",
    specialty: "Cardiology",
    experienceYears: 16,
    qualifications: "MBBS, MD (Gen Med), DM (Cardiology), FACC",
    consultationFee: 850,
    profileImage: "/assets/doctors/dr-rajesh-varma.png",
    isDemo: true,
    rating: 4.9,
    reviewsCount: 312,
    clinicName: "Apex Heart & Vascular Center",
    location: "Indiranagar, Bengaluru",
    about: "[Fictional Demo Record] Senior interventional cardiologist with 16 years of clinical excellence in coronary angiography, complex angioplasty, hypertension control, and preventive cardiovascular care.",
    areasOfCare: ["Preventive Cardiology", "Coronary Angiography", "Hypertension Control", "Lipid Disorders", "Cardiologist Consultation"],
    availableSlots: ["Tomorrow · 10:30 AM", "Tomorrow · 04:00 PM", "Friday · 11:15 AM", "Saturday · 02:30 PM"],
  },
  // 1. Cardiology (Doctor 2)
  {
    name: "Dr. Sunita Deshmukh",
    email: "sunita.deshmukh.demo@appointer.internal",
    specialty: "Cardiology",
    experienceYears: 11,
    qualifications: "MBBS, DNB (Cardiology), Fellowship in Non-Invasive Cardiology",
    consultationFee: 750,
    profileImage: "/assets/doctors/dr-sunita-deshmukh.png",
    isDemo: true,
    rating: 4.8,
    reviewsCount: 198,
    clinicName: "HeartBeat Care & Diagnostics",
    location: "Koramangala, Bengaluru",
    about: "[Fictional Demo Record] Non-invasive cardiologist specializing in echocardiography, cardiac rhythm monitoring, heart failure management, and comprehensive women's heart health.",
    areasOfCare: ["Heart Failure Management", "Arrhythmia Screening", "2D Echocardiography", "Holter Monitoring", "Cardiologist Consultation"],
    availableSlots: ["Today · 05:00 PM", "Tomorrow · 09:30 AM", "Thursday · 03:00 PM", "Saturday · 11:00 AM"],
  },

  // 2. Dermatology (Doctor 3)
  {
    name: "Dr. Vikram Aditya",
    email: "vikram.aditya.demo@appointer.internal",
    specialty: "Dermatology",
    experienceYears: 13,
    qualifications: "MBBS, MD (Dermatology, Venereology & Leprosy)",
    consultationFee: 650,
    profileImage: "/assets/doctors/dr-vikram-aditya.png",
    isDemo: true,
    rating: 4.9,
    reviewsCount: 275,
    clinicName: "DermaCare Advanced Skin Clinic",
    location: "Jayanagar, Bengaluru",
    about: "[Fictional Demo Record] Consultant dermatologist and trichologist specializing in severe acne therapy, eczema, chronic psoriasis, scalp disorders, and laser scar revision.",
    areasOfCare: ["Acne & Scar Therapy", "Eczema & Psoriasis", "Hair Loss & Trichology", "Chemical Peels", "Dermatologist Consultation"],
    availableSlots: ["Tomorrow · 11:00 AM", "Tomorrow · 05:30 PM", "Friday · 03:30 PM", "Saturday · 04:00 PM"],
  },
  // 2. Dermatology (Doctor 4)
  {
    name: "Dr. Radhika Sen",
    email: "radhika.sen.demo@appointer.internal",
    specialty: "Dermatology",
    experienceYears: 9,
    qualifications: "MBBS, DVD, Fellowship in Aesthetic Dermatology",
    consultationFee: 600,
    profileImage: "/assets/doctors/dr-radhika-sen.png",
    isDemo: true,
    rating: 4.8,
    reviewsCount: 164,
    clinicName: "Glow & Radiance Aesthetics",
    location: "Whitefield, Bengaluru",
    about: "[Fictional Demo Record] Aesthetic dermatologist dedicated to evidence-based skin allergy treatment, pigmentation correction, melasma therapies, and preventive skincare.",
    areasOfCare: ["Skin Allergy Testing", "Pigmentation & Melasma", "Anti-Aging Consultation", "Sensitive Skin Care", "Dermatologist Consultation"],
    availableSlots: ["Today · 06:15 PM", "Tomorrow · 02:00 PM", "Thursday · 10:00 AM", "Saturday · 01:30 PM"],
  },

  // 3. Neurology (Doctor 5)
  {
    name: "Dr. Alok Mukherjee",
    email: "alok.mukherjee.demo@appointer.internal",
    specialty: "Neurology",
    experienceYears: 18,
    qualifications: "MBBS, MD (General Medicine), DM (Neurology)",
    consultationFee: 900,
    profileImage: "/assets/doctors/dr-alok-mukherjee.png",
    isDemo: true,
    rating: 4.9,
    reviewsCount: 340,
    clinicName: "NeuroLife Institute of Brain & Spine",
    location: "Malleshwaram, Bengaluru",
    about: "[Fictional Demo Record] Senior consultant neurologist with extensive clinical experience in acute stroke rehabilitation, epilepsy management, Parkinson's disease, and neurodegenerative disorders.",
    areasOfCare: ["Stroke Rehabilitation", "Epilepsy Management", "Parkinson's Disease", "Nerve Conduction Studies", "Neurologist Consultation"],
    availableSlots: ["Tomorrow · 10:00 AM", "Thursday · 04:30 PM", "Friday · 10:00 AM", "Saturday · 12:00 PM"],
  },
  // 3. Neurology (Doctor 6)
  {
    name: "Dr. Prerna Chawla",
    email: "prerna.chawla.demo@appointer.internal",
    specialty: "Neurology",
    experienceYears: 10,
    qualifications: "MBBS, DNB (Neurology), Fellowship in Headache Disorders",
    consultationFee: 800,
    profileImage: "/assets/doctors/dr-prerna-chawla.png",
    isDemo: true,
    rating: 4.8,
    reviewsCount: 185,
    clinicName: "Cerebral Health & Headache Clinic",
    location: "HSR Layout, Bengaluru",
    about: "[Fictional Demo Record] Specialist neurologist dedicated to comprehensive chronic migraine treatment, cluster headaches, peripheral neuropathy, and sleep-related neurological disorders.",
    areasOfCare: ["Chronic Migraine & Headache", "Vertigo & Balance Disorders", "Peripheral Neuropathy", "Sleep Neurology", "Neurologist Consultation"],
    availableSlots: ["Today · 04:00 PM", "Tomorrow · 01:30 PM", "Friday · 05:00 PM", "Saturday · 10:30 AM"],
  },

  // 4. Orthopedics (Doctor 7)
  {
    name: "Dr. Harish K. Gowda",
    email: "harish.gowda.demo@appointer.internal",
    specialty: "Orthopedics",
    experienceYears: 17,
    qualifications: "MBBS, MS (Orthopedics), M.Ch (Orthopedics), Fellowship in Joint Replacement",
    consultationFee: 850,
    profileImage: "/assets/doctors/dr-harish-gowda.png",
    isDemo: true,
    rating: 4.9,
    reviewsCount: 290,
    clinicName: "Orthocare Bone & Joint Center",
    location: "Rajajinagar, Bengaluru",
    about: "[Fictional Demo Record] Senior orthopedic surgeon specializing in robotic-assisted knee and hip replacement, complex trauma fracture fixation, osteoarthritis, and geriatric bone care.",
    areasOfCare: ["Joint Replacement", "Knee & Hip Arthritis", "Complex Fracture Care", "Geriatric Bone Health", "Orthopedic Surgeon Consultation"],
    availableSlots: ["Tomorrow · 09:00 AM", "Tomorrow · 03:00 PM", "Friday · 02:00 PM", "Saturday · 11:30 AM"],
  },
  // 4. Orthopedics (Doctor 8)
  {
    name: "Dr. Shalini Prasad",
    email: "shalini.prasad.demo@appointer.internal",
    specialty: "Orthopedics",
    experienceYears: 12,
    qualifications: "MBBS, MS (Orthopedics), Fellowship in Sports Medicine & Arthroscopy",
    consultationFee: 750,
    profileImage: "/assets/doctors/dr-shalini-prasad.png",
    isDemo: true,
    rating: 4.8,
    reviewsCount: 215,
    clinicName: "Motion & Sports Injury Institute",
    location: "Indiranagar, Bengaluru",
    about: "[Fictional Demo Record] Sports medicine orthopedic surgeon with expertise in arthroscopic ligament reconstruction, ACL/PCL tears, shoulder dislocations, and athletic rehabilitation.",
    areasOfCare: ["Sports Injuries", "ACL & Meniscus Repair", "Shoulder Arthroscopy", "Sprains & Tendonitis", "Orthopedic Surgeon Consultation"],
    availableSlots: ["Today · 05:30 PM", "Tomorrow · 11:30 AM", "Thursday · 02:30 PM", "Saturday · 03:00 PM"],
  },

  // 5. Pediatrics (Doctor 9)
  {
    name: "Dr. Suresh N. Balaji",
    email: "suresh.balaji.demo@appointer.internal",
    specialty: "Pediatrics",
    experienceYears: 15,
    qualifications: "MBBS, MD (Pediatrics), DCH, FIAP",
    consultationFee: 600,
    profileImage: "/assets/doctors/dr-suresh-balaji.png",
    isDemo: true,
    rating: 4.9,
    reviewsCount: 380,
    clinicName: "Little Wonders Children's Hospital",
    location: "BTM Layout, Bengaluru",
    about: "[Fictional Demo Record] Compassionate senior pediatrician providing comprehensive childhood immunization, newborn screening, milestone tracking, and pediatric acute care.",
    areasOfCare: ["Newborn & Infant Care", "Childhood Immunization", "Growth & Milestone Tracking", "Pediatric Acute Infections", "Pediatrician Consultation"],
    availableSlots: ["Tomorrow · 10:00 AM", "Tomorrow · 04:30 PM", "Thursday · 06:00 PM", "Friday · 11:00 AM"],
  },
  // 5. Pediatrics (Doctor 10)
  {
    name: "Dr. Deepa Ramachandran",
    email: "deepa.ramachandran.demo@appointer.internal",
    specialty: "Pediatrics",
    experienceYears: 9,
    qualifications: "MBBS, DNB (Pediatrics), Fellowship in Pediatric Pulmonology",
    consultationFee: 550,
    profileImage: "/assets/doctors/dr-deepa-ramachandran.png",
    isDemo: true,
    rating: 4.8,
    reviewsCount: 172,
    clinicName: "KiddieCare Pediatric & Allergy Clinic",
    location: "Electronic City, Bengaluru",
    about: "[Fictional Demo Record] Dedicated pediatrician focusing on childhood asthma, seasonal allergic rhinitis, infant nutrition guidance, and routine adolescent wellness checks.",
    areasOfCare: ["Pediatric Asthma", "Childhood Allergies", "Seasonal Flu & Colds", "Child Nutrition Counseling", "Pediatrician Consultation"],
    availableSlots: ["Today · 04:30 PM", "Tomorrow · 09:00 AM", "Friday · 03:00 PM", "Saturday · 10:00 AM"],
  },

  // 6. General Medicine (Doctor 11)
  {
    name: "Dr. Manoj K. Srivastava",
    email: "manoj.srivastava.demo@appointer.internal",
    specialty: "General Medicine",
    experienceYears: 14,
    qualifications: "MBBS, MD (General Medicine)",
    consultationFee: 500,
    profileImage: "/assets/doctors/dr-manoj-srivastava.png",
    isDemo: true,
    rating: 4.9,
    reviewsCount: 260,
    clinicName: "CityCare Family & Internal Medicine",
    location: "Koramangala, Bengaluru",
    about: "[Fictional Demo Record] Consultant internal medicine physician focusing on adult preventative health, type-2 diabetes management, blood pressure regulation, and infectious disease care.",
    areasOfCare: ["Type-2 Diabetes", "Hypertension Regulation", "Annual Wellness Screening", "Infectious Diseases", "General Physician Consultation"],
    availableSlots: ["Tomorrow · 08:30 AM", "Tomorrow · 05:00 PM", "Thursday · 11:00 AM", "Saturday · 09:30 AM"],
  },
  // 6. General Medicine (Doctor 12)
  {
    name: "Dr. Swati Kulkarni",
    email: "swati.kulkarni.demo@appointer.internal",
    specialty: "General Medicine",
    experienceYears: 10,
    qualifications: "MBBS, DNB (Family Medicine), Post-Graduate Diploma in Diabetology",
    consultationFee: 450,
    profileImage: "/assets/doctors/dr-swati-kulkarni.png",
    isDemo: true,
    rating: 4.8,
    reviewsCount: 195,
    clinicName: "LifeLine Community Health Center",
    location: "HSR Layout, Bengaluru",
    about: "[Fictional Demo Record] General physician and family medicine specialist committed to routine primary care, acute viral fevers, digestive health, and holistic lifestyle wellness.",
    areasOfCare: ["Viral Fevers & Infection", "Gastric & Digestive Issues", "Metabolic Screening", "Adult Vaccinations", "General Physician Consultation"],
    availableSlots: ["Today · 06:00 PM", "Tomorrow · 10:00 AM", "Friday · 04:00 PM", "Saturday · 02:00 PM"],
  },

  // 7. Gynecology (Doctor 13)
  {
    name: "Dr. Meenakshi Sundaram",
    email: "meenakshi.sundaram.demo@appointer.internal",
    specialty: "Gynecology",
    experienceYears: 16,
    qualifications: "MBBS, MS (Obstetrics & Gynecology), DGO, Fellowship in Fetal Medicine",
    consultationFee: 800,
    profileImage: "/assets/doctors/dr-meenakshi-sundaram.png",
    isDemo: true,
    rating: 4.9,
    reviewsCount: 320,
    clinicName: "Mother & Cradle Maternity Center",
    location: "Jayanagar, Bengaluru",
    about: "[Fictional Demo Record] Senior obstetrician and gynecologist with deep expertise in high-risk pregnancies, pre-conception guidance, prenatal sonography, and normal delivery care.",
    areasOfCare: ["High-Risk Pregnancy", "Prenatal & Postnatal Care", "Obstetric Sonography", "Normal Delivery Counseling", "Gynecologist Consultation"],
    availableSlots: ["Tomorrow · 11:00 AM", "Tomorrow · 03:30 PM", "Thursday · 10:00 AM", "Saturday · 11:00 AM"],
  },
  // 7. Gynecology (Doctor 14)
  {
    name: "Dr. Tanvi Parekh",
    email: "tanvi.parekh.demo@appointer.internal",
    specialty: "Gynecology",
    experienceYears: 11,
    qualifications: "MBBS, DNB (OBG), Fellowship in Reproductive Medicine",
    consultationFee: 700,
    profileImage: "/assets/doctors/dr-tanvi-parekh.png",
    isDemo: true,
    rating: 4.8,
    reviewsCount: 210,
    clinicName: "Harmony Women's Wellness & Fertility",
    location: "Indiranagar, Bengaluru",
    about: "[Fictional Demo Record] Gynecologist specializing in PCOS/PCOD management, menstrual cycle irregularities, fertility workups, adolescent reproductive care, and menopause wellness.",
    areasOfCare: ["PCOS & PCOD Management", "Fertility Evaluation", "Menstrual Cycle Health", "Pelvic Health", "Gynecologist Consultation"],
    availableSlots: ["Today · 05:00 PM", "Tomorrow · 01:00 PM", "Friday · 02:30 PM", "Saturday · 04:30 PM"],
  },
];

export async function seedDemoDoctors() {
  console.log("==================================================================");
  console.log("[Demo Doctor Seeder] Starting idempotent provisioning...");
  console.log(`[Target Database] MongoDB Atlas - Database: appointer`);
  console.log("==================================================================");

  const salt = await bcrypt.genSalt(10);
  const defaultPassword = process.env.DOCTOR_SEED_PASSWORD || "DemoDoctor123!";
  const hashedPassword = await bcrypt.hash(defaultPassword, salt);

  let createdCount = 0;
  let existingCount = 0;
  let updatedCount = 0;

  for (const docData of DEMO_DOCTORS) {
    const email = docData.email.toLowerCase();

    // 1. Ensure dedicated Doctor User account exists (1-to-1 requirement)
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name: docData.name,
        email,
        password: hashedPassword,
        role: "doctor",
        phone: "9876543210",
      });
      console.log(`[User Created] ${email} (Role: doctor)`);
    }

    // 2. Ensure Doctor Profile exists and links 1-to-1 to user._id
    let profile = await Doctor.findOne({ user: user._id });
    if (!profile) {
      profile = await Doctor.create({
        user: user._id,
        name: docData.name,
        specialty: docData.specialty,
        experienceYears: docData.experienceYears,
        qualifications: docData.qualifications,
        consultationFee: docData.consultationFee,
        profileImage: docData.profileImage,
        isDemo: true,
        rating: docData.rating,
        reviewsCount: docData.reviewsCount,
        clinicName: docData.clinicName,
        location: docData.location,
        about: docData.about,
        areasOfCare: docData.areasOfCare,
        availableSlots: docData.availableSlots,
      });
      createdCount++;
      console.log(`[Doctor Created] ${docData.name} (${docData.specialty}) [ID: ${profile._id}]`);
    } else {
      existingCount++;
      // Ensure fields like qualifications, consultationFee, profileImage, isDemo are up to date
      let needsUpdate = false;
      if (!profile.qualifications || profile.qualifications !== docData.qualifications) {
        profile.qualifications = docData.qualifications;
        needsUpdate = true;
      }
      if (!profile.consultationFee || profile.consultationFee !== docData.consultationFee) {
        profile.consultationFee = docData.consultationFee;
        needsUpdate = true;
      }
      if (!profile.profileImage || profile.profileImage !== docData.profileImage) {
        profile.profileImage = docData.profileImage;
        needsUpdate = true;
      }
      if (profile.isDemo !== true) {
        profile.isDemo = true;
        needsUpdate = true;
      }
      if (needsUpdate) {
        await profile.save();
        updatedCount++;
        console.log(`[Doctor Updated] ${docData.name} - updated fields`);
      } else {
        console.log(`[Doctor Already Exists] ${docData.name} (${docData.specialty}) [Unchanged]`);
      }
    }
  }

  const totalDoctors = await Doctor.countDocuments({});
  console.log("==================================================================");
  console.log(`[Summary] Created: ${createdCount}, Already Present: ${existingCount}, Updated: ${updatedCount}`);
  console.log(`[Total Registered Doctors in MongoDB Atlas]: ${totalDoctors}`);
  console.log("==================================================================");

  return { createdCount, existingCount, updatedCount, totalDoctors };
}

// Standalone execution entry
if (process.argv[1]?.endsWith("seedDemoDoctors.js")) {
  connectDB()
    .then(async () => {
      await seedDemoDoctors();
      await mongoose.disconnect();
      process.exit(0);
    })
    .catch((err) => {
      console.error("[Seeder Fatal Error]:", err);
      process.exit(1);
    });
}
