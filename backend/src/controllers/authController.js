import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Doctor from "../models/Doctor.js";

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
    const user = await User.findOne({ email: normalizedEmail }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
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
      doctorProfile = await Doctor.findOne({ user: user._id });
      if (!doctorProfile) {
        return res.status(403).json({
          message: "Doctor account exists but onboarding is incomplete. No linked doctor profile was found.",
        });
      }
    }

    const token = generateToken(user._id, user.role, user.name, user.email);

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      doctorProfile: doctorProfile ? { _id: doctorProfile._id, specialty: doctorProfile.specialty } : null,
      token,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let doctorProfile = null;
    if (user.role === "doctor") {
      doctorProfile = await Doctor.findOne({ user: user._id });
    }

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
