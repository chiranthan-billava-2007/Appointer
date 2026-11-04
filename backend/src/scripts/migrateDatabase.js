import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/appointer";

async function runMigration(isDryRun = true) {
  console.log(`\n======================================================`);
  console.log(`  APPOINTER REPEATABLE DATABASE MIGRATION & INDEXING`);
  console.log(`  MODE: ${isDryRun ? "DRY-RUN (Inspect Only)" : "LIVE EXECUTION (Safe Index & Preservation)"}`);
  console.log(`======================================================\n`);

  let client = null;
  try {
    const conn = await mongoose.connect(MONGODB_URI);
    client = conn.connection;
    const db = client.db;

    // 1. Inspect Appointments & Detect Potential Conflicting Duplicates
    console.log("[Phase 1] Scanning for duplicate upcoming bookings on {doctor, slot}...");
    const upcomingAppointments = await db.collection("appointments").find({
      status: "upcoming",
      doctor: { $exists: true, $ne: null },
    }).toArray();

    const seenSlots = new Map();
    const conflictingDuplicates = [];

    for (const appt of upcomingAppointments) {
      const key = `${appt.doctor.toString()}_${appt.slot}`;
      if (seenSlots.has(key)) {
        conflictingDuplicates.push({
          duplicateId: appt._id,
          firstId: seenSlots.get(key),
          key,
        });
      } else {
        seenSlots.set(key, appt._id);
      }
    }

    if (conflictingDuplicates.length > 0) {
      console.warn(`[WARNING] Detected ${conflictingDuplicates.length} conflicting upcoming duplicate appointment(s):`);
      conflictingDuplicates.forEach((dup) => {
        console.warn(`  - Conflicting Slot: ${dup.key} | Appt1: ${dup.firstId} | Appt2: ${dup.duplicateId}`);
      });
      console.warn("[ACTION HALTED] Duplicate records must be resolved by administrator. Automated deletion is strictly prohibited.");
      if (!isDryRun) {
        throw new Error("Cannot apply unique index while conflicting duplicate upcoming bookings exist.");
      }
    } else {
      console.log("  ✓ No conflicting upcoming duplicate bookings found. Safe to proceed with partial unique index.");
    }

    // 2. Identify Legacy Unlinked Appointments
    const unlinkedAppointments = await db.collection("appointments").find({
      $or: [{ patient: { $exists: false } }, { doctor: { $exists: false } }, { patient: null }, { doctor: null }],
    }).toArray();

    const legacyToTag = unlinkedAppointments.filter((a) => !a.isLegacy).map((a) => a._id);
    console.log(`\n[Phase 2] Legacy Unlinked Appointments: ${unlinkedAppointments.length} found. Needs isLegacy tag: ${legacyToTag.length}`);

    // 3. Execution / Dry-Run summary
    console.log(`\n[Migration Summary]`);
    console.log(`  • Conflicting duplicates: ${conflictingDuplicates.length}`);
    console.log(`  • Legacy appointments to preserve: ${legacyToTag.length}`);
    console.log(`  • Planned indexes:`);
    console.log(`    - users: { email: 1 } (unique)`);
    console.log(`    - doctors: { user: 1 } (unique, sparse)`);
    console.log(`    - appointments: { doctor: 1, slot: 1 } (partialFilter: status='upcoming', doctor exists)`);
    console.log(`    - appointments: { patient: 1, createdAt: -1 }`);
    console.log(`    - appointments: { doctor: 1, createdAt: -1 }`);

    if (isDryRun) {
      console.log(`\n[DRY RUN COMPLETE] Zero database modifications were written.`);
    } else {
      console.log(`\n[LIVE UPDATE] Applying updates and indexes...`);

      if (legacyToTag.length > 0) {
        await db.collection("appointments").updateMany(
          { _id: { $in: legacyToTag } },
          { $set: { isLegacy: true, legacyPreservedAt: new Date() } }
        );
        console.log(`  ✓ Tagged ${legacyToTag.length} appointment(s) with isLegacy: true.`);
      }

      // Safe index creation
      await db.collection("users").createIndex({ email: 1 }, { unique: true });
      await db.collection("doctors").createIndex({ user: 1 }, { unique: true, sparse: true });
      await db.collection("appointments").createIndex({ patient: 1, createdAt: -1 });
      await db.collection("appointments").createIndex({ doctor: 1, createdAt: -1 });
      await db.collection("appointments").createIndex(
        { doctor: 1, slot: 1 },
        {
          unique: true,
          partialFilterExpression: { status: "upcoming", doctor: { $exists: true } },
          name: "unique_upcoming_doctor_slot",
        }
      );
      console.log(`  ✓ All collection indexes verified and applied successfully.`);
    }
  } catch (err) {
    console.error("[Migration Error]", err.message);
    process.exitCode = 1;
  } finally {
    if (client) {
      await mongoose.disconnect();
      console.log("[Database Cleanup] Disconnected from MongoDB cleanly.");
    }
  }
}

const isDryRun = !process.argv.includes("--apply");
runMigration(isDryRun);
