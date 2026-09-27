const mysql = require("mysql2");

// TiDB Cloud Starter requires TLS for public MySQL connections. Keep this
// opt-in so local MySQL development continues to work without TLS by default.
const ssl = process.env.DB_SSL === "true"
  ? { minVersion: "TLSv1.2" }
  : undefined;

const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "worksphere",
  port: Number(process.env.DB_PORT || 3306),
  ...(ssl ? { ssl } : {}),
});

db.connect((err) => {
  if (err) {
    console.error("MySQL connection failed:", err.message);
    return;
  }

  console.log("MySQL connected successfully!");
});

module.exports = db;
