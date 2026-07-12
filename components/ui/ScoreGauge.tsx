import { cn } from "@/lib/utils";

interface ScoreGaugeProps {
  score: number;
  label?: string;
  size?: number;
  className?: string;
}

function scoreColor(score: number): string {
  if (score >= 60) return "#22c55e";
  if (score >= 45) return "#eab308";
  return "#ef4444";
}

function scoreVerdict(score: number): string {
  if (score >= 75) return "Strong Buy";
  if (score >= 60) return "Buy";
  if (score >= 45) return "Neutral";
  if (score >= 30) return "Weak";
  return "Avoid";
}

/**
 * Radial 0–100 score gauge rendered as an SVG arc. Server-safe (no hooks).
 */
export function ScoreGauge({
  score,
  label = "Score",
  size = 132,
  className,
}: ScoreGaugeProps) {
  const clamped = Math.max(0, Math.min(100, score));
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = Math.PI * radius; // semicircle
  const offset = circumference * (1 - clamped / 100);
  const color = scoreColor(clamped);
  const center = size / 2;

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="relative" style={{ width: size, height: size / 2 + 14 }}>
        <svg
          width={size}
          height={size / 2 + 14}
          viewBox={`0 0 ${size} ${size / 2 + 14}`}
        >
          <path
            d={`M ${stroke / 2} ${center} A ${radius} ${radius} 0 0 1 ${
              size - stroke / 2
            } ${center}`}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={stroke}
            strokeLinecap="round"
          />
          <path
            d={`M ${stroke / 2} ${center} A ${radius} ${radius} 0 0 1 ${
              size - stroke / 2
            } ${center}`}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: "stroke-dashoffset 0.9s cubic-bezier(0.4,0,0.2,1)",
              filter: `drop-shadow(0 0 6px ${color}55)`,
            }}
          />
        </svg>
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
          <span
            className="font-mono text-3xl font-bold tabular-nums leading-none"
            style={{ color }}
          >
            {clamped}
          </span>
          <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-text-faint">
            / 100
          </span>
        </div>
      </div>
      <div className="mt-1 flex flex-col items-center">
        <span className="text-sm font-semibold" style={{ color }}>
          {scoreVerdict(clamped)}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-text-faint">
          {label}
        </span>
      </div>
    </div>
  );
}
