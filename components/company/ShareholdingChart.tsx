import type { ShareholdingPattern } from "@/types";
import { cn } from "@/lib/utils";

interface ShareholdingChartProps {
  shareholding: ShareholdingPattern;
}

const segments = [
  { key: "promoter" as const, label: "Promoter", color: "bg-accent" },
  { key: "fii" as const, label: "FII", color: "bg-gain" },
  { key: "dii" as const, label: "DII", color: "bg-amber-500" },
  { key: "public" as const, label: "Public", color: "bg-text-muted" },
];

export function ShareholdingChart({ shareholding }: ShareholdingChartProps) {
  return (
    <div className="space-y-4">
      <div className="flex h-4 w-full overflow-hidden rounded-full">
        {segments.map((seg) => {
          const value = shareholding[seg.key];
          if (value <= 0) return null;
          return (
            <div
              key={seg.key}
              className={cn(seg.color, "transition-all")}
              style={{ width: `${value}%` }}
              title={`${seg.label}: ${value}%`}
            />
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {segments.map((seg) => (
          <div
            key={seg.key}
            className="rounded-lg border border-surface-border-subtle bg-surface-overlay/40 p-3"
          >
            <div className="flex items-center gap-2">
              <span className={cn("h-2 w-2 rounded-full", seg.color)} />
              <span className="text-xs text-text-muted">{seg.label}</span>
            </div>
            <p className="mt-1 text-lg font-semibold font-mono text-text-primary tabular-nums">
              {shareholding[seg.key]}%
            </p>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-text-faint">
        Last updated: {shareholding.lastUpdated}
      </p>
    </div>
  );
}
