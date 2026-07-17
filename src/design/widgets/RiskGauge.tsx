import { GaugeChart } from "../charts/GaugeChart";
import { RISK_BANDS } from "../visualizations/gauge";

interface RiskGaugeProps {
  /** 0–100 risk score from the existing risk/validation engines. */
  score: number;
  size?: number;
  label?: string;
  className?: string;
}

/** Risk gauge with Low / Moderate / High / Extreme color bands. */
export function RiskGauge({
  score,
  size = 120,
  label = "Risk",
  className,
}: RiskGaugeProps) {
  return (
    <GaugeChart
      value={score}
      bands={RISK_BANDS}
      size={size}
      label={label}
      className={className}
    />
  );
}
