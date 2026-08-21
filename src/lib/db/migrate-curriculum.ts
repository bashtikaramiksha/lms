import { rawClient } from "./client";
import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function run() {
  console.log("Applying modules and lessons schema...");

  const queries = [
    `CREATE TABLE IF NOT EXISTS modules (
      id text PRIMARY KEY NOT NULL,
      course_id text NOT NULL,
      title text NOT NULL,
      "order" integer NOT NULL,
      created_at text,
      updated_at text,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON UPDATE NO ACTION ON DELETE CASCADE
    );`,
    `CREATE INDEX IF NOT EXISTS idx_modules_course ON modules (course_id);`,
    `CREATE TABLE IF NOT EXISTS lessons (
      id text PRIMARY KEY NOT NULL,
      module_id text NOT NULL,
      title text NOT NULL,
      type text NOT NULL,
      "order" integer NOT NULL,
      video_url text,
      duration integer,
      content text,
      is_preview integer DEFAULT 0,
      created_at text,
      updated_at text,
      FOREIGN KEY (module_id) REFERENCES modules(id) ON UPDATE NO ACTION ON DELETE CASCADE
    );`,
    `CREATE INDEX IF NOT EXISTS idx_lessons_module ON lessons (module_id);`,
  ];

  // Execute on configured database (Turso / primary client)
  for (const q of queries) {
    await rawClient.execute(q);
  }

  // If local.db exists and distinct from Turso, apply there too for local parity
  const localDb = createClient({ url: "file:./local.db" });
  for (const q of queries) {
    try {
      await localDb.execute(q);
    } catch (e) {
      // ignore
    }
  }

  console.log("✅ Curriculum tables created successfully!");
}

run().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
