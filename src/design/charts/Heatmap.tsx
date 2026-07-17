import { cn } from "@/lib/utils";
import { renderHeatmap, type HeatmapCellInput } from "../visualizations/heatmap";

interface HeatmapProps {
  cells: readonly HeatmapCellInput[];
  /** Fixed domain, e.g. [-3, 3] for daily % change. */
  domain?: [number, number];
  columns?: 2 | 3 | 4 | 5 | 6;
  className?: string;
}

const COLUMN_CLASSES = {
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-4",
  5: "grid-cols-3 sm:grid-cols-5",
  6: "grid-cols-3 sm:grid-cols-6",
} as const;

/** Reusable heatmap grid — sectors, portfolio, market, recommendations. */
export function Heatmap({ cells, domain, columns = 4, className }: HeatmapProps) {
  const render = renderHeatmap(cells, { domain });
  if (render.empty) return null;

  return (
    <div
      role="img"
      aria-label={`Heatmap of ${render.cells.length} items`}
      className={cn("grid gap-1.5", COLUMN_CLASSES[columns], className)}
    >
      {render.cells.map((cell) => (
        <div
          key={cell.id}
          title={`${cell.label}: ${cell.display ?? cell.value}`}
          className="rounded-md border border-surface-border-subtle p-2"
          style={{
            backgroundColor: cell.color,
            // Blend intensity into opacity so mid-range cells stay readable.
            opacity: 0.35 + cell.intensity * 0.45,
          }}
        >
          <p className="truncate text-[10px] font-medium uppercase tracking-wide text-text-primary">
            {cell.label}
          </p>
          <p className="mt-0.5 font-mono text-xs font-semibold tabular-nums text-text-primary">
            {cell.display ?? cell.value}
          </p>
        </div>
      ))}
    </div>
  );
}
