import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ComponentType } from "react";
import {
  RESEARCH_CARD_TONES,
  type ResearchCardTone,
} from "@/components/company/research-cards/tones";

export interface ResearchMetricCardProps {
  title: string;
  value: string;
  verdict: string;
  tone?: ResearchCardTone;
  icon: LucideIcon | ComponentType<{ className?: string }>;
  className?: string;
}

/**
 * Compact colorful research summary card — informational only (not clickable).
 */
export function ResearchMetricCard({
  title,
  value,
  verdict,
  tone = "neutral",
  icon: Icon,
  className,
}: ResearchMetricCardProps) {
  const tokens = RESEARCH_CARD_TONES[tone];

  return (
    <div
      className={cn(
        "relative flex min-h-[108px] flex-col items-start rounded-xl border p-3",
        tokens.gradient,
        tokens.border,
        tokens.glow,
        className
      )}
    >
      <div className="flex w-full items-start justify-between gap-2">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg ring-1",
            tokens.iconBg,
            tokens.icon
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <span
          className={cn(
            "rounded-md border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
            tokens.badge
          )}
        >
          {verdict}
        </span>
      </div>

      <p className="mt-2.5 text-[10px] font-medium uppercase tracking-wider text-text-muted">
        {title}
      </p>
      <p
        className={cn(
          "mt-0.5 font-mono text-base font-semibold tabular-nums leading-tight",
          tokens.value
        )}
      >
        {value}
      </p>
    </div>
  );
}
