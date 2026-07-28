/**
 * Start workspace-local embedded PostgreSQL for EquityOS localhost.
 * Writes/updates .env.local DATABASE_URL and creates the equityos database.
 *
 * Usage: npx tsx scripts/start-local-postgres.mts
 */
import EmbeddedPostgres from "embedded-postgres";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client } from "pg";

const ROOT = resolve(process.cwd());
const DATA_DIR = resolve(ROOT, ".data", "embedded-postgres");
const ENV_PATH = resolve(ROOT, ".env.local");
const PORT = Number(process.env.EQUITYOS_PG_PORT ?? 54329);
const USER = "equityos";
const PASSWORD = "equityos_local";
const DATABASE = "equityos";

const DATABASE_URL = `postgresql://${USER}:${PASSWORD}@127.0.0.1:${PORT}/${DATABASE}`;

function upsertEnvLocal(databaseUrl: string): void {
  const block = [
    "# Local PostgreSQL (managed by scripts/start-local-postgres.mts)",
    `DATABASE_URL=${databaseUrl}`,
  ].join("\n");

  if (!existsSync(ENV_PATH)) {
    const base = existsSync(resolve(ROOT, ".env.example"))
      ? readFileSync(resolve(ROOT, ".env.example"), "utf8")
      : "";
    const withoutDb = base
      .split(/\r?\n/)
      .filter((line) => !line.startsWith("DATABASE_URL="))
      .join("\n")
      .trimEnd();
    writeFileSync(
      ENV_PATH,
      `${withoutDb}\n\n${block}\n`,
      "utf8"
    );
    return;
  }

  const current = readFileSync(ENV_PATH, "utf8");
  if (/^DATABASE_URL=/m.test(current)) {
    writeFileSync(
      ENV_PATH,
      current.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL=${databaseUrl}`),
      "utf8"
    );
  } else {
    writeFileSync(ENV_PATH, `${current.trimEnd()}\n\n${block}\n`, "utf8");
  }
}

async function verifyConnection(url: string): Promise<void> {
  const client = new Client({ connectionString: url });
  await client.connect();
  const result = await client.query("SELECT current_database() AS db, now() AS ts");
  console.info(
    `[local-pg] connected db=${result.rows[0]?.db} ts=${result.rows[0]?.ts}`
  );
  await client.end();
}

async function main() {
  mkdirSync(DATA_DIR, { recursive: true });

  const pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: USER,
    password: PASSWORD,
    port: PORT,
    persistent: true,
    // Force UTF-8 — Windows default locale (WIN1252) cannot store OE unicode (✓ etc.).
    initdbFlags: ["--encoding=UTF8", "--locale=C"],
  });

  console.info(`[local-pg] initialise cluster at ${DATA_DIR}…`);
  const alreadyInitialized = existsSync(resolve(DATA_DIR, "PG_VERSION"));
  if (alreadyInitialized) {
    console.info(`[local-pg] existing cluster detected — skipping initdb`);
  } else {
    await pg.initialise();
  }
  console.info(`[local-pg] starting on 127.0.0.1:${PORT}…`);
  await pg.start();

  try {
    await pg.createDatabase(DATABASE);
    console.info(`[local-pg] database ${DATABASE} ready`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/already exists/i.test(message)) {
      // createDatabase may throw if DB exists — continue to verify.
      console.warn(`[local-pg] createDatabase note: ${message}`);
    } else {
      console.info(`[local-pg] database ${DATABASE} already exists`);
    }
  }

  upsertEnvLocal(DATABASE_URL);
  console.info(`[local-pg] wrote DATABASE_URL to .env.local`);

  await verifyConnection(DATABASE_URL);

  // Keep process alive so Next.js / seed can connect.
  console.info(
    "[local-pg] PostgreSQL is running. Leave this process open while using localhost."
  );
  console.info(`[local-pg] DATABASE_URL=${DATABASE_URL}`);

  const shutdown = async () => {
    console.info("[local-pg] stopping…");
    try {
      await pg.stop();
    } catch {
      // ignore
    }
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());

  // Park forever.
  await new Promise(() => undefined);
}

main().catch((error) => {
  console.error("[local-pg] failed:", error);
  process.exit(1);
});
