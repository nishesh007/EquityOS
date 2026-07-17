/**
 * Gauge geometry and band classification for conviction and risk gauges.
 * Pure presentation math — the score itself always comes from existing
 * engines; this module only decides how to draw it.
 */

export interface GaugeBand {
  id: string;
  label: string;
  /** Inclusive lower bound (0–100 scale). */
  from: number;
  /** Exclusive upper bound, except the final band which is inclusive. */
  to: number;
  /** Semantic tone consumed by components for coloring. */
  tone: "success" | "accent" | "info" | "warning" | "danger";
}

/** Institutional conviction bands. */
export const CONVICTION_BANDS: readonly GaugeBand[] = Object.freeze([
  { id: "weak", label: "Weak", from: 0, to: 40, tone: "danger" },
  { id: "average", label: "Average", from: 40, to: 55, tone: "warning" },
  { id: "good", label: "Good", from: 55, to: 70, tone: "info" },
  { id: "strong", label: "Strong", from: 70, to: 85, tone: "accent" },
  { id: "excellent", label: "Excellent", from: 85, to: 100, tone: "success" },
]);

/** Institutional risk bands. */
export const RISK_BANDS: readonly GaugeBand[] = Object.freeze([
  { id: "low", label: "Low", from: 0, to: 30, tone: "success" },
  { id: "moderate", label: "Moderate", from: 30, to: 55, tone: "info" },
  { id: "high", label: "High", from: 55, to: 80, tone: "warning" },
  { id: "extreme", label: "Extreme", from: 80, to: 100, tone: "danger" },
]);

/** Gauge sweep: 220° arc opening downward (institutional dial). */
export const GAUGE_START_ANGLE = -110;
export const GAUGE_END_ANGLE = 110;
export const GAUGE_SWEEP = GAUGE_END_ANGLE - GAUGE_START_ANGLE;

export interface GaugeRender {
  /** Clamped value on the 0–100 scale. */
  value: number;
  /** Needle rotation in degrees (GAUGE_START..GAUGE_END). */
  needleAngle: number;
  /** Fraction of the sweep covered, 0–1. */
  fraction: number;
  /** Matched band. */
  band: GaugeBand;
  /** Band segments with their start/end angles for drawing color bands. */
  segments: readonly (GaugeBand & { startAngle: number; endAngle: number })[];
}

/** Classify a 0–100 value into a band set. */
export function classifyBand(value: number, bands: readonly GaugeBand[]): GaugeBand {
  const clamped = clamp(value);
  const match = bands.find(
    (band, index) =>
      clamped >= band.from &&
      (index === bands.length - 1 ? clamped <= band.to : clamped < band.to),
  );
  // Bands are contiguous over [0,100]; fall back defensively to the last.
  return match ?? bands[bands.length - 1];
}

/** Public API — compute gauge geometry for a 0–100 value. */
export function renderGauge(
  value: number,
  bands: readonly GaugeBand[] = CONVICTION_BANDS,
): GaugeRender {
  const clamped = clamp(value);
  const fraction = clamped / 100;
  const needleAngle = round2(GAUGE_START_ANGLE + fraction * GAUGE_SWEEP);
  const segments = bands.map((band) =>
    Object.freeze({
      ...band,
      startAngle: round2(GAUGE_START_ANGLE + (band.from / 100) * GAUGE_SWEEP),
      endAngle: round2(GAUGE_START_ANGLE + (band.to / 100) * GAUGE_SWEEP),
    }),
  );
  return Object.freeze({
    value: clamped,
    needleAngle,
    fraction: round2(fraction),
    band: classifyBand(clamped, bands),
    segments: Object.freeze(segments),
  });
}

/** SVG arc path for a circle segment (used by gauge band rendering). */
export function describeArc(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
): string {
  const start = polarToCartesian(cx, cy, radius, startAngle);
  const end = polarToCartesian(cx, cy, radius, endAngle);
  const largeArc = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  // 0° points up; positive angles rotate clockwise.
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: round2(cx + radius * Math.cos(angleRad + Math.PI / 2)),
    y: round2(cy + radius * Math.sin(angleRad + Math.PI / 2)),
  };
}

function clamp(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
