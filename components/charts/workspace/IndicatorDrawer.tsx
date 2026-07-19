"use client";

import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, GripVertical, SlidersHorizontal } from "lucide-react";
import type { IndicatorConfig } from "./types";

interface IndicatorDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  indicators: IndicatorConfig[];
  onChange: (next: IndicatorConfig[]) => void;
}

export function IndicatorDrawer({
  open,
  onOpenChange,
  indicators,
  onChange,
}: IndicatorDrawerProps) {
  const ordered = [...indicators].sort((a, b) => a.order - b.order);

  const move = (id: string, dir: -1 | 1) => {
    const list = [...ordered];
    const index = list.findIndex((i) => i.id === id);
    const target = index + dir;
    if (index < 0 || target < 0 || target >= list.length) return;
    const tmp = list[index];
    list[index] = list[target];
    list[target] = tmp;
    onChange(list.map((item, order) => ({ ...item, order })));
  };

  return (
    <div className="rounded-xl border border-surface-border bg-card">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left"
      >
        <span className="inline-flex items-center gap-2 text-[12px] font-semibold text-text-primary">
          <SlidersHorizontal className="h-3.5 w-3.5 text-accent" />
          Indicators
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-text-muted" />
        ) : (
          <ChevronDown className="h-4 w-4 text-text-muted" />
        )}
      </button>
      {open ? (
        <div className="max-h-64 space-y-1 overflow-y-auto border-t border-surface-border-subtle px-2 py-2">
          {ordered.map((indicator) => (
            <div
              key={indicator.id}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-hover/60"
            >
              <GripVertical className="h-3 w-3 shrink-0 text-text-faint" />
              <input
                type="checkbox"
                checked={indicator.enabled}
                aria-label={`Toggle ${indicator.label}`}
                onChange={(event) =>
                  onChange(
                    indicators.map((item) =>
                      item.id === indicator.id
                        ? { ...item, enabled: event.target.checked }
                        : item
                    )
                  )
                }
                className="rounded border-surface-border"
              />
              <span className="min-w-0 flex-1 truncate text-[11px] text-text-secondary">
                {indicator.label}
              </span>
              <input
                type="color"
                value={indicator.color}
                aria-label={`Color for ${indicator.label}`}
                onChange={(event) =>
                  onChange(
                    indicators.map((item) =>
                      item.id === indicator.id
                        ? { ...item, color: event.target.value }
                        : item
                    )
                  )
                }
                className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent"
              />
              <button
                type="button"
                aria-label={`Move ${indicator.label} up`}
                onClick={() => move(indicator.id, -1)}
                className={cn(
                  "rounded p-0.5 text-text-faint hover:text-text-primary"
                )}
              >
                <ChevronUp className="h-3 w-3" />
              </button>
              <button
                type="button"
                aria-label={`Move ${indicator.label} down`}
                onClick={() => move(indicator.id, 1)}
                className="rounded p-0.5 text-text-faint hover:text-text-primary"
              >
                <ChevronDown className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
