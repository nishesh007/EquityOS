/**
 * Domain contracts for news data.
 */

import type { CompanyNews, MarketNews } from "@/types";

export interface NewsDataService {
  fetchMarketNews(): Promise<MarketNews[]>;
  fetchCompanyNews(symbol: string): Promise<CompanyNews[]>;
}

export type { MarketNews, CompanyNews };
