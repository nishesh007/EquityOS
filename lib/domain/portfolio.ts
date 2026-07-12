/**
 * Domain contracts for portfolio data.
 */

import type { PortfolioDoctorAnalysis, PortfolioSummary } from "@/types";

export interface PortfolioDataService {
  fetchSummary(): Promise<PortfolioSummary>;
}

export interface PortfolioAnalysisService {
  fetchDoctorAnalysis(): Promise<PortfolioDoctorAnalysis>;
}

export type { PortfolioSummary, PortfolioDoctorAnalysis };
