/**
 * Institutional AI Alert Engine — source registry (Sprint 9C.R1).
 * Every engine registers through AlertRegistry. Idempotent.
 */

import {
  ALERT_SOURCE_ENGINES,
  DEFAULT_SOURCE_WEIGHTS,
  type AlertSourceEngine,
} from "./AlertTypes";
import type { AlertCategory } from "./AlertCategory";

export interface AlertSourceDefinition {
  sourceId: AlertSourceEngine;
  label: string;
  description: string;
  defaultCategory: AlertCategory;
  weight: number;
  enabled: boolean;
  registeredAt: string;
}

const sources = new Map<AlertSourceEngine, AlertSourceDefinition>();
let builtinsRegistered = false;

const BUILTIN_SOURCES: Array<
  Omit<AlertSourceDefinition, "registeredAt" | "weight" | "enabled"> & {
    weight?: number;
    enabled?: boolean;
  }
> = [
  {
    sourceId: "AI Research",
    label: "AI Research Engine",
    description: "Opportunity and conviction signals from research",
    defaultCategory: "Opportunity",
  },
  {
    sourceId: "Earnings",
    label: "Earnings Engine",
    description: "Earnings calendar, results, and transcript events",
    defaultCategory: "Earnings",
  },
  {
    sourceId: "Portfolio",
    label: "Portfolio",
    description: "Portfolio exposure and position events",
    defaultCategory: "Portfolio",
  },
  {
    sourceId: "Watchlist",
    label: "Watchlist",
    description: "Watchlist membership and monitoring events",
    defaultCategory: "Watchlist",
  },
  {
    sourceId: "Validation",
    label: "Validation Engine",
    description: "Data validation and integrity events",
    defaultCategory: "Validation",
  },
  {
    sourceId: "Trust",
    label: "Trust Engine",
    description: "Trust score and classification events",
    defaultCategory: "Trust",
  },
  {
    sourceId: "Reports",
    label: "Reporting Engine",
    description: "Report generation and export events",
    defaultCategory: "Platform",
  },
  {
    sourceId: "Market",
    label: "Market Data",
    description: "Market structure and quote events",
    defaultCategory: "Technical",
  },
  {
    sourceId: "Corporate Actions",
    label: "Corporate Actions",
    description: "Dividends, splits, and corporate events",
    defaultCategory: "Corporate Action",
  },
  {
    sourceId: "News",
    label: "News",
    description: "News and headline events",
    defaultCategory: "News",
  },
  {
    sourceId: "Screener",
    label: "Screener (Future)",
    description: "Future screener opportunity events",
    defaultCategory: "Opportunity",
  },
  {
    sourceId: "Platform",
    label: "Platform",
    description: "Platform health and system events",
    defaultCategory: "Platform",
  },
];

export function registerSource(
  definition: Omit<AlertSourceDefinition, "registeredAt"> & {
    registeredAt?: string;
  },
  options?: { force?: boolean }
): { registered: boolean; skipped: boolean } {
  if (sources.has(definition.sourceId) && !options?.force) {
    return { registered: false, skipped: true };
  }
  sources.set(definition.sourceId, {
    ...definition,
    weight: Number.isFinite(definition.weight)
      ? definition.weight
      : DEFAULT_SOURCE_WEIGHTS[definition.sourceId] ?? 1,
    enabled: definition.enabled !== false,
    registeredAt: definition.registeredAt ?? new Date().toISOString(),
  });
  return { registered: true, skipped: false };
}

export function registerBuiltinSources(options?: {
  force?: boolean;
}): { registered: number; skipped: number; total: number } {
  if (builtinsRegistered && !options?.force) {
    return { registered: 0, skipped: sources.size, total: sources.size };
  }
  let added = 0;
  let skipped = 0;
  for (const source of BUILTIN_SOURCES) {
    const result = registerSource(
      {
        ...source,
        weight: source.weight ?? DEFAULT_SOURCE_WEIGHTS[source.sourceId] ?? 1,
        enabled: source.enabled !== false,
      },
      { force: options?.force }
    );
    if (result.registered) added += 1;
    else skipped += 1;
  }
  // Ensure every known engine id is present
  for (const id of ALERT_SOURCE_ENGINES) {
    if (!sources.has(id)) {
      registerSource(
        {
          sourceId: id,
          label: id,
          description: id,
          defaultCategory: "Platform",
          weight: DEFAULT_SOURCE_WEIGHTS[id],
          enabled: true,
        },
        { force: options?.force }
      );
      added += 1;
    }
  }
  builtinsRegistered = true;
  return { registered: added, skipped, total: sources.size };
}

export function getSource(
  sourceId: AlertSourceEngine
): AlertSourceDefinition | null {
  const s = sources.get(sourceId);
  return s ? { ...s } : null;
}

export function listSources(filter?: {
  enabledOnly?: boolean;
}): AlertSourceDefinition[] {
  return [...sources.values()]
    .filter((s) => (filter?.enabledOnly ? s.enabled : true))
    .map((s) => ({ ...s }));
}

export function isSourceRegistered(sourceId: AlertSourceEngine): boolean {
  return sources.has(sourceId);
}

export function isSourceEnabled(sourceId: AlertSourceEngine): boolean {
  return sources.get(sourceId)?.enabled === true;
}

export function resetAlertRegistry(): void {
  sources.clear();
  builtinsRegistered = false;
}
