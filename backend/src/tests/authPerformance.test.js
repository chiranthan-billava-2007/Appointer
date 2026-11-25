import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";
import Doctor from "../models/Doctor.js";
import { loginUser, getMe } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const baseUri = process.env.APPOINTER_TEST_MONGODB_URI;
if (!baseUri) throw new Error("Set APPOINTER_TEST_MONGODB_URI to run auth tests.");
const uri = new URL(baseUri);
const databaseName = decodeURIComponent(uri.pathname.replace(/^\//, ""));
if (!/test/i.test(databaseName)) throw new Error("APPOINTER_TEST_MONGODB_URI must name a disposable test database.");
uri.pathname = `/${databaseName}_auth_${process.pid}_${Date.now()}`;
process.env.JWT_SECRET ||= "local-auth-test-secret-01234567890123456789";
process.env.AUTH_PERF_LOGS = "false";

const response = () => ({ statusCode: 200, body: null, headers: {}, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; }, setHeader(name, value) { this.headers[name] = value; } });
const request = (body) => ({ body });

let users;

describe("Authentication performance and security", () => {
  before(async () => {
    await mongoose.connect(uri.toString());
    const hash = await bcrypt.hash("Password123!", 10);
    const patient = await User.create({ name: "Auth Patient", email: "auth-patient@example.test", password: hash, role: "patient" });
    const doctorUser = await User.create({ name: "Auth Doctor", email: "auth-doctor@example.test", password: hash, role: "doctor" });
    const admin = await User.create({ name: "Auth Admin", email: "auth-admin@example.test", password: hash, role: "admin" });
    await Doctor.create({ user: doctorUser._id, name: "Dr Auth", specialty: "General physician", timezone: "Asia/Kolkata", weeklyAvailability: [] });
    users = { patient, doctorUser, admin };
  });
  after(async () => mongoose.disconnect());

  for (const [role, email] of [["patient", "auth-patient@example.test"], ["doctor", "auth-doctor@example.test"], ["admin", "auth-admin@example.test"]]) {
    it(`logs in a ${role} without changing the response contract`, async () => {
      const res = response();
      await loginUser(request({ email, password: "Password123!", portalRole: role }), res);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.role, role);
      assert.ok(res.body.token);
      assert.match(res.headers["Server-Timing"], /auth-total/);
    });
  }

  it("rejects incorrect passwords and unknown emails", async () => {
    for (const body of [{ email: "auth-patient@example.test", password: "wrong", portalRole: "patient" }, { email: "missing@example.test", password: "Password123!", portalRole: "patient" }]) {
      const res = response(); await loginUser(request(body), res); assert.equal(res.statusCode, 401);
    }
  });

  it("returns /auth/me data and protects against invalid or expired JWTs", async () => {
    const token = jwt.sign({ id: users.patient._id.toString() }, process.env.JWT_SECRET, { expiresIn: "1h" });
    const me = response(); await getMe({ user: { id: users.patient._id.toString() } }, me); assert.equal(me.statusCode, 200); assert.equal(me.body.role, "patient"); assert.match(me.headers["Server-Timing"], /auth-total/);
    for (const value of ["not-a-token", jwt.sign({ id: users.patient._id.toString() }, process.env.JWT_SECRET, { expiresIn: -1 })]) {
      const res = response(); let called = false; await protect({ headers: { authorization: `Bearer ${value}` } }, res, () => { called = true; }); assert.equal(res.statusCode, 401); assert.equal(called, false);
    }
    const ok = response(); let called = false; await protect({ headers: { authorization: `Bearer ${token}` } }, ok, () => { called = true; }); assert.equal(called, true); assert.equal(ok.headers["Server-Timing"].includes("auth-verify"), true);
  });
});
