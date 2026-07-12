"use client";

import { formatISTClock } from "@/lib/market/format";
import type { MarketStatus } from "@/lib/market/session";
import { getMarketStatusLabel } from "@/lib/market/session";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface MarketSessionIndicatorProps {
  marketStatus: MarketStatus | string;
  marketStatusLabel?: string;
  className?: string;
}

function statusTone(status: string): {
  text: string;
  dot: string;
  pulse: boolean;
} {
  switch (status) {
    case "open":
      return { text: "text-gain", dot: "bg-gain", pulse: true };
    case "pre_open":
      return { text: "text-accent", dot: "bg-accent", pulse: true };
    case "holiday":
      return { text: "text-text-muted", dot: "bg-text-faint", pulse: false };
    default:
      return { text: "text-text-muted", dot: "bg-text-faint", pulse: false };
  }
}

export function MarketSessionIndicator({
  marketStatus,
  marketStatusLabel,
  className,
}: MarketSessionIndicatorProps) {
  const [istTime, setIstTime] = useState(() => formatISTClock());

  useEffect(() => {
    const tick = () => {
      setIstTime(formatISTClock());
    };
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, []);

  const tone = statusTone(marketStatus);
  const label =
    marketStatusLabel ??
    getMarketStatusLabel(marketStatus as MarketStatus);

  return (
    <div className={cn("flex flex-col items-end gap-0.5 text-right", className)}>
      <div
        className={cn(
          "flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider",
          tone.text
        )}
      >
        <span className="relative flex h-2 w-2">
          {tone.pulse && (
            <span
              className={cn(
                "absolute inline-flex h-full w-full animate-ping rounded-full opacity-50",
                tone.dot
              )}
            />
          )}
          <span className={cn("relative inline-flex h-2 w-2 rounded-full", tone.dot)} />
        </span>
        {label}
      </div>
      <p className="font-mono text-[10px] text-text-muted tabular-nums">
        {istTime ?? "—"}
      </p>
    </div>
  );
}
