import { cn } from "@/lib/utils";

export type PortfolioGaugeMode = "health" | "risk" | "neutral";

interface PortfolioGaugeProps {
  score: number;
  label?: string;
  verdict?: string;
  mode?: PortfolioGaugeMode;
  size?: number;
  className?: string;
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function healthVerdict(score: number): string {
  if (score >= 80) return "Excellent Portfolio";
  if (score >= 65) return "Healthy Portfolio";
  if (score >= 50) return "Needs Improvement";
  if (score >= 35) return "Weak Portfolio";
  return "High Risk Portfolio";
}

function riskVerdict(score: number): string {
  if (score <= 20) return "Very Low Risk";
  if (score <= 40) return "Low Risk";
  if (score <= 60) return "Moderate Risk";
  if (score <= 80) return "High Risk";
  return "Very High Risk";
}

function healthColor(score: number): string {
  if (score >= 65) return "#22c55e";
  if (score >= 50) return "#eab308";
  if (score >= 35) return "#f97316";
  return "#ef4444";
}

function riskColor(score: number): string {
  if (score <= 20) return "#22c55e";
  if (score <= 40) return "#84cc16";
  if (score <= 60) return "#eab308";
  if (score <= 80) return "#f97316";
  return "#ef4444";
}

function neutralColor(score: number): string {
  if (score >= 70) return "#22c55e";
  if (score >= 50) return "#eab308";
  return "#ef4444";
}

/**
 * Portfolio-specific gauge — never shows stock recommendation language.
 * Server-safe (no hooks).
 */
export function PortfolioGauge({
  score,
  label = "Score",
  verdict,
  mode = "health",
  size = 132,
  className,
}: PortfolioGaugeProps) {
  const clamped = clampScore(score);
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  const center = size / 2;

  const color =
    mode === "risk" ? riskColor(clamped) : mode === "neutral" ? neutralColor(clamped) : healthColor(clamped);

  const displayVerdict =
    verdict ??
    (mode === "risk" ? riskVerdict(clamped) : mode === "health" ? healthVerdict(clamped) : String(clamped));

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
        <span
          className="max-w-[180px] text-center text-sm font-semibold leading-tight"
          style={{ color }}
        >
          {displayVerdict}
        </span>
        <span className="mt-0.5 text-[10px] uppercase tracking-wider text-text-faint">
          {label}
        </span>
      </div>
    </div>
  );
}

export { healthVerdict, riskVerdict, clampScore as clampPortfolioScore };
