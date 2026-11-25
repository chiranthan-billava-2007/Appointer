import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Doctor from "../models/Doctor.js";
import { logAuthTiming, setAuthServerTiming, timerElapsedMs, timerStart } from "../utils/authTiming.js";

const generateToken = (id, role, name, email) => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 32 || jwtSecret.includes("change_in_production")) {
    throw new Error("Server JWT configuration is invalid or insecure");
  }

  return jwt.sign(
    { id, role, name, email },
    jwtSecret,
    { expiresIn: "7d" }
  );
};

const RESET_OTP_TTL_MS = 5 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 10 * 60 * 1000;
const MAX_RESET_OTP_ATTEMPTS = 5;
const RECOVERY_MESSAGE = "If an account exists for that email, a password reset code has been sent.";
const DEMO_OTP = "123456";

const demoOtpEnabled = () => process.env.NODE_ENV !== "production" && process.env.DEMO_OTP_ENABLED === "true";

const clearPasswordReset = (user) => {
  user.resetOtpHash = undefined;
  user.resetOtpExpiresAt = undefined;
  user.resetOtpAttempts = 0;
  user.resetTokenHash = undefined;
  user.resetTokenExpiresAt = undefined;
};

const hashResetToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

export const forgotPassword = async (req, res) => {
  try {
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    if (!email) return res.status(400).json({ message: "Email is required" });
    // This non-sensitive mode flag lets the local UI explain where the code comes
    // from without returning the OTP or revealing whether the account exists.
    const recoveryResponse = demoOtpEnabled()
      ? { message: RECOVERY_MESSAGE, demoMode: true }
      : { message: RECOVERY_MESSAGE };

    const user = await User.findOne({ email }).select("+resetOtpHash +resetOtpExpiresAt +resetOtpAttempts +resetTokenHash +resetTokenExpiresAt");
    if (!user) return res.json(recoveryResponse);

    // Demo OTP mode is intentionally unavailable in production. With no configured
    // delivery mechanism, do not leave a code that a user cannot receive.
    if (!demoOtpEnabled()) {
      clearPasswordReset(user);
      await user.save();
      return res.json(recoveryResponse);
    }

    const otp = DEMO_OTP;
    user.resetOtpHash = await bcrypt.hash(otp, 10);
    user.resetOtpExpiresAt = new Date(Date.now() + RESET_OTP_TTL_MS);
    user.resetOtpAttempts = 0;
    user.resetTokenHash = undefined;
    user.resetTokenExpiresAt = undefined;
    await user.save();

    return res.json(recoveryResponse);
  } catch {
    return res.status(500).json({ message: "Unable to process password reset request" });
  }
};

export const verifyResetOtp = async (req, res) => {
  try {
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const otp = typeof req.body.otp === "string" ? req.body.otp.trim() : "";
    if (!email || !/^\d{6}$/.test(otp)) return res.status(400).json({ message: "Enter a valid six-digit code" });

    const user = await User.findOne({ email }).select("+resetOtpHash +resetOtpExpiresAt +resetOtpAttempts +resetTokenHash +resetTokenExpiresAt");
    const now = new Date();
    if (!user || !user.resetOtpHash || !user.resetOtpExpiresAt || user.resetOtpExpiresAt <= now) {
      if (user) { clearPasswordReset(user); await user.save(); }
      return res.status(400).json({ message: "This reset code is invalid or has expired" });
    }

    if (user.resetOtpAttempts >= MAX_RESET_OTP_ATTEMPTS) {
      clearPasswordReset(user);
      await user.save();
      return res.status(429).json({ message: "Too many code attempts. Request a new code." });
    }

    const valid = await bcrypt.compare(otp, user.resetOtpHash);
    if (!valid) {
      user.resetOtpAttempts += 1;
      const locked = user.resetOtpAttempts >= MAX_RESET_OTP_ATTEMPTS;
      if (locked) clearPasswordReset(user);
      await user.save();
      return res.status(locked ? 429 : 400).json({
        message: locked ? "Too many code attempts. Request a new code." : "This reset code is invalid or has expired",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetTokenHash = hashResetToken(resetToken);
    user.resetTokenExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    user.resetOtpHash = undefined;
    user.resetOtpExpiresAt = undefined;
    user.resetOtpAttempts = 0;
    await user.save();
    return res.json({ message: "Code verified", resetToken });
  } catch {
    return res.status(500).json({ message: "Unable to verify reset code" });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const { resetToken, password } = req.body;
    if (!email || typeof resetToken !== "string" || !resetToken || typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ message: "Email, reset token, and a password of at least 8 characters are required" });
    }

    const user = await User.findOne({ email }).select("+password +resetOtpHash +resetOtpExpiresAt +resetOtpAttempts +resetTokenHash +resetTokenExpiresAt");
    const suppliedTokenHash = hashResetToken(resetToken);
    const validToken = user && user.resetTokenHash && user.resetTokenExpiresAt > new Date()
      && user.resetTokenHash.length === suppliedTokenHash.length
      && crypto.timingSafeEqual(Buffer.from(user.resetTokenHash, "hex"), Buffer.from(suppliedTokenHash, "hex"));
    if (!validToken) return res.status(400).json({ message: "This password reset link is invalid or has expired" });

    user.password = await bcrypt.hash(password, 10);
    clearPasswordReset(user);
    await user.save();
    return res.json({ message: "Password reset successful. You can now log in." });
  } catch {
    return res.status(500).json({ message: "Unable to reset password" });
  }
};

export const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters long" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // SECURITY: Unconditionally enforce role: 'patient' for public registration.
    // Doctors must be onboarded by Admins. Admins must be provisioned via CLI seed script.
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: "patient",
      phone: phone || "",
    });

    const token = generateToken(user._id, user.role, user.name, user.email);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const loginUser = async (req, res) => {
  const totalStart = timerStart();
  let lookupMs;
  let bcryptMs;
  let doctorProfileMs;
  let jwtMs;
  try {
    const { email, password, portalRole } = req.body;

    // Validate portalRole requirement
    const validRoles = ["patient", "doctor", "admin"];
    if (!portalRole || !validRoles.includes(portalRole)) {
      return res.status(400).json({
        message: `portalRole is mandatory and must be one of: [${validRoles.join(", ")}]`,
      });
    }

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    // Explicitly select password since it has select: false in schema
    const lookupStart = timerStart();
    const user = await User.findOne({ email: normalizedEmail }).select("+password");
    lookupMs = timerElapsedMs(lookupStart);
    if (!user) {
      setAuthServerTiming(res, { lookup: lookupMs, total: timerElapsedMs(totalStart) });
      logAuthTiming("login", { status: 401, lookupMs, totalMs: timerElapsedMs(totalStart) });
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const bcryptStart = timerStart();
    const isMatch = await bcrypt.compare(password, user.password);
    bcryptMs = timerElapsedMs(bcryptStart);
    if (!isMatch) {
      setAuthServerTiming(res, { lookup: lookupMs, bcrypt: bcryptMs, total: timerElapsedMs(totalStart) });
      logAuthTiming("login", { status: 401, lookupMs, bcryptMs, totalMs: timerElapsedMs(totalStart) });
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Role-portal boundary check
    if (user.role !== portalRole) {
      return res.status(403).json({
        message: `Access denied: This account cannot log in through the ${portalRole} portal. Registered role is '${user.role}'.`,
      });
    }

    // If logging in through doctor portal, verify linked doctor profile exists
    let doctorProfile = null;
    if (user.role === "doctor") {
      const doctorStart = timerStart();
      doctorProfile = await Doctor.findOne({ user: user._id });
      doctorProfileMs = timerElapsedMs(doctorStart);
      if (!doctorProfile) {
        return res.status(403).json({
          message: "Doctor account exists but onboarding is incomplete. No linked doctor profile was found.",
        });
      }
    }

    const jwtStart = timerStart();
    const token = generateToken(user._id, user.role, user.name, user.email);
    jwtMs = timerElapsedMs(jwtStart);
    const totalMs = timerElapsedMs(totalStart);
    setAuthServerTiming(res, { lookup: lookupMs, bcrypt: bcryptMs, doctor: doctorProfileMs, jwt: jwtMs, total: totalMs });
    logAuthTiming("login", { status: 200, role: user.role, lookupMs, bcryptMs, doctorProfileMs, jwtMs, totalMs });

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      doctorProfile: doctorProfile ? { _id: doctorProfile._id, specialty: doctorProfile.specialty } : null,
      token,
    });
  } catch (error) {
    logAuthTiming("me", { status: 500, totalMs: timerElapsedMs(totalStart) });
    res.status(500).json({ message: error.message });
  }
};

export const getMe = async (req, res) => {
  const totalStart = timerStart();
  try {
    const lookupStart = timerStart();
    const user = await User.findById(req.user.id).select("-password");
    const lookupMs = timerElapsedMs(lookupStart);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let doctorProfile = null;
    let doctorProfileMs;
    if (user.role === "doctor") {
      const doctorStart = timerStart();
      doctorProfile = await Doctor.findOne({ user: user._id });
      doctorProfileMs = timerElapsedMs(doctorStart);
    }

    const totalMs = timerElapsedMs(totalStart);
    setAuthServerTiming(res, { lookup: lookupMs, doctor: doctorProfileMs, total: totalMs });
    logAuthTiming("me", { status: 200, role: user.role, lookupMs, doctorProfileMs, totalMs });

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      doctorProfile: doctorProfile ? { _id: doctorProfile._id, specialty: doctorProfile.specialty } : null,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
