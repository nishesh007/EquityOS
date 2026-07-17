import { GaugeChart } from "../charts/GaugeChart";
import { CONVICTION_BANDS } from "../visualizations/gauge";

interface ConvictionMeterProps {
  /** 0–100 conviction score from the existing recommendation engine. */
  score: number;
  size?: number;
  label?: string;
  className?: string;
}

/** Circular institutional conviction gauge with confidence bands. */
export function ConvictionMeter({
  score,
  size = 120,
  label = "Conviction",
  className,
}: ConvictionMeterProps) {
  return (
    <GaugeChart
      value={score}
      bands={CONVICTION_BANDS}
      size={size}
      label={label}
      className={className}
    />
  );
}
