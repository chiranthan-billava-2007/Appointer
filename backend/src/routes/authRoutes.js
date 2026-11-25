import express from "express";
import rateLimit from "express-rate-limit";
import { registerUser, loginUser, getMe, forgotPassword, verifyResetOtp, resetPassword } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

const passwordRecoveryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many password recovery requests. Please try again later." },
});

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/forgot-password", passwordRecoveryLimiter, forgotPassword);
router.post("/verify-reset-otp", passwordRecoveryLimiter, verifyResetOtp);
router.post("/reset-password", passwordRecoveryLimiter, resetPassword);
router.get("/me", protect, getMe);

export default router;
