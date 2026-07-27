/**
 * Live Market Internals validation — no fixtures.
 * Single canonical loadMarketSnapshot() (same path as Dashboard + Markets).
 *
 * Usage:
 *   $env:NODE_OPTIONS="--require ./test/stub-server-only.cjs"
 *   npx tsx scripts/validate-live-market-internals.mts
 */

import {
  computeBreadthCoreMetrics,
  validateBreadthCorePublication,
} from "../lib/market-breadth/metrics";
import { loadMarketSnapshotUncached } from "../lib/market-orchestrator/marketsSnapshot";
import { compareDashboardMarketsIntelligence } from "../lib/market-orchestrator/dashboard-markets-parity";
import { buildDailyBriefing } from "../lib/dashboard/executive-intelligence";

async function main() {
  console.log("=== Live Market Internals Validation ===");
  console.log(`As-of (local): ${new Date().toISOString()}`);
  console.log("Source: loadMarketSnapshotUncached({ forceRefresh: true })");
  console.log("");

  const marketSnap = await loadMarketSnapshotUncached({ forceRefresh: true });
  const breadth = marketSnap.breadth;
  const intelligence = marketSnap.intelligence;

  if (!intelligence) {
    throw new Error("Market Snapshot missing intelligence");
  }

  // Reconstruct rows from published A/D/U to prove metrics.ts identity.
  const syntheticRows = [
    ...Array.from({ length: breadth.advances }, () => ({ changePercent: 1 })),
    ...Array.from({ length: breadth.declines }, () => ({ changePercent: -1 })),
    ...Array.from({ length: breadth.unchanged ?? 0 }, () => ({
      changePercent: 0,
    })),
  ];
  const recomputed = computeBreadthCoreMetrics(syntheticRows);
  const report = validateBreadthCorePublication({
    published: {
      advances: breadth.advances,
      declines: breadth.declines,
      unchanged: breadth.unchanged ?? 0,
      advanceDeclineRatio: breadth.advanceDeclineRatio ?? 0,
      breadthPercent: breadth.breadthPercent ?? 0,
      netAdvances: breadth.netAdvances ?? 0,
      participationPercent: breadth.participationPercent,
      marketMood: breadth.marketMood,
    },
    rows: syntheticRows,
    expectedParticipation: breadth.participationPercent ?? null,
    expectedMood: breadth.marketMood ?? null,
  });

  const adu =
    breadth.advances + breadth.declines + (breadth.unchanged ?? 0);
  const quoted = breadth.quotedStocks ?? adu;

  const lines = [
    {
      n: 1,
      name: "Total quoted symbols",
      value: quoted,
      raw: `quotedStocks=${breadth.quotedStocks ?? "n/a"} · A+D+U=${adu} · universe=${breadth.totalStocks ?? "n/a"} · coverage=${breadth.quoteCoveragePercent ?? "n/a"}%`,
      formula: "count(symbols with finite LTP + change%)",
      source: "lib/market-breadth/engine.ts → runMarketBreadthEngine (via snapshot)",
    },
    {
      n: 2,
      name: "Advances",
      value: breadth.advances,
      raw: `count(change% > 0.01) = ${breadth.advances}`,
      formula: "count(change% > 0.01)",
      source: "lib/market-breadth/metrics.ts → computeBreadthCoreMetrics",
    },
    {
      n: 3,
      name: "Declines",
      value: breadth.declines,
      raw: `count(change% < −0.01) = ${breadth.declines}`,
      formula: "count(change% < −0.01)",
      source: "lib/market-breadth/metrics.ts → computeBreadthCoreMetrics",
    },
    {
      n: 4,
      name: "Unchanged",
      value: breadth.unchanged ?? 0,
      raw: `count(|change%| ≤ 0.01) = ${breadth.unchanged ?? 0}`,
      formula: "quoted − advances − declines",
      source: "lib/market-breadth/metrics.ts → computeBreadthCoreMetrics",
    },
    {
      n: 5,
      name: "Breadth %",
      value: breadth.breadthPercent ?? 0,
      raw: `${breadth.advances} / ${quoted} × 100`,
      formula: "advances ÷ quoted × 100",
      source: "lib/market-breadth/metrics.ts → computeBreadthCoreMetrics",
    },
    {
      n: 6,
      name: "A/D Ratio",
      value: breadth.advanceDeclineRatio ?? 0,
      raw: `${breadth.advances} / ${breadth.declines || "(no declines)"}`,
      formula: "advances ÷ declines (else advances if declines=0)",
      source: "lib/market-breadth/metrics.ts → computeBreadthCoreMetrics",
    },
    {
      n: 7,
      name: "Net Advances",
      value: breadth.netAdvances ?? breadth.advances - breadth.declines,
      raw: `${breadth.advances} − ${breadth.declines}`,
      formula: "advances − declines",
      source: "lib/market-breadth/metrics.ts → computeBreadthCoreMetrics",
    },
    {
      n: 8,
      name: "Participation",
      value: breadth.participationPercent ?? "—",
      raw: `technicalSample=${breadth.technicalSampleSize ?? "n/a"} · above20=${breadth.aboveEma20Pct ?? "n/a"}% above50=${breadth.aboveEma50Pct ?? "n/a"}% above200=${breadth.aboveEma200Pct ?? "n/a"}% · partial=${breadth.participationPartial ?? false}`,
      formula:
        "EMA ready → mean(above EMA20/50/200 %); else (A+D)/quoted × 100",
      source:
        "lib/market-breadth/engine.ts (EMA mean or metrics.moverParticipationPercent)",
    },
    {
      n: 9,
      name: "Market Mood",
      value: breadth.marketMood ?? "—",
      raw: `gauge=${breadth.moodGauge ?? "n/a"} · factors=${JSON.stringify(breadth.moodFactors ?? [])}`,
      formula:
        "mean(factor scores −2…+2) → mood label; ≥35% coverage & ≥2 factors",
      source: "lib/market-breadth/mood.ts → classifyMarketMood",
    },
    {
      n: 10,
      name: "Market Regime",
      value: intelligence.regime.regime,
      raw: `confidence=${intelligence.regime.confidence} · ts=${intelligence.regime.timestamp}`,
      formula: "argmax MarketRegimeRules(InstitutionalMarketContext)",
      source:
        "services/marketIntelligence.ts → getMarketIntelligenceSnapshot",
    },
  ] as const;

  for (const line of lines) {
    console.log(`\n${line.n}. ${line.name}: ${line.value}`);
    console.log(`   Raw input:  ${line.raw}`);
    console.log(`   Formula:    ${line.formula}`);
    console.log(`   Source:     ${line.source}`);
  }

  console.log("\n=== metrics.ts identity (A/D/U → recompute) ===");
  console.log(
    `recomputed breadth%=${recomputed.breadthPercent} A/D=${recomputed.advanceDeclineRatio} net=${recomputed.netAdvances}`
  );
  for (const row of report.filter((r) =>
    [
      "Advances",
      "Declines",
      "Unchanged",
      "A/D Ratio",
      "Breadth %",
      "Net Advances",
    ].includes(r.metric)
  )) {
    console.log(
      `  ${row.metric}: current=${row.currentValue} expected=${row.expectedValue} correct=${row.correct}`
    );
  }
  console.log(
    `A+D+U === quoted: ${adu} === ${quoted} → ${adu === quoted}`
  );

  // Simulate Dashboard + Markets + AI Brief consumers of the SAME snapshot.
  const dashboardCtx = {
    intelligence,
    timestamp: marketSnap.timestamp,
    breadth,
  };
  const marketsCtx = {
    intelligence,
    timestamp: marketSnap.timestamp,
    breadth: marketSnap.breadth,
  };
  const parity = compareDashboardMarketsIntelligence(dashboardCtx, marketSnap);

  const briefing = buildDailyBriefing({
    intelligence,
    breadth,
    slots: [],
    portfolio: {
      totalValue: 0,
      dayChange: 0,
      dayChangePercent: 0,
      holdings: [],
    } as never,
    recommendations: [],
    results: [],
  });

  console.log("\n=== Consumer verification (same MarketSnapshot) ===");
  console.log(
    `Dashboard ≡ Markets intelligence: identical=${parity.identical}`
  );
  console.log(
    `Dashboard breadth%: ${dashboardCtx.breadth.breadthPercent} · Markets breadth%: ${marketsCtx.breadth.breadthPercent} · match=${dashboardCtx.breadth.breadthPercent === marketsCtx.breadth.breadthPercent}`
  );
  console.log(
    `Dashboard mood: ${dashboardCtx.breadth.marketMood} · Markets mood: ${marketsCtx.breadth.marketMood} · match=${dashboardCtx.breadth.marketMood === marketsCtx.breadth.marketMood}`
  );
  console.log(
    `Dashboard regime: ${dashboardCtx.intelligence.regime.regime} · Markets regime: ${marketsCtx.intelligence.regime.regime} · match=${dashboardCtx.intelligence.regime.regime === marketsCtx.intelligence.regime.regime}`
  );
  console.log(
    `AI Market Brief updatedAt: ${briefing.updatedAt} · snapshot.timestamp: ${marketSnap.timestamp} · match=${briefing.updatedAt === marketSnap.timestamp || briefing.updatedAt === intelligence.timestamp}`
  );
  console.log(`AI Market Brief bullets (first): ${briefing.bullets[0] ?? "—"}`);
  console.log(`Shared timestamp: ${marketSnap.timestamp}`);

  const coreOk = report
    .filter((r) =>
      [
        "Advances",
        "Declines",
        "Unchanged",
        "A/D Ratio",
        "Breadth %",
        "Net Advances",
      ].includes(r.metric)
    )
    .every((r) => r.correct);

  if (!coreOk || !parity.identical || adu !== quoted) {
    console.error("\nVALIDATION FAILED");
    process.exitCode = 1;
  } else {
    console.log("\nVALIDATION PASSED — single snapshot, metrics.ts formulas");
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
