import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import type { MarketRegimeView } from "@/lib/market-intelligence";
import { StatusBadge, statusToneFromLabel } from "@/src/design";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Compass,
  Crosshair,
  Layers,
  Shield,
  TrendingUp,
  Waves,
} from "lucide-react";

function formatUpdated(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

type MetricTone = {
  shell: string;
  icon: string;
  value: string;
};

const TONES = {
  trend: {
    shell:
      "border-cyan-500/35 bg-gradient-to-br from-cyan-500/15 via-blue-500/10 to-transparent shadow-[0_0_20px_-12px_rgba(34,211,238,0.55)]",
    icon: "text-cyan-400",
    value: "text-cyan-200",
  },
  momentum: {
    shell:
      "border-violet-500/35 bg-gradient-to-br from-violet-500/15 via-purple-500/10 to-transparent shadow-[0_0_20px_-12px_rgba(168,85,247,0.55)]",
    icon: "text-violet-400",
    value: "text-violet-200",
  },
  volatility: {
    shell:
      "border-sky-500/35 bg-gradient-to-br from-sky-500/15 via-sky-400/10 to-transparent shadow-[0_0_20px_-12px_rgba(56,189,248,0.55)]",
    icon: "text-sky-400",
    value: "text-sky-200",
  },
  breadth: {
    shell:
      "border-emerald-500/35 bg-gradient-to-br from-emerald-500/15 via-emerald-400/10 to-transparent shadow-[0_0_20px_-12px_rgba(16,185,129,0.55)]",
    icon: "text-emerald-400",
    value: "text-emerald-200",
  },
  risk: {
    shell:
      "border-amber-500/35 bg-gradient-to-br from-amber-500/15 via-amber-400/10 to-transparent shadow-[0_0_20px_-12px_rgba(245,158,11,0.55)]",
    icon: "text-amber-400",
    value: "text-amber-200",
  },
} as const satisfies Record<string, MetricTone>;

function confidenceTone(
  confidence: number,
  grade: string
): { label: string; tone: MetricTone } {
  const normalized = grade.toLowerCase();
  if (
    normalized.includes("high") ||
    normalized.includes("strong") ||
    confidence >= 70
  ) {
    return {
      label: "High",
      tone: {
        shell:
          "border-emerald-500/35 bg-gradient-to-br from-emerald-500/15 via-emerald-400/10 to-transparent shadow-[0_0_20px_-12px_rgba(16,185,129,0.55)]",
        icon: "text-emerald-400",
        value: "text-emerald-200",
      },
    };
  }
  if (
    normalized.includes("low") ||
    normalized.includes("weak") ||
    confidence < 40
  ) {
    return {
      label: "Low",
      tone: {
        shell:
          "border-red-500/35 bg-gradient-to-br from-red-500/15 via-red-400/10 to-transparent shadow-[0_0_20px_-12px_rgba(239,68,68,0.55)]",
        icon: "text-red-400",
        value: "text-red-200",
      },
    };
  }
  return {
    label: "Medium",
    tone: {
      shell:
        "border-blue-500/35 bg-gradient-to-br from-blue-500/15 via-blue-400/10 to-transparent shadow-[0_0_20px_-12px_rgba(59,130,246,0.55)]",
      icon: "text-blue-400",
      value: "text-blue-200",
    },
  };
}

function MetricTile({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  detail?: string;
  icon: LucideIcon;
  tone: MetricTone;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2.5 transition-colors",
        tone.shell
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-text-faint">
          {label}
        </p>
        <Icon className={cn("h-3.5 w-3.5 shrink-0", tone.icon)} aria-hidden />
      </div>
      <p className={cn("mt-1.5 text-sm font-semibold tracking-tight", tone.value)}>
        {value}
      </p>
      {detail ? (
        <p className="mt-0.5 text-[10px] text-text-muted">{detail}</p>
      ) : null}
    </div>
  );
}

function isInvestorReason(reason: string): boolean {
  return !/neutral fallback|full pipeline not invoked|pipeline not invoked|implementation|debug|injected context|trading pipeline/i.test(
    reason
  );
}

export function MarketRegimeCard({
  regime,
}: {
  regime: MarketRegimeView | null;
}) {
  if (!regime) {
    return (
      <Card padding="sm" data-testid="market-regime-card-empty">
        <CardHeader title="Market Regime" subtitle="Awaiting classification" />
        <EmptyStatePanel
          message="Market regime is warming up and will appear automatically."
          source="Market Intelligence"
          icon={Compass}
        />
      </Card>
    );
  }

  const c = regime.components;
  const confidence = confidenceTone(regime.confidence, regime.confidenceGrade);
  const visibleReasons = regime.reasons.filter(isInvestorReason);

  return (
    <Card
      padding="sm"
      accent="indigo"
      data-testid="market-regime-card"
      className="shadow-[0_8px_30px_-18px_rgba(15,23,42,0.85)]"
    >
      <CardHeader
        title="Market Regime"
        subtitle="Institutional classification"
        icon={<Compass className="h-4 w-4" />}
        timestamp={`Updated ${formatUpdated(regime.timestamp)} IST`}
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <StatusBadge tone={statusToneFromLabel(regime.regime)}>
          {regime.regime}
        </StatusBadge>
        <p className="text-[10px] text-text-muted">
          Confidence {Math.round(regime.confidence)} · {regime.confidenceGrade}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        <MetricTile
          label="Trend Strength"
          value={String(Math.round(c.trendStrength))}
          icon={TrendingUp}
          tone={TONES.trend}
        />
        <MetricTile
          label="Momentum"
          value={String(Math.round(c.momentum))}
          icon={Activity}
          tone={TONES.momentum}
        />
        <MetricTile
          label="Volatility"
          value={String(Math.round(c.volatility))}
          icon={Waves}
          tone={TONES.volatility}
        />
        <MetricTile
          label="Breadth"
          value={String(Math.round(c.breadth))}
          icon={Layers}
          tone={TONES.breadth}
        />
        <MetricTile
          label="Risk"
          value={c.risk}
          icon={Shield}
          tone={TONES.risk}
        />
        <MetricTile
          label="Confidence"
          value={`${Math.round(regime.confidence)}`}
          detail={confidence.label}
          icon={Crosshair}
          tone={confidence.tone}
        />
      </div>

      {visibleReasons.length > 0 ? (
        <ul className="mt-3 space-y-1">
          {visibleReasons.slice(0, 3).map((reason) => (
            <li
              key={reason}
              className="flex items-start gap-1.5 text-[10px] text-text-muted"
            >
              <Shield className="mt-0.5 h-3 w-3 shrink-0 text-accent" />
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="mt-2 text-[10px] text-text-faint">
        Last updated {formatUpdated(regime.timestamp)} IST
      </p>
    </Card>
  );
}
