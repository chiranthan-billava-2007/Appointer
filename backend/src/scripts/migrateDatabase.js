import mongoose from "mongoose";
import dotenv from "dotenv";
import { findScheduledAtConflicts, findUpcomingSlotConflicts } from "../utils/appointmentSlotUtils.js";

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
      // Keep this aligned with the unique index's partial filter. Null doctor values
      // are indexed too when the field exists; missing doctor fields are not.
      doctor: { $exists: true },
    }).toArray();

    const conflictingDuplicates = findUpcomingSlotConflicts(upcomingAppointments);
    const exactDuplicates = conflictingDuplicates.filter((conflict) => conflict.exact);
    const normalizedOnlyDuplicates = conflictingDuplicates.filter((conflict) => !conflict.exact);

    if (conflictingDuplicates.length > 0) {
      console.warn(`[WARNING] Detected ${conflictingDuplicates.length} upcoming duplicate slot group(s):`);
      conflictingDuplicates.forEach((conflict) => {
        const appointmentIds = conflict.appointments.map((appointment) => appointment.id).join(", ");
        const rawSlots = [...new Set(conflict.appointments.map((appointment) => appointment.slot))].join(" | ");
        console.warn(`  - Doctor: ${conflict.doctor} | Normalized slot: '${conflict.normalizedSlot}' | ${conflict.exact ? "Exact" : "Whitespace/case variant"} | Raw values: '${rawSlots}' | Appointments: ${appointmentIds}`);
      });
      console.warn("[ACTION HALTED] Conflicts require manual review. No appointment records will be modified or deleted.");
      if (!isDryRun) {
        throw new Error("Cannot apply index migration while exact or normalized duplicate upcoming bookings exist.");
      }
    } else {
      console.log("  ✓ No exact or normalized upcoming slot conflicts found.");
    }

    const datedUpcomingAppointments = await db.collection("appointments").find({
      status: "upcoming",
      doctor: { $exists: true },
      scheduledAt: { $type: "date" },
    }).toArray();
    const scheduledAtConflicts = findScheduledAtConflicts(datedUpcomingAppointments);
    const displayOnlyUpcomingCount = await db.collection("appointments").countDocuments({
      status: "upcoming",
      scheduledAt: { $not: { $type: "date" } },
    });
    const appointmentsCollectionExists = await db.listCollections({ name: "appointments" }).hasNext();
    const appointmentIndexes = appointmentsCollectionExists
      ? await db.collection("appointments").listIndexes().toArray()
      : [];
    const scheduledAtIndex = appointmentIndexes.find((index) => index.name === "unique_upcoming_doctor_scheduled_at");
    console.log(`\n[Phase 1b] Dated appointment index: ${scheduledAtIndex ? "present" : "not present"}`);
    console.log(`[Phase 1b] Upcoming display-only/legacy appointments preserved without date backfill: ${displayOnlyUpcomingCount}`);
    if (scheduledAtConflicts.length) {
      console.warn(`[WARNING] Found ${scheduledAtConflicts.length} duplicate doctor/instant group(s) for the new date index:`);
      for (const conflict of scheduledAtConflicts) {
        console.warn(`  - Doctor: ${conflict.doctor} | UTC instant: ${conflict.scheduledAt} | Appointments: ${conflict.appointmentIds.join(", ")}`);
      }
      if (!isDryRun) throw new Error("Cannot apply the dated appointment index while duplicate instants exist.");
    }

    // 2. Identify Legacy Unlinked Appointments
    const unlinkedAppointments = await db.collection("appointments").find({
      $or: [{ patient: { $exists: false } }, { doctor: { $exists: false } }, { patient: null }, { doctor: null }],
    }).toArray();

    const legacyUntaggedCount = unlinkedAppointments.filter((appointment) => !appointment.isLegacy).length;
    console.log(`\n[Phase 2] Legacy Unlinked Appointments: ${unlinkedAppointments.length} found. Untagged records to preserve and review: ${legacyUntaggedCount}`);

    // 3. Execution / Dry-Run summary
    console.log(`\n[Migration Summary]`);
    console.log(`  • Exact duplicate groups: ${exactDuplicates.length}`);
    console.log(`  • Whitespace/case-only duplicate groups: ${normalizedOnlyDuplicates.length}`);
    console.log(`  • Total normalized conflict groups: ${conflictingDuplicates.length}`);
    console.log(`  • Duplicate dated instants: ${scheduledAtConflicts.length}`);
    console.log(`  • Untagged legacy appointments to preserve without modification: ${legacyUntaggedCount}`);
    console.log(`  • Planned indexes:`);
    console.log(`    - users: { email: 1 } (unique)`);
    console.log(`    - doctors: { user: 1 } (unique, sparse)`);
    console.log(`    - appointments: { doctor: 1, slot: 1 } (partialFilter: status='upcoming', doctor exists)`);
    console.log(`    - appointments: { doctor: 1, scheduledAt: 1 } (unique; status='upcoming', doctor exists, scheduledAt is Date)`);
    console.log(`    - appointments: { patient: 1, createdAt: -1 }`);
    console.log(`    - appointments: { doctor: 1, createdAt: -1 }`);

    if (isDryRun) {
      console.log(`\n[DRY RUN COMPLETE] Zero database modifications were written.`);
    } else {
      console.log(`\n[LIVE UPDATE] Applying index changes only...`);

      // This migration intentionally does not update or delete appointment records.
      // It only creates indexes, and does not drop or replace existing indexes.
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
      await db.collection("appointments").createIndex(
        { doctor: 1, scheduledAt: 1 },
        {
          unique: true,
          partialFilterExpression: {
            status: "upcoming",
            doctor: { $exists: true },
            scheduledAt: { $type: "date" },
          },
          name: "unique_upcoming_doctor_scheduled_at",
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
