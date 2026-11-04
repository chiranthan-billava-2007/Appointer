import express from "express";
import rateLimit from "express-rate-limit";
import { handleAssistantChat } from "../controllers/assistantController.js";
import { optionalAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

// Rate limiting on AI Assistant chat: 60 requests per 15 minutes per IP
const assistantLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many AI Assistant requests. Please wait a few moments before trying again.",
  },
});

// AI Assistant endpoints (supports both POST /api/assistant and POST /api/assistant/chat)
router.post("/", assistantLimiter, optionalAuth, handleAssistantChat);
router.post("/chat", assistantLimiter, optionalAuth, handleAssistantChat);
router.get("/", (req, res) => res.json({ status: "ok", service: "Appointer AI Assistant API" }));
router.get("/chat", (req, res) => res.json({ status: "ok", service: "Appointer AI Assistant API" }));

export default router;
