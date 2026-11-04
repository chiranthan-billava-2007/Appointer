import express from "express";
import {
  getAppointments,
  createAppointment,
  updateAppointmentStatus,
  deleteAppointment,
  rescheduleAppointment,
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

// PATCH /api/appointments/:id/reschedule: Patients and Admins can reschedule upcoming appointments
router.patch("/:id/reschedule", authorize("patient", "admin"), rescheduleAppointment);

// DELETE /api/appointments/:id: Status-based cancellation with ownership verification
router.delete("/:id", deleteAppointment);

export default router;
