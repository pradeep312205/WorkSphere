const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const bcrypt = require("bcryptjs");
const db = require("./db");

async function main() {
  const name = process.env.DEMO_ADMIN_NAME?.trim();
  const email = process.env.DEMO_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.DEMO_ADMIN_PASSWORD;
  if (!name || !email || !password || password.length < 10) {
    throw new Error("Set DEMO_ADMIN_NAME, DEMO_ADMIN_EMAIL, and a DEMO_ADMIN_PASSWORD of at least 10 characters in backend/.env.");
  }
  const [existing] = await new Promise((resolve, reject) => db.query("SELECT id FROM users WHERE email = ? LIMIT 1", [email], (err, rows) => err ? reject(err) : resolve(rows)));
  if (existing) {
    console.log(`Admin account ${email} already exists. Existing password was left unchanged.`);
    return;
  }
  const hash = await bcrypt.hash(password, 12);
  await new Promise((resolve, reject) => db.query("INSERT INTO users (name, email, password) VALUES (?, ?, ?)", [name, email, hash], (err) => err ? reject(err) : resolve()));
  console.log(`Demo admin account created for ${email}.`);
}

main().catch((error) => {
  console.error("Admin seed failed:", error.message);
  process.exitCode = 1;
}).finally(() => db.end());
