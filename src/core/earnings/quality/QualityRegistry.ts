/**
 * Quality check registry — catalogs advisory quality detectors.
 * Registration is idempotent.
 */

import type { QualityDimension } from "./QualityConfiguration";

export type QualitySignalSeverity = "info" | "watch" | "warning" | "critical";

export interface QualityCheckDefinition {
  checkId: string;
  dimension: QualityDimension;
  label: string;
  description: string;
  defaultSeverity: QualitySignalSeverity;
  registeredAt: string;
}

const checks = new Map<string, QualityCheckDefinition>();
let builtinsRegistered = false;

const BUILTIN_CHECKS: Array<Omit<QualityCheckDefinition, "registeredAt">> = [
  {
    checkId: "high_accruals",
    dimension: "accrualQuality",
    label: "High Accruals",
    description: "Accruals large relative to net income",
    defaultSeverity: "warning",
  },
  {
    checkId: "ocf_vs_ni",
    dimension: "cashFlowQuality",
    label: "Operating Cash Flow vs Net Income",
    description: "OCF materially below net income",
    defaultSeverity: "warning",
  },
  {
    checkId: "receivable_growth",
    dimension: "workingCapital",
    label: "Receivable Growth > Revenue Growth",
    description: "Receivables growing faster than revenue",
    defaultSeverity: "warning",
  },
  {
    checkId: "inventory_growth",
    dimension: "workingCapital",
    label: "Inventory Growth > Sales Growth",
    description: "Inventory growing faster than sales",
    defaultSeverity: "warning",
  },
  {
    checkId: "one_time_income",
    dimension: "accountingQuality",
    label: "Frequent One-time Income",
    description: "Elevated other/one-time income dependence",
    defaultSeverity: "watch",
  },
  {
    checkId: "negative_fcf",
    dimension: "cashFlowQuality",
    label: "Negative Free Cash Flow",
    description: "Sustained negative free cash flow",
    defaultSeverity: "warning",
  },
  {
    checkId: "capitalized_expenses",
    dimension: "accountingQuality",
    label: "Large Capitalized Expenses",
    description: "CWIP / intangibles elevated vs assets",
    defaultSeverity: "watch",
  },
  {
    checkId: "declining_roce",
    dimension: "capitalAllocation",
    label: "Declining ROCE",
    description: "Return on capital employed deteriorating",
    defaultSeverity: "warning",
  },
  {
    checkId: "debt_weak_cash",
    dimension: "capitalAllocation",
    label: "Increasing Debt with Weak Cash Flow",
    description: "Debt rising while cash generation weak",
    defaultSeverity: "critical",
  },
  {
    checkId: "wc_stress",
    dimension: "workingCapital",
    label: "Working Capital Stress",
    description: "Working capital deterioration / stress",
    defaultSeverity: "warning",
  },
  {
    checkId: "margin_deterioration",
    dimension: "margins",
    label: "Margin Deterioration",
    description: "Operating or net margins declining",
    defaultSeverity: "warning",
  },
  {
    checkId: "cash_conversion_decline",
    dimension: "cashFlowQuality",
    label: "Cash Conversion Decline",
    description: "Cash conversion ratio declining over time",
    defaultSeverity: "warning",
  },
];

export function registerQualityCheck(
  definition: Omit<QualityCheckDefinition, "registeredAt"> & {
    registeredAt?: string;
  },
  options?: { force?: boolean }
): { registered: boolean; skipped: boolean } {
  if (checks.has(definition.checkId) && !options?.force) {
    return { registered: false, skipped: true };
  }
  checks.set(definition.checkId, {
    ...definition,
    registeredAt: definition.registeredAt ?? new Date().toISOString(),
  });
  return { registered: true, skipped: false };
}

export function registerBuiltinQualityChecks(options?: {
  force?: boolean;
}): { registered: number; skipped: number; total: number } {
  if (builtinsRegistered && !options?.force) {
    return { registered: 0, skipped: checks.size, total: checks.size };
  }
  let added = 0;
  let skipped = 0;
  for (const check of BUILTIN_CHECKS) {
    const result = registerQualityCheck(check, { force: options?.force });
    if (result.registered) added += 1;
    else skipped += 1;
  }
  builtinsRegistered = true;
  return { registered: added, skipped, total: checks.size };
}

export function getQualityCheck(checkId: string): QualityCheckDefinition | null {
  const c = checks.get(checkId);
  return c ? { ...c } : null;
}

export function listQualityChecks(filter?: {
  dimension?: QualityDimension;
}): QualityCheckDefinition[] {
  return [...checks.values()]
    .filter((c) => (filter?.dimension ? c.dimension === filter.dimension : true))
    .map((c) => ({ ...c }));
}

export function resetQualityRegistry(): void {
  checks.clear();
  builtinsRegistered = false;
}
