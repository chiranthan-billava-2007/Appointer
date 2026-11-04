import readline from "readline";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "../models/User.js";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/appointer";

function validatePasswordStrength(password) {
  if (!password || typeof password !== "string") {
    return "Password is required.";
  }
  if (password.length < 10) {
    return "Password must be at least 10 characters long.";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter.";
  }
  if (!/[a-z]/.test(password)) {
    return "Password must contain at least one lowercase letter.";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one digit.";
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    return "Password must contain at least one special character.";
  }
  return null;
}

/**
 * Secure password prompter without terminal echo.
 * Also supports non-interactive input when stdin is piped (e.g. automated tests).
 */
function promptHiddenPassword(promptText) {
  return new Promise((resolve, reject) => {
    // If stdin is not a TTY (e.g. piped input in tests / scripts), read line normally
    if (!process.stdin.isTTY) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      process.stdout.write(promptText);
      rl.question("", (answer) => {
        rl.close();
        process.stdout.write("\n");
        resolve(answer.trim());
      });
      return;
    }

    // TTY interactive mode with echo masking
    process.stdout.write(promptText);
    const stdin = process.stdin;
    const oldRawMode = stdin.isRaw;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    let password = "";

    const onData = (ch) => {
      ch = ch.toString("utf8");
      switch (ch) {
        case "\n":
        case "\r":
        case "\u0004": // EOF
          stdin.setRawMode(oldRawMode);
          stdin.pause();
          stdin.removeListener("data", onData);
          process.stdout.write("\n");
          resolve(password);
          break;
        case "\u0003": // Ctrl+C
          stdin.setRawMode(oldRawMode);
          stdin.pause();
          stdin.removeListener("data", onData);
          process.stdout.write("\nCancelled.\n");
          reject(new Error("User cancelled password input."));
          break;
        case "\u007f": // Backspace
        case "\b":
          if (password.length > 0) {
            password = password.slice(0, -1);
          }
          break;
        default:
          password += ch;
          break;
      }
    };

    stdin.on("data", onData);
  });
}

function promptText(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function resetAdminPassword() {
  console.log("\n=================================================");
  console.log("  APPOINTER SECURE ADMIN PASSWORD RESET UTILITY");
  console.log("=================================================\n");

  let adminEmail = process.env.ADMIN_EMAIL;

  // If not provided in environment variable, prompt for target admin email
  if (!adminEmail || !adminEmail.trim()) {
    adminEmail = await promptText("Enter Administrator Email: ");
  }

  if (!adminEmail || !adminEmail.trim()) {
    console.error("FATAL ERROR: Administrator email is required.");
    process.exit(1);
  }

  const normalizedEmail = adminEmail.trim().toLowerCase();

  try {
    await mongoose.connect(MONGODB_URI);

    // Look up the account by normalized email
    const user = await User.findOne({ email: normalizedEmail });

    // Condition 1: Check account existence
    if (!user) {
      console.error(`ERROR: No account found with email: ${normalizedEmail}`);
      console.error("Operation aborted. This utility updates only existing accounts.");
      return;
    }

    // Condition 2: STRICT ROLE CHECK - Only accounts whose role is 'admin' can be reset
    if (user.role !== "admin") {
      console.error(`SECURITY VIOLATION: The account ${normalizedEmail} has role '${user.role}'.`);
      console.error("This utility is strictly restricted to administrator accounts.");
      console.error("Operation aborted. Non-admin accounts will NEVER be modified or promoted.");
      return;
    }

    // Securely prompt for the new password without terminal echo
    // Can also accept NEW_ADMIN_PASSWORD environment variable for automated testing / headless deployments
    let newPassword = process.env.NEW_ADMIN_PASSWORD;
    if (!newPassword) {
      newPassword = await promptHiddenPassword("Enter New Admin Password: ");
      const confirmPassword = await promptHiddenPassword("Confirm New Admin Password: ");

      if (newPassword !== confirmPassword) {
        console.error("ERROR: Passwords do not match. Reset aborted.");
        return;
      }
    }

    // Validate password complexity
    const passwordError = validatePasswordStrength(newPassword);
    if (passwordError) {
      console.error(`ERROR: Insecure password. ${passwordError}`);
      console.error("Password reset aborted.");
      return;
    }

    // Hash with bcrypt (10 rounds)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update existing admin account
    user.password = hashedPassword;
    await user.save();

    // SECURITY: Confirm success without logging password, hash, or secrets
    console.log(`\nSUCCESS: Password successfully reset for administrator: ${user.email}`);
    console.log(`Administrator ID: ${user._id}`);
    console.log(`Account Role: ${user.role} (Preserved)`);
  } catch (error) {
    console.error("[Admin Password Reset Error]", error.message);
    process.exitCode = 1;
  } finally {
    // ALWAYS disconnect MongoDB regardless of outcome
    await mongoose.disconnect();
  }
}

resetAdminPassword();
