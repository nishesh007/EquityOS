"use client";

/**
 * Sprint 10C — expandable strategy explainability panel.
 * Presentation only over InsightsResearchRow (OE projection).
 * Uses the same horizon color identity as cards / tables.
 */

import type { InsightsResearchRow } from "@/lib/ai/insights-research";
import type { InstitutionalStrategyId } from "@/lib/recommendations";
import { HORIZON_COLORS } from "@/lib/recommendations/horizons/colors";
import { Check, X } from "lucide-react";

function price(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return "—";
  }
  return `₹${value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function ListBlock({
  title,
  items,
  empty = "—",
  tone = "neutral",
}: {
  title: string;
  items: readonly string[];
  empty?: string;
  tone?: "neutral" | "positive" | "negative";
}) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-300"
      : tone === "negative"
        ? "text-rose-300"
        : "text-text-secondary";

  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">
        {title}
      </p>
      {items.length === 0 ? (
        <p className="mt-1 text-xs text-text-muted">{empty}</p>
      ) : (
        <ul className={`mt-1 space-y-1 text-xs ${toneClass}`}>
          {items.map((item) => (
            <li key={item} className="leading-snug">
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function StrategyResearchExplainability({
  row,
  horizonId,
}: {
  row: InsightsResearchRow;
  /** When set, panel chrome matches the strategy color identity. */
  horizonId?: InstitutionalStrategyId;
}) {
  const matchedLabel = `${row.matchedSignalCount} / ${row.totalSignalCount} Signals`;
  const colors = horizonId ? HORIZON_COLORS[horizonId] : null;

  return (
    <div
      className={`space-y-4 rounded-lg border bg-surface-overlay/40 p-4 ${
        colors
          ? `border-l-4 ${colors.border} ${colors.divider}`
          : "border-surface-border-subtle"
      }`}
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">
            Primary Strategy
          </p>
          <p
            className={`mt-1 text-sm font-semibold ${
              colors ? colors.accent : "text-text-primary"
            }`}
          >
            {row.primaryStrategy}
          </p>
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-text-faint">
            Supporting Signals
          </p>
          {row.supportingSignals.length === 0 ? (
            <p className="mt-1 text-xs text-text-muted">
              No additional supporting strategies for this selection.
            </p>
          ) : (
            <ul className="mt-1 space-y-1">
              {row.supportingSignals.map((signal) => (
                <li
                  key={signal}
                  className="flex items-start gap-1.5 text-xs text-emerald-300"
                >
                  <Check className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                  <span>{signal}</span>
                </li>
              ))}
            </ul>
          )}
          <p
            className={`mt-2 text-xs font-medium ${
              colors ? colors.accent : "text-sky-300"
            }`}
          >
            Matched {matchedLabel}
          </p>
        </div>

        <ListBlock title="Matched Conditions" items={row.matchedConditions} />
        <ListBlock title="Matched Indicators" items={row.matchedIndicators} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">
            AI Explanation
          </p>
          <p className="mt-1 text-xs leading-relaxed text-text-secondary">
            {row.aiExplanation}
          </p>
        </div>
        <ListBlock
          title="Risk Factors"
          items={row.riskFactors}
          tone="negative"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ListBlock
          title="Reasons For Selection"
          items={row.reasonsFor}
          tone="positive"
        />
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">
            Reasons Against Selection
          </p>
          {row.reasonsAgainst.length === 0 ? (
            <p className="mt-1 text-xs text-text-muted">None material.</p>
          ) : (
            <ul className="mt-1 space-y-1 text-xs text-rose-300">
              {row.reasonsAgainst.map((item) => (
                <li key={item} className="flex items-start gap-1.5">
                  <X className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div
        className={`grid gap-3 border-t pt-3 sm:grid-cols-3 ${
          colors ? colors.divider : "border-surface-border-subtle"
        }`}
      >
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">
            Expected Holding Period
          </p>
          <p className="mt-1 text-xs font-medium text-text-primary">
            {row.expectedHoldingPeriod || "—"}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">
            Expected Success Probability
          </p>
          <p className="mt-1 text-xs font-medium text-text-primary">
            {row.expectedSuccessProbability != null
              ? `${Math.round(row.expectedSuccessProbability)}%`
              : "—"}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">
            Trade Levels
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            Entry {row.entryRangeLabel} · SL {price(row.stopLoss)} · T1{" "}
            {price(row.target1)} · T2 {price(row.target2)}
            {row.supportsTarget3 ? ` · T3 ${price(row.target3)}` : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
