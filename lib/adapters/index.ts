export type {
  AdapterConfig,
  AdapterHealth,
  AdapterStatus,
  DataAdapter,
} from "@/lib/adapters/types";
export { BaseDataAdapter } from "@/lib/adapters/types";
export { adapterFetch, hasApiKey, type FetchOptions } from "@/lib/adapters/http";

export { NSEAdapter, nseAdapter } from "@/lib/adapters/nse";
export { BSEAdapter, bseAdapter } from "@/lib/adapters/bse";
export { FinnhubAdapter, finnhubAdapter } from "@/lib/adapters/finnhub";
export { AlphaVantageAdapter, alphaVantageAdapter } from "@/lib/adapters/alphavantage";
export {
  FinancialModelingPrepAdapter,
  fmpAdapter,
} from "@/lib/adapters/financial-modeling-prep";
export { PolygonAdapter, polygonAdapter } from "@/lib/adapters/polygon";
export { OpenAIAdapter, openaiAdapter } from "@/lib/adapters/openai";

import type { DataAdapter } from "@/lib/adapters/types";
import { alphaVantageAdapter } from "@/lib/adapters/alphavantage";
import { bseAdapter } from "@/lib/adapters/bse";
import { finnhubAdapter } from "@/lib/adapters/finnhub";
import { fmpAdapter } from "@/lib/adapters/financial-modeling-prep";
import { nseAdapter } from "@/lib/adapters/nse";
import { openaiAdapter } from "@/lib/adapters/openai";
import { polygonAdapter } from "@/lib/adapters/polygon";

/** Registry of all market data adapters with failover support. */
export const adapterRegistry: DataAdapter[] = [
  nseAdapter,
  bseAdapter,
  finnhubAdapter,
  alphaVantageAdapter,
  fmpAdapter,
  polygonAdapter,
  openaiAdapter,
];
