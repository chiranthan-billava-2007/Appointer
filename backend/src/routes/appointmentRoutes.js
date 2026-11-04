import express from "express";
import {
  getAppointments,
  createAppointment,
  updateAppointmentStatus,
  deleteAppointment,
} from "../controllers/appointmentController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/rbacMiddleware.js";

const router = express.Router();

// All appointment operations require authentication
router.use(protect);

// GET /api/appointments: Filtered by user role (patient gets own, doctor gets assigned, admin gets all)
router.get("/", getAppointments);

// POST /api/appointments: Patients and Admins can book appointments
router.post("/", authorize("patient", "admin"), createAppointment);

// PATCH /api/appointments/:id/status: Doctors and Admins can update visit status
router.patch("/:id/status", authorize("doctor", "admin"), updateAppointmentStatus);

// DELETE /api/appointments/:id: Status-based cancellation with ownership verification
router.delete("/:id", deleteAppointment);

export default router;
