"use client";

import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { TabBar } from "@/components/ui/TabBar";
import {
  CATEGORY_LABELS,
  OPERATOR_LABELS,
  type FilterCategory,
  type FilterCondition,
  type FilterDefinition,
  type FilterGroup,
  type FilterLogic,
  type FilterOperator,
} from "@/lib/screener/types";
import { Filter, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";

interface ScreenerFilterPanelProps {
  filters: FilterDefinition[];
  rootGroup: FilterGroup;
  onGroupChange: (group: FilterGroup) => void;
  onRun: () => void;
  isRunning: boolean;
}

const CATEGORY_TABS: Array<{ id: FilterCategory; label: string }> = [
  { id: "price", label: "Price" },
  { id: "valuation", label: "Valuation" },
  { id: "growth", label: "Growth" },
  { id: "profitability", label: "Profitability" },
  { id: "financial_strength", label: "Strength" },
  { id: "shareholding", label: "Holdings" },
  { id: "technical", label: "Technical" },
  { id: "quality", label: "Quality" },
  { id: "ai", label: "AI" },
  { id: "metadata", label: "Meta" },
];

function createConditionId(): string {
  return `cond_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function defaultOperator(filter: FilterDefinition): FilterOperator {
  return filter.operators[0] ?? "gte";
}

function defaultValue(filter: FilterDefinition): number | string {
  if (filter.valueType === "text") return "";
  if (filter.valueType === "percent") return 10;
  if (filter.valueType === "score") return 50;
  if (filter.valueType === "ratio") return 1;
  if (filter.valueType === "currency") return 100;
  return 0;
}

export function ScreenerFilterPanel({
  filters,
  rootGroup,
  onGroupChange,
  onRun,
  isRunning,
}: ScreenerFilterPanelProps) {
  const [activeCategory, setActiveCategory] = useState<FilterCategory>("price");
  const [search, setSearch] = useState("");

  const filtersByCategory = useMemo(() => {
    const map = new Map<FilterCategory, FilterDefinition[]>();
    for (const filter of filters) {
      const list = map.get(filter.category) ?? [];
      list.push(filter);
      map.set(filter.category, list);
    }
    return map;
  }, [filters]);

  const categoryFilters = useMemo(() => {
    const list = filtersByCategory.get(activeCategory) ?? [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (f) => f.label.toLowerCase().includes(q) || f.key.toLowerCase().includes(q)
    );
  }, [filtersByCategory, activeCategory, search]);

  const activeConditions = rootGroup.conditions;

  function addFilter(filter: FilterDefinition) {
    const condition: FilterCondition = {
      id: createConditionId(),
      filterKey: filter.key,
      operator: defaultOperator(filter),
      value: defaultValue(filter),
    };
    onGroupChange({
      ...rootGroup,
      conditions: [...rootGroup.conditions, condition],
    });
  }

  function removeCondition(id: string) {
    onGroupChange({
      ...rootGroup,
      conditions: rootGroup.conditions.filter((c) => c.id !== id),
    });
  }

  function updateCondition(id: string, updates: Partial<FilterCondition>) {
    onGroupChange({
      ...rootGroup,
      conditions: rootGroup.conditions.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    });
  }

  function setLogic(logic: FilterLogic) {
    onGroupChange({ ...rootGroup, logic });
  }

  function clearAll() {
    onGroupChange({ ...rootGroup, conditions: [], groups: [] });
  }

  return (
    <Card padding="lg" className="h-full">
      <CardHeader
        title="Filters"
        subtitle={`${filters.length}+ AI screener filters`}
        action={
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
            <Filter className="h-4 w-4 text-accent" />
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <TabBar
          tabs={[
            { id: "and" as FilterLogic, label: "AND" },
            { id: "or" as FilterLogic, label: "OR" },
          ]}
          activeTab={rootGroup.logic}
          onTabChange={setLogic}
          size="sm"
        />
        {activeConditions.length > 0 && (
          <button
            onClick={clearAll}
            className="ml-auto text-[10px] text-text-faint transition-colors hover:text-text-muted"
          >
            Clear all
          </button>
        )}
      </div>

      {activeConditions.length > 0 && (
        <div className="mb-4 space-y-2">
          {activeConditions.map((condition) => {
            const def = filters.find((f) => f.key === condition.filterKey);
            if (!def) return null;
            return (
              <div
                key={condition.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-surface-border-subtle bg-surface-overlay/30 px-3 py-2"
              >
                <span className="text-xs font-medium text-text-primary">{def.label}</span>
                <select
                  value={condition.operator}
                  onChange={(e) =>
                    updateCondition(condition.id, {
                      operator: e.target.value as FilterOperator,
                    })
                  }
                  className="rounded border border-surface-border-subtle bg-surface-overlay px-1.5 py-0.5 text-[10px] text-text-secondary"
                >
                  {def.operators.map((op) => (
                    <option key={op} value={op}>
                      {OPERATOR_LABELS[op]}
                    </option>
                  ))}
                </select>
                <input
                  type={def.valueType === "text" ? "text" : "number"}
                  value={condition.value}
                  onChange={(e) =>
                    updateCondition(condition.id, {
                      value:
                        def.valueType === "text"
                          ? e.target.value
                          : Number(e.target.value),
                    })
                  }
                  className="w-20 rounded border border-surface-border-subtle bg-surface-overlay px-1.5 py-0.5 text-[10px] font-mono text-text-primary tabular-nums"
                />
                {condition.operator === "between" && (
                  <input
                    type="number"
                    value={condition.valueTo ?? ""}
                    onChange={(e) =>
                      updateCondition(condition.id, {
                        valueTo: Number(e.target.value),
                      })
                    }
                    placeholder="Max"
                    className="w-20 rounded border border-surface-border-subtle bg-surface-overlay px-1.5 py-0.5 text-[10px] font-mono text-text-primary tabular-nums"
                  />
                )}
                <button
                  onClick={() => removeCondition(condition.id)}
                  className="ml-auto rounded p-0.5 text-text-faint transition-colors hover:text-loss"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="mb-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search filters..."
          className="w-full rounded-lg border border-surface-border-subtle bg-surface-overlay/50 px-3 py-1.5 text-xs text-text-primary placeholder:text-text-faint"
        />
      </div>

      <div className="mb-3 overflow-x-auto">
        <TabBar
          tabs={CATEGORY_TABS}
          activeTab={activeCategory}
          onTabChange={setActiveCategory}
          size="sm"
        />
      </div>

      <div className="mb-4 max-h-[240px] overflow-y-auto">
        <div className="flex flex-wrap gap-1.5">
          {categoryFilters.map((filter) => {
            const isActive = activeConditions.some((c) => c.filterKey === filter.key);
            return (
              <button
                key={filter.key}
                onClick={() => addFilter(filter)}
                disabled={isActive}
                className="inline-flex items-center gap-1 rounded-md border border-surface-border-subtle px-2 py-1 text-[10px] text-text-secondary transition-colors hover:border-accent/30 hover:bg-accent/5 hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus className="h-2.5 w-2.5" />
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onRun}
          disabled={isRunning}
          className="flex-1 rounded-lg bg-accent/15 px-4 py-2 text-xs font-medium text-accent transition-colors hover:bg-accent/25 disabled:opacity-50"
        >
          {isRunning ? "Screening..." : "Run Screen"}
        </button>
        {activeConditions.length > 0 && (
          <Badge variant="accent" size="sm">
            {activeConditions.length} active
          </Badge>
        )}
      </div>

      <p className="mt-3 text-[10px] text-text-faint">
        {CATEGORY_LABELS[activeCategory]} · {categoryFilters.length} filters in category
      </p>
    </Card>
  );
}
