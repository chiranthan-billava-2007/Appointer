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

// POST /api/assistant/chat (with optional JWT auth to identify user when logged in)
router.post("/chat", assistantLimiter, optionalAuth, handleAssistantChat);

export default router;
