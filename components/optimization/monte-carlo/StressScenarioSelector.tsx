"use client";

import { memo } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import {
  STRESS_SCENARIOS,
  type StressScenarioId,
} from "@/lib/optimization";

export interface StressScenarioSelectorProps {
  selected: StressScenarioId[];
  onChange: (ids: StressScenarioId[]) => void;
}

export const StressScenarioSelector = memo(function StressScenarioSelector({
  selected,
  onChange,
}: StressScenarioSelectorProps) {
  const toggle = (id: StressScenarioId) => {
    if (selected.includes(id)) {
      onChange(selected.filter((x) => x !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <Card hover={false} padding="sm" data-testid="stress-scenario-selector">
      <CardHeader
        title="Stress Scenarios"
        subtitle="Combine institutional presets — shocks are blended when multiple are selected"
      />
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {STRESS_SCENARIOS.map((scenario) => {
          const active = selected.includes(scenario.id);
          return (
            <button
              key={scenario.id}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(scenario.id)}
              className={cn(
                "rounded-lg border px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
                active
                  ? "border-accent/40 bg-accent/10"
                  : "border-surface-border-subtle bg-surface-overlay/40 hover:bg-surface-hover"
              )}
            >
              <p className="text-xs font-semibold text-text-primary">
                {scenario.label}
              </p>
              <p className="mt-0.5 text-[11px] text-text-muted">
                {scenario.description}
              </p>
            </button>
          );
        })}
      </div>
    </Card>
  );
});
