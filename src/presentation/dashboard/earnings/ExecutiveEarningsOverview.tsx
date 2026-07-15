"use client";

import type { ExecutiveEarningsOverviewItem } from "@/lib/dashboard/executive-earnings-presentation";
import { ExecutiveEmptyState } from "@/src/presentation/dashboard/earnings/ExecutiveEmptyState";

export function ExecutiveEarningsOverview({
  items,
  empty = false,
  emptyMessage = "",
}: {
  items: ExecutiveEarningsOverviewItem[];
  empty?: boolean;
  emptyMessage?: string;
}) {
  if (empty && items.every((i) => i.value === "—" || Number(i.value) === 0)) {
    return <ExecutiveEmptyState message={emptyMessage} />;
  }

  return (
    <div data-testid="executive-earnings-overview">
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-text-faint">
        Executive Overview
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {items.map((item) => (
          <div
            key={item.id}
            data-testid={`executive-earnings-overview-${item.id}`}
            className="rounded-md border border-surface-border-subtle/70 bg-surface-raised/40 px-2.5 py-2"
          >
            <p className="text-[9px] font-medium uppercase tracking-wider text-text-faint">
              {item.label}
            </p>
            <p
              className={`mt-0.5 text-sm font-semibold tabular-nums ${item.toneClass}`}
            >
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
