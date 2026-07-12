import { cn } from "@/lib/utils";
import type { ScoreTone } from "@/types";

interface IntelligenceProgressProps {
  value: number;
  tone: ScoreTone;
  className?: string;
  showValue?: boolean;
}

const toneStyles: Record<ScoreTone, { bar: string; text: string; background: string }> = {
  gain: {
    bar: "bg-gain",
    text: "text-gain",
    background: "bg-gain/10",
  },
  accent: {
    bar: "bg-accent",
    text: "text-accent",
    background: "bg-accent/10",
  },
  loss: {
    bar: "bg-loss",
    text: "text-loss",
    background: "bg-loss/10",
  },
};

export function IntelligenceProgress({
  value,
  tone,
  className,
  showValue = true,
}: IntelligenceProgressProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const styles = toneStyles[tone];

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className={cn("h-1.5 flex-1 overflow-hidden rounded-full", styles.background)}>
        <div
          className={cn(
            "h-full origin-left rounded-full transition-[width] duration-1000 ease-out",
            styles.bar
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showValue && (
        <span className={cn("w-7 text-right font-mono text-xs font-semibold tabular-nums", styles.text)}>
          {clamped}
        </span>
      )}
    </div>
  );
}

export const intelligenceToneText: Record<ScoreTone, string> = {
  gain: "text-gain",
  accent: "text-accent",
  loss: "text-loss",
};
