"use client";

import type { ExecutiveStatusItem } from "@/lib/dashboard/institutional-executive-presentation";

export function ExecutiveStatusStrip({
  items,
}: {
  items: ExecutiveStatusItem[];
}) {
  return (
    <div
      className="flex flex-wrap gap-2"
      data-testid="executive-status-strip"
    >
      {items.map((item) => (
        <div
          key={item.id}
          data-testid={`executive-status-${item.id}`}
          className="inline-flex items-center gap-2 rounded-md border border-surface-border-subtle/70 bg-surface-raised/40 px-2.5 py-1.5"
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              item.status === "Healthy"
                ? "bg-gain"
                : item.status === "Warning"
                  ? "bg-amber-500"
                  : item.status === "Offline"
                    ? "bg-loss"
                    : "bg-text-faint"
            }`}
          />
          <span className="text-[10px] font-medium text-text-secondary">
            {item.label}
          </span>
          <span className={`text-[10px] font-semibold ${item.toneClass}`}>
            {item.status}
          </span>
        </div>
      ))}
    </div>
  );
}
