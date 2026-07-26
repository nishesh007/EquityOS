"use client";

import { cn } from "@/lib/utils";
import type { PaperTrade } from "@/lib/paper-trading/types";
import {
  formatClock,
  formatDateTime,
  formatHoldingDuration,
  formatPercent,
  formatPnl,
  formatPrice,
  PAPER_EXIT_REASON_LABELS,
  PAPER_STATUS_LABELS,
  PAPER_STRATEGY_LABELS,
} from "@/lib/paper-trading/format";
import { FOCUS_RING_CLASS } from "@/src/design/motion/motionPresets";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";

interface PaperTradeDrawerProps {
  trade: PaperTrade | null;
  open: boolean;
  onClose: () => void;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-primary">
        {title}
      </p>
      <div>{children}</div>
    </section>
  );
}

function MetricGrid({
  rows,
}: {
  rows: Array<{
    label: string;
    value: string;
    tone?: "gain" | "loss" | "neutral";
  }>;
}) {
  return (
    <dl className="grid grid-cols-2 gap-2">
      {rows.map((row) => (
        <div
          key={`${row.label}-${row.value}`}
          className="rounded-lg border border-surface-border-subtle/80 bg-surface/40 px-2.5 py-2"
        >
          <dt className="text-[10px] text-text-muted">{row.label}</dt>
          <dd
            className={cn(
              "mt-0.5 text-xs font-medium",
              row.tone === "gain"
                ? "text-gain"
                : row.tone === "loss"
                  ? "text-loss"
                  : "text-text-primary"
            )}
          >
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function PaperTradeDrawer({
  trade,
  open,
  onClose,
}: PaperTradeDrawerProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !trade) return null;

  const snap = trade.recommendation;
  const profitable = trade.pnl >= 0;
  const isOpen = trade.status === "open";

  return (
    <div className="fixed inset-0 z-[70] flex justify-end">
      <button
        type="button"
        aria-label="Close trade details"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Paper trade ${trade.symbol}`}
        className="relative flex h-full w-full max-w-md flex-col border-l border-surface-border-subtle bg-surface/95 shadow-2xl backdrop-blur-xl animate-fade-in-up"
      >
        <header className="flex items-start justify-between gap-3 border-b border-surface-border-subtle px-4 py-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">
              Trade Details · {PAPER_STRATEGY_LABELS[trade.strategy]}
            </p>
            <h2 className="mt-1 truncate text-lg font-semibold text-text-primary">
              {trade.symbol}
            </h2>
            <p className="truncate text-xs text-text-secondary">{trade.company}</p>
            <p className="mt-1 font-mono text-[10px] text-text-faint">{trade.id}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className={cn(
              "rounded-lg border border-surface-border-subtle p-1.5 text-text-muted hover:bg-surface-hover hover:text-text-primary",
              FOCUS_RING_CLASS
            )}
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
          <Section title="Recommendation Snapshot">
            <MetricGrid
              rows={[
                { label: "AI Recommendation", value: snap.primaryStrategy },
                {
                  label: "Confidence",
                  value: `${snap.confidence.toFixed(0)}%`,
                },
                {
                  label: "Conviction",
                  value: snap.conviction.toFixed(0),
                },
                {
                  label: "Score",
                  value: snap.opportunityScore.toFixed(1),
                },
                { label: "R:R", value: snap.riskReward.toFixed(2) },
                {
                  label: "Status",
                  value: PAPER_STATUS_LABELS[trade.status],
                },
              ]}
            />
          </Section>

          <Section title="Entry Reason">
            <ul className="space-y-1.5">
              {(snap.reasons.length > 0
                ? snap.reasons
                : ["Highest-conviction automated entry."]
              ).map((reason) => (
                <li
                  key={reason}
                  className="rounded-lg border border-surface-border-subtle/80 bg-surface/40 px-2.5 py-2 text-xs text-text-secondary"
                >
                  {reason}
                </li>
              ))}
            </ul>
          </Section>

          <Section title="AI Recommendation">
            <p className="rounded-lg border border-surface-border-subtle/80 bg-surface/40 px-2.5 py-2 text-xs leading-relaxed text-text-secondary">
              {snap.aiExplanation}
            </p>
          </Section>

          <Section title="Levels">
            <MetricGrid
              rows={[
                { label: "Entry Price", value: formatPrice(trade.entryPrice) },
                {
                  label: "Current Price",
                  value: formatPrice(trade.currentPrice),
                },
                {
                  label: "Stop Loss",
                  value: formatPrice(trade.stopLoss),
                  tone: "loss",
                },
                ...trade.targets.map((target, i) => ({
                  label: `Target ${i + 1}`,
                  value: formatPrice(target),
                  tone: "gain" as const,
                })),
              ]}
            />
          </Section>

          <Section title="Timeline">
            <ol className="space-y-0">
              {trade.timeline.map((event, index) => {
                const isLast = index === trade.timeline.length - 1;
                return (
                  <li key={event.id} className="relative flex gap-3 pb-4">
                    {!isLast ? (
                      <span
                        aria-hidden
                        className="absolute left-[7px] top-4 h-[calc(100%-8px)] w-px bg-surface-border-subtle"
                      />
                    ) : null}
                    <span
                      className={cn(
                        "relative z-[1] mt-1 h-2 w-2 shrink-0 rounded-full",
                        event.type === "closed"
                          ? profitable
                            ? "bg-gain"
                            : "bg-loss"
                          : event.type.includes("stop")
                            ? "bg-loss"
                            : event.type.includes("target")
                              ? "bg-gain"
                              : "bg-accent"
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-xs font-medium text-text-primary">
                          {event.label}
                        </p>
                        <time className="shrink-0 font-mono text-[10px] text-text-faint">
                          {formatClock(event.timestamp)}
                        </time>
                      </div>
                      <p className="mt-0.5 text-[10px] text-text-muted">
                        {formatDateTime(event.timestamp)}
                        {event.price != null
                          ? ` · ${formatPrice(event.price)}`
                          : ""}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </Section>

          {!isOpen ? (
            <Section title="Final Outcome">
              <MetricGrid
                rows={[
                  {
                    label: "P&L",
                    value: formatPnl(trade.pnl),
                    tone: profitable ? "gain" : "loss",
                  },
                  {
                    label: "Return",
                    value: formatPercent(trade.returnPercent),
                    tone: profitable ? "gain" : "loss",
                  },
                  {
                    label: "Exit Reason",
                    value: trade.exitReason
                      ? PAPER_EXIT_REASON_LABELS[trade.exitReason]
                      : "—",
                  },
                  {
                    label: "Holding",
                    value: formatHoldingDuration(trade.holdingMs),
                  },
                ]}
              />
            </Section>
          ) : (
            <Section title="Mark-to-Market">
              <p className="text-xs text-text-secondary">
                Position remains open · {formatPnl(trade.pnl)} (
                {formatPercent(trade.returnPercent)}) ·{" "}
                {formatHoldingDuration(trade.holdingMs)}
              </p>
            </Section>
          )}
        </div>
      </aside>
    </div>
  );
}
