import type { Pool } from "pg";
import { isPostgresPersistenceEnabled } from "@/lib/opportunity-engine/persistence";
import type { PublishedRecommendationsBundle } from "@/lib/recommendations/published/types";
import type { InstitutionalStrategySlot } from "@/lib/recommendations/institutional-strategy-dashboard";
import type { SharedRecommendation } from "@/lib/recommendations/shared-recommendation";
import type { InsightsResearchTerminal } from "@/lib/ai/insights-research";

let pgPool: Pool | null = null;
let pgSchemaReady: Promise<void> | null = null;

async function getPgPool(): Promise<Pool | null> {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return null;
  if (!pgPool) {
    const { Pool } = await import("pg");
    pgPool = new Pool({
      connectionString: url,
      max: 2,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 8_000,
    });
  }
  return pgPool;
}

async function ensurePublishedSchema(pool: Pool): Promise<void> {
  if (!pgSchemaReady) {
    pgSchemaReady = pool
      .query(
        `
        CREATE TABLE IF NOT EXISTS equityos_kv (
          key text PRIMARY KEY,
          value jsonb NOT NULL,
          updated_at timestamptz NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS published_recommendations (
          recommendation_id text NOT NULL,
          session_id text NOT NULL,
          scan_id text NOT NULL,
          generated_at timestamptz NOT NULL,
          recommendation_version text NOT NULL,
          strategy text NOT NULL,
          horizon text NOT NULL,
          symbol text NOT NULL,
          entry numeric,
          stop_loss numeric,
          targets jsonb NOT NULL DEFAULT '[]'::jsonb,
          conviction numeric NOT NULL,
          reasoning jsonb NOT NULL DEFAULT '[]'::jsonb,
          payload jsonb NOT NULL,
          PRIMARY KEY (session_id, scan_id, recommendation_id)
        );

        CREATE TABLE IF NOT EXISTS strategy_dashboard_slots (
          session_id text NOT NULL,
          scan_id text NOT NULL,
          generated_at timestamptz NOT NULL,
          recommendation_version text NOT NULL,
          strategy_id text NOT NULL,
          slot_payload jsonb NOT NULL,
          PRIMARY KEY (session_id, scan_id, strategy_id)
        );

        CREATE INDEX IF NOT EXISTS idx_published_recs_session_generated
          ON published_recommendations (session_id, generated_at DESC);

        CREATE INDEX IF NOT EXISTS idx_published_slots_session_generated
          ON strategy_dashboard_slots (session_id, generated_at DESC);
      `
      )
      .then(() => undefined)
      .catch((error) => {
        pgSchemaReady = null;
        throw error;
      });
  }
  await pgSchemaReady;
}

function bundleFromRows(input: {
  envelope: Pick<
    PublishedRecommendationsBundle,
    | "sessionId"
    | "scanId"
    | "generatedAt"
    | "recommendationVersion"
  >;
  recommendations: SharedRecommendation[];
  strategyDashboard: InstitutionalStrategySlot[];
  researchTerminal: InsightsResearchTerminal;
}): PublishedRecommendationsBundle {
  return {
    sessionId: input.envelope.sessionId,
    scanId: input.envelope.scanId,
    generatedAt: input.envelope.generatedAt,
    recommendationVersion: input.envelope.recommendationVersion,
    recommendations: input.recommendations,
    strategyDashboard: input.strategyDashboard,
    researchTerminal: input.researchTerminal,
  };
}

export async function persistPublishedBundleToPostgres(
  bundle: PublishedRecommendationsBundle
): Promise<boolean> {
  if (!isPostgresPersistenceEnabled()) return false;

  const pool = await getPgPool();
  if (!pool) return false;

  try {
    await ensurePublishedSchema(pool);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      await client.query(
        `DELETE FROM published_recommendations WHERE session_id = $1 AND scan_id = $2`,
        [bundle.sessionId, bundle.scanId]
      );
      await client.query(
        `DELETE FROM strategy_dashboard_slots WHERE session_id = $1 AND scan_id = $2`,
        [bundle.sessionId, bundle.scanId]
      );

      for (const recommendation of bundle.recommendations) {
        await client.query(
          `
          INSERT INTO published_recommendations (
            recommendation_id, session_id, scan_id, generated_at,
            recommendation_version, strategy, horizon, symbol,
            entry, stop_loss, targets, conviction, reasoning, payload
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13::jsonb,$14::jsonb)
          `,
          [
            recommendation.id,
            bundle.sessionId,
            bundle.scanId,
            bundle.generatedAt,
            bundle.recommendationVersion,
            recommendation.primaryStrategy,
            recommendation.primaryStrategyId,
            recommendation.symbol,
            recommendation.entry,
            recommendation.stopLoss,
            JSON.stringify(recommendation.targets),
            recommendation.conviction,
            JSON.stringify(recommendation.reasons),
            JSON.stringify(recommendation),
          ]
        );
      }

      for (const slot of bundle.strategyDashboard) {
        await client.query(
          `
          INSERT INTO strategy_dashboard_slots (
            session_id, scan_id, generated_at, recommendation_version,
            strategy_id, slot_payload
          ) VALUES ($1,$2,$3,$4,$5,$6::jsonb)
          `,
          [
            bundle.sessionId,
            bundle.scanId,
            bundle.generatedAt,
            bundle.recommendationVersion,
            slot.strategyId,
            JSON.stringify(slot),
          ]
        );
      }

      await client.query(
        `
        INSERT INTO equityos_kv (key, value, updated_at)
        VALUES ($1, $2::jsonb, now())
        ON CONFLICT (key) DO UPDATE
          SET value = EXCLUDED.value,
              updated_at = now()
        `,
        [
          `opportunity-engine:published:${bundle.sessionId}:${bundle.scanId}`,
          JSON.stringify(bundle),
        ]
      );

      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.warn(
      "[PublishedRecommendations] Postgres persist failed:",
      error instanceof Error ? error.message : error
    );
    return false;
  }
}

export async function loadPublishedBundleFromPostgres(
  sessionId: string
): Promise<PublishedRecommendationsBundle | null> {
  if (!isPostgresPersistenceEnabled()) return null;

  const pool = await getPgPool();
  if (!pool) return null;

  try {
    await ensurePublishedSchema(pool);

    const latest = await pool.query<{
      scan_id: string;
      generated_at: string;
      recommendation_version: string;
    }>(
      `
      SELECT scan_id, generated_at, recommendation_version
      FROM published_recommendations
      WHERE session_id = $1
      ORDER BY generated_at DESC
      LIMIT 1
      `,
      [sessionId]
    );

    const header = latest.rows[0];
    if (!header) return null;

    const kv = await pool.query<{ value: PublishedRecommendationsBundle }>(
      `SELECT value FROM equityos_kv WHERE key = $1 LIMIT 1`,
      [`opportunity-engine:published:${sessionId}:${header.scan_id}`]
    );
    const fromKv = kv.rows[0]?.value;
    if (fromKv?.recommendations && fromKv.strategyDashboard) {
      return fromKv;
    }

    const recRows = await pool.query<{ payload: SharedRecommendation }>(
      `
      SELECT payload FROM published_recommendations
      WHERE session_id = $1 AND scan_id = $2
      ORDER BY conviction DESC
      `,
      [sessionId, header.scan_id]
    );
    const slotRows = await pool.query<{ slot_payload: InstitutionalStrategySlot }>(
      `
      SELECT slot_payload FROM strategy_dashboard_slots
      WHERE session_id = $1 AND scan_id = $2
      ORDER BY strategy_id ASC
      `,
      [sessionId, header.scan_id]
    );

    const recommendations = recRows.rows.map((row) => row.payload);
    const strategyDashboard = slotRows.rows.map((row) => row.slot_payload);
    if (recommendations.length === 0 && strategyDashboard.length === 0) {
      return null;
    }

    return bundleFromRows({
      envelope: {
        sessionId,
        scanId: header.scan_id,
        generatedAt: new Date(header.generated_at).toISOString(),
        recommendationVersion: header.recommendation_version,
      },
      recommendations,
      strategyDashboard,
      researchTerminal: {} as InsightsResearchTerminal,
    });
  } catch (error) {
    console.warn(
      "[PublishedRecommendations] Postgres load failed:",
      error instanceof Error ? error.message : error
    );
    return null;
  }
}
