import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import dotenv from "dotenv";
import {
  getFallbackSearchCriteria,
  extractDoctorSearchCriteria,
  findMatchingDoctors,
} from "../services/aiService.js";
import { aiFindDoctors } from "../controllers/doctorController.js";
import Doctor from "../models/Doctor.js";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/appointer";

describe("AI Doctor Finder - Core Functionality & Safety Tests", () => {
  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
    }
  });

  after(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  describe("1. Natural-Language Query to Search Criteria Conversion", () => {
    it("should correctly identify Dermatologist for skin and acne complaints", () => {
      const criteria = getFallbackSearchCriteria("I have severe acne breakouts and red rashes on my skin");
      assert.equal(criteria.specialty, "Dermatologist");
      assert.ok(criteria.keywords.includes("skin") || criteria.keywords.includes("dermatology"));
      assert.ok(criteria.disclaimer.includes("does not provide medical diagnoses"));
      assert.ok(criteria.reasoning.includes("Dermatologist"));
    });

    it("should correctly identify Dentist for dental and toothache complaints", () => {
      const criteria = getFallbackSearchCriteria("Need help with a painful toothache and bleeding gums");
      assert.equal(criteria.specialty, "Dentist");
      assert.ok(criteria.keywords.includes("dental") || criteria.keywords.includes("teeth"));
      assert.ok(criteria.disclaimer.includes("does not provide medical diagnoses"));
    });

    it("should correctly identify Cardiologist for heart and blood pressure concerns", () => {
      const criteria = getFallbackSearchCriteria("Feeling chest heaviness and irregular heart palpitations with high blood pressure");
      assert.equal(criteria.specialty, "Cardiologist");
      assert.ok(criteria.keywords.includes("heart") || criteria.keywords.includes("cardiology"));
      assert.ok(criteria.disclaimer.includes("does not provide medical diagnoses"));
    });

    it("should correctly identify Eye specialist for vision concerns", () => {
      const criteria = getFallbackSearchCriteria("Experiencing blurry vision and dry eyes while using screens");
      assert.equal(criteria.specialty, "Eye specialist");
      assert.ok(criteria.keywords.includes("vision") || criteria.keywords.includes("eyes"));
    });

    it("should correctly identify Gynecologist for women's reproductive health concerns", () => {
      const criteria = getFallbackSearchCriteria("Seeking consultation for PCOS and irregular menstrual periods");
      assert.equal(criteria.specialty, "Gynecologist");
      assert.ok(criteria.keywords.includes("women's health") || criteria.keywords.includes("gynecology"));
    });

    it("should correctly extract location when specified by the user", () => {
      const criteria = getFallbackSearchCriteria("Looking for a dermatologist clinic in Indiranagar");
      assert.equal(criteria.specialty, "Dermatologist");
      assert.equal(criteria.location, "Indiranagar");
    });

    it("should enforce doctor discovery only and strictly disclaim medical diagnosis (Requirement 10)", () => {
      const criteria = getFallbackSearchCriteria("What is wrong with my chest? Do I have a disease?");
      assert.ok(criteria.disclaimer, "Disclaimer must always be present");
      assert.match(criteria.disclaimer, /does not provide medical diagnoses/i);
      assert.match(criteria.disclaimer, /doctor discovery/i);
    });
  });

  describe("2. Input Validation & Error Handling (Requirement 7)", () => {
    it("should reject empty or whitespace-only queries with 400", async () => {
      await assert.rejects(
        async () => {
          await extractDoctorSearchCriteria("");
        },
        (err) => {
          assert.equal(err.status, 400);
          return true;
        }
      );

      await assert.rejects(
        async () => {
          await extractDoctorSearchCriteria("    ");
        },
        (err) => {
          assert.equal(err.status, 400);
          return true;
        }
      );
    });

    it("should reject non-string queries with 400", async () => {
      await assert.rejects(
        async () => {
          await extractDoctorSearchCriteria(null);
        },
        (err) => {
          assert.equal(err.status, 400);
          return true;
        }
      );
    });

    it("should reject queries exceeding 500 characters with 400", async () => {
      const overlyLongQuery = "a".repeat(501);
      await assert.rejects(
        async () => {
          await extractDoctorSearchCriteria(overlyLongQuery);
        },
        (err) => {
          assert.equal(err.status, 400);
          return true;
        }
      );
    });
  });

  describe("3. MongoDB Integration & Authenticity Verification (Requirements 5 & 6)", () => {
    it("should fetch actual registered doctors from MongoDB for valid specialty", async () => {
      const criteria = {
        specialty: "Dermatologist",
        keywords: ["skin", "acne"],
        location: "Indiranagar",
      };

      const doctors = await findMatchingDoctors(criteria);
      assert.ok(Array.isArray(doctors));
      assert.ok(doctors.length > 0, "Should find registered dermatologist in MongoDB");

      const matchedDoc = doctors[0];
      assert.equal(matchedDoc.specialty, "Dermatologist");
      assert.equal(matchedDoc.name, "Dr. Ananya Sharma");
      assert.ok(matchedDoc._id, "Doctor must have a valid MongoDB _id");

      // Verify doctor document actually exists in the MongoDB database
      const dbDoctor = await Doctor.findById(matchedDoc._id);
      assert.ok(dbDoctor, "Doctor must be present in MongoDB database");
      assert.equal(dbDoctor.name, matchedDoc.name);
      assert.equal(dbDoctor.rating, matchedDoc.rating, "Rating must not be fabricated");
      assert.deepEqual(dbDoctor.availableSlots, matchedDoc.availableSlots, "Slots must not be fabricated");
    });

    it("should match registered dentist for teeth concerns", async () => {
      const criteria = {
        specialty: "Dentist",
        keywords: ["root canal", "teeth"],
        location: "",
      };

      const doctors = await findMatchingDoctors(criteria);
      assert.ok(doctors.length > 0);
      assert.equal(doctors[0].specialty, "Dentist");
      assert.equal(doctors[0].name, "Dr. Rohan Mehta");
    });

    it("should match registered cardiologist for heart concerns", async () => {
      const criteria = {
        specialty: "Cardiologist",
        keywords: ["heart", "cardio"],
        location: "",
      };

      const doctors = await findMatchingDoctors(criteria);
      assert.ok(doctors.length > 0);
      assert.equal(doctors[0].specialty, "Cardiologist");
      assert.equal(doctors[0].name, "Dr. Arjun Rao");
    });

    it("should return empty array and never fabricate doctors when no match exists (Requirement 6 & 7)", async () => {
      const criteria = {
        specialty: "Pediatric Neurosurgeon",
        keywords: ["brain surgery", "unregistered_procedure_xyz"],
        location: "Atlantis",
      };

      const doctors = await findMatchingDoctors(criteria);
      assert.ok(Array.isArray(doctors));
      assert.equal(doctors.length, 0, "Must return 0 doctors for unregistered specialties without fabricating any");
    });
  });

  describe("4. End-to-End Controller Execution (aiFindDoctors)", () => {
    it("should return 200 with structured response and registered doctors for valid query", async () => {
      const req = {
        body: {
          query: "I have painful toothache and cavity in Koramangala",
        },
      };

      let statusCode = 200;
      let responseData = null;

      const res = {
        status: (code) => {
          statusCode = code;
          return res;
        },
        json: (data) => {
          responseData = data;
          return res;
        },
      };

      await aiFindDoctors(req, res);

      assert.equal(statusCode, 200);
      assert.ok(responseData.success);
      assert.equal(responseData.criteria.specialty, "Dentist");
      assert.ok(responseData.totalMatches > 0);
      assert.ok(Array.isArray(responseData.doctors));
      assert.equal(responseData.doctors[0].name, "Dr. Rohan Mehta");
      assert.ok(responseData.criteria.disclaimer.includes("does not provide medical diagnoses"));
    });

    it("should return 400 when query is empty in controller", async () => {
      const req = {
        body: { query: "   " },
      };

      let statusCode = 200;
      let responseData = null;

      const res = {
        status: (code) => {
          statusCode = code;
          return res;
        },
        json: (data) => {
          responseData = data;
          return res;
        },
      };

      await aiFindDoctors(req, res);

      assert.equal(statusCode, 400);
      assert.ok(responseData.message.includes("provide a description"));
    });

    it("should return 200 with totalMatches: 0 and clear message when no doctors match", async () => {
      const req = {
        body: {
          query: "Need a specialized orthopedic spine robotic surgery specialist",
        },
      };

      let statusCode = 200;
      let responseData = null;

      const res = {
        status: (code) => {
          statusCode = code;
          return res;
        },
        json: (data) => {
          responseData = data;
          return res;
        },
      };

      await aiFindDoctors(req, res);

      assert.equal(statusCode, 200);
      assert.ok(responseData.success);
      assert.equal(responseData.totalMatches, 0);
      assert.deepEqual(responseData.doctors, []);
      assert.ok(responseData.message.includes("No registered doctors"));
    });
  });
});
