/**
 * Composable analytics filter state (presentation + shared contracts).
 */

import type { DateRange, TimeRangePreset } from "@/lib/analytics/types";

export type AnalyticsFilterId =
  | "dateRange"
  | "strategy"
  | "company"
  | "sector"
  | "recommendation"
  | "status"
  | "marketRegime";

export interface AnalyticsFilterOption {
  id: string;
  label: string;
}

export interface AnalyticsFilterState {
  dateRange?: DateRange;
  timeRangePreset?: TimeRangePreset;
  strategies: string[];
  companies: string[];
  sectors: string[];
  recommendations: string[];
  statuses: string[];
  marketRegimes: string[];
  query?: string;
}

export function createEmptyAnalyticsFilters(
  partial?: Partial<AnalyticsFilterState>
): AnalyticsFilterState {
  return {
    strategies: [],
    companies: [],
    sectors: [],
    recommendations: [],
    statuses: [],
    marketRegimes: [],
    ...partial,
  };
}

export function countActiveAnalyticsFilters(
  state: AnalyticsFilterState
): number {
  let count = 0;
  if (state.dateRange || state.timeRangePreset) count += 1;
  if (state.strategies.length) count += 1;
  if (state.companies.length) count += 1;
  if (state.sectors.length) count += 1;
  if (state.recommendations.length) count += 1;
  if (state.statuses.length) count += 1;
  if (state.marketRegimes.length) count += 1;
  if (state.query?.trim()) count += 1;
  return count;
}
