import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/lib/db/schema/index.ts",
  out: "./src/lib/db/migrations",
  dialect: "turso",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL || "file:./local.db",
    authToken: process.env.TURSO_AUTH_TOKEN || undefined,
  },
  verbose: true,
  strict: true,
});
