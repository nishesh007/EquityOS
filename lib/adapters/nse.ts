import { adapterFetch } from "@/lib/adapters/http";
import { resolveMarketDataSymbol } from "@/lib/fundamentals/symbols";
import { loadProviderConfig } from "@/lib/providers/config";
import { BaseDataAdapter, type AdapterConfig } from "@/lib/adapters/types";

export interface NSEQuoteParams {
  symbol: string;
}

export interface NSEQuoteResult {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  volume: number;
  deliveryPercent?: number;
  vwap?: number;
}

interface NSEPriceInfo {
  lastPrice?: number;
  change?: number;
  pChange?: number;
  open?: number;
  intraDayHighLow?: { max?: number; min?: number };
  weekHighLow?: { max?: number; min?: number };
  previousClose?: number;
  totalTradedVolume?: number;
  vwap?: number;
}

interface NSEEquityResponse {
  info?: { symbol?: string; companyName?: string; industry?: string; isFNOSec?: boolean };
  priceInfo?: NSEPriceInfo;
  securityInfo?: { sector?: string; industry?: string };
  preOpenMarket?: { data?: Array<{ totalTradedVolume?: number }> };
}

export class NSEAdapter extends BaseDataAdapter<NSEQuoteParams, NSEQuoteResult> {
  readonly provider = "NSE";

  constructor(
    protected readonly config: AdapterConfig & { enabled?: boolean; baseUrl?: string } = {}
  ) {
    super(config);
  }

  override get status() {
    return this.config.enabled ? ("ready" as const) : ("stub" as const);
  }

  async healthCheck() {
    if (!this.config.enabled) {
      return {
        status: "stub" as const,
        provider: this.provider,
        message: "NSE adapter disabled. Set NSE_ENABLED=true to activate.",
        lastChecked: new Date().toISOString(),
      };
    }
    return {
      status: "ready" as const,
      provider: this.provider,
      message: "NSE adapter configured and ready.",
      lastChecked: new Date().toISOString(),
    };
  }

  async fetch(params: NSEQuoteParams): Promise<NSEQuoteResult> {
    if (!this.config.enabled) {
      this.notConnected();
    }

    const baseUrl = this.config.baseUrl ?? "https://www.nseindia.com/api";
    const canonical = params.symbol.toUpperCase();
    const quoteSymbol = resolveMarketDataSymbol(canonical);
    const url = `${baseUrl}/quote-equity?symbol=${encodeURIComponent(quoteSymbol)}`;

    const data = await adapterFetch<NSEEquityResponse>(url, {
      timeout: this.config.timeout,
      headers: {
        Referer: "https://www.nseindia.com/",
        Origin: "https://www.nseindia.com",
      },
    });

    const priceInfo = data.priceInfo;
    if (!priceInfo?.lastPrice) {
      throw new Error(`NSE: no price data for ${canonical}`);
    }

    const price = priceInfo.lastPrice;
    const change = priceInfo.change ?? 0;
    const changePercent = priceInfo.pChange ?? 0;

    return {
      symbol: canonical,
      price,
      change,
      changePercent,
      open: priceInfo.open ?? price,
      high: priceInfo.intraDayHighLow?.max ?? price,
      low: priceInfo.intraDayHighLow?.min ?? price,
      previousClose: priceInfo.previousClose ?? price - change,
      volume: priceInfo.totalTradedVolume ?? 0,
      vwap: priceInfo.vwap,
      deliveryPercent: undefined,
    };
  }
}

const config = loadProviderConfig();
export const nseAdapter = new NSEAdapter({
  enabled: config.nse.enabled,
  baseUrl: config.nse.baseUrl,
  timeout: 12_000,
});
