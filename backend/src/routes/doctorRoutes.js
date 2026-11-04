import express from "express";
import rateLimit from "express-rate-limit";
import {
  getDoctors,
  getDoctorById,
  createDoctor,
  aiFindDoctors,
  getDoctorAvailability,
} from "../controllers/doctorController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/rbacMiddleware.js";

const router = express.Router();

// Rate limiter for AI Doctor Finder endpoint: 60 queries per 15 minutes per IP
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many AI doctor search requests. Please wait a few moments before searching again.",
  },
});

// AI Doctor Finder (Public doctor discovery)
// Supports both POST with { query } and GET with ?query=...
router.post("/ai-find", aiLimiter, aiFindDoctors);
router.get("/ai-find", aiLimiter, (req, res) => {
  req.body = { query: req.query.query || req.query.q || "" };
  return aiFindDoctors(req, res);
});

// Public doctor discovery and real-time availability
router.get("/", getDoctors);
router.get("/:id/availability", getDoctorAvailability);
router.get("/:id", getDoctorById);

// Canonical Doctor Onboarding: Admin only
router.post("/", protect, authorize("admin"), createDoctor);

export default router;
