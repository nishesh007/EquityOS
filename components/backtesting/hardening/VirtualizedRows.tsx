"use client";

import { useMemo, useRef, useState, type ReactNode, type UIEvent } from "react";
import { cn } from "@/lib/utils";

const DEFAULT_ROW_HEIGHT = 40;
const OVERSCAN = 6;

/**
 * Lightweight windowed list for large backtesting tables (no extra deps).
 * Renders only visible rows for scroll performance.
 */
export function VirtualizedRows<T>({
  items,
  rowHeight = DEFAULT_ROW_HEIGHT,
  maxHeight = 360,
  keyExtractor,
  renderRow,
  className,
  emptyFallback,
  labelledBy,
}: {
  items: readonly T[];
  rowHeight?: number;
  maxHeight?: number;
  keyExtractor: (item: T, index: number) => string;
  renderRow: (item: T, index: number) => ReactNode;
  className?: string;
  emptyFallback?: ReactNode;
  labelledBy?: string;
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const totalHeight = items.length * rowHeight;
  const visibleCount = Math.ceil(maxHeight / rowHeight) + OVERSCAN * 2;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - OVERSCAN);
  const endIndex = Math.min(items.length, startIndex + visibleCount);
  const offsetY = startIndex * rowHeight;

  const windowed = useMemo(
    () => items.slice(startIndex, endIndex),
    [items, startIndex, endIndex]
  );

  function onScroll(e: UIEvent<HTMLDivElement>) {
    setScrollTop(e.currentTarget.scrollTop);
  }

  if (items.length === 0) {
    return <>{emptyFallback ?? null}</>;
  }

  return (
    <div
      ref={ref}
      className={cn("overflow-auto rounded-lg border border-surface-border-subtle", className)}
      style={{ maxHeight }}
      onScroll={onScroll}
      role="list"
      aria-labelledby={labelledBy}
      data-testid="virtualized-rows"
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {windowed.map((item, i) => {
            const index = startIndex + i;
            return (
              <div
                key={keyExtractor(item, index)}
                role="listitem"
                style={{ height: rowHeight }}
                className="border-b border-surface-border-subtle/60 px-3"
              >
                {renderRow(item, index)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
