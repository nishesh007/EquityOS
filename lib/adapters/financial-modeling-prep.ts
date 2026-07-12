import { adapterFetch, hasApiKey } from "@/lib/adapters/http";
import { loadProviderConfig } from "@/lib/providers/config";
import { BaseDataAdapter } from "@/lib/adapters/types";
import { toFmpSymbol } from "@/lib/fundamentals/normalize";

export interface FMPParams {
  symbol: string;
  endpoint:
    | "profile"
    | "income"
    | "balance"
    | "cashflow"
    | "ratios"
    | "key-metrics"
    | "income-quarterly"
    | "balance-quarterly"
    | "cashflow-quarterly";
}

export interface FMPResult {
  symbol: string;
  endpoint: FMPParams["endpoint"];
  data: unknown;
}

interface FMPProfile {
  symbol?: string;
  companyName?: string;
  sector?: string;
  industry?: string;
  description?: string;
  website?: string;
  fullTimeEmployees?: number;
  mktCap?: number;
  price?: number;
  beta?: number;
  ipoDate?: string;
}

export class FinancialModelingPrepAdapter extends BaseDataAdapter<FMPParams, FMPResult> {
  readonly provider = "FinancialModelingPrep";

  override get status() {
    return hasApiKey(this.config.apiKey) ? ("ready" as const) : ("stub" as const);
  }

  async healthCheck() {
    if (!hasApiKey(this.config.apiKey)) {
      return {
        status: "stub" as const,
        provider: this.provider,
        message: "FMP adapter requires FMP_API_KEY.",
        lastChecked: new Date().toISOString(),
      };
    }
    return {
      status: "ready" as const,
      provider: this.provider,
      message: "FMP adapter configured and ready.",
      lastChecked: new Date().toISOString(),
    };
  }

  async fetch(params: FMPParams): Promise<FMPResult> {
    if (!hasApiKey(this.config.apiKey)) {
      this.notConnected();
    }

    const fmpSymbol = toFmpSymbol(params.symbol);
    const baseUrl = this.config.baseUrl ?? "https://financialmodelingprep.com/api/v3";
    const timeout = this.config.timeout ?? 15_000;

    const pathMap: Record<FMPParams["endpoint"], string> = {
      profile: `/profile/${encodeURIComponent(fmpSymbol)}`,
      income: `/income-statement/${encodeURIComponent(fmpSymbol)}?period=annual&limit=5`,
      "income-quarterly": `/income-statement/${encodeURIComponent(fmpSymbol)}?period=quarter&limit=8`,
      balance: `/balance-sheet-statement/${encodeURIComponent(fmpSymbol)}?period=annual&limit=5`,
      "balance-quarterly": `/balance-sheet-statement/${encodeURIComponent(fmpSymbol)}?period=quarter&limit=8`,
      cashflow: `/cash-flow-statement/${encodeURIComponent(fmpSymbol)}?period=annual&limit=5`,
      "cashflow-quarterly": `/cash-flow-statement/${encodeURIComponent(fmpSymbol)}?period=quarter&limit=8`,
      ratios: `/ratios/${encodeURIComponent(fmpSymbol)}?period=annual&limit=5`,
      "key-metrics": `/key-metrics/${encodeURIComponent(fmpSymbol)}?period=annual&limit=5`,
    };

    const url = `${baseUrl}${pathMap[params.endpoint]}&apikey=${this.config.apiKey}`;
    const data = await adapterFetch<unknown>(url, { timeout });

    if (!data || (Array.isArray(data) && data.length === 0)) {
      throw new Error(`FMP: empty response for ${params.endpoint} (${params.symbol})`);
    }

    return {
      symbol: params.symbol.toUpperCase(),
      endpoint: params.endpoint,
      data,
    };
  }

  async fetchProfile(symbol: string): Promise<FMPProfile> {
    const result = await this.fetch({ symbol, endpoint: "profile" });
    const rows = result.data as FMPProfile[];
    const profile = Array.isArray(rows) ? rows[0] : (result.data as FMPProfile);
    if (!profile?.companyName) {
      throw new Error(`FMP: profile not found for ${symbol}`);
    }
    return profile;
  }
}

const envConfig = loadProviderConfig();
export const fmpAdapter = new FinancialModelingPrepAdapter({
  apiKey: envConfig.fmp.apiKey,
  baseUrl: envConfig.fmp.baseUrl,
  timeout: 15_000,
});
