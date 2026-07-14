"use client";

import type { ReportViewerTocItem } from "@/lib/dashboard/institutional-report-viewer";

export function ReportTableOfContents({
  items,
  activeId,
  onNavigate,
}: {
  items: ReportViewerTocItem[];
  activeId?: string;
  onNavigate: (id: string) => void;
}) {
  return (
    <nav
      className="space-y-0.5"
      data-testid="report-table-of-contents"
      aria-label="Report table of contents"
    >
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-text-faint">
        Contents
      </p>
      {items.map((item) => {
        const active = activeId === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.id)}
            className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-[11px] transition ${
              active
                ? "bg-accent/10 font-semibold text-accent"
                : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
            }`}
            data-toc-id={item.id}
          >
            <span className={item.locked ? "opacity-60" : ""}>{item.label}</span>
            {item.locked ? (
              <span className="text-[9px] font-medium uppercase tracking-wider text-amber-600">
                Locked
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}
