import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import User from "../models/User.js";
import Doctor from "../models/Doctor.js";

let ioInstance;

const normalizeOrigins = (origins = []) => origins.filter(Boolean).map((origin) => origin.replace(/\/+$/, ""));

export const appointmentRoom = (appointment) => ({
  patient: appointment.patient ? `user:${appointment.patient.toString()}` : null,
  doctor: appointment.doctor ? `doctor:${appointment.doctor.toString()}` : null,
  admin: "role:admin",
});

export const safeAppointmentEvent = (appointment) => ({
  appointmentId: appointment._id.toString(),
  patientId: appointment.patient?.toString() || null,
  doctorId: appointment.doctor?.toString() || null,
  status: appointment.status,
  slot: appointment.slot,
  scheduledAt: appointment.scheduledAt instanceof Date ? appointment.scheduledAt.toISOString() : null,
  timezone: appointment.timezone || null,
});

export const emitAppointmentEvent = (eventName, appointment) => {
  if (!ioInstance || !appointment?._id) return;
  const payload = safeAppointmentEvent(appointment);
  const rooms = appointmentRoom(appointment);
  [rooms.patient, rooms.doctor, rooms.admin].filter(Boolean).forEach((room) => ioInstance.to(room).emit(eventName, payload));
};

export const getSocketServer = () => ioInstance;

export function attachSocketServer(httpServer, { allowedOrigins = [] } = {}) {
  const origins = normalizeOrigins(allowedOrigins);
  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || origins.includes(origin.replace(/\/+$/, ""))) return callback(null, true);
        return callback(new Error("Socket origin is not allowed"));
      },
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.replace(/^Bearer\s+/i, "");
      const secret = process.env.JWT_SECRET;
      if (!secret || !token) return next(new Error("Authentication required"));
      const decoded = jwt.verify(token, secret);
      const user = await User.findById(decoded.id).select("-password");
      if (!user) return next(new Error("Authentication failed"));
      const doctor = user.role === "doctor" ? await Doctor.findOne({ user: user._id }).select("_id") : null;
      if (user.role === "doctor" && !doctor) return next(new Error("Doctor profile unavailable"));
      socket.data.user = { id: user._id.toString(), role: user.role, doctorId: doctor?._id.toString() || null };
      next();
    } catch {
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    const { id, role, doctorId } = socket.data.user;
    socket.join(`user:${id}`);
    if (role === "doctor") socket.join(`doctor:${doctorId}`);
    if (role === "admin") socket.join("role:admin");

    const expiresAt = socket.handshake.auth?.token ? jwt.decode(socket.handshake.auth.token)?.exp : null;
    if (expiresAt) {
      const expiryTimer = setTimeout(() => {
        socket.emit("auth:expired");
        socket.disconnect(true);
      }, Math.max(0, expiresAt * 1000 - Date.now()));
      socket.once("disconnect", () => clearTimeout(expiryTimer));
    }

    // Rooms are server-controlled. This event exists only to make unauthorized
    // client subscription attempts explicit and observable to the caller.
    socket.on("room:join", (_requestedRoom, acknowledge) => {
      if (typeof acknowledge === "function") acknowledge({ ok: false, message: "Rooms are assigned by the server." });
    });
  });

  ioInstance = io;
  return io;
}
