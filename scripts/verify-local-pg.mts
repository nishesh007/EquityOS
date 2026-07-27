import { readFileSync } from "node:fs";
import { Client } from "pg";

async function main() {
  const m = readFileSync(".env.local", "utf8").match(/^DATABASE_URL=(.+)$/m);
  if (!m?.[1]) throw new Error("DATABASE_URL missing in .env.local");
  const client = new Client({ connectionString: m[1].trim() });
  await client.connect();
  const enc = await client.query("SHOW server_encoding");
  const db = await client.query("SELECT current_database() AS db");
  console.log(
    JSON.stringify({
      db: db.rows[0]?.db,
      encoding: enc.rows[0]?.server_encoding,
    })
  );
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
