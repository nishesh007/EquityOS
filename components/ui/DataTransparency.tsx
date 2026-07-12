import { freshnessLabel } from "@/lib/engine/data-transparency";
import { cn } from "@/lib/utils";
import type { DataTransparency } from "@/types";
import { Clock, Database, Radio } from "lucide-react";

interface DataTransparencyProps {
  transparency: DataTransparency;
  className?: string;
  compact?: boolean;
}

const freshnessStyles = {
  live: "text-gain border-gain/20 bg-gain-bg",
  delayed: "text-accent border-accent/20 bg-accent/10",
  mock: "text-text-muted border-surface-border-subtle bg-surface-overlay/30",
};

export function DataTransparencyBar({
  transparency,
  className,
  compact = false,
}: DataTransparencyProps) {
  const freshness = freshnessLabel(transparency.freshness);
  const style = freshnessStyles[transparency.freshness];

  if (compact) {
    return (
      <div
        className={cn(
          "flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-text-faint",
          className
        )}
      >
        <span className={cn("rounded px-1.5 py-0.5 font-medium uppercase tracking-wider", style)}>
          {freshness}
        </span>
        <span>{transparency.provider}</span>
        <span>{transparency.cacheAge}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-surface-border-subtle bg-surface-overlay/20 px-3 py-2",
        className
      )}
    >
      <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
        <Database className="h-3 w-3" />
        <span>{transparency.dataSource}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Radio className="h-3 w-3 text-text-faint" />
        <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider", style)}>
          {freshness}
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
        <span className="text-text-faint">Provider</span>
        <span className="font-medium text-text-secondary">{transparency.provider}</span>
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
        <Clock className="h-3 w-3" />
        <span>{transparency.lastUpdated}</span>
        <span className="text-text-faint">({transparency.cacheAge})</span>
      </div>
    </div>
  );
}
