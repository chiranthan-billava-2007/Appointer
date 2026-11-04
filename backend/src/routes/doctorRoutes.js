import express from "express";
import { getDoctors, getDoctorById, createDoctor } from "../controllers/doctorController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/rbacMiddleware.js";

const router = express.Router();

// Public doctor discovery
router.get("/", getDoctors);
router.get("/:id", getDoctorById);

// Canonical Doctor Onboarding: Admin only
router.post("/", protect, authorize("admin"), createDoctor);

export default router;
