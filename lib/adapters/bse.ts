import { adapterFetch } from "@/lib/adapters/http";
import { loadProviderConfig } from "@/lib/providers/config";
import { BaseDataAdapter, type AdapterConfig } from "@/lib/adapters/types";

export interface BSEQuoteParams {
  symbol: string;
}

export interface BSEQuoteResult {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  volume: number;
}

interface BSEQuoteResponse {
  CurrRate?: {
    LTP?: string;
    OpenRate?: string;
    High?: string;
    Low?: string;
    PrevClose?: string;
    TotalQty?: string;
  };
}

const BSE_SCRIP_CODES: Record<string, string> = {
  RELIANCE: "500325",
  TCS: "532540",
  HDFCBANK: "500180",
  INFY: "500209",
  ICICIBANK: "532174",
  BHARTIARTL: "532454",
  SBIN: "500112",
  LT: "500510",
  WIPRO: "507685",
  ADANIENT: "512599",
  MARUTI: "532500",
};

function parseNum(value: string | undefined, fallback = 0): number {
  if (!value) return fallback;
  const n = parseFloat(value.replace(/,/g, ""));
  return Number.isFinite(n) ? n : fallback;
}

export class BSEAdapter extends BaseDataAdapter<BSEQuoteParams, BSEQuoteResult> {
  readonly provider = "BSE";

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
        message: "BSE adapter disabled. Set BSE_ENABLED=true to activate.",
        lastChecked: new Date().toISOString(),
      };
    }
    return {
      status: "ready" as const,
      provider: this.provider,
      message: "BSE adapter configured and ready.",
      lastChecked: new Date().toISOString(),
    };
  }

  async fetch(params: BSEQuoteParams): Promise<BSEQuoteResult> {
    if (!this.config.enabled) {
      this.notConnected();
    }

    const symbol = params.symbol.toUpperCase();
    const scripCode = BSE_SCRIP_CODES[symbol];
    if (!scripCode) {
      throw new Error(`BSE: no scrip code mapping for ${symbol}`);
    }

    const baseUrl = this.config.baseUrl ?? "https://api.bseindia.com";
    const url = `${baseUrl}/BseIndiaServices/api/StockReachGraph/w?scripcode=${scripCode}&flag=0&fromdate=&todate=&seriesid=`;

    const data = await adapterFetch<BSEQuoteResponse>(url, {
      timeout: this.config.timeout,
      headers: {
        Referer: "https://www.bseindia.com/",
      },
    });

    const rate = data.CurrRate;
    if (!rate?.LTP) {
      throw new Error(`BSE: no price data for ${symbol}`);
    }

    const price = parseNum(rate.LTP);
    const previousClose = parseNum(rate.PrevClose, price);
    const change = price - previousClose;
    const changePercent =
      previousClose !== 0 ? (change / previousClose) * 100 : 0;

    return {
      symbol,
      price,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      open: parseNum(rate.OpenRate, price),
      high: parseNum(rate.High, price),
      low: parseNum(rate.Low, price),
      previousClose,
      volume: parseNum(rate.TotalQty),
    };
  }
}

const config = loadProviderConfig();
export const bseAdapter = new BSEAdapter({
  enabled: config.bse.enabled,
  baseUrl: config.bse.baseUrl,
  timeout: 12_000,
});
