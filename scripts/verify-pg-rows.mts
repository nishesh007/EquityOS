import { readFileSync } from "node:fs";
import { Client } from "pg";

async function main() {
  const m = readFileSync(".env.local", "utf8").match(/^DATABASE_URL=(.+)$/m);
  if (!m?.[1]) throw new Error("DATABASE_URL missing");
  const client = new Client({ connectionString: m[1].trim() });
  await client.connect();
  const rows = await client.query(
    "SELECT key, jsonb_typeof(value) AS t, updated_at FROM equityos_kv"
  );
  const state = await client.query(
    `SELECT
       value->'state'->>'tradingDate' AS trading_date,
       value->'state'->>'lastScannedAt' AS last_scanned,
       value->'state'->>'scanCount' AS scan_count,
       (
         SELECT COALESCE(SUM(jsonb_array_length(value->'state'->'categories'->cat)),0)
         FROM jsonb_object_keys(value->'state'->'categories') AS cat
       ) AS category_candidates,
       COALESCE(jsonb_array_length(value->'state'->'recommendations'),0) AS recommendations
     FROM equityos_kv
     WHERE key = 'opportunity-engine:state'`
  );
  console.log(
    JSON.stringify(
      {
        kvRows: rows.rowCount,
        keys: rows.rows.map((r) => r.key),
        state: state.rows[0] ?? null,
      },
      null,
      2
    )
  );
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
