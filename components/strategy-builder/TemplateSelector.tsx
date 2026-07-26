"use client";

import { memo } from "react";
import { Card } from "@/components/ui/Card";
import type { StrategyTemplate } from "@/lib/strategy-builder";
import { cn } from "@/lib/utils";

export const TemplateSelector = memo(function TemplateSelector({
  templates,
  selectedId,
  onSelect,
  onApply,
}: {
  templates: readonly StrategyTemplate[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onApply: (id: string) => void;
}) {
  return (
    <Card padding="md" data-testid="template-selector">
      <h2 className="text-base font-semibold text-text-primary">
        Strategy Templates
      </h2>
      <p className="mt-1 text-sm text-text-secondary">
        Start from an editable institutional template.
      </p>
      <div
        className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5"
        role="listbox"
        aria-label="Strategy templates"
      >
        {templates.map((t) => {
          const selected = selectedId === t.id;
          return (
            <div
              key={t.id}
              role="option"
              aria-selected={selected}
              className={cn(
                "flex flex-col rounded-xl border p-3",
                selected
                  ? "border-accent bg-accent/10"
                  : "border-surface-border-subtle bg-surface-overlay/30"
              )}
            >
              <button
                type="button"
                className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                onClick={() => onSelect(t.id)}
              >
                <div className="text-xs font-medium uppercase tracking-wide text-text-faint">
                  {t.category}
                </div>
                <div className="mt-1 text-sm font-semibold text-text-primary">
                  {t.name}
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-text-secondary">
                  {t.description}
                </p>
              </button>
              <button
                type="button"
                className="mt-3 rounded-lg border border-surface-border-subtle px-2 py-1 text-xs font-medium text-text-secondary hover:bg-surface-raised"
                onClick={() => onApply(t.id)}
              >
                Apply template
              </button>
            </div>
          );
        })}
      </div>
    </Card>
  );
});
