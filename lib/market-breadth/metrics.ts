/**
 * Pure Market Internals core metrics — single formula source for engine + validation.
 */

/** Treat |change%| ≤ this as flat (basis points of a percent). */
export const UNCHANGED_EPS_PCT = 0.01;

export type MoveClass = "advance" | "decline" | "unchanged";

export function classifyDayMove(changePercent: number): MoveClass {
  if (!Number.isFinite(changePercent)) return "unchanged";
  if (changePercent > UNCHANGED_EPS_PCT) return "advance";
  if (changePercent < -UNCHANGED_EPS_PCT) return "decline";
  return "unchanged";
}

export interface BreadthCoreInput {
  changePercent: number;
}

export interface BreadthCoreMetrics {
  advances: number;
  declines: number;
  unchanged: number;
  quotedStocks: number;
  advanceDeclineRatio: number;
  breadthPercent: number;
  netAdvances: number;
  /** (A + D) / quoted × 100 — mover participation when EMA sample is cold. */
  moverParticipationPercent: number;
}

/**
 * Canonical breadth arithmetic from quoted day-change rows.
 *
 * Formulas:
 * - Advances      = count(change% > ε)
 * - Declines      = count(change% < −ε)
 * - Unchanged     = quoted − advances − declines  (= count(|change%| ≤ ε))
 * - A/D Ratio     = advances / declines when declines > 0; else advances (or 0)
 * - Breadth %     = advances / quoted × 100
 * - Net Advances  = advances − declines
 * - Mover partic. = (advances + declines) / quoted × 100
 */
export function computeBreadthCoreMetrics(
  rows: readonly BreadthCoreInput[]
): BreadthCoreMetrics {
  let advances = 0;
  let declines = 0;
  let unchanged = 0;

  for (const row of rows) {
    const move = classifyDayMove(row.changePercent);
    if (move === "advance") advances += 1;
    else if (move === "decline") declines += 1;
    else unchanged += 1;
  }

  const quotedStocks = rows.length;
  const advanceDeclineRatio =
    declines > 0 ? advances / declines : advances > 0 ? advances : 0;
  const breadthPercent =
    quotedStocks > 0
      ? Math.round((advances / quotedStocks) * 1000) / 10
      : 0;
  const netAdvances = advances - declines;
  const moverParticipationPercent =
    quotedStocks > 0
      ? Math.round(((advances + declines) / quotedStocks) * 1000) / 10
      : 0;

  return {
    advances,
    declines,
    unchanged,
    quotedStocks,
    advanceDeclineRatio: Math.round(advanceDeclineRatio * 100) / 100,
    breadthPercent,
    netAdvances,
    moverParticipationPercent,
  };
}

export interface SectorBreadthCoreRow {
  name: string;
  advances: number;
  declines: number;
  unchanged: number;
  total: number;
  /** advances / total × 100 */
  breadth: number;
  changePercent: number;
}

/**
 * Sector breadth % = sector advances ÷ sector quoted × 100.
 */
export function computeSectorBreadthMetrics(
  rows: readonly { changePercent: number; sector: string }[]
): SectorBreadthCoreRow[] {
  const bySector = new Map<
    string,
    { advances: number; declines: number; unchanged: number; total: number; changes: number[] }
  >();

  for (const row of rows) {
    const sector = row.sector.trim() || "Equities";
    const bucket = bySector.get(sector) ?? {
      advances: 0,
      declines: 0,
      unchanged: 0,
      total: 0,
      changes: [],
    };
    bucket.changes.push(row.changePercent);
    bucket.total += 1;
    const move = classifyDayMove(row.changePercent);
    if (move === "advance") bucket.advances += 1;
    else if (move === "decline") bucket.declines += 1;
    else bucket.unchanged += 1;
    bySector.set(sector, bucket);
  }

  return [...bySector.entries()]
    .map(([name, bucket]) => {
      const avg =
        bucket.changes.reduce((sum, value) => sum + value, 0) /
        Math.max(1, bucket.changes.length);
      return {
        name,
        advances: bucket.advances,
        declines: bucket.declines,
        unchanged: bucket.unchanged,
        total: bucket.total,
        breadth:
          Math.round((bucket.advances / Math.max(1, bucket.total)) * 1000) / 10,
        changePercent: Math.round(avg * 100) / 100,
      };
    })
    .sort((a, b) => b.breadth - a.breadth);
}

/** Share of sectors with breadth ≥ 50% (mood input). */
export function sectorAdvanceSharePercent(
  sectors: readonly { breadth: number }[]
): number | null {
  if (sectors.length === 0) return null;
  return (
    Math.round(
      (sectors.filter((s) => s.breadth >= 50).length / sectors.length) * 1000
    ) / 10
  );
}

export interface MetricValidationRow {
  metric: string;
  formula: string;
  sourceData: string;
  currentValue: number | string | null;
  expectedValue: number | string | null;
  correct: boolean;
}

/**
 * Compare published breadth fields against recomputed expected values.
 */
export function validateBreadthCorePublication(input: {
  published: {
    advances: number;
    declines: number;
    unchanged: number;
    advanceDeclineRatio: number;
    breadthPercent: number;
    netAdvances: number;
    participationPercent?: number | null;
    sectorBreadth?: readonly { name: string; breadth: number }[];
    marketMood?: string | null;
  };
  rows: readonly BreadthCoreInput[];
  sectorRows?: readonly { changePercent: number; sector: string }[];
  expectedMood?: string | null;
  expectedParticipation?: number | null;
}): MetricValidationRow[] {
  const expected = computeBreadthCoreMetrics(input.rows);
  const p = input.published;

  const rows: MetricValidationRow[] = [
    {
      metric: "Advances",
      formula: "count(change% > 0.01)",
      sourceData: "Quoted day change %",
      currentValue: p.advances,
      expectedValue: expected.advances,
      correct: p.advances === expected.advances,
    },
    {
      metric: "Declines",
      formula: "count(change% < −0.01)",
      sourceData: "Quoted day change %",
      currentValue: p.declines,
      expectedValue: expected.declines,
      correct: p.declines === expected.declines,
    },
    {
      metric: "Unchanged",
      formula: "quoted − advances − declines (|change%| ≤ 0.01)",
      sourceData: "Quoted day change %",
      currentValue: p.unchanged,
      expectedValue: expected.unchanged,
      correct: p.unchanged === expected.unchanged,
    },
    {
      metric: "A/D Ratio",
      formula: "advances ÷ declines (if declines>0; else advances)",
      sourceData: "Advances, Declines",
      currentValue: p.advanceDeclineRatio,
      expectedValue: expected.advanceDeclineRatio,
      correct: p.advanceDeclineRatio === expected.advanceDeclineRatio,
    },
    {
      metric: "Breadth %",
      formula: "advances ÷ quoted × 100",
      sourceData: "Advances, quoted stocks",
      currentValue: p.breadthPercent,
      expectedValue: expected.breadthPercent,
      correct: p.breadthPercent === expected.breadthPercent,
    },
    {
      metric: "Net Advances",
      formula: "advances − declines",
      sourceData: "Advances, Declines",
      currentValue: p.netAdvances,
      expectedValue: expected.netAdvances,
      correct: p.netAdvances === expected.netAdvances,
    },
  ];

  if (input.expectedParticipation != null && p.participationPercent != null) {
    rows.push({
      metric: "Participation",
      formula:
        "EMA ready → mean(above EMA20/50/200 %); else (A+D)/quoted × 100",
      sourceData: "OHLC EMA sample or mover A/D",
      currentValue: p.participationPercent,
      expectedValue: input.expectedParticipation,
      correct: p.participationPercent === input.expectedParticipation,
    });
  } else if (p.participationPercent != null) {
    rows.push({
      metric: "Participation",
      formula:
        "EMA ready → mean(above EMA20/50/200 %); else (A+D)/quoted × 100",
      sourceData: "OHLC EMA sample or mover A/D",
      currentValue: p.participationPercent,
      expectedValue: expected.moverParticipationPercent,
      correct:
        p.participationPercent === expected.moverParticipationPercent,
    });
  }

  if (input.sectorRows) {
    const sectors = computeSectorBreadthMetrics(input.sectorRows);
    const publishedSectors = p.sectorBreadth ?? [];
    const match =
      sectors.length === publishedSectors.length &&
      sectors.every((s, i) => {
        const pub = publishedSectors[i];
        return pub && pub.name === s.name && pub.breadth === s.breadth;
      });
    rows.push({
      metric: "Sector Breadth",
      formula: "per sector: advances ÷ sector quoted × 100; sort desc",
      sourceData: "Quoted change % · company master sector",
      currentValue: publishedSectors
        .map((s) => `${s.name}:${s.breadth}`)
        .join(" | "),
      expectedValue: sectors.map((s) => `${s.name}:${s.breadth}`).join(" | "),
      correct: match,
    });
  }

  if (input.expectedMood != null) {
    rows.push({
      metric: "Market Mood",
      formula:
        "mean(factor scores −2…+2) → Extremely Bullish…Extremely Bearish; ≥35% coverage & ≥2 factors",
      sourceData: "Breadth %, EMA partic., H/L, sector advance share, RSI",
      currentValue: p.marketMood ?? null,
      expectedValue: input.expectedMood,
      correct: (p.marketMood ?? null) === input.expectedMood,
    });
  }

  return rows;
}
