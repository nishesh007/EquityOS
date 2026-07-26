"use client";

import { memo } from "react";
import { Card } from "@/components/ui/Card";
import type { BuiltStrategy } from "@/lib/strategy-builder";
import { ConfidenceBar } from "@/components/ui/ConfidenceBar";

export const ImprovementPanel = memo(function ImprovementPanel({
  strategy,
}: {
  strategy: BuiltStrategy | null;
}) {
  return (
    <Card padding="lg" data-testid="improvement-panel">
      <h2 className="text-base font-semibold text-text-primary">
        AI Evaluation & Improvements
      </h2>
      <p className="mt-1 text-sm text-text-secondary">
        Deterministic recommendations with confidence scores (LLM-ready architecture).
      </p>

      {!strategy ? (
        <p className="mt-4 text-sm text-text-secondary">
          Select a strategy to review AI improvement suggestions.
        </p>
      ) : (
        <>
          <div className="mt-4 rounded-lg border border-surface-border-subtle bg-surface-overlay/30 p-3">
            <h3 className="text-sm font-semibold text-text-primary">Rules snapshot</h3>
            <dl className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
              <div>
                <dt className="text-text-faint">Entry</dt>
                <dd className="text-text-secondary">
                  {strategy.rules.entry.join(" · ")}
                </dd>
              </div>
              <div>
                <dt className="text-text-faint">Exit</dt>
                <dd className="text-text-secondary">
                  {strategy.rules.exit.join(" · ")}
                </dd>
              </div>
              <div>
                <dt className="text-text-faint">Stop / Target / Trail</dt>
                <dd className="text-text-secondary">
                  {strategy.rules.stopLossPct}% / {strategy.rules.targetPct}% /{" "}
                  {strategy.rules.trailingStopPct ?? "—"}%
                </dd>
              </div>
              <div>
                <dt className="text-text-faint">Position size</dt>
                <dd className="text-text-secondary">
                  {strategy.rules.positionSizePct}% · hold{" "}
                  {strategy.rules.holdingMinDays}–{strategy.rules.holdingMaxDays}d
                </dd>
              </div>
            </dl>
          </div>

          <ul className="mt-4 space-y-3" aria-label="Improvement suggestions">
            {strategy.improvements.map((tip) => (
              <li
                key={tip.id}
                className="rounded-xl border border-surface-border-subtle bg-surface-overlay/40 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-text-faint">
                      {tip.category}
                    </span>
                    <h3 className="text-sm font-semibold text-text-primary">
                      {tip.title}
                    </h3>
                  </div>
                  <span className="text-xs text-text-secondary">
                    {tip.confidence}% confidence
                  </span>
                </div>
                <p className="mt-1 text-xs text-text-secondary">{tip.detail}</p>
                <div className="mt-2">
                  <ConfidenceBar value={tip.confidence} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
});
