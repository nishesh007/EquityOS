"use client";

import { Info } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { MetricTooltipMeta } from "@/lib/dashboard/institutional-exposure";

/** Structured institutional metric tooltip (description, calculation, meaning, range, updated). */
export function InstitutionalMetricTooltip({
  meta,
}: {
  meta: MetricTooltipMeta;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="relative inline-flex" ref={ref}>
      <button
        type="button"
        aria-label="Metric information"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((value) => !value);
        }}
        className="rounded p-0.5 text-text-faint transition hover:bg-surface-hover hover:text-text-secondary"
      >
        <Info className="h-3 w-3" />
      </button>
      {open ? (
        <div className="absolute left-0 top-5 z-40 w-72 rounded-lg border border-surface-border bg-surface-raised p-2.5 text-[11px] leading-relaxed text-text-secondary shadow-lg">
          <p className="mb-1.5 font-medium text-text-primary">Description</p>
          <p className="mb-2">{meta.description}</p>
          <p className="mb-1 font-medium text-text-primary">Calculation</p>
          <p className="mb-2">{meta.calculation}</p>
          <p className="mb-1 font-medium text-text-primary">Meaning</p>
          <p className="mb-2">{meta.meaning}</p>
          <p className="mb-1 font-medium text-text-primary">Healthy Range</p>
          <p className="mb-2">{meta.healthyRange}</p>
          <p className="mb-1 font-medium text-text-primary">Last Updated</p>
          <p>{meta.lastUpdated}</p>
        </div>
      ) : null}
    </div>
  );
}
