"use client";

import { cn } from "@/lib/utils";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
  positive?: boolean;
}

export function Sparkline({
  data,
  width = 80,
  height = 28,
  className,
  positive = true,
}: SparklineProps) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((value, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  const color = positive ? "#22c55e" : "#ef4444";

  return (
    <svg
      width={width}
      height={height}
      className={cn("flex-shrink-0", className)}
      viewBox={`0 0 ${width} ${height}`}
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.8}
      />
    </svg>
  );
}
