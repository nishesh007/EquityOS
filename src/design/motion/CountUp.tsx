"use client";

/**
 * Sprint 10C.R5 — animated numeric count-up for KPI metrics.
 * Respects reduced motion (renders the final value immediately).
 */

import { useEffect, useRef, useState } from "react";
import { DURATIONS_MS, EASINGS } from "../theme/animationTokens";

interface CountUpProps {
  value: number;
  /** Pre-format the animated value (defaults to en-IN locale). */
  format?: (value: number) => string;
  durationMs?: number;
  className?: string;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function CountUp({
  value,
  format = (v) => v.toLocaleString("en-IN", { maximumFractionDigits: 2 }),
  durationMs = DURATIONS_MS.slower,
  className,
}: CountUpProps) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);

  useEffect(() => {
    const reduced =
      typeof document !== "undefined" &&
      document.documentElement.dataset.motion === "reduced";
    if (reduced || durationMs <= 0) {
      fromRef.current = value;
      setDisplay(value);
      return;
    }
    const from = fromRef.current;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      setDisplay(from + (value - from) * easeOutCubic(progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
      else fromRef.current = value;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs]);

  return (
    <span
      className={className}
      style={{ transitionTimingFunction: EASINGS.standard }}
      aria-live="polite"
    >
      {format(display)}
    </span>
  );
}
