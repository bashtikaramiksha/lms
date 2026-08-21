import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema/index";

const client = createClient({ url: "file:./local.db" });
const db = drizzle(client, { schema });

async function run() {
  // Show all users
  const all = await db
    .select({
      email: schema.users.email,
      role: schema.users.role,
      status: schema.users.status,
      emailVerified: schema.users.emailVerified,
    })
    .from(schema.users);

  console.log("\n📋 All users in local.db:\n");
  all.forEach((u) => console.log(`  ${u.email}  | ${u.role} | ${u.status} | verified=${u.emailVerified}`));

  // Fix any unverified users
  const fixed = await db
    .update(schema.users)
    .set({ emailVerified: true, updatedAt: new Date().toISOString() })
    .returning({ email: schema.users.email });

  console.log(`\n✅ Force-verified all ${fixed.length} user(s) in local DB\n`);
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
