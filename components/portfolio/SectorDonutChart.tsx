import { cn } from "@/lib/utils";
import type { SectorAllocationItem } from "@/types";
import { SECTOR_COLORS } from "@/lib/engine/calculators/portfolio-doctor";

interface SectorDonutChartProps {
  sectors: SectorAllocationItem[];
  className?: string;
}

function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleDeg: number
): { x: number; y: number } {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  };
}

function describeArc(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

/**
 * SVG donut chart for sector allocation. Server-safe (no hooks).
 */
export function SectorDonutChart({ sectors, className }: SectorDonutChartProps) {
  const active = sectors.filter((s) => s.currentPercent > 0);
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 72;
  const innerR = 48;
  const stroke = 22;

  let currentAngle = 0;
  const segments = active.map((sector, index) => {
    const sweep = (sector.currentPercent / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sweep;
    currentAngle = endAngle;
    const color = SECTOR_COLORS[index % SECTOR_COLORS.length];
    const midAngle = startAngle + sweep / 2;
    const labelPos = polarToCartesian(cx, cy, outerR + 4, midAngle);

    return {
      sector,
      color,
      startAngle,
      endAngle: Math.min(endAngle, 359.99),
      labelPos,
      showLabel: sweep > 18,
    };
  });

  return (
    <div className={cn("flex flex-col items-center gap-4 lg:flex-row lg:items-start lg:gap-8", className)}>
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={cx}
            cy={cy}
            r={outerR}
            fill="none"
            stroke="rgba(255,255,255,0.04)"
            strokeWidth={stroke}
          />
          {segments.map((seg) => (
            <path
              key={seg.sector.sector}
              d={describeArc(cx, cy, outerR, seg.startAngle, seg.endAngle)}
              fill="none"
              stroke={seg.color}
              strokeWidth={stroke}
              strokeLinecap="butt"
              style={{ filter: `drop-shadow(0 0 4px ${seg.color}44)` }}
            />
          ))}
          <circle cx={cx} cy={cy} r={innerR} fill="var(--surface-overlay, rgba(0,0,0,0.3))" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-2xl font-bold tabular-nums text-text-primary">
            {active.length}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-text-faint">Sectors</span>
        </div>
      </div>

      <div className="w-full flex-1 space-y-2">
        {active.map((sector, index) => {
          const color = SECTOR_COLORS[index % SECTOR_COLORS.length];
          return (
            <div
              key={sector.sector}
              className="rounded-lg border border-surface-border-subtle bg-surface-overlay/30 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs font-medium text-text-primary">{sector.sector}</span>
                </div>
                <span className="font-mono text-sm font-semibold tabular-nums text-text-primary">
                  {sector.currentPercent}%
                </span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
                <div>
                  <span className="text-text-faint">Ideal </span>
                  <span className="font-mono tabular-nums text-text-muted">
                    {sector.idealPercent}%
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-text-faint">Diff </span>
                  <span
                    className={cn(
                      "font-mono tabular-nums",
                      sector.difference > 5
                        ? "text-loss"
                        : sector.difference < -5
                          ? "text-accent"
                          : "text-gain"
                    )}
                  >
                    {sector.difference > 0 ? "+" : ""}
                    {sector.difference}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
