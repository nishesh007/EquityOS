/**
 * Domain contracts for earnings results data.
 */

import type { ResultsSummary, UpcomingResult } from "@/types";

export interface ResultsDataService {
  fetchUpcoming(): Promise<UpcomingResult[]>;
  fetchSummary(symbol: string): Promise<ResultsSummary | null>;
}

export type { ResultsSummary, UpcomingResult };
