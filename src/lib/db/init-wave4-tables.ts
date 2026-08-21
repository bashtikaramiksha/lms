import { rawClient } from "./client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function initTables() {
  console.log("Applying Wave 4 database tables...");

  // 1. lesson_progress table
  await rawClient.execute(`
    CREATE TABLE IF NOT EXISTS lesson_progress (
      id TEXT PRIMARY KEY NOT NULL,
      enrollment_id TEXT NOT NULL,
      lesson_id TEXT NOT NULL,
      watch_percent REAL DEFAULT 0 NOT NULL,
      is_completed INTEGER DEFAULT 0 NOT NULL,
      last_watched_at TEXT,
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE,
      FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
    );
  `);

  await rawClient.execute(`CREATE INDEX IF NOT EXISTS idx_lesson_progress_enrollment ON lesson_progress(enrollment_id);`);
  await rawClient.execute(`CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson ON lesson_progress(lesson_id);`);
  await rawClient.execute(`CREATE UNIQUE INDEX IF NOT EXISTS idx_lesson_progress_unique ON lesson_progress(enrollment_id, lesson_id);`);

  // 2. live_sessions table
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

  await rawClient.execute(`CREATE INDEX IF NOT EXISTS idx_live_sessions_course ON live_sessions(course_id);`);
  await rawClient.execute(`CREATE INDEX IF NOT EXISTS idx_live_sessions_teacher ON live_sessions(teacher_id);`);
  await rawClient.execute(`CREATE INDEX IF NOT EXISTS idx_live_sessions_scheduled ON live_sessions(scheduled_at);`);
  await rawClient.execute(`CREATE INDEX IF NOT EXISTS idx_live_sessions_status ON live_sessions(status);`);

  // 3. enrollments certificate fields
  try {
    await rawClient.execute(`ALTER TABLE enrollments ADD COLUMN certificate_url TEXT;`);
  } catch (e: any) {
    // Column might already exist
  }

  try {
    await rawClient.execute(`ALTER TABLE enrollments ADD COLUMN cert_issued_at TEXT;`);
  } catch (e: any) {
    // Column might already exist
  }

  console.log("Wave 4 tables successfully initialized!");
}

initTables()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Failed to init Wave 4 tables:", err);
    process.exit(1);
  });
