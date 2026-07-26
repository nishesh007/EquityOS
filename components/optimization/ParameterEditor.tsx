"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { ChevronDown, RotateCcw } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { ParameterGroup, ParameterState } from "@/lib/optimization";

const INPUT_CLASS =
  "w-full rounded-lg border border-surface-border-subtle bg-surface-overlay/50 px-2 py-1.5 text-xs text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:opacity-50";

export interface ParameterEditorProps {
  parameters: ParameterState[];
  onValueChange: (id: string, value: number | boolean | string) => void;
  onBoundsChange: (
    id: string,
    patch: Partial<Pick<ParameterState, "min" | "max" | "increment" | "enabled">>
  ) => void;
  onReset: (id: string) => void;
}

function statusLabel(status: ParameterState["status"]): string {
  switch (status) {
    case "valid":
      return "Valid";
    case "invalid":
      return "Invalid";
    case "overflow":
      return "Overflow";
    case "disabled":
      return "Disabled";
    default:
      return status;
  }
}

function statusClass(status: ParameterState["status"]): string {
  switch (status) {
    case "valid":
      return "text-gain";
    case "invalid":
    case "overflow":
      return "text-loss";
    default:
      return "text-text-faint";
  }
}

const ParameterRow = memo(function ParameterRow({
  param,
  onValueChange,
  onBoundsChange,
  onReset,
}: {
  param: ParameterState;
  onValueChange: ParameterEditorProps["onValueChange"];
  onBoundsChange: ParameterEditorProps["onBoundsChange"];
  onReset: ParameterEditorProps["onReset"];
}) {
  const parseNumber = useCallback((raw: string, fallback: number) => {
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
  }, []);

  return (
    <div
      className={cn(
        "rounded-lg border border-surface-border-subtle/80 bg-surface-overlay/30 p-3",
        !param.enabled && "opacity-70"
      )}
      data-testid={`param-row-${param.id}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-text-primary">{param.label}</p>
          <p className={cn("mt-0.5 text-[10px] font-medium", statusClass(param.status))}>
            {statusLabel(param.status)}
            {param.error ? ` · ${param.error}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-1.5 text-[10px] text-text-secondary">
            <input
              type="checkbox"
              checked={param.enabled}
              onChange={(e) =>
                onBoundsChange(param.id, { enabled: e.target.checked })
              }
              aria-label={`Enable optimization for ${param.label}`}
              className="h-3.5 w-3.5 rounded border-surface-border-subtle accent-[var(--eos-accent,#38bdf8)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            />
            Optimize
          </label>
          <button
            type="button"
            onClick={() => onReset(param.id)}
            aria-label={`Reset ${param.label}`}
            className="inline-flex items-center gap-1 rounded-md border border-surface-border-subtle bg-surface-overlay/50 px-2 py-1 text-[10px] font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          >
            <RotateCcw className="h-3 w-3" aria-hidden />
            Reset
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label className="block space-y-1">
          <span className="text-[10px] uppercase tracking-wide text-text-faint">
            Current
          </span>
          {param.type === "boolean" ? (
            <select
              className={INPUT_CLASS}
              value={param.current ? "true" : "false"}
              onChange={(e) =>
                onValueChange(param.id, e.target.value === "true")
              }
              aria-label={`${param.label} current value`}
            >
              <option value="true">True</option>
              <option value="false">False</option>
            </select>
          ) : param.type === "dropdown" ? (
            <select
              className={INPUT_CLASS}
              value={String(param.current)}
              onChange={(e) => onValueChange(param.id, e.target.value)}
              aria-label={`${param.label} current value`}
            >
              {(param.options ?? []).map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="number"
              className={INPUT_CLASS}
              value={Number(param.current)}
              step={param.increment ?? 1}
              min={param.min}
              max={param.max}
              onChange={(e) =>
                onValueChange(
                  param.id,
                  parseNumber(e.target.value, Number(param.current))
                )
              }
              aria-label={`${param.label} current value`}
            />
          )}
        </label>

        {param.type !== "boolean" && param.type !== "dropdown" ? (
          <>
            <label className="block space-y-1">
              <span className="text-[10px] uppercase tracking-wide text-text-faint">
                Minimum
              </span>
              <input
                type="number"
                className={INPUT_CLASS}
                value={param.min ?? ""}
                step={param.increment ?? 1}
                onChange={(e) =>
                  onBoundsChange(param.id, {
                    min: parseNumber(e.target.value, param.min ?? 0),
                  })
                }
                aria-label={`${param.label} minimum`}
                disabled={!param.enabled}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] uppercase tracking-wide text-text-faint">
                Maximum
              </span>
              <input
                type="number"
                className={INPUT_CLASS}
                value={param.max ?? ""}
                step={param.increment ?? 1}
                onChange={(e) =>
                  onBoundsChange(param.id, {
                    max: parseNumber(e.target.value, param.max ?? 0),
                  })
                }
                aria-label={`${param.label} maximum`}
                disabled={!param.enabled}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] uppercase tracking-wide text-text-faint">
                Increment
              </span>
              <input
                type="number"
                className={INPUT_CLASS}
                value={param.increment ?? ""}
                step="any"
                min={0}
                onChange={(e) =>
                  onBoundsChange(param.id, {
                    increment: Math.max(
                      0.0001,
                      parseNumber(e.target.value, param.increment ?? 1)
                    ),
                  })
                }
                aria-label={`${param.label} increment`}
                disabled={!param.enabled}
              />
            </label>
          </>
        ) : (
          <div className="col-span-3 flex items-end">
            <p className="text-[10px] text-text-faint">
              Type: {param.type}
              {param.unit ? ` · ${param.unit}` : ""}
            </p>
          </div>
        )}
      </div>
    </div>
  );
});

export const ParameterEditor = memo(function ParameterEditor({
  parameters,
  onValueChange,
  onBoundsChange,
  onReset,
}: ParameterEditorProps) {
  const groups = useMemo(() => {
    const map = new Map<ParameterGroup, ParameterState[]>();
    for (const p of parameters) {
      const list = map.get(p.group) ?? [];
      list.push(p);
      map.set(p.group, list);
    }
    return Array.from(map.entries());
  }, [parameters]);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(groups.map(([g]) => [g, true]))
  );

  const toggleGroup = useCallback((group: string) => {
    setOpenGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  }, []);

  return (
    <Card hover={false} padding="sm" data-testid="parameter-editor">
      <CardHeader
        title="Optimization Parameters"
        subtitle="Configure ranges, increments, and enable flags for each parameter"
      />
      <div className="mt-3 space-y-2">
        {groups.map(([group, params]) => {
          const open = openGroups[group] !== false;
          const panelId = `param-group-${group.replace(/\s+/g, "-").toLowerCase()}`;
          return (
            <div
              key={group}
              className="overflow-hidden rounded-xl border border-surface-border-subtle"
            >
              <button
                type="button"
                onClick={() => toggleGroup(group)}
                aria-expanded={open}
                aria-controls={panelId}
                className="flex w-full items-center justify-between gap-2 bg-surface-overlay/50 px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/50"
              >
                <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  {group}
                </span>
                <ChevronDown
                  aria-hidden
                  className={cn(
                    "h-4 w-4 text-text-muted transition-transform",
                    open && "rotate-180"
                  )}
                />
              </button>
              {open ? (
                <div id={panelId} className="space-y-2 p-3">
                  {params.map((param) => (
                    <ParameterRow
                      key={param.id}
                      param={param}
                      onValueChange={onValueChange}
                      onBoundsChange={onBoundsChange}
                      onReset={onReset}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </Card>
  );
});
