import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import User from "../models/User.js";
import Doctor from "../models/Doctor.js";
import { forgotPassword, loginUser, resetPassword, verifyResetOtp } from "../controllers/authController.js";

const baseUri = process.env.APPOINTER_TEST_MONGODB_URI;
if (!baseUri) throw new Error("Set APPOINTER_TEST_MONGODB_URI to run password reset tests.");
const uri = new URL(baseUri);
const databaseName = decodeURIComponent(uri.pathname.replace(/^\//, ""));
if (!/test/i.test(databaseName)) throw new Error("APPOINTER_TEST_MONGODB_URI must name a disposable test database.");
uri.pathname = `/${databaseName}_password_reset_${process.pid}_${Date.now()}`;
process.env.JWT_SECRET ||= "local-password-reset-test-secret-012345678901234";

const response = () => ({ statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
const request = (body) => ({ body });
const selectReset = (email) => User.findOne({ email }).select("+password +resetOtpHash +resetOtpExpiresAt +resetOtpAttempts +resetTokenHash +resetTokenExpiresAt");

describe("Password recovery", () => {
  const password = "OriginalPass123!";
  const accounts = ["patient", "doctor", "admin"].map((role) => ({ role, email: `reset-${role}@example.test` }));
  const originalNodeEnv = process.env.NODE_ENV;
  const originalDemoOtpEnabled = process.env.DEMO_OTP_ENABLED;

  before(async () => {
    process.env.NODE_ENV = "test";
    process.env.DEMO_OTP_ENABLED = "true";
    await mongoose.connect(uri.toString());
    const passwordHash = await bcrypt.hash(password, 10);
    const users = await User.create(accounts.map(({ role, email }) => ({ name: `Reset ${role}`, email, password: passwordHash, role })));
    const doctorUser = users.find((user) => user.role === "doctor");
    await Doctor.create({ user: doctorUser._id, name: "Dr Reset", specialty: "General physician", timezone: "Asia/Kolkata", weeklyAvailability: [] });
  });
  after(async () => {
    await mongoose.disconnect();
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalDemoOtpEnabled === undefined) delete process.env.DEMO_OTP_ENABLED;
    else process.env.DEMO_OTP_ENABLED = originalDemoOtpEnabled;
  });

  it("accepts valid OTPs and resets passwords for every role", async () => {
    for (const { role, email } of accounts) {
      const user = await selectReset(email);
      user.resetOtpHash = await bcrypt.hash("123456", 10);
      user.resetOtpExpiresAt = new Date(Date.now() + 60_000);
      user.resetOtpAttempts = 0;
      await user.save();

      const verified = response();
      await verifyResetOtp(request({ email, otp: "123456" }), verified);
      assert.equal(verified.statusCode, 200);
      assert.match(verified.body.resetToken, /^[a-f0-9]{64}$/);

      const reset = response();
      const newPassword = `Updated-${role}-Pass123!`;
      await resetPassword(request({ email, resetToken: verified.body.resetToken, password: newPassword }), reset);
      assert.equal(reset.statusCode, 200);

      const login = response();
      await loginUser(request({ email, password: newPassword, portalRole: role }), login);
      assert.equal(login.statusCode, 200);
      const updated = await selectReset(email);
      assert.equal(await bcrypt.compare(newPassword, updated.password), true);
    }
  });

  it("rejects invalid, expired, reused, and too many OTP attempts", async () => {
    const { email } = accounts[0];
    let user = await selectReset(email);
    user.resetOtpHash = await bcrypt.hash("654321", 10);
    user.resetOtpExpiresAt = new Date(Date.now() + 60_000);
    user.resetOtpAttempts = 0;
    await user.save();
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const result = response(); await verifyResetOtp(request({ email, otp: "000000" }), result);
      assert.equal(result.statusCode, attempt === 5 ? 429 : 400);
    }

    user = await selectReset(email);
    user.resetOtpHash = await bcrypt.hash("654321", 10);
    user.resetOtpExpiresAt = new Date(Date.now() - 1);
    await user.save();
    const expired = response(); await verifyResetOtp(request({ email, otp: "654321" }), expired);
    assert.equal(expired.statusCode, 400);

    user = await selectReset(email);
    user.resetOtpHash = await bcrypt.hash("654321", 10);
    user.resetOtpExpiresAt = new Date(Date.now() + 60_000);
    await user.save();
    const first = response(); await verifyResetOtp(request({ email, otp: "654321" }), first);
    const reused = response(); await verifyResetOtp(request({ email, otp: "654321" }), reused);
    assert.equal(reused.statusCode, 400);
  });

  it("uses a hashed fixed demonstration code without exposing it in the response", async () => {
    const known = response(); await forgotPassword(request({ email: accounts[1].email }), known);
    const unknown = response(); await forgotPassword(request({ email: "missing@example.test" }), unknown);
    assert.deepEqual(known.body, unknown.body);
    assert.equal(known.body.demoMode, true);
    const user = await selectReset(accounts[1].email);
    assert.equal(await bcrypt.compare("123456", user.resetOtpHash), true);
    assert.equal(JSON.stringify(known.body).includes("123456"), false);
  });

  it("does not create a demo code when production mode is set", async () => {
    process.env.NODE_ENV = "production";
    const result = response(); await forgotPassword(request({ email: accounts[2].email }), result);
    assert.equal(result.statusCode, 200);
    assert.equal(result.body.demoMode, undefined);
    const user = await selectReset(accounts[2].email);
    assert.equal(user.resetOtpHash, undefined);
    process.env.NODE_ENV = "test";
  });
});
