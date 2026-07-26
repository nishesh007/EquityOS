"use client";

import { useCallback, useMemo, useRef, useState } from "react";

const DEFAULT_ROW_HEIGHT = 44;
const DEFAULT_VIEWPORT = 480;
const DEFAULT_OVERSCAN = 8;
const DEFAULT_THRESHOLD = 40;

/**
 * Windowed index range for long tables — prevents rendering hundreds of rows.
 */
export function usePaperTableWindow(
  length: number,
  options?: {
    rowHeight?: number;
    viewportHeight?: number;
    overscan?: number;
    threshold?: number;
  }
) {
  const rowHeight = options?.rowHeight ?? DEFAULT_ROW_HEIGHT;
  const viewportHeight = options?.viewportHeight ?? DEFAULT_VIEWPORT;
  const overscan = options?.overscan ?? DEFAULT_OVERSCAN;
  const threshold = options?.threshold ?? DEFAULT_THRESHOLD;

  const [scrollTop, setScrollTop] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const enabled = length > threshold;

  const onScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setScrollTop(el.scrollTop);
  }, []);

  const range = useMemo(() => {
    if (!enabled) {
      return {
        start: 0,
        end: length,
        padTop: 0,
        padBottom: 0,
        enabled: false as const,
      };
    }
    const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const visible = Math.ceil(viewportHeight / rowHeight) + overscan * 2;
    const end = Math.min(length, start + visible);
    return {
      start,
      end,
      padTop: start * rowHeight,
      padBottom: Math.max(0, (length - end) * rowHeight),
      enabled: true as const,
    };
  }, [enabled, length, overscan, rowHeight, scrollTop, viewportHeight]);

  return {
    scrollerRef,
    onScroll,
    style: enabled
      ? ({ maxHeight: viewportHeight, overflow: "auto" } as const)
      : undefined,
    ...range,
  };
}
