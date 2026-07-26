"use client";

/**
 * Sprint 9A + 10C — complete strategy research section for AI Insights.
 * Cards / Table / Detailed Recommendations view modes over the same OE projection.
 * Visual polish only — no recommendation logic or calculation changes.
 */

import { RecommendationRefreshButton } from "@/components/recommendations/RecommendationRefreshButton";
import { StrategyResearchExplainability } from "@/components/ai/insights/StrategyResearchExplainability";
import type {
  InsightsResearchRow,
  InsightsResearchViewMode,
} from "@/lib/ai/insights-research";
import { strategyResearchAnchorId } from "@/lib/ai/insights-research";
import type { InstitutionalStrategyId } from "@/lib/recommendations";
import {
  HORIZON_COLORS,
  horizonSectionSurfaceStyle,
} from "@/lib/recommendations/horizons/colors";
import { ConfidenceBar } from "@/components/ui/ConfidenceBar";
import { ActionBadge, normalizeActionBadge } from "@/components/ui/ActionBadge";
import {
  createInstitutionalTable,
  ResearchDataGrid,
} from "@/src/design";
import {
  Crosshair,
  LayoutGrid,
  List,
  Rows3,
} from "lucide-react";
import { useMemo, useState } from "react";

function price(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return "—";
  }
  return `₹${value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatPct(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function toDisplayAction(
  action: InsightsResearchRow["action"]
): "BUY" | "SELL" | "HOLD" {
  return normalizeActionBadge(action) ?? "BUY";
}

function formatTs(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function HoldingBadge({
  label,
  chipClass,
}: {
  label: string;
  chipClass: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium ${chipClass}`}
    >
      {label}
    </span>
  );
}

function ConvictionBadge({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center rounded border border-white/15 bg-white/5 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-white/75">
      Conviction {Math.round(value)}
    </span>
  );
}

interface GridRow {
  id: string;
  company: string;
  symbol: string;
  action: string;
  entryRange: string;
  stopLoss: number;
  target1: number;
  target2: number;
  target3: number;
  expectedReturn: string;
  riskReward: number;
  holdingPeriod: string;
  confidence: number;
  conviction: number;
  currentPrice: number;
  upside: string;
  volume: string;
  liquidity: string;
  sector: string;
  scanTime: string;
  source: InsightsResearchRow;
}

function researchTableFor(
  strategyId: InstitutionalStrategyId,
  supportsTarget3: boolean
) {
  const columns = [
    { id: "company", label: "Company", kind: "text" as const, width: 140 },
    {
      id: "symbol",
      label: "Symbol",
      kind: "text" as const,
      sticky: true as const,
      width: 100,
    },
    { id: "action", label: "Action", kind: "badge" as const, width: 90 },
    {
      id: "entryRange",
      label: "Entry Range",
      kind: "text" as const,
      width: 150,
    },
    { id: "stopLoss", label: "Stop Loss", kind: "price" as const },
    { id: "target1", label: "Target 1", kind: "price" as const },
    { id: "target2", label: "Target 2", kind: "price" as const },
    ...(supportsTarget3
      ? [{ id: "target3", label: "Target 3", kind: "price" as const }]
      : []),
    {
      id: "expectedReturn",
      label: "Expected Return",
      kind: "text" as const,
      width: 110,
    },
    { id: "riskReward", label: "Risk Reward", kind: "number" as const },
    {
      id: "holdingPeriod",
      label: "Holding Period",
      kind: "text" as const,
      width: 140,
    },
    { id: "confidence", label: "Confidence", kind: "percent" as const },
    { id: "conviction", label: "Conviction", kind: "number" as const },
    { id: "currentPrice", label: "Current Price", kind: "price" as const },
    { id: "upside", label: "Upside %", kind: "text" as const, width: 90 },
    { id: "volume", label: "Volume", kind: "text" as const, width: 90 },
    { id: "liquidity", label: "Liquidity", kind: "text" as const, width: 90 },
    { id: "sector", label: "Sector", kind: "text" as const, width: 120 },
    { id: "scanTime", label: "Scan Time", kind: "date" as const, width: 130 },
  ];

  return createInstitutionalTable<GridRow>({
    id: `ai-strategy-recommendations-${strategyId}`,
    pageSize: 25,
    density: "comfortable",
    defaultSort: { columnId: "conviction", direction: "desc" },
    columns,
  });
}

const VIEW_MODES: Array<{
  id: InsightsResearchViewMode;
  label: string;
  icon: typeof LayoutGrid;
}> = [
  { id: "cards", label: "Cards", icon: LayoutGrid },
  { id: "table", label: "Table", icon: List },
  { id: "detailed", label: "Detailed Recommendations", icon: Rows3 },
];

function ResearchCard({
  row,
  expanded,
  onToggle,
  horizonId,
}: {
  row: InsightsResearchRow;
  expanded: boolean;
  onToggle: () => void;
  horizonId: InstitutionalStrategyId;
}) {
  const display = toDisplayAction(row.action);
  const colors = HORIZON_COLORS[horizonId];
  return (
    <article
      className={`rounded-lg border border-l-4 ${colors.border} p-4 transition duration-200 ${colors.rowHover} ${colors.hoverGlow}`}
      style={{
        borderColor: `rgba(${colors.rgb}, 0.35)`,
        backgroundImage: `linear-gradient(180deg, ${colors.wash} 0%, transparent 100%)`,
        backgroundColor: "rgba(8, 12, 22, 0.55)",
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-2 text-left"
      >
        <div>
          <p className="text-sm font-semibold text-text-primary">{row.company}</p>
          <p className="text-[11px] text-text-muted">{row.symbol}</p>
        </div>
        <ActionBadge action={display} />
      </button>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] sm:grid-cols-4">
        <div>
          <p className="text-text-faint">Entry Range</p>
          <p className="font-mono text-text-primary">{row.entryRangeLabel}</p>
        </div>
        <div>
          <p className="text-text-faint">Stop Loss</p>
          <p className="font-mono text-text-primary">{price(row.stopLoss)}</p>
        </div>
        <div>
          <p className="text-text-faint">Target 1</p>
          <p className="font-mono text-text-primary">{price(row.target1)}</p>
        </div>
        <div>
          <p className="text-text-faint">Upside</p>
          <p className="font-mono text-text-primary">
            {formatPct(row.upsidePercent)}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-semibold tabular-nums ${colors.chip}`}
        >
          {row.confidence.toFixed(0)}% conf
        </span>
        <ConfidenceBar value={row.confidence} size="sm" showLabel={false} />
        <ConvictionBadge value={row.conviction} />
        <HoldingBadge label={row.holdingPeriod} chipClass={colors.chip} />
        <span className={`text-[10px] ${colors.accent}`}>
          {row.primaryStrategy}
        </span>
      </div>

      {expanded ? (
        <div className="mt-4">
          <StrategyResearchExplainability row={row} horizonId={horizonId} />
        </div>
      ) : (
        <p className="mt-3 text-[10px] text-text-faint">
          Click to expand explainability
        </p>
      )}
    </article>
  );
}

function DetailedResearchList({
  rows,
  horizonId,
}: {
  rows: readonly InsightsResearchRow[];
  horizonId: InstitutionalStrategyId;
}) {
  const [openId, setOpenId] = useState<string | null>(rows[0]?.id ?? null);
  const colors = HORIZON_COLORS[horizonId];

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const open = openId === row.id;
        const display = toDisplayAction(row.action);
        return (
          <div
            key={row.id}
            className={`rounded-xl border border-l-4 ${colors.border} transition duration-200 ${colors.hoverGlow} ${
              open
                ? `ring-1 ${colors.highlightRing} ${colors.rowActive}`
                : colors.rowHover
            }`}
            style={{
              borderColor: `rgba(${colors.rgb}, 0.35)`,
              backgroundImage: open
                ? `linear-gradient(180deg, rgba(${colors.rgb},0.12) 0%, rgba(${colors.rgb},0.04) 100%)`
                : `linear-gradient(180deg, ${colors.wash} 0%, transparent 100%)`,
              backgroundColor: "rgba(8, 12, 22, 0.45)",
            }}
          >
            <button
              type="button"
              onClick={() => setOpenId(open ? null : row.id)}
              className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left"
            >
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  {row.company}{" "}
                  <span className="text-text-muted">· {row.symbol}</span>
                </p>
                <p className={`mt-0.5 text-[11px] ${colors.accent}`}>
                  {row.primaryStrategy}
                  {row.supportingSignals.length > 0
                    ? ` + ${row.supportingSignals.length} supporting`
                    : ""}{" "}
                  · Matched {row.matchedSignalCount}/{row.totalSignalCount}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <ActionBadge action={display} />
                <span
                  className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium tabular-nums ${colors.chip}`}
                >
                  {formatPct(row.upsidePercent)} · R:R {row.riskReward.toFixed(2)}
                </span>
              </div>
            </button>
            {open ? (
              <div className={`border-t ${colors.divider} px-4 py-4`}>
                <div className="mb-4 grid gap-2 text-[11px] sm:grid-cols-4 lg:grid-cols-8">
                  <div>
                    <p className="text-text-faint">Entry Range</p>
                    <p className="text-text-primary">{row.entryRangeLabel}</p>
                  </div>
                  <div>
                    <p className="text-text-faint">Stop Loss</p>
                    <p className="text-text-primary">{price(row.stopLoss)}</p>
                  </div>
                  <div>
                    <p className="text-text-faint">Target 1</p>
                    <p className="text-text-primary">{price(row.target1)}</p>
                  </div>
                  <div>
                    <p className="text-text-faint">Target 2</p>
                    <p className="text-text-primary">{price(row.target2)}</p>
                  </div>
                  {row.supportsTarget3 ? (
                    <div>
                      <p className="text-text-faint">Target 3</p>
                      <p className="text-text-primary">{price(row.target3)}</p>
                    </div>
                  ) : null}
                  <div>
                    <p className="text-text-faint">Current</p>
                    <p className="text-text-primary">{price(row.currentPrice)}</p>
                  </div>
                  <div>
                    <p className="text-text-faint">Holding</p>
                    <p className="text-text-primary">{row.holdingPeriod}</p>
                  </div>
                  <div>
                    <p className="text-text-faint">Scan Time</p>
                    <p className="text-text-primary">{formatTs(row.scanTime)}</p>
                  </div>
                </div>
                <StrategyResearchExplainability
                  row={row}
                  horizonId={horizonId}
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function StrategyResearchSection({
  strategyId,
  title,
  emoji,
  rows,
  highlighted = false,
  defaultView = "table",
}: {
  strategyId: InstitutionalStrategyId;
  title: string;
  emoji: string;
  rows: readonly InsightsResearchRow[];
  highlighted?: boolean;
  defaultView?: InsightsResearchViewMode;
}) {
  const [view, setView] = useState<InsightsResearchViewMode>(defaultView);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const supportsTarget3 =
    rows.length === 0 || rows.some((row) => row.supportsTarget3);
  const colors = HORIZON_COLORS[strategyId];

  const gridRows = useMemo<GridRow[]>(
    () =>
      rows.map((row) => ({
        id: row.id,
        company: row.company,
        symbol: row.symbol,
        action: toDisplayAction(row.action),
        entryRange: row.entryRangeLabel,
        stopLoss: row.stopLoss,
        target1: row.target1 ?? 0,
        target2: row.target2 ?? 0,
        target3: row.target3 ?? 0,
        expectedReturn: formatPct(row.expectedReturnPercent),
        riskReward: row.riskReward,
        holdingPeriod: row.holdingPeriod,
        confidence: row.confidence,
        conviction: row.conviction,
        currentPrice: row.currentPrice ?? 0,
        upside: formatPct(row.upsidePercent),
        volume: row.volumeLabel,
        liquidity: row.liquidityLabel,
        sector: row.sector,
        scanTime: formatTs(row.scanTime),
        source: row,
      })),
    [rows]
  );

  const sectionStyle = horizonSectionSurfaceStyle(strategyId);

  return (
    <section
      id={strategyResearchAnchorId(strategyId)}
      style={sectionStyle}
      className={`strategy-accent-table relative scroll-mt-24 overflow-hidden rounded-xl border p-5 shadow-[var(--eos-shadow-card)] sm:p-6 ${
        highlighted ? `ring-1 ${colors.highlightRing}` : ""
      }`}
    >
      <span
        aria-hidden
        className={`absolute inset-y-0 left-0 w-1 rounded-r-full ${colors.rail}`}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background: `linear-gradient(90deg, ${colors.hex}, transparent 70%)`,
          boxShadow: `0 0 18px 1px rgba(${colors.rgb}, 0.35)`,
        }}
      />

      <div
        className={`flex flex-wrap items-start justify-between gap-3 border-b pb-3 ${colors.headerUnderline}`}
        style={{
          boxShadow: `0 8px 24px -20px rgba(${colors.rgb}, 0.55)`,
        }}
      >
        <div>
          <h2
            className={`flex items-center gap-2 text-base font-semibold tracking-tight sm:text-lg ${colors.accent}`}
          >
            <Crosshair className={`h-4 w-4 ${colors.icon}`} aria-hidden />
            <span aria-hidden>{emoji}</span>
            <span>{title}</span>
          </h2>
          <p className="mt-1 text-xs text-text-muted">
            {`${rows.length} recommendation${rows.length === 1 ? "" : "s"} · independent ${colors.label} horizon pipeline`}
          </p>
        </div>

        <div
          className="inline-flex rounded-lg border border-surface-border-subtle bg-surface-overlay/50 p-0.5"
          role="group"
          aria-label="Research view mode"
        >
          {VIEW_MODES.map((mode) => {
            const Icon = mode.icon;
            const active = view === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => setView(mode.id)}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition ${
                  active
                    ? `${colors.chip} ${colors.accent}`
                    : "text-text-muted hover:text-text-secondary"
                }`}
                aria-pressed={active}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                <span className="hidden sm:inline">{mode.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {rows.length === 0 ? (
        <div
          className={`mt-4 flex flex-col items-start gap-3 rounded-xl border border-dashed p-6 ${colors.divider}`}
          style={{
            backgroundImage: `linear-gradient(180deg, ${colors.wash} 0%, transparent 100%)`,
          }}
        >
          <span
            className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${colors.chip}`}
            aria-hidden
          >
            <Crosshair className={`h-5 w-5 ${colors.icon}`} />
          </span>
          <div>
            <p className={`text-sm font-semibold ${colors.accent}`}>
              No Recommendation Available
            </p>
            <p className="mt-1 max-w-md text-xs leading-relaxed text-text-muted">
              The Opportunity Engine returned no validated ideas for the{" "}
              {colors.label} horizon in the latest scan. Refresh to request the
              next institutional pass.
            </p>
          </div>
          <RecommendationRefreshButton
            label="Refresh Scan"
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold tracking-wide transition disabled:opacity-60 ${colors.button} ${colors.buttonHover}`}
          />
        </div>
      ) : view === "cards" ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => (
            <ResearchCard
              key={row.id}
              row={row}
              horizonId={strategyId}
              expanded={expandedCardId === row.id}
              onToggle={() =>
                setExpandedCardId((current) =>
                  current === row.id ? null : row.id
                )
              }
            />
          ))}
        </div>
      ) : view === "detailed" ? (
        <div className="mt-4">
          <DetailedResearchList rows={rows} horizonId={strategyId} />
        </div>
      ) : (
        <div
          className={`mt-4 overflow-hidden rounded-lg border border-l-4 ${colors.border}`}
          style={{
            borderColor: `rgba(${colors.rgb}, 0.35)`,
            ["--strategy-accent" as string]: colors.hex,
            ["--strategy-rgb" as string]: colors.rgb,
            ["--strategy-wash" as string]: colors.wash,
            backgroundImage: `linear-gradient(180deg, ${colors.wash} 0%, transparent 100%)`,
          }}
        >
          <ResearchDataGrid
            table={researchTableFor(strategyId, supportsTarget3)}
            rows={gridRows}
            getRowId={(row) => row.id}
            maxHeight={560}
            emptyTitle="No recommendations"
            className="min-w-0"
            renderExpandedRow={(row) => (
              <StrategyResearchExplainability
                row={row.source}
                horizonId={strategyId}
              />
            )}
          />
        </div>
      )}
    </section>
  );
}
