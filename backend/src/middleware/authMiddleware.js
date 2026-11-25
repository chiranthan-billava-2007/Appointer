import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { logAuthTiming, setAuthServerTiming, timerElapsedMs, timerStart } from "../utils/authTiming.js";

export const protect = async (req, res, next) => {
  const totalStart = timerStart();
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 32 || jwtSecret.includes("change_in_production")) {
    console.error("[AuthMiddleware] FATAL: JWT_SECRET is missing, insecure, or using a placeholder.");
    return res.status(500).json({ message: "Server authentication configuration error" });
  }

  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      if (!token) {
        return res.status(401).json({ message: "Not authorized, token missing" });
      }

      // Verify cryptographic signature and expiration
      const verifyStart = timerStart();
      const decoded = jwt.verify(token, jwtSecret);
      const verifyMs = timerElapsedMs(verifyStart);

      // Verify user existence and active status in MongoDB
      const lookupStart = timerStart();
      const user = await User.findById(decoded.id).select("-password");
      const lookupMs = timerElapsedMs(lookupStart);
      if (!user) {
        setAuthServerTiming(res, { verify: verifyMs, lookup: lookupMs, total: timerElapsedMs(totalStart) });
        return res.status(401).json({ message: "Not authorized, user account no longer exists" });
      }

      // Securely bind verified database identity and authoritative database role to req.user
      req.user = {
        id: user._id.toString(),
        role: user.role, // Authoritative role directly from MongoDB
        email: user.email,
        name: user.name,
      };

      const totalMs = timerElapsedMs(totalStart);
      setAuthServerTiming(res, { verify: verifyMs, lookup: lookupMs, total: totalMs });
      logAuthTiming("protect", { status: 200, role: user.role, verifyMs, lookupMs, totalMs });
      return next();
    } catch {
      const totalMs = timerElapsedMs(totalStart);
      setAuthServerTiming(res, { total: totalMs });
      logAuthTiming("protect", { status: 401, totalMs });
      return res.status(401).json({ message: "Not authorized, token failed or expired" });
    }
  }

  return res.status(401).json({ message: "Not authorized, no token provided" });
};

// Optional authentication middleware: Populates req.user if valid JWT is present,
// but allows unauthenticated access to continue (req.user remains undefined)
export const optionalAuth = async (req, res, next) => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 32 || jwtSecret.includes("change_in_production")) {
    return next();
  }

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      const token = req.headers.authorization.split(" ")[1];
      if (token) {
        const decoded = jwt.verify(token, jwtSecret);
        const user = await User.findById(decoded.id).select("-password");
        if (user) {
          req.user = {
            id: user._id.toString(),
            role: user.role,
            email: user.email,
            name: user.name,
          };
        }
      }
    } catch {
      // Ignore token failure for optional auth
    }
  }

  next();
};
