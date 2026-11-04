import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import doctorRoutes from "./routes/doctorRoutes.js";
import appointmentRoutes from "./routes/appointmentRoutes.js";
import assistantRoutes from "./routes/assistantRoutes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config();

// CRITICAL SECURITY ASSERTION: Validate JWT configuration at server launch
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 32 || jwtSecret.includes("change_in_production")) {
  console.error("==================================================================");
  console.error("FATAL: Insecure or missing JWT_SECRET environment configuration.");
  console.error("Please supply a random 32+ character JWT_SECRET in backend/.env");
  console.error("Server startup aborted to protect application security.");
  console.error("==================================================================");
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// Trust reverse proxy headers (required for Render, Cloudflare, Heroku, etc.)
app.set("trust proxy", 1);

// Security Headers via Helmet
app.use(helmet());

// Security: Disable Express fingerprint header
app.disable("x-powered-by");

// Rate limiting on authentication routes to mitigate brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 auth requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many authentication attempts. Please try again after 15 minutes." },
});

// Middleware: CORS supporting explicitly configured origins (default + CLIENT_URL) with trailing-slash normalization
const defaultAllowed = [
  "http://localhost:5173",
  "https://appointer.vercel.app",
];
const envAllowed = (process.env.CLIENT_URL || "")
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

const allowedOrigins = Array.from(new Set([...defaultAllowed, ...envAllowed]));

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header (health probes, curl, server-to-server)
      if (!origin) {
        return callback(null, true);
      }
      const normalized = origin.trim().replace(/\/+$/, "");
      // Allow only explicitly configured origins
      if (allowedOrigins.includes(normalized)) {
        return callback(null, true);
      }
      callback(null, false);
    },
    credentials: true,
  })
);

// Enforce request body size limit to mitigate payload-based DoS attacks
app.use(express.json({ limit: "10kb" }));

// API Routes
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/assistant", assistantRoutes);
app.use("/api/appointments/assistant", assistantRoutes);

// Root welcome endpoint
app.get("/", (req, res) => {
  res.send(`
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 60px auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
      <h2 style="color: #0f172a; margin-top: 0;">🏥 Appointer Backend API is Running</h2>
      <p style="color: #475569;">The Express server is actively listening on port ${PORT}.</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <h3 style="color: #1e293b; margin-bottom: 8px;">Available Endpoints:</h3>
      <ul style="color: #2563eb; line-height: 1.8;">
        <li><a href="/api/health" target="_blank">GET /api/health</a> - Service health check</li>
        <li><a href="/api/doctors" target="_blank">GET /api/doctors</a> - Doctor directory & search</li>
        <li><a href="/api/appointments" target="_blank">GET /api/appointments</a> - Appointments list (Auth required)</li>
        <li><a href="/api/assistant" target="_blank">POST /api/assistant/chat</a> - AI Appointment Assistant</li>
      </ul>
      <p style="margin-top: 24px; font-size: 0.9rem; color: #64748b;">
        Frontend application runs at: <a href="http://localhost:5173" style="color: #0284c7;">http://localhost:5173</a>
      </p>
    </div>
  `);
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "Appointer Backend API",
    timestamp: new Date().toISOString(),
  });
});

// Safe Central error handler - Never leaks internal call stacks, DB driver paths, or system details
app.use((err, req, res, next) => {
  // If payload size exceeded
  if (err.type === "entity.too.large") {
    return res.status(413).json({ message: "Payload too large. Maximum allowed size is 10kb." });
  }

  // Safe fallback error response
  res.status(err.status || 500).json({
    message: err.status ? err.message : "An unexpected internal server error occurred",
  });
});

// REQUIREMENT: Connect to MongoDB BEFORE starting the HTTP server
// If database connection fails, the process exits and does not listen on the port
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`[Appointer API] Server running on http://localhost:${PORT}`);
  });
});
