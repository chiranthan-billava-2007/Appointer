import mongoose from "mongoose";
import Appointment from "../models/Appointment.js";
import Doctor from "../models/Doctor.js";
import User from "../models/User.js";
import { getDoctorTimezone, getLocalDateTime } from "../utils/appointmentDateTime.js";

const statusCounts = (appointments) => appointments.reduce(
  (counts, appointment) => ({ ...counts, [appointment.status]: (counts[appointment.status] || 0) + 1 }),
  { upcoming: 0, completed: 0, cancelled: 0 }
);

export const getDashboardSummary = async (req, res) => {
  try {
    if (req.user.role === "admin") {
      const [patients, doctors, appointments, recentAppointments, users] = await Promise.all([
        User.countDocuments({ role: "patient" }),
        Doctor.countDocuments({}),
        Appointment.find({}).sort({ updatedAt: -1 }).select("status").lean(),
        Appointment.find({}).sort({ updatedAt: -1 }).limit(20).lean(),
        User.find({ role: { $in: ["patient", "doctor", "admin"] } })
          .select("name email role createdAt")
          .sort({ createdAt: -1 })
          .limit(100)
          .lean(),
      ]);
      return res.json({
        role: "admin",
        stats: { patients, doctors, totalAppointments: appointments.length, ...statusCounts(appointments) },
        recentAppointments,
        users,
      });
    }

    if (req.user.role === "doctor") {
      const doctor = await Doctor.findOne({ user: new mongoose.Types.ObjectId(req.user.id) });
      if (!doctor) return res.status(403).json({ message: "Doctor account has no linked profile. Access denied." });

      const appointments = await Appointment.find({ doctor: doctor._id }).sort({ scheduledAt: 1, createdAt: -1 }).lean();
      const timezone = getDoctorTimezone(doctor);
      const today = getLocalDateTime(new Date(), timezone).date;
      const todayAppointments = appointments.filter((appointment) => (
        appointment.status === "upcoming"
        && appointment.scheduledAt
        && getLocalDateTime(appointment.scheduledAt, timezone).date === today
      ));
      return res.json({
        role: "doctor",
        timezone,
        weeklyAvailability: doctor.weeklyAvailability || [],
        stats: { ...statusCounts(appointments), today: todayAppointments.length },
        todayAppointments,
        appointments,
      });
    }

    const appointments = await Appointment.find({
      patient: new mongoose.Types.ObjectId(req.user.id),
    }).sort({ scheduledAt: 1, createdAt: -1 }).lean();
    const now = new Date();
    const upcomingAppointments = appointments.filter((appointment) => (
      appointment.status === "upcoming" && (!appointment.scheduledAt || new Date(appointment.scheduledAt) >= now)
    ));
    return res.json({
      role: "patient",
      stats: { ...statusCounts(appointments), upcoming: upcomingAppointments.length },
      upcomingAppointments,
      appointments,
    });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
};
