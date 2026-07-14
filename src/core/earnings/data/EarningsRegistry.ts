/**
 * Earnings dataset registry — catalog of supported institutional datasets.
 * Registration is idempotent.
 */

import {
  ALL_EARNINGS_DATASET_KINDS,
  type EarningsDatasetKind,
} from "./EarningsConfiguration";

export interface EarningsDatasetDefinition {
  kind: EarningsDatasetKind;
  label: string;
  description: string;
  supportsPeriods: boolean;
  registeredAt: string;
  metadata?: Record<string, unknown>;
}

const DATASET_LABELS: Record<EarningsDatasetKind, string> = {
  quarterly_results: "Quarterly Results",
  annual_results: "Annual Results",
  standalone_results: "Standalone Results",
  consolidated_results: "Consolidated Results",
  income_statement: "Income Statement",
  balance_sheet: "Balance Sheet",
  cash_flow: "Cash Flow",
  shareholding_pattern: "Shareholding Pattern",
  segment_results: "Segment Results",
  corporate_announcements: "Corporate Announcements",
  financial_highlights: "Financial Highlights",
  dividend_history: "Dividend History",
};

const PERIOD_SUPPORT: Record<EarningsDatasetKind, boolean> = {
  quarterly_results: true,
  annual_results: true,
  standalone_results: true,
  consolidated_results: true,
  income_statement: true,
  balance_sheet: true,
  cash_flow: true,
  shareholding_pattern: true,
  segment_results: true,
  corporate_announcements: false,
  financial_highlights: true,
  dividend_history: true,
};

const datasets = new Map<EarningsDatasetKind, EarningsDatasetDefinition>();
let builtinsRegistered = false;

export function registerEarningsDataset(
  definition: Omit<EarningsDatasetDefinition, "registeredAt"> & {
    registeredAt?: string;
  },
  options?: { force?: boolean }
): { registered: boolean; skipped: boolean } {
  if (datasets.has(definition.kind) && !options?.force) {
    return { registered: false, skipped: true };
  }
  datasets.set(definition.kind, {
    ...definition,
    registeredAt: definition.registeredAt ?? new Date().toISOString(),
    metadata: definition.metadata ? { ...definition.metadata } : undefined,
  });
  return { registered: true, skipped: false };
}

export function registerBuiltinEarningsDatasets(options?: {
  force?: boolean;
}): { registered: number; skipped: number; total: number } {
  if (builtinsRegistered && !options?.force) {
    return {
      registered: 0,
      skipped: datasets.size,
      total: datasets.size,
    };
  }

  let added = 0;
  let skipped = 0;
  for (const kind of ALL_EARNINGS_DATASET_KINDS) {
    const result = registerEarningsDataset(
      {
        kind,
        label: DATASET_LABELS[kind],
        description: `Institutional earnings dataset: ${DATASET_LABELS[kind]}`,
        supportsPeriods: PERIOD_SUPPORT[kind],
        metadata: { sprint: "9B.1", engine: "EarningsDataEngine" },
      },
      { force: options?.force }
    );
    if (result.registered) added += 1;
    else skipped += 1;
  }
  builtinsRegistered = true;
  return { registered: added, skipped, total: datasets.size };
}

export function getEarningsDataset(
  kind: EarningsDatasetKind
): EarningsDatasetDefinition | null {
  const d = datasets.get(kind);
  return d ? cloneDataset(d) : null;
}

export function listEarningsDatasets(): EarningsDatasetDefinition[] {
  return [...datasets.values()].map(cloneDataset);
}

export function resetEarningsRegistry(): void {
  datasets.clear();
  builtinsRegistered = false;
}

export function areBuiltinEarningsDatasetsRegistered(): boolean {
  return builtinsRegistered;
}

function cloneDataset(
  definition: EarningsDatasetDefinition
): EarningsDatasetDefinition {
  return {
    ...definition,
    metadata: definition.metadata ? { ...definition.metadata } : undefined,
  };
}
