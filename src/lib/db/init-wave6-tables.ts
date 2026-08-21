import { rawClient } from "./client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function initWave6Tables() {
  console.log("Applying Wave 6 database migration (Teacher Live OAuth columns & indexes)...");

  // Columns to add to users table
  const columnsToAdd = [
    { name: "zoom_access_token", type: "TEXT" },
    { name: "zoom_refresh_token", type: "TEXT" },
    { name: "zoom_token_expiry", type: "TEXT" },
    { name: "zoom_user_id", type: "TEXT" },
    { name: "google_access_token", type: "TEXT" },
    { name: "google_refresh_token", type: "TEXT" },
    { name: "google_token_expiry", type: "TEXT" },
  ];

  for (const col of columnsToAdd) {
    try {
      await rawClient.execute(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type};`);
      console.log(`   + Added column users.${col.name}`);
    } catch (err: any) {
      if (err?.message?.includes("duplicate column") || err?.message?.includes("already exists")) {
        console.log(`   ~ Column users.${col.name} already exists, skipping.`);
      } else {
        console.warn(`   ! Note on adding users.${col.name}: ${err?.message || err}`);
      }
    }
  }

  // Ensure live_sessions table exists if not already present
  await rawClient.execute(`
    CREATE TABLE IF NOT EXISTS live_sessions (
      id TEXT PRIMARY KEY NOT NULL,
      lesson_id TEXT,
      course_id TEXT NOT NULL,
      teacher_id TEXT NOT NULL,
      title TEXT NOT NULL,
      scheduled_at TEXT NOT NULL,
      duration INTEGER NOT NULL,
      platform TEXT DEFAULT 'ZOOM' NOT NULL,
      join_url TEXT,
      host_url TEXT,
      status TEXT DEFAULT 'SCHEDULED' NOT NULL,
      recording_url TEXT,
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE SET NULL,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
      FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  await rawClient.execute(`CREATE INDEX IF NOT EXISTS idx_live_sessions_teacher ON live_sessions(teacher_id);`);
  await rawClient.execute(`CREATE INDEX IF NOT EXISTS idx_live_sessions_course ON live_sessions(course_id);`);
  await rawClient.execute(`CREATE INDEX IF NOT EXISTS idx_live_sessions_scheduled ON live_sessions(scheduled_at);`);
  await rawClient.execute(`CREATE INDEX IF NOT EXISTS idx_live_sessions_status ON live_sessions(status);`);

  console.log("Wave 6 tables and columns initialized successfully!");
}

initWave6Tables()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Failed to init Wave 6 tables:", err);
    process.exit(1);
  });
