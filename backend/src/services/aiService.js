import { GoogleGenAI } from "@google/genai";
import Doctor from "../models/Doctor.js";

/**
 * Standard specialties offered by registered doctors on Appointer
 */
export const KNOWN_SPECIALTIES = [
  "Dermatologist",
  "Dentist",
  "General physician",
  "Cardiologist",
  "Eye specialist",
  "Gynecologist",
  "Neurologist",
  "Orthopedic surgeon",
  "Pediatrician",
  "Cardiology",
  "Dermatology",
  "Neurology",
  "Orthopedics",
  "Pediatrics",
  "General Medicine",
  "Gynecology",
];

const STANDARD_DISCLAIMER =
  "This tool is for doctor discovery and appointment matching only. It does not provide medical diagnoses, treatment plans, or emergency care advice. Please consult a qualified physician for medical concerns or contact emergency services in urgent situations.";

const STOP_WORDS = new Set([
  "with", "have", "need", "want", "look", "looking", "help", "find",
  "doctor", "doctors", "care", "very", "some", "good", "best", "clinic",
  "hospital", "treatment", "treatments", "consultation", "specialist",
  "specialists", "patient", "patients", "medical", "health", "problem",
  "problems", "issue", "issues", "symptom", "symptoms", "about", "also",
  "from", "into", "more", "please", "experienced", "experience", "around"
]);

/**
 * Deterministic fallback extractor used when Gemini API key is missing or upstream fails.
 * Guarantees zero downtime and safe, non-diagnostic matching.
 */
export function getFallbackSearchCriteria(query) {
  const normalized = (query || "").toLowerCase();
  let specialty = "";
  const keywords = [];
  let location = "";

  // 1. Specialty detection heuristics
  if (/\b(skin|acne|pimple|pimples|rash|rashes|hair|scalp|itch|itching|eczema|boil|mole|psoriasis|complexion|dermatolog\w*)\b/i.test(normalized)) {
    specialty = "Dermatologist";
    keywords.push("skin", "dermatology");
  } else if (/\b(tooth|teeth|dental|dentist|gum|gums|cavity|cavities|root canal|whitening|enamel|filling|oral|molar|braces)\b/i.test(normalized)) {
    specialty = "Dentist";
    keywords.push("dental", "teeth", "oral care");
  } else if (/\b(heart|cardio\w*|chest|palpitation|palpitations|bp|blood pressure|cholesterol|ecg|cardiac|lipid|angina)\b/i.test(normalized)) {
    specialty = "Cardiologist";
    keywords.push("heart", "cardiology", "cardiovascular");
  } else if (/\b(eye|eyes|vision|sight|cataract|dry eye|cornea|ophthalmol\w*|retina|glasses|blurry vision|optom\w*)\b/i.test(normalized)) {
    specialty = "Eye specialist";
    keywords.push("vision", "eyes", "eye care");
  } else if (/\b(women|gynec\w*|period|periods|menstrual|menstruation|pregnancy|pregnant|prenatal|pcos|ovary|uterus|pelvic|hormon\w*)\b/i.test(normalized)) {
    specialty = "Gynecologist";
    keywords.push("women's health", "gynecology");
  } else if (/\b(neuro\w*|brain|migraine|nerve|seizure|epilepsy|neuropathy|dizziness|vertigo|stroke)\b/i.test(normalized)) {
    specialty = "Neurologist";
    keywords.push("neurology", "brain", "nerve");
  } else if (/\b(spine|robotic\s*surg\w*)\b/i.test(normalized)) {
    specialty = "Spine Surgeon";
    keywords.push("spine", "robotic surgery");
  } else if (/\b(ortho\w*|bone|joint|fracture|knee|arthritis|shoulder|ligament|tendon)\b/i.test(normalized)) {
    specialty = "Orthopedics";
    keywords.push("orthopedics", "bones", "joints");
  } else if (/\b(pediatr\w*|paediatr\w*|child|children|baby|infant|toddler|newborn|immunization|vaccination)\b/i.test(normalized)) {
    specialty = "Pediatrician";
    keywords.push("pediatrics", "child care");
  } else if (/\b(fever|cold|cough|stomach|flu|fatigue|weakness|tired|infection|virus|viral|physician|checkup|general|routine|vomiting|nausea|diabetes|annual check)\b/i.test(normalized)) {
    specialty = "General physician";
    keywords.push("general wellness", "routine care");
  }

  // 2. Location detection heuristics
  const locations = ["Indiranagar", "Koramangala", "Whitefield", "Jayanagar", "HSR Layout", "HSR", "MG Road", "Bengaluru", "Bangalore"];
  for (const loc of locations) {
    if (new RegExp(`\\b${loc}\\b`, "i").test(normalized)) {
      location = loc === "Bangalore" ? "Bengaluru" : loc;
      break;
    }
  }

  // 3. Extract meaningful symptom keywords from query (excluding stopwords)
  const words = normalized
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w));
  keywords.push(...words.slice(0, 4));

  const uniqueKeywords = Array.from(new Set(keywords));

  const reasoning = specialty
    ? `Based on your mentioned care needs, consulting a ${specialty} is appropriate for initial clinical evaluation.`
    : "Reviewing registered specialists and practitioners on Appointer to identify potential matches.";

  return {
    specialty,
    keywords: uniqueKeywords,
    location,
    reasoning,
    disclaimer: STANDARD_DISCLAIMER,
    source: "local-nlp",
  };
}

/**
 * Converts natural-language patient query to doctor search criteria using Google Gemini API.
 * Falls back safely to deterministic extractor if API key is not configured or upstream call fails.
 */
export async function extractDoctorSearchCriteria(query) {
  if (!query || typeof query !== "string" || !query.trim()) {
    const error = new Error("Query is required and must be a non-empty string");
    error.status = 400;
    throw error;
  }

  const trimmedQuery = query.trim();
  if (trimmedQuery.length > 500) {
    const error = new Error("Query too long. Please describe your symptoms or care requirements in 500 characters or less.");
    error.status = 400;
    throw error;
  }

  const apiKey = (process.env.GEMINI_API_KEY || "").trim();

  // If no Gemini API key configured, use deterministic NLP extractor
  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    return getFallbackSearchCriteria(trimmedQuery);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";

    const prompt = `You are an AI assistant for doctor discovery on the Appointer healthcare appointment platform.
A patient is looking for care and wrote this query:
"${trimmedQuery}"

TASK:
Analyze the natural language input to identify the matching doctor specialty, key clinical search keywords, and any preferred location.

REGISTERED MEDICAL SPECIALTIES ON APPOINTER:
- "Dermatologist" (skin, hair, acne, rash, scalp, itching, eczema, dermatitis)
- "Dentist" (teeth, gums, cavity, toothache, root canal, dental cleaning, cosmetic whitening)
- "General physician" (routine checkup, viral fever, flu, cold, cough, headache, hypertension, diabetes, general illness)
- "Cardiologist" (heart, chest discomfort, shortness of breath on exertion, blood pressure, palpitations, ECG, lipid profiling)
- "Eye specialist" (vision, dry eye, cataract, blurry vision, spectacles, eye strain)
- "Gynecologist" (women's health, reproductive wellness, pregnancy, prenatal advice, PCOS, menstrual health)

If the patient's need clearly requires another specialty outside the list (e.g. "Orthopedic surgeon", "Neurologist", "ENT specialist", "Pediatrician", "Oncologist"), specify that accurate specialty name.

CRITICAL HEALTHCARE & ETHICAL RULES:
1. This is DOCTOR DISCOVERY ONLY, NOT MEDICAL DIAGNOSIS.
2. DO NOT formulate a clinical diagnosis, suggest prescription medications, or recommend treatments.
3. Keep the reasoning calm, neutral, and focused on which doctor category to consult.
4. Always include the standard disclaimer.

Respond with ONLY valid JSON adhering strictly to this schema:
{
  "specialty": "<Exact or closest specialty name, or empty string if undetermined>",
  "keywords": ["<keyword1>", "<keyword2>"],
  "location": "<Location if mentioned by user, or empty string>",
  "reasoning": "<1-2 concise, non-diagnostic sentences explaining why this specialist type is recommended for their search>",
  "disclaimer": "This tool is for doctor discovery and appointment matching only. It does not provide medical diagnoses, treatment plans, or emergency care advice. Please consult a qualified physician for medical concerns or contact emergency services in urgent situations."
}`;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("Empty response received from Gemini API");
    }

    const parsed = JSON.parse(responseText.trim());

    return {
      specialty: typeof parsed.specialty === "string" ? parsed.specialty.trim() : "",
      keywords: Array.isArray(parsed.keywords)
        ? parsed.keywords.map((k) => String(k).trim().toLowerCase()).filter((k) => k && !STOP_WORDS.has(k))
        : [],
      location: typeof parsed.location === "string" ? parsed.location.trim() : "",
      reasoning:
        typeof parsed.reasoning === "string" && parsed.reasoning.trim()
          ? parsed.reasoning.trim()
          : "Recommended based on your care search criteria.",
      disclaimer: STANDARD_DISCLAIMER,
      source: "gemini",
    };
  } catch (geminiError) {
    // Log failure without exposing secrets or disrupting the patient
    console.warn("[AI Doctor Finder] Gemini API call failed, falling back to local extractor:", geminiError.message);
    return getFallbackSearchCriteria(trimmedQuery);
  }
}

/**
 * Fetches actual registered doctors from MongoDB matching the search criteria.
 * STRICT REQUIREMENT: Only actual registered doctors from MongoDB are returned.
 * Never fabricates doctors, ratings, or availability.
 */
export async function findMatchingDoctors({ specialty, keywords = [], location = "" }) {
  let finalQuery = {};

  // If specialty was determined, search primarily by specialty
  if (specialty && typeof specialty === "string" && specialty.trim()) {
    const escapedSpecialty = specialty.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const root = escapedSpecialty.replace(/(ology|ologist|ics|ician|edist|edicine|ician)$/i, "");
    const pattern = root.length >= 4 ? `(${escapedSpecialty}|${root})` : escapedSpecialty;
    finalQuery = {
      $or: [
        { specialty: { $regex: new RegExp(pattern, "i") } },
        { areasOfCare: { $regex: new RegExp(escapedSpecialty, "i") } },
      ],
    };
  } else if (Array.isArray(keywords) && keywords.length > 0) {
    // If no specialty determined, search areasOfCare and specialty with clinical keywords
    const keywordConditions = [];
    for (const kw of keywords) {
      if (typeof kw === "string" && kw.trim().length > 2 && !STOP_WORDS.has(kw.toLowerCase())) {
        const escaped = kw.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(`\\b${escaped}\\b`, "i");
        keywordConditions.push({
          $or: [
            { areasOfCare: { $regex: regex } },
            { specialty: { $regex: regex } },
          ],
        });
      }
    }
    if (keywordConditions.length > 0) {
      finalQuery = { $or: keywordConditions };
    } else {
      return [];
    }
  } else {
    // Neither specialty nor clinical keywords identified
    return [];
  }

  // Location filter if specified
  let locationFilter = null;
  if (location && typeof location === "string" && location.trim()) {
    const escapedLocation = location.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    locationFilter = { location: { $regex: new RegExp(escapedLocation, "i") } };
    finalQuery = { $and: [finalQuery, locationFilter] };
  }

  // STRICT RULE: Query ONLY actual registered doctors in MongoDB
  let doctors = await Doctor.find(finalQuery).select("-__v").lean();

  // If location filter resulted in 0 matches, loosen location filter to still show verified specialists
  if (doctors.length === 0 && locationFilter && specialty) {
    const escapedSpecialty = specialty.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    doctors = await Doctor.find({ specialty: { $regex: new RegExp(escapedSpecialty, "i") } })
      .select("-__v")
      .lean();
  }

  // Rank matches: exact specialty match first, then by rating
  if (specialty) {
    const target = specialty.toLowerCase();
    doctors.sort((a, b) => {
      const aMatches = a.specialty?.toLowerCase().includes(target) ? 1 : 0;
      const bMatches = b.specialty?.toLowerCase().includes(target) ? 1 : 0;
      if (bMatches !== aMatches) return bMatches - aMatches;
      return (b.rating || 0) - (a.rating || 0);
    });
  } else {
    doctors.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }

  return doctors;
}
