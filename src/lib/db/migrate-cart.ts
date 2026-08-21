import { rawClient } from "./client";
import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function run() {
  console.log("Applying cart_items schema...");

  const queries = [
    `CREATE TABLE IF NOT EXISTS cart_items (
      id text PRIMARY KEY NOT NULL,
      user_id text NOT NULL,
      course_id text NOT NULL,
      added_at text,
      FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE NO ACTION ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON UPDATE NO ACTION ON DELETE CASCADE
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_cart_user_course ON cart_items (user_id, course_id);`,
    `CREATE INDEX IF NOT EXISTS idx_cart_user ON cart_items (user_id);`,
  ];

  // Execute on configured database (Turso / primary client)
  for (const q of queries) {
    await rawClient.execute(q);
  }

  // If local.db exists and distinct from Turso, apply there too for local parity
  try {
    const localDb = createClient({ url: "file:./local.db" });
    for (const q of queries) {
      try {
        await localDb.execute(q);
      } catch (e) {
        // ignore
      }
    }
  } catch (e) {
    // ignore
  }

  console.log("✅ cart_items table and indexes created successfully!");
}

run().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
