"use client";

/**
 * Sprint 10C.R4 — professional cell rendering for institutional tables.
 * Presentation only: maps a raw value + cell kind to premium visuals
 * (badges, pills, trend arrows, sparklines, progress, gauges).
 */

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sparkline } from "@/src/design/charts/Sparkline";
import { ProgressBar, ProgressRing } from "@/src/design/charts/Progress";
import type { CellKind } from "@/src/design/tables/tableEngine";
import {
  CELL_TONE_PILL_CLASS,
  CELL_TONE_TEXT_CLASS,
  renderCell,
  type RenderCellOptions,
} from "./cellFormatters";

interface CellRendererProps {
  kind: CellKind;
  value: unknown;
  options?: RenderCellOptions;
  className?: string;
}

/** Renders one table cell value according to its kind. */
export function CellRenderer({ kind, value, options, className }: CellRendererProps) {
  if (kind === "sparkline") {
    const data = Array.isArray(value) ? (value as number[]) : [];
    if (data.length < 2) {
      return <span className="text-text-faint">—</span>;
    }
    return <Sparkline data={data} width={80} height={22} className={className} />;
  }

  if (kind === "progress") {
    const rendered = renderCell("number", value);
    const percent = Number(value);
    if (!Number.isFinite(percent)) {
      return <span className="text-text-faint">—</span>;
    }
    return (
      <ProgressBar
        percent={percent}
        className={cn("min-w-[72px]", className)}
        valueText={`${rendered.text}%`}
      />
    );
  }

  if (kind === "gauge") {
    const percent = Number(value);
    if (!Number.isFinite(percent)) {
      return <span className="text-text-faint">—</span>;
    }
    return <ProgressRing percent={percent} size={34} className={className} />;
  }

  const rendered = renderCell(kind, value, options);

  if (kind === "status" || kind === "badge" || kind === "risk") {
    if (rendered.text === "—") {
      return <span className="text-text-faint">—</span>;
    }
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
          CELL_TONE_PILL_CLASS[rendered.tone],
          className
        )}
      >
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 rounded-full bg-current opacity-80"
        />
        {rendered.text}
      </span>
    );
  }

  if (kind === "tag") {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-md border border-surface-border bg-surface-raised px-1.5 py-0.5 text-[11px] text-text-secondary",
          className
        )}
      >
        {rendered.text}
      </span>
    );
  }

  const numeric = rendered.align === "right";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1",
        numeric && "font-mono tabular-nums",
        rendered.tone === "neutral" && numeric && kind === "price"
          ? "text-text-primary"
          : CELL_TONE_TEXT_CLASS[rendered.tone],
        className
      )}
    >
      {rendered.arrow === "up" && (
        <ArrowUpRight aria-hidden="true" className="h-3 w-3" />
      )}
      {rendered.arrow === "down" && (
        <ArrowDownRight aria-hidden="true" className="h-3 w-3" />
      )}
      {rendered.text}
    </span>
  );
}
