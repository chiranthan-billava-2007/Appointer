import { processAssistantMessage } from "../services/appointmentAiService.js";

/**
 * AI Appointment Assistant Chat Controller
 * Handles natural-language conversational queries, doctor discovery, real availability checking,
 * and pre-confirmation workflows for bookings, rescheduling, and cancellations.
 */
export const handleAssistantChat = async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        message: "Please enter a message or question for the AI Assistant.",
      });
    }

    if (message.trim().length > 500) {
      return res.status(400).json({
        message: "Your message is too long. Please summarize your question in 500 characters or less.",
      });
    }

    // req.user is populated by optionalAuth middleware if valid JWT Bearer token was supplied
    const user = req.user || null;

    const result = await processAssistantMessage({
      message: message.trim(),
      history: Array.isArray(history) ? history.slice(-6) : [],
      user,
    });

    res.json(result);
  } catch (error) {
    console.error("[AI Assistant Controller Error]", error.message);
    res.status(500).json({
      message: "An error occurred while processing your request with the AI Assistant. Please try again.",
    });
  }
};
