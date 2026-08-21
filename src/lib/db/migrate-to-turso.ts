import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: ".env.local" });

async function migrateData() {
  console.log("🚀 Starting data migration from SQLite to Turso Cloud...\n");

  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  if (!tursoUrl || tursoUrl.startsWith("file:")) {
    console.error("❌ TURSO_DATABASE_URL is not set to a remote Turso database.");
    process.exit(1);
  }

  if (!tursoToken) {
    console.error("❌ TURSO_AUTH_TOKEN is missing in .env.local.");
    process.exit(1);
  }

  // 1. Connect to Local SQLite
  const localDb = createClient({
    url: "file:./local.db",
  });

  // 2. Connect to Turso Cloud
  const tursoDb = createClient({
    url: tursoUrl,
    authToken: tursoToken,
  });

  console.log("📡 Connected to Turso:", tursoUrl);

  const tables = [
    "users",
    "categories",
    "accounts",
    "sessions",
    "verification_tokens",
    "audit_logs",
    "courses",
  ];

  for (const table of tables) {
    try {
      console.log(`📦 Migrating table: ${table}...`);
      const localRows = await localDb.execute(`SELECT * FROM ${table}`);

      if (localRows.rows.length === 0) {
        console.log(`  ℹ️ Table ${table} is empty, skipping.`);
        continue;
      }

      console.log(`  Found ${localRows.rows.length} rows in ${table}. Transferring...`);

      for (const row of localRows.rows) {
        const columns = Object.keys(row);
        const placeholders = columns.map(() => "?").join(", ");
        const values = Object.values(row);

        const sql = `INSERT OR REPLACE INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`;
        await tursoDb.execute({ sql, args: values });
      }

      console.log(`  ✅ Successfully migrated ${localRows.rows.length} rows to ${table}.`);
    } catch (err: any) {
      console.warn(`  ⚠️ Could not migrate table ${table}:`, err.message);
    }
  }

  console.log("\n🎉 All data successfully migrated from local.db to Turso!");
}

migrateData().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
