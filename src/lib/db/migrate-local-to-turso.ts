/**
 * migrate-local-to-turso.ts
 *
 * Comprehensive migration: copies ALL data from local.db to the Turso cloud DB.
 * - Skips FTS virtual tables (they are rebuilt automatically via triggers)
 * - Uses INSERT OR REPLACE to be idempotent (safe to re-run)
 * - Migrates tables in FK-safe dependency order
 * - Prints a per-table summary at the end
 *
 * Usage:
 *   npx dotenv-cli -e .env.local -- npx tsx src/lib/db/migrate-local-to-turso.ts
 */

import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

if (!tursoUrl || tursoUrl.startsWith("file:")) {
  console.error("❌ TURSO_DATABASE_URL must be a remote Turso URL (not file:)");
  console.error("   Current value:", tursoUrl);
  process.exit(1);
}

if (!tursoToken) {
  console.error("❌ TURSO_AUTH_TOKEN is missing in .env.local");
  process.exit(1);
}

// ─── Table order: parents before children (FK dependency order) ──────────────
// FTS virtual tables and internal drizzle migration table are excluded.
const TABLES = [
  // core auth
  "users",
  "accounts",
  "sessions",
  "verification_tokens",

  // taxonomy / lookup
  "categories",
  "settings",

  // content
  "courses",
  "modules",
  "lessons",
  "pages",

  // blog
  "blog_categories",
  "blog_posts",
  "blog_tags",
  "blog_post_tags",

  // commerce
  "coupons",
  "cart_items",
  "orders",
  "order_items",

  // learning progress
  "enrollments",
  "lesson_progress",
  "reviews",
  "live_sessions",

  // misc
  "audit_logs",
  "notifications",
];

// Tables to skip entirely
const SKIP_TABLES = new Set([
  "__drizzle_migrations",
  "courses_fts",
  "courses_fts_config",
  "courses_fts_content",
  "courses_fts_data",
  "courses_fts_docsize",
  "courses_fts_idx",
]);

async function migrate() {
  console.log("🚀 Starting comprehensive local.db → Turso migration\n");
  console.log("   Source : file:./local.db");
  console.log("   Target :", tursoUrl);
  console.log("");

  const local = createClient({ url: "file:./local.db" });
  const turso = createClient({ url: tursoUrl!, authToken: tursoToken });

  // Discover all actual tables in local.db
  const discovered = await local.execute(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
  );
  const localTables = new Set(discovered.rows.map((r) => r.name as string));

  // Build ordered list: schema-ordered first, then any extras
  const orderedTables = [
    ...TABLES.filter((t) => localTables.has(t)),
    ...[...localTables].filter(
      (t) => !TABLES.includes(t) && !SKIP_TABLES.has(t)
    ),
  ];

  const results: { table: string; rows: number; status: string }[] = [];

  for (const table of orderedTables) {
    if (SKIP_TABLES.has(table)) continue;

    process.stdout.write(`📦 ${table.padEnd(30)}`);

    try {
      const { rows } = await local.execute(`SELECT * FROM "${table}"`);

      if (rows.length === 0) {
        console.log("— (empty)");
        results.push({ table, rows: 0, status: "empty" });
        continue;
      }

      const columns = Object.keys(rows[0]);
      const placeholders = columns.map(() => "?").join(", ");
      const sql = `INSERT OR REPLACE INTO "${table}" (${columns.map((c) => `"${c}"`).join(", ")}) VALUES (${placeholders})`;

      let inserted = 0;
      const BATCH = 50; // Turso has a 512-statement-per-batch limit but we keep it small

      for (let i = 0; i < rows.length; i += BATCH) {
        const batch = rows.slice(i, i + BATCH);
        const stmts = batch.map((row) => ({
          sql,
          args: Object.values(row) as any[],
        }));
        await turso.batch(stmts, "write");
        inserted += batch.length;
      }

      console.log(`✅ ${inserted} rows`);
      results.push({ table, rows: inserted, status: "ok" });
    } catch (err: any) {
      console.log(`❌ ERROR: ${err.message}`);
      results.push({ table, rows: 0, status: `error: ${err.message}` });
    }
  }

  // ─── Summary ────────────────────────────────────────────────────────────────
  console.log("\n" + "─".repeat(60));
  console.log("📊 Migration Summary");
  console.log("─".repeat(60));

  let totalRows = 0;
  let errors = 0;

  for (const r of results) {
    const icon = r.status === "ok" ? "✅" : r.status === "empty" ? "⬜" : "❌";
    console.log(`  ${icon} ${r.table.padEnd(30)} ${String(r.rows).padStart(6)} rows`);
    if (r.status === "ok") totalRows += r.rows;
    if (r.status.startsWith("error")) errors++;
  }

  console.log("─".repeat(60));
  console.log(`  Total: ${totalRows} rows migrated, ${errors} table(s) with errors\n`);

  if (errors === 0) {
    console.log("🎉 Migration complete! All data is now in Turso.");
  } else {
    console.log(
      "⚠️  Migration finished with errors. Check the output above.\n" +
        "    Common causes:\n" +
        "    • Table doesn't exist yet in Turso (run migrations first)\n" +
        "    • FK constraint violation (check table order)"
    );
  }

  process.exit(errors > 0 ? 1 : 0);
}

migrate().catch((err) => {
  console.error("\n❌ Fatal error:", err);
  process.exit(1);
});
