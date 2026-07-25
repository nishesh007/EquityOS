"use client";

import { cn } from "@/lib/utils";
import { InstitutionalCard } from "@/src/design";
import type {
  CommitteeVerdict,
  ConvictionBand,
  DecisionAction,
  OverallCommitteeLabel,
} from "@/lib/recommendations/executive-decision-presenter";

export function SectionShell({
  index,
  title,
  description,
  children,
  badge,
}: {
  index: number;
  title: string;
  description?: string;
  children: React.ReactNode;
  badge?: string;
}) {
  return (
    <InstitutionalCard padding="sm" className="animate-fade-in">
      <div className="space-y-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-faint">
              Section {String(index).padStart(2, "0")}
            </p>
            <h3 className="mt-0.5 text-sm font-semibold tracking-tight text-text-primary">
              {title}
            </h3>
            {description ? (
              <p className="mt-1 text-[11px] leading-relaxed text-text-muted">
                {description}
              </p>
            ) : null}
          </div>
          {badge ? (
            <span className="shrink-0 rounded-md border border-surface-border-subtle bg-surface/50 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-text-faint">
              {badge}
            </span>
          ) : null}
        </div>
        {children}
      </div>
    </InstitutionalCard>
  );
}

const ACTION_BADGE: Record<DecisionAction | CommitteeVerdict, string> = {
  BUY: "border-emerald-500/35 bg-emerald-500/12 text-emerald-400",
  HOLD: "border-amber-500/35 bg-amber-500/12 text-amber-400",
  SELL: "border-rose-500/35 bg-rose-500/12 text-rose-400",
};

const CONVICTION_BADGE: Record<ConvictionBand, string> = {
  High: "border-emerald-500/35 bg-emerald-500/12 text-emerald-400",
  Medium: "border-amber-500/35 bg-amber-500/12 text-amber-400",
  Low: "border-rose-500/35 bg-rose-500/12 text-rose-400",
};

const OVERALL_BADGE: Record<OverallCommitteeLabel, string> = {
  "Strong Buy": "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
  Buy: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  Hold: "border-amber-500/35 bg-amber-500/12 text-amber-400",
  Sell: "border-rose-500/30 bg-rose-500/10 text-rose-400",
  "Strong Sell": "border-rose-500/40 bg-rose-500/15 text-rose-300",
  "Insufficient Data": "border-surface-border-subtle bg-surface/40 text-text-muted",
};

export function VerdictBadge({
  verdict,
  className,
}: {
  verdict: DecisionAction | CommitteeVerdict;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-tight",
        ACTION_BADGE[verdict],
        className
      )}
    >
      {verdict}
    </span>
  );
}

export function ConvictionBadge({ band }: { band: ConvictionBand }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-tight",
        CONVICTION_BADGE[band]
      )}
    >
      {band}
    </span>
  );
}

export function OverallBadge({ label }: { label: OverallCommitteeLabel }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold tracking-tight",
        OVERALL_BADGE[label]
      )}
    >
      {label}
    </span>
  );
}

export function MetricChip({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: "entry" | "stop" | "default";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-2.5 py-2",
        emphasize === "entry" &&
          "border-emerald-500/35 bg-emerald-500/10",
        emphasize === "stop" && "border-rose-500/35 bg-rose-500/10",
        (!emphasize || emphasize === "default") &&
          "border-surface-border-subtle/80 bg-surface/40"
      )}
    >
      <p className="text-[10px] text-text-muted">{label}</p>
      <p
        className={cn(
          "mt-0.5 font-mono text-xs font-semibold tabular-nums",
          emphasize === "entry" && "text-emerald-400",
          emphasize === "stop" && "text-rose-400",
          (!emphasize || emphasize === "default") && "text-text-primary"
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function ScoreBar({
  value,
  tone,
}: {
  value: number | null;
  tone: "positive" | "neutral" | "negative" | "ai" | "info";
}) {
  const clamped = value == null ? 0 : Math.max(0, Math.min(100, value));
  const fill =
    tone === "positive"
      ? "bg-emerald-500/80"
      : tone === "negative"
        ? "bg-rose-500/70"
        : tone === "ai"
          ? "bg-violet-500/75"
          : tone === "info"
            ? "bg-sky-500/70"
            : "bg-amber-500/70";

  return (
    <div className="flex items-center gap-2">
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-border/70"
        role="progressbar"
        aria-valuenow={value == null ? undefined : Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-500", fill)}
          style={{ width: value == null ? "0%" : `${clamped}%` }}
        />
      </div>
      <span className="w-10 shrink-0 text-right font-mono text-[11px] tabular-nums text-text-secondary">
        {value == null ? "—" : Math.round(clamped)}
      </span>
    </div>
  );
}

export function formatInr(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `₹${value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
