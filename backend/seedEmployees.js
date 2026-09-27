const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const db = require("./db");
const { initializePerformanceSchema } = require("./performance");
const { seedEmployees } = require("./performanceData");
const ownerUserId = Number(process.env.DEMO_OWNER_USER_ID);

if (!Number.isInteger(ownerUserId) || ownerUserId <= 0) {
  console.error("Set DEMO_OWNER_USER_ID to the account ID that should own the fictional employee seed data.");
  db.end();
  process.exit(1);
}

initializePerformanceSchema(db, (error, result) => {
  if (error) {
    console.error("Employee seeding failed:", error.message);
    db.end();
    process.exitCode = 1;
    return;
  }
  if (result?.removedDemoEmployees) console.log(`Removed ${result.removedDemoEmployees} old shared demo profile(s).`);
  seedEmployees(db, ownerUserId, (seedError, seedResult) => {
    if (seedError) console.error("Employee seeding failed:", seedError.message);
    else console.log(seedResult?.inserted ? `Seeded ${seedResult.inserted} sample employees for account ${ownerUserId}.` : "This account already has employee records; nothing changed.");
    db.end();
    if (seedError) process.exitCode = 1;
  });
});
