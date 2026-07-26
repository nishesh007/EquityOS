"use client";

import { memo, useMemo } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import {
  validateConstraints,
  type ConstraintDefinition,
  type ParameterState,
} from "@/lib/optimization";

const INPUT_CLASS =
  "w-24 rounded-lg border border-surface-border-subtle bg-surface-overlay/50 px-2 py-1.5 text-xs text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:opacity-50";

export interface ConstraintBuilderProps {
  constraints: ConstraintDefinition[];
  parameters: ParameterState[];
  onChange: (id: ConstraintDefinition["id"], patch: Partial<ConstraintDefinition>) => void;
}

export const ConstraintBuilder = memo(function ConstraintBuilder({
  constraints,
  parameters,
  onChange,
}: ConstraintBuilderProps) {
  const validations = useMemo(
    () => validateConstraints(constraints, parameters),
    [constraints, parameters]
  );
  const byId = useMemo(
    () => Object.fromEntries(validations.map((v) => [v.id, v])),
    [validations]
  );

  return (
    <Card hover={false} padding="sm" data-testid="constraint-builder">
      <CardHeader
        title="Constraints"
        subtitle="Institutional risk and quality gates — invalid combinations are blocked immediately"
      />
      <ul className="mt-3 space-y-2" aria-label="Optimization constraints">
        {constraints.map((c) => {
          const result = byId[c.id];
          const invalid = result && !result.valid;
          return (
            <li
              key={c.id}
              className={cn(
                "rounded-lg border px-3 py-2.5",
                invalid
                  ? "border-loss/40 bg-loss/5"
                  : "border-surface-border-subtle bg-surface-overlay/30"
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="inline-flex items-center gap-2 text-xs font-medium text-text-primary">
                  <input
                    type="checkbox"
                    checked={c.enabled}
                    onChange={(e) =>
                      onChange(c.id, { enabled: e.target.checked })
                    }
                    aria-label={`Enable ${c.label}`}
                    className="h-3.5 w-3.5 rounded border-surface-border-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                  />
                  {c.label}
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-text-muted" aria-hidden>
                    {c.operator}
                  </span>
                  <input
                    type="number"
                    className={INPUT_CLASS}
                    value={c.value}
                    disabled={!c.enabled}
                    step="any"
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (!Number.isFinite(n)) return;
                      onChange(c.id, { value: n });
                    }}
                    aria-label={`${c.label} threshold`}
                    aria-invalid={invalid || undefined}
                  />
                  {c.unit ? (
                    <span className="text-[10px] text-text-faint">{c.unit}</span>
                  ) : null}
                </div>
              </div>
              {invalid && result?.message ? (
                <p
                  role="alert"
                  className="mt-1.5 text-[11px] text-loss"
                >
                  {result.message}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Card>
  );
});
