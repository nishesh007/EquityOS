import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import type { MarketContextView } from "@/lib/market-intelligence";
import { StatusBadge, statusToneFromLabel } from "@/src/design";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Droplets,
  Gauge,
  Layers,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  Users,
  Waves,
  Wind,
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

function riskTone(risk: string): { label: string; tone: MetricTone } {
  const normalized = risk.trim().toLowerCase();
  // Exact / phrase match — avoid "Risk On".includes("on") → Low bug.
  if (
    normalized === "risk off" ||
    normalized.includes("risk off") ||
    normalized === "high" ||
    normalized.includes("elevated")
  ) {
    return {
      label: "High",
      tone: {
        shell: "border-red-500/35 bg-gradient-to-br from-red-500/15 via-red-400/10 to-transparent shadow-[0_0_20px_-12px_rgba(239,68,68,0.55)]",
        icon: "text-red-400",
        value: "text-red-300",
      },
    };
  }
  if (
    normalized === "risk on" ||
    normalized.includes("risk on") ||
    normalized === "low" ||
    normalized.includes("calm")
  ) {
    return {
      label: "Low",
      tone: {
        shell: "border-emerald-500/35 bg-gradient-to-br from-emerald-500/15 via-emerald-400/10 to-transparent shadow-[0_0_20px_-12px_rgba(16,185,129,0.55)]",
        icon: "text-emerald-400",
        value: "text-emerald-300",
      },
    };
  }
  return {
    label: "Medium",
    tone: {
      shell: "border-amber-500/35 bg-gradient-to-br from-amber-500/15 via-amber-400/10 to-transparent shadow-[0_0_20px_-12px_rgba(245,158,11,0.55)]",
      icon: "text-amber-400",
      value: "text-amber-300",
    },
  };
}

function volatilityTone(regime: string): { label: string; tone: MetricTone } {
  const normalized = regime.toLowerCase();
  if (normalized.includes("high") || normalized.includes("elevated")) {
    return {
      label: regime || "High",
      tone: {
        shell: "border-orange-500/35 bg-gradient-to-br from-orange-500/15 via-orange-400/10 to-transparent shadow-[0_0_20px_-12px_rgba(249,115,22,0.55)]",
        icon: "text-orange-400",
        value: "text-orange-300",
      },
    };
  }
  if (normalized.includes("low") || normalized.includes("quiet")) {
    return {
      label: regime || "Low",
      tone: {
        shell: "border-blue-500/35 bg-gradient-to-br from-blue-500/15 via-blue-400/10 to-transparent shadow-[0_0_20px_-12px_rgba(59,130,246,0.55)]",
        icon: "text-blue-400",
        value: "text-blue-300",
      },
    };
  }
  return {
    label: regime || "Normal",
    tone: {
      shell: "border-cyan-500/35 bg-gradient-to-br from-cyan-500/15 via-cyan-400/10 to-transparent shadow-[0_0_20px_-12px_rgba(34,211,238,0.55)]",
      icon: "text-cyan-400",
      value: "text-cyan-300",
    },
  };
}

function breadthTone(
  quality: string,
  score: number
): { label: string; tone: MetricTone } {
  const normalized = quality.toLowerCase();
  if (
    normalized.includes("positive") ||
    normalized.includes("strong") ||
    score >= 55
  ) {
    return {
      label: `${Math.round(score)} · Positive`,
      tone: {
        shell: "border-emerald-500/35 bg-gradient-to-br from-emerald-500/15 via-emerald-400/10 to-transparent shadow-[0_0_20px_-12px_rgba(16,185,129,0.55)]",
        icon: "text-emerald-400",
        value: "text-emerald-300",
      },
    };
  }
  if (
    normalized.includes("negative") ||
    normalized.includes("weak") ||
    score <= 45
  ) {
    return {
      label: `${Math.round(score)} · Negative`,
      tone: {
        shell: "border-red-500/35 bg-gradient-to-br from-red-500/15 via-red-400/10 to-transparent shadow-[0_0_20px_-12px_rgba(239,68,68,0.55)]",
        icon: "text-red-400",
        value: "text-red-300",
      },
    };
  }
  return {
    label: `${Math.round(score)} · Neutral`,
    tone: {
      shell: "border-blue-500/35 bg-gradient-to-br from-blue-500/15 via-blue-400/10 to-transparent shadow-[0_0_20px_-12px_rgba(59,130,246,0.55)]",
      icon: "text-blue-400",
      value: "text-blue-300",
    },
  };
}

function momentumTone(value: number): { label: string; tone: MetricTone } {
  if (value >= 55) {
    return {
      label: "Bullish",
      tone: {
        shell: "border-emerald-500/35 bg-gradient-to-br from-emerald-500/15 via-emerald-400/10 to-transparent shadow-[0_0_20px_-12px_rgba(16,185,129,0.55)]",
        icon: "text-emerald-400",
        value: "text-emerald-300",
      },
    };
  }
  if (value <= 45) {
    return {
      label: "Bearish",
      tone: {
        shell: "border-red-500/35 bg-gradient-to-br from-red-500/15 via-red-400/10 to-transparent shadow-[0_0_20px_-12px_rgba(239,68,68,0.55)]",
        icon: "text-red-400",
        value: "text-red-300",
      },
    };
  }
  return {
    label: "Neutral",
    tone: {
      shell: "border-slate-500/35 bg-gradient-to-br from-slate-500/15 via-slate-400/10 to-transparent shadow-[0_0_20px_-12px_rgba(100,116,139,0.5)]",
      icon: "text-slate-400",
      value: "text-slate-300",
    },
  };
}

function liquidityTone(value: number): { label: string; tone: MetricTone } {
  if (value >= 70) {
    return {
      label: "High",
      tone: {
        shell: "border-emerald-500/35 bg-gradient-to-br from-emerald-500/15 via-emerald-400/10 to-transparent shadow-[0_0_20px_-12px_rgba(16,185,129,0.55)]",
        icon: "text-emerald-400",
        value: "text-emerald-300",
      },
    };
  }
  if (value <= 40) {
    return {
      label: "Low",
      tone: {
        shell: "border-red-500/35 bg-gradient-to-br from-red-500/15 via-red-400/10 to-transparent shadow-[0_0_20px_-12px_rgba(239,68,68,0.55)]",
        icon: "text-red-400",
        value: "text-red-300",
      },
    };
  }
  return {
    label: "Medium",
    tone: {
      shell: "border-yellow-500/35 bg-gradient-to-br from-yellow-500/15 via-yellow-400/10 to-transparent shadow-[0_0_20px_-12px_rgba(234,179,8,0.55)]",
      icon: "text-yellow-400",
      value: "text-yellow-300",
    },
  };
}

function participationTone(
  value: number
): { label: string; tone: MetricTone } {
  if (value >= 60) {
    return {
      label: "Strong",
      tone: {
        shell: "border-emerald-500/35 bg-gradient-to-br from-emerald-500/15 via-emerald-400/10 to-transparent shadow-[0_0_20px_-12px_rgba(16,185,129,0.55)]",
        icon: "text-emerald-400",
        value: "text-emerald-300",
      },
    };
  }
  if (value <= 30) {
    return {
      label: "Weak",
      tone: {
        shell: "border-orange-500/35 bg-gradient-to-br from-orange-500/15 via-orange-400/10 to-transparent shadow-[0_0_20px_-12px_rgba(249,115,22,0.55)]",
        icon: "text-orange-400",
        value: "text-orange-300",
      },
    };
  }
  return {
    label: "Average",
    tone: {
      shell: "border-blue-500/35 bg-gradient-to-br from-blue-500/15 via-blue-400/10 to-transparent shadow-[0_0_20px_-12px_rgba(59,130,246,0.55)]",
      icon: "text-blue-400",
      value: "text-blue-300",
    },
  };
}

function sectorBreadthTone(
  value: number
): { label: string; tone: MetricTone } {
  if (!Number.isFinite(value)) {
    return {
      label: "—",
      tone: {
        shell: "border-cyan-500/25 bg-gradient-to-br from-cyan-500/12 via-cyan-400/8 to-transparent",
        icon: "text-cyan-400",
        value: "text-cyan-300",
      },
    };
  }
  const rounded = Math.round(value);
  // Sector breadth is a 0–100 average sector score (not signed).
  if (rounded >= 55) {
    return {
      label: String(rounded),
      tone: {
        shell: "border-emerald-500/35 bg-gradient-to-br from-emerald-500/15 via-emerald-400/10 to-transparent shadow-[0_0_20px_-12px_rgba(16,185,129,0.55)]",
        icon: "text-emerald-400",
        value: "text-emerald-300",
      },
    };
  }
  if (rounded <= 45) {
    return {
      label: String(rounded),
      tone: {
        shell: "border-red-500/35 bg-gradient-to-br from-red-500/15 via-red-400/10 to-transparent shadow-[0_0_20px_-12px_rgba(239,68,68,0.55)]",
        icon: "text-red-400",
        value: "text-red-300",
      },
    };
  }
  return {
    label: String(rounded),
    tone: {
      shell: "border-slate-500/35 bg-gradient-to-br from-slate-500/15 via-slate-400/10 to-transparent shadow-[0_0_20px_-12px_rgba(100,116,139,0.5)]",
      icon: "text-slate-400",
      value: "text-slate-300",
    },
  };
}

function isMostlyNumericValue(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return /^[+\-−]?\d/.test(trimmed) && /[\d%]/.test(trimmed);
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
  const numeric = isMostlyNumericValue(value);
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2.5 transition-colors",
        tone.shell
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="data-label">{label}</p>
        <Icon
          className={cn("data-icon h-3.5 w-3.5 shrink-0", tone.icon)}
          aria-hidden
        />
      </div>
      <p
        className={cn(
          "mt-1.5 font-bold tracking-tight",
          numeric
            ? "text-[24px] leading-none sm:text-[26px]"
            : "text-[18px] leading-tight sm:text-[20px]",
          tone.value
        )}
      >
        {value}
      </p>
      {detail ? <p className="data-secondary mt-1">{detail}</p> : null}
    </div>
  );
}

export function MarketContextCard({
  context,
}: {
  context: MarketContextView | null;
}) {
  if (!context) {
    return (
      <Card padding="sm" data-testid="market-context-card-empty">
        <CardHeader title="Market Context" subtitle="Awaiting market data" />
        <EmptyStatePanel
          message="Market context is warming up and will appear automatically."
          source="Market Intelligence"
          icon={Activity}
        />
      </Card>
    );
  }

  const risk = riskTone(context.riskMode);
  const volatility = volatilityTone(context.volatilityRegime);
  const breadth = breadthTone(context.breadthQuality, context.breadthScore);
  const momentum = momentumTone(context.momentum);
  const liquidity = liquidityTone(context.liquidity);
  const participation = participationTone(context.institutionalParticipation);
  const sectorBreadth = sectorBreadthTone(context.sectorBreadth);

  return (
    <Card
      padding="sm"
      accent="indigo"
      data-testid="market-context-card"
      className="shadow-[0_8px_30px_-18px_rgba(15,23,42,0.85)]"
    >
      <CardHeader
        title="Market Context"
        subtitle="Trend · volatility · breadth · risk"
        icon={<Activity className="h-4 w-4" />}
        timestamp={`Updated ${formatUpdated(context.timestamp)} IST`}
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <StatusBadge tone={statusToneFromLabel(context.marketTrend)}>
          {context.marketTrend}
        </StatusBadge>
        <StatusBadge tone={statusToneFromLabel(context.riskMode)} size="sm">
          {context.riskMode}
        </StatusBadge>
        <p className="data-secondary">
          Score {Math.round(context.contextScore)} · Strength{" "}
          {Math.round(context.marketStrength)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <MetricTile
          label="Risk"
          value={risk.label}
          detail={context.riskMode}
          icon={ShieldAlert}
          tone={risk.tone}
        />
        <MetricTile
          label="Volatility"
          value={volatility.label}
          icon={Wind}
          tone={volatility.tone}
        />
        <MetricTile
          label="Breadth"
          value={breadth.label}
          detail={`${context.advanceCount}/${context.declineCount} A/D`}
          icon={Layers}
          tone={breadth.tone}
        />
        <MetricTile
          label="Momentum"
          value={momentum.label}
          detail={`${Math.round(context.momentum)}`}
          icon={TrendingUp}
          tone={momentum.tone}
        />
        <MetricTile
          label="Liquidity"
          value={liquidity.label}
          detail={`Vol stability ${Math.round(context.liquidity)}`}
          icon={Droplets}
          tone={liquidity.tone}
        />
        <MetricTile
          label="Participation"
          value={participation.label}
          detail={`Movers ${Math.round(context.institutionalParticipation)}%`}
          icon={Users}
          tone={participation.tone}
        />
        <MetricTile
          label="Sector Breadth"
          value={sectorBreadth.label}
          icon={
            Number(sectorBreadth.label) <= 45 ? TrendingDown : Waves
          }
          tone={sectorBreadth.tone}
        />
        <MetricTile
          label="A/D"
          value={`${context.advanceCount}/${context.declineCount}`}
          icon={Gauge}
          tone={{
            shell: "border-indigo-500/30 bg-gradient-to-br from-indigo-500/15 via-indigo-400/10 to-transparent shadow-[0_0_20px_-12px_rgba(99,102,241,0.5)]",
            icon: "text-indigo-400",
            value: "text-indigo-200",
          }}
        />
      </div>

      {(context.leadingSectors.length > 0 || context.weakSectors.length > 0) && (
        <div className="data-secondary mt-3 flex flex-wrap gap-3">
          {context.leadingSectors.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <Activity className="data-icon h-3.5 w-3.5 text-gain" />
              Lead: {context.leadingSectors.slice(0, 3).join(", ")}
            </span>
          )}
          {context.weakSectors.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <Waves className="data-icon h-3.5 w-3.5 text-loss" />
              Weak: {context.weakSectors.slice(0, 3).join(", ")}
            </span>
          )}
        </div>
      )}

      <p className="data-timestamp mt-2 flex items-center gap-1">
        <Gauge className="data-icon h-3.5 w-3.5" />
        Last updated {formatUpdated(context.timestamp)} IST
      </p>
    </Card>
  );
}
