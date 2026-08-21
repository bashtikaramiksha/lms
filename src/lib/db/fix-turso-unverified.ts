/**
 * fix-turso-unverified.ts
 *
 * One-shot script: marks all unverified users in the Turso cloud DB as verified.
 * Run ONCE to unblock existing accounts from signing in on Vercel.
 *
 * Usage:
 *   npx tsx src/lib/db/fix-turso-unverified.ts
 *
 * Requires TURSO_DATABASE_URL and TURSO_AUTH_TOKEN to be set in the environment
 * (they are already in .env.local, so this works locally pointing at the cloud DB).
 */

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { eq } from "drizzle-orm";
import * as schema from "./schema/index";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error(
    "❌ Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN in environment."
  );
  process.exit(1);
}

const client = createClient({ url, authToken });
const db = drizzle(client, { schema });

async function run() {
  // 1. Show all users
  const all = await db
    .select({
      email: schema.users.email,
      role: schema.users.role,
      status: schema.users.status,
      emailVerified: schema.users.emailVerified,
    })
    .from(schema.users);

  console.log("\n📋 All users in Turso cloud DB:\n");
  all.forEach((u) =>
    console.log(
      `  ${u.email.padEnd(40)} | ${String(u.role).padEnd(8)} | ${String(u.status).padEnd(20)} | verified=${u.emailVerified}`
    )
  );

  const unverified = all.filter((u) => !u.emailVerified);
  if (unverified.length === 0) {
    console.log("\n✅ All users are already verified. Nothing to do.\n");
    process.exit(0);
  }

  console.log(`\n⚠️  Found ${unverified.length} unverified user(s). Fixing...\n`);

  // 2. Force-verify all unverified users
  const fixed = await db
    .update(schema.users)
    .set({
      emailVerified: true,
      emailVerifyToken: null,
      emailVerifyExpiresAt: null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.users.emailVerified, false))
    .returning({ email: schema.users.email });

  console.log(`✅ Force-verified ${fixed.length} user(s) in Turso cloud DB:`);
  fixed.forEach((u) => console.log(`   ✓ ${u.email}`));
  console.log("");

  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
