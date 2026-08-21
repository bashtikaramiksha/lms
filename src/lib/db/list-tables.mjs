import { createClient } from "@libsql/client";
const db = createClient({ url: "file:./local.db" });
const r = await db.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
console.log(JSON.stringify(r.rows.map(x => x.name)));
process.exit(0);
