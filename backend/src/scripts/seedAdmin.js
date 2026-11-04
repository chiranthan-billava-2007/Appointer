import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "../models/User.js";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/appointer";

function validatePasswordStrength(password) {
  if (!password || typeof password !== "string") {
    return "Password is required and must be a string.";
  }
  if (password.length < 10) {
    return "Admin password must be at least 10 characters long.";
  }
  if (!/[A-Z]/.test(password)) {
    return "Admin password must contain at least one uppercase letter.";
  }
  if (!/[a-z]/.test(password)) {
    return "Admin password must contain at least one lowercase letter.";
  }
  if (!/[0-9]/.test(password)) {
    return "Admin password must contain at least one digit.";
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    return "Admin password must contain at least one special character.";
  }
  return null;
}

async function seedAdmin() {
  console.log("\n=================================================");
  console.log("  APPOINTER SECURE ADMIN PROVISIONING UTILITY");
  console.log("=================================================\n");

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME || "System Administrator";

  // STRICT REQUIREMENT: Fail immediately if ADMIN_EMAIL or ADMIN_PASSWORD are missing
  if (!adminEmail || !adminEmail.trim()) {
    console.error("FATAL ERROR: ADMIN_EMAIL environment variable is required.");
    console.error("Usage example: ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD='StrongPassword123!' npm run seed:admin");
    process.exit(1);
  }

  if (!adminPassword || !adminPassword.trim()) {
    console.error("FATAL ERROR: ADMIN_PASSWORD environment variable is required.");
    console.error("Usage example: ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD='StrongPassword123!' npm run seed:admin");
    process.exit(1);
  }

  const passwordError = validatePasswordStrength(adminPassword);
  if (passwordError) {
    console.error(`FATAL ERROR: Insecure ADMIN_PASSWORD. ${passwordError}`);
    process.exit(1);
  }

  const normalizedEmail = adminEmail.trim().toLowerCase();

  try {
    await mongoose.connect(MONGODB_URI);

    const existingAdmin = await User.findOne({ email: normalizedEmail });
    if (existingAdmin) {
      console.log(`[Admin Provisioning] Admin account already exists for: ${normalizedEmail}`);
      console.log(`[Admin Provisioning] Duplicate creation safely prevented. No changes applied.`);
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    const newAdmin = await User.create({
      name: adminName.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: "admin",
    });

    // SECURITY: Never print plain text password, hash, or secrets
    console.log(`[Admin Provisioning] SUCCESS: Administrator account created.`);
    console.log(`[Admin Provisioning] Admin Email: ${newAdmin.email}`);
    console.log(`[Admin Provisioning] Account Role: ${newAdmin.role}`);
    console.log(`[Admin Provisioning] Record ID: ${newAdmin._id}`);
  } catch (error) {
    console.error("[Admin Provisioning Error]", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seedAdmin();
