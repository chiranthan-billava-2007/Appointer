import { GoogleGenAI } from "@google/genai";
import Doctor from "../models/Doctor.js";
import Appointment from "../models/Appointment.js";

const STANDARD_DISCLAIMER =
  "This tool is for appointment scheduling and doctor discovery only. It does not provide medical diagnoses, treatment plans, or prescription medications. Please consult a qualified physician for medical concerns or contact emergency services in urgent situations.";

function normalizeSlot(slot) {
  if (!slot || typeof slot !== "string") return "";
  return slot.trim().replace(/\s+/g, " ").toLowerCase();
}

function isSlotMatch(doctorSlot, requestedSlot) {
  if (!doctorSlot || !requestedSlot) return false;
  const s1 = normalizeSlot(doctorSlot);
  const s2 = normalizeSlot(requestedSlot);
  if (s1 === s2) return true;
  const clean1 = s1.replace(/[^a-z0-9]/g, "");
  const clean2 = s2.replace(/[^a-z0-9]/g, "");
  return clean1.includes(clean2) || clean2.includes(clean1);
}

/**
 * Calculates real, unbooked slots for a doctor from MongoDB records.
 * Compares doctor.availableSlots against active upcoming appointments.
 * Never fabricates slots.
 */
export async function getDoctorRealAvailableSlots(doctor) {
  if (!doctor || !doctor._id) return [];
  const upcomingAppointments = await Appointment.find({
    doctor: doctor._id,
    status: "upcoming",
  }).select("slot");

  const bookedSet = new Set(upcomingAppointments.map((a) => normalizeSlot(a.slot)));
  const allSlots = doctor.availableSlots || [];
  return allSlots.filter((slot) => !bookedSet.has(normalizeSlot(slot)));
}

/**
 * Deterministic local NLP extractor for Appointment Assistant intent classification.
 * Used when Gemini API key is missing, invalid, or during upstream API disruptions.
 */
export function getFallbackAppointmentIntent(message, context = {}) {
  const norm = (message || "").toLowerCase().trim();

  // 1. Safety Guardrail: Medical diagnosis or prescription request (Requirement 9)
  if (
    /\b(diagnos\w*|diagnosis|what disease|what condition|what sickness|what illness|prescribe\w*|prescription\w*|what pill\w*|what medicin\w*|what antibiotic\w*|treatment for|cure for|give me drug\w*|dosage|how much mg|can you treat)\b/i.test(norm)
  ) {
    let suggestedSpecialty = "";
    if (/\b(skin\w*|acne\w*|rash\w*|pimple\w*|hair\w*|itch\w*)\b/i.test(norm)) suggestedSpecialty = "Dermatologist";
    else if (/\b(tooth\w*|teeth\w*|dental\w*|dentist\w*|gum\w*|cavit\w*)\b/i.test(norm)) suggestedSpecialty = "Dentist";
    else if (/\b(heart\w*|cardio\w*|chest\s*pain|blood\s*pressure|bp|palpitat\w*)\b/i.test(norm)) suggestedSpecialty = "Cardiologist";
    else if (/\b(eye\w*|vision\w*|blurry|dry\s*eye)\b/i.test(norm)) suggestedSpecialty = "Eye specialist";
    else if (/\b(period\w*|menstru\w*|pregnan\w*|women\w*|gynec\w*)\b/i.test(norm)) suggestedSpecialty = "Gynecologist";
    else suggestedSpecialty = "General physician";

    return {
      intent: "MEDICAL_ADVICE",
      specialty: suggestedSpecialty,
      userReply: `I am Appointer's AI Appointment Assistant. I cannot diagnose medical conditions, formulate treatment plans, or prescribe medications. Please consult a qualified doctor for clinical evaluation and prescriptions.${
        suggestedSpecialty ? ` Based on what you described, consulting a registered ${suggestedSpecialty} is recommended for in-person assessment.` : ""
      }`,
    };
  }

  // Doctor name matching
  let doctorName = "";
  if (/\b(ananya|sharma)\b/i.test(norm)) doctorName = "Dr. Ananya Sharma";
  else if (/\b(rohan|mehta)\b/i.test(norm)) doctorName = "Dr. Rohan Mehta";
  else if (/\b(kavya|nair)\b/i.test(norm)) doctorName = "Dr. Kavya Nair";
  else if (/\b(arjun|rao)\b/i.test(norm)) doctorName = "Dr. Arjun Rao";
  else if (/\b(meera|iyer)\b/i.test(norm)) doctorName = "Dr. Meera Iyer";
  else if (/\b(nisha|kapoor)\b/i.test(norm)) doctorName = "Dr. Nisha Kapoor";

  // Slot matching
  let slot = "";
  const slotMatch = norm.match(/\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b\s*(?:·|,|-|\s+at\s+|\s+for\s+|\s+to\s+|\s+)?\s*(\d{1,2}:\d{2}\s*(?:am|pm))/i);
  if (slotMatch) {
    slot = `${slotMatch[1].charAt(0).toUpperCase() + slotMatch[1].slice(1).toLowerCase()} · ${slotMatch[2].toUpperCase()}`;
  }

  // Specialty detection
  let specialty = "";
  if (/\b(skin\w*|acne\w*|rash\w*|pimple\w*|hair\w*|scalp\w*|dermatolog\w*)\b/i.test(norm)) specialty = "Dermatologist";
  else if (/\b(tooth\w*|teeth\w*|dental\w*|dentist\w*|gum\w*|cavit\w*|root canal)\b/i.test(norm)) specialty = "Dentist";
  else if (/\b(heart\w*|cardio\w*|chest\s*pain|palpitat\w*|bp|blood\s*pressure)\b/i.test(norm)) specialty = "Cardiologist";
  else if (/\b(eye\w*|eyes\w*|vision\w*|cataract\w*|dry\s*eye|sight)\b/i.test(norm)) specialty = "Eye specialist";
  else if (/\b(women\w*|gynec\w*|period\w*|pregnan\w*|prenatal|pcos)\b/i.test(norm)) specialty = "Gynecologist";
  else if (/\b(physician\w*|general\w*|fever\w*|cold\w*|cough\w*|headache\w*|routine|wellness)\b/i.test(norm)) specialty = "General physician";

  // 2. Cancel appointment
  if (/\b(cancel|delete|drop)\b.*\b(appointment\w*|visit\w*|booking\w*|slot\w*|consultation\w*)\b/i.test(norm)) {
    return {
      intent: "CANCEL_APPOINTMENT",
      doctorName,
      slot,
      userReply: "I can help you cancel an appointment. Let me pull up your upcoming visits to confirm.",
    };
  }

  // 3. Reschedule appointment
  if (
    /\b(reschedule|change\s+time|change\s+date|move\s+appointment|postpone|different\s+slot|different\s+time)\b/i.test(norm)
  ) {
    return {
      intent: "RESCHEDULE_APPOINTMENT",
      doctorName,
      slot,
      userReply: "I can help you reschedule your visit. Let me check open slots.",
    };
  }

  // 4. View upcoming appointments
  if (
    /\b(my|view|show|list|check|see|upcoming)\b.*\b(appointments?|bookings?|visits?)\b/i.test(norm) ||
    /\b(appointments?|bookings?|visits?)\b.*\b(my|upcoming)\b/i.test(norm)
  ) {
    return {
      intent: "VIEW_APPOINTMENTS",
      doctorName,
      userReply: "Checking your scheduled appointments...",
    };
  }

  // 5. Booking appointment
  const isBookingPhrase = /\b(book\w*|schedule\w*|make\s+an\s+appointment|reserve\w*|get\s+appointment)\b/i.test(norm);
  if (isBookingPhrase) {
    return {
      intent: "BOOK_APPOINTMENT",
      specialty,
      doctorName,
      slot,
      userReply: "Let me check available doctors and slots for your appointment.",
    };
  }

  // 6. Find doctors / Check availability
  if (specialty || doctorName || /\b(find|search|doctor|specialist|clinic|available|availability)\b/i.test(norm)) {
    return {
      intent: "FIND_DOCTORS",
      specialty,
      doctorName,
      slot,
      userReply: "Searching verified doctors and real-time open slots...",
    };
  }

  return {
    intent: "GENERAL",
    userReply: "Hello! I am Appointer's AI Appointment Assistant. I can help you find verified doctors, check real appointment availability, and manage your bookings (book, reschedule, or cancel). How can I assist you today?",
  };
}

/**
 * Extracts appointment intent and parameters using Google Gemini API with fallback to deterministic NLP.
 */
export async function extractAppointmentIntent(message, context = {}) {
  const trimmed = (message || "").trim();
  if (!trimmed) {
    return {
      intent: "GENERAL",
      userReply: "How can I help you with your healthcare appointments today?",
    };
  }

  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    return getFallbackAppointmentIntent(trimmed, context);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";

    const prompt = `You are the AI Appointment Assistant for the Appointer healthcare platform.
The patient sent the following message:
"${trimmed}"

Previous conversation context (if any):
${JSON.stringify(context.history || [])}

Available Specialties on Appointer:
- "Dermatologist"
- "Dentist"
- "General physician"
- "Cardiologist"
- "Eye specialist"
- "Gynecologist"

REGISTERED DOCTOR NAMES ON APPOINTER:
- "Dr. Ananya Sharma" (Dermatologist, Indiranagar)
- "Dr. Rohan Mehta" (Dentist, Koramangala)
- "Dr. Kavya Nair" (General physician, Whitefield)
- "Dr. Arjun Rao" (Cardiologist, Jayanagar)
- "Dr. Meera Iyer" (Eye specialist, HSR Layout)
- "Dr. Nisha Kapoor" (Gynecologist, MG Road)

CRITICAL SAFETY & MEDICAL POLICY (Requirement 9):
1. You CANNOT diagnose illnesses, formulate clinical diagnoses, or prescribe medications.
2. If the user asks for diagnosis or prescriptions, classify intent as "MEDICAL_ADVICE", explain that you cannot diagnose/prescribe, suggest an appropriate specialty, and advise emergency care if symptoms are severe.

INTENTS:
- "BOOK_APPOINTMENT": User explicitly wants to book a slot or appointment with a doctor.
- "FIND_DOCTORS": User wants to discover doctors, check specialties, or find providers.
- "VIEW_APPOINTMENTS": User asks to view, check, or list their current upcoming appointments.
- "RESCHEDULE_APPOINTMENT": User wants to reschedule, change time, or postpone an appointment.
- "CANCEL_APPOINTMENT": User wants to cancel or drop an upcoming appointment.
- "CHECK_AVAILABILITY": User asks if a doctor has open slots or times available.
- "MEDICAL_ADVICE": User is asking for diagnosis, treatment, or prescription medicine.
- "GENERAL": Greeting, question about platform, or unclear input.

Respond with ONLY valid JSON strictly matching this schema:
{
  "intent": "BOOK_APPOINTMENT" | "FIND_DOCTORS" | "VIEW_APPOINTMENTS" | "RESCHEDULE_APPOINTMENT" | "CANCEL_APPOINTMENT" | "CHECK_AVAILABILITY" | "MEDICAL_ADVICE" | "GENERAL",
  "specialty": "<specialty name or empty string>",
  "doctorName": "<doctor name if mentioned or empty string>",
  "slot": "<slot or timing if mentioned or empty string>",
  "notes": "<symptoms or reasons mentioned>",
  "userReply": "<A friendly, concise 1-2 sentence response directly answering the user>"
}`;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    const parsed = JSON.parse(response.text.trim());
    return {
      intent: parsed.intent || "GENERAL",
      specialty: parsed.specialty || "",
      doctorName: parsed.doctorName || "",
      slot: parsed.slot || "",
      notes: parsed.notes || "",
      userReply: parsed.userReply || "I am ready to help with your appointments.",
    };
  } catch (err) {
    console.warn("[AI Assistant] Gemini parse failed, falling back to deterministic extractor:", err.message);
    return getFallbackAppointmentIntent(trimmed, context);
  }
}

/**
 * Handles conversational queries end-to-end, querying MongoDB and enforcing:
 * - Real doctor records and real unbooked slots (Requirements 3 & 4)
 * - JWT authentication & patient isolation (Requirement 7)
 * - Explicit confirmation for modifications (Requirement 6)
 * - No diagnosis/prescriptions (Requirement 9)
 */
export async function processAssistantMessage({ message, history = [], user = null }) {
  if (!message || typeof message !== "string" || !message.trim()) {
    return {
      success: false,
      message: "Please enter a message or question.",
    };
  }

  const trimmedMessage = message.trim();
  const intentData = await extractAppointmentIntent(trimmedMessage, { history });

  // 1. SAFETY: Medical Advice or Prescription Request Guardrail (Requirement 9)
  if (intentData.intent === "MEDICAL_ADVICE") {
    let recommendedDoctors = [];
    if (intentData.specialty) {
      const docs = await Doctor.find({
        specialty: { $regex: new RegExp(intentData.specialty, "i") },
      }).lean();
      for (const doc of docs) {
        const slots = await getDoctorRealAvailableSlots(doc);
        recommendedDoctors.push({ ...doc, realAvailableSlots: slots });
      }
    }

    return {
      success: true,
      intent: "MEDICAL_ADVICE",
      reply: intentData.userReply || "I am Appointer's AI Appointment Assistant. I cannot diagnose medical conditions or prescribe medications. Please consult a qualified doctor for clinical care.",
      disclaimer: STANDARD_DISCLAIMER,
      recommendedDoctors,
      suggestedSpecialty: intentData.specialty || "",
    };
  }

  // 2. VIEW APPOINTMENTS (Requirement 7: JWT authentication & patient data isolation)
  if (intentData.intent === "VIEW_APPOINTMENTS") {
    if (!user) {
      return {
        success: true,
        intent: "VIEW_APPOINTMENTS",
        requiresAuth: true,
        reply: "To view your scheduled appointments, please log in to your patient account.",
        disclaimer: STANDARD_DISCLAIMER,
      };
    }

    // STRICT PATIENT ISOLATION: Query only appointments owned by user._id
    const appointments = await Appointment.find({
      patient: user.id,
      status: "upcoming",
    })
      .sort({ createdAt: -1 })
      .lean();

    return {
      success: true,
      intent: "VIEW_APPOINTMENTS",
      reply:
        appointments.length > 0
          ? `You have ${appointments.length} upcoming appointment${appointments.length === 1 ? "" : "s"} scheduled:`
          : "You currently have no upcoming appointments scheduled. Would you like me to help you find a doctor?",
      appointments,
      disclaimer: STANDARD_DISCLAIMER,
    };
  }

  // 3. CANCEL APPOINTMENT (Requirement 6: Explicit user confirmation)
  if (intentData.intent === "CANCEL_APPOINTMENT") {
    if (!user) {
      return {
        success: true,
        intent: "CANCEL_APPOINTMENT",
        requiresAuth: true,
        reply: "To cancel an appointment, please log in to your patient account.",
        disclaimer: STANDARD_DISCLAIMER,
      };
    }

    const appointments = await Appointment.find({
      patient: user.id,
      status: "upcoming",
    }).lean();

    if (appointments.length === 0) {
      return {
        success: true,
        intent: "CANCEL_APPOINTMENT",
        reply: "You don't have any upcoming appointments to cancel.",
        disclaimer: STANDARD_DISCLAIMER,
      };
    }

    // If a specific doctor name was mentioned, find that appointment
    let target = null;
    if (intentData.doctorName) {
      target = appointments.find((a) =>
        a.doctorName.toLowerCase().includes(intentData.doctorName.toLowerCase().replace("dr.", "").trim())
      );
    }

    if (!target && appointments.length === 1) {
      target = appointments[0];
    }

    if (target) {
      // REQUIRE EXPLICIT USER CONFIRMATION (Requirement 6)
      return {
        success: true,
        intent: "CANCEL_APPOINTMENT",
        actionRequired: "CONFIRM_CANCEL",
        pendingAction: {
          type: "CANCEL",
          appointmentId: target._id.toString(),
          doctorName: target.doctorName,
          specialty: target.specialty,
          clinicName: target.clinicName,
          slot: target.slot,
        },
        reply: `Please confirm: Would you like to cancel your upcoming appointment with **${target.doctorName}** on **${target.slot}** at ${target.clinicName}?`,
        disclaimer: STANDARD_DISCLAIMER,
      };
    }

    // Multiple appointments: Ask user to choose which one
    return {
      success: true,
      intent: "CANCEL_APPOINTMENT",
      reply: "Which upcoming appointment would you like to cancel? Please select one below:",
      appointments,
      disclaimer: STANDARD_DISCLAIMER,
    };
  }

  // 4. RESCHEDULE APPOINTMENT (Requirement 6: Explicit user confirmation)
  if (intentData.intent === "RESCHEDULE_APPOINTMENT") {
    if (!user) {
      return {
        success: true,
        intent: "RESCHEDULE_APPOINTMENT",
        requiresAuth: true,
        reply: "To reschedule an appointment, please log in to your patient account.",
        disclaimer: STANDARD_DISCLAIMER,
      };
    }

    const appointments = await Appointment.find({
      patient: user.id,
      status: "upcoming",
    }).lean();

    if (appointments.length === 0) {
      return {
        success: true,
        intent: "RESCHEDULE_APPOINTMENT",
        reply: "You don't have any upcoming appointments to reschedule.",
        disclaimer: STANDARD_DISCLAIMER,
      };
    }

    let target = null;
    if (intentData.doctorName) {
      target = appointments.find((a) =>
        a.doctorName.toLowerCase().includes(intentData.doctorName.toLowerCase().replace("dr.", "").trim())
      );
    }
    if (!target && appointments.length === 1) {
      target = appointments[0];
    }

    if (target) {
      // Query attending doctor's real unbooked slots from MongoDB
      const doctorDoc = await Doctor.findById(target.doctor).lean();
      if (!doctorDoc) {
        return {
          success: false,
          reply: "Doctor record not found for this appointment.",
        };
      }

      const realSlots = await getDoctorRealAvailableSlots(doctorDoc);

      // If user specified a target slot and it's available:
      if (intentData.slot) {
        const matchingSlot = realSlots.find((s) => isSlotMatch(s, intentData.slot));
        if (matchingSlot) {
          // REQUIRE EXPLICIT CONFIRMATION (Requirement 6)
          return {
            success: true,
            intent: "RESCHEDULE_APPOINTMENT",
            actionRequired: "CONFIRM_RESCHEDULE",
            pendingAction: {
              type: "RESCHEDULE",
              appointmentId: target._id.toString(),
              doctorId: doctorDoc._id.toString(),
              doctorName: target.doctorName,
              currentSlot: target.slot,
              newSlot: matchingSlot,
              clinicName: target.clinicName,
            },
            reply: `Please confirm: Would you like to reschedule your appointment with **${target.doctorName}** from **${target.slot}** to **${matchingSlot}**?`,
            disclaimer: STANDARD_DISCLAIMER,
          };
        }
      }

      // Present available slots for this appointment
      return {
        success: true,
        intent: "RESCHEDULE_APPOINTMENT",
        reply: `Here are the currently available slots with **${target.doctorName}**. Which one would you like to reschedule to?`,
        appointmentToReschedule: target,
        availableSlots: realSlots,
        disclaimer: STANDARD_DISCLAIMER,
      };
    }

    return {
      success: true,
      intent: "RESCHEDULE_APPOINTMENT",
      reply: "Which of your upcoming appointments would you like to reschedule?",
      appointments,
      disclaimer: STANDARD_DISCLAIMER,
    };
  }

  // 5. BOOK APPOINTMENT (Requirement 5 & 6)
  if (intentData.intent === "BOOK_APPOINTMENT") {
    let query = {};
    if (intentData.doctorName) {
      query.name = { $regex: new RegExp(intentData.doctorName.replace("Dr.", "").trim(), "i") };
    } else if (intentData.specialty) {
      query.specialty = { $regex: new RegExp(intentData.specialty.trim(), "i") };
    }

    const doctors = await Doctor.find(query).lean();
    if (doctors.length === 0) {
      const allDocs = await Doctor.find({}).limit(4).lean();
      return {
        success: true,
        intent: "FIND_DOCTORS",
        reply: `I couldn't find a doctor matching "${intentData.doctorName || intentData.specialty}". Here are some of our top verified specialists:`,
        doctors: await Promise.all(
          allDocs.map(async (d) => ({
            ...d,
            realAvailableSlots: await getDoctorRealAvailableSlots(d),
          }))
        ),
        disclaimer: STANDARD_DISCLAIMER,
      };
    }

    // If 1 doctor identified
    if (doctors.length === 1) {
      const doctor = doctors[0];
      const realSlots = await getDoctorRealAvailableSlots(doctor);

      if (intentData.slot) {
        const matchingSlot = realSlots.find((s) => isSlotMatch(s, intentData.slot));
        if (matchingSlot) {
          if (!user) {
            return {
              success: true,
              intent: "BOOK_APPOINTMENT",
              requiresAuth: true,
              reply: `**${matchingSlot}** is available with **${doctor.name}** (${doctor.specialty}). Please log in or create an account to confirm your booking.`,
              disclaimer: STANDARD_DISCLAIMER,
            };
          }

          // REQUIRE EXPLICIT CONFIRMATION (Requirement 6)
          return {
            success: true,
            intent: "BOOK_APPOINTMENT",
            actionRequired: "CONFIRM_BOOKING",
            pendingAction: {
              type: "BOOK",
              doctorId: doctor._id.toString(),
              doctorName: doctor.name,
              specialty: doctor.specialty,
              clinicName: doctor.clinicName,
              location: doctor.location,
              slot: matchingSlot,
              notes: intentData.notes || "",
            },
            reply: `Please review and confirm your booking with **${doctor.name}** (${doctor.specialty}) on **${matchingSlot}** at ${doctor.clinicName}:`,
            disclaimer: STANDARD_DISCLAIMER,
          };
        }
      }

      // Slot not specified or specified slot not open
      return {
        success: true,
        intent: "BOOK_APPOINTMENT",
        reply: `**${doctor.name}** (${doctor.specialty}) has the following verified available slots. Select a slot to proceed:`,
        selectedDoctor: {
          ...doctor,
          realAvailableSlots: realSlots,
        },
        disclaimer: STANDARD_DISCLAIMER,
      };
    }

    // Multiple doctors match: present them with real unbooked slots
    const doctorsWithSlots = await Promise.all(
      doctors.map(async (d) => ({
        ...d,
        realAvailableSlots: await getDoctorRealAvailableSlots(d),
      }))
    );

    return {
      success: true,
      intent: "FIND_DOCTORS",
      reply: `Found ${doctors.length} verified doctors. Choose a doctor and preferred time slot:`,
      doctors: doctorsWithSlots,
      disclaimer: STANDARD_DISCLAIMER,
    };
  }

  // 6. FIND DOCTORS / CHECK AVAILABILITY (Requirements 3 & 4)
  let searchQuery = {};
  if (intentData.doctorName) {
    searchQuery.name = { $regex: new RegExp(intentData.doctorName.replace("Dr.", "").trim(), "i") };
  } else if (intentData.specialty) {
    searchQuery.specialty = { $regex: new RegExp(intentData.specialty.trim(), "i") };
  }

  const foundDocs = await Doctor.find(searchQuery).lean();
  const docsWithSlots = await Promise.all(
    foundDocs.map(async (d) => ({
      ...d,
      realAvailableSlots: await getDoctorRealAvailableSlots(d),
    }))
  );

  return {
    success: true,
    intent: intentData.intent || "FIND_DOCTORS",
    reply:
      docsWithSlots.length > 0
        ? `Found ${docsWithSlots.length} verified doctor${docsWithSlots.length === 1 ? "" : "s"} with live slot availability:`
        : "I couldn't find any registered doctors matching that search. You can search by specialty (e.g. Dermatologist, Dentist, Cardiologist) or ask to view your appointments.",
    doctors: docsWithSlots,
    disclaimer: STANDARD_DISCLAIMER,
  };
}
