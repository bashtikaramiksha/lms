import { rawClient } from "@/lib/db/client";

export async function initNotificationsTable() {
  console.log("🛠️ Initializing Wave 6 notifications table in Turso DB...");

  // 1. Create notifications table
  await rawClient.execute(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      action_url TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT
    );
  `);

  // 2. Create indices
  await rawClient.execute(`
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
  `);

  await rawClient.execute(`
    CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
  `);

  console.log("✅ notifications table and indexes successfully initialized in Turso DB!");
}

if (require.main === module || process.argv[1]?.includes("init-wave6-notifications")) {
  initNotificationsTable()
    .then(() => {
      console.log("🎉 Migration completed successfully.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ Migration failed:", err);
      process.exit(1);
    });
}
