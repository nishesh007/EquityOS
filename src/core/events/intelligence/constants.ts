/**
 * Shared constants for Event Intelligence engines (Sprint 10D.4).
 */

import type { EventType } from "@/types/event";
import type { NseSector } from "@/types/eventIntelligence";

/** Base impact contribution by event type (0–40). */
export const EVENT_TYPE_IMPACT_BASE: Readonly<Partial<Record<EventType, number>>> =
  Object.freeze({
    rbi_policy: 38,
    repo_rate: 36,
    fed_meeting: 37,
    nfp: 34,
    fiscal_budget: 36,
    fomc_minutes: 28,
    rbi_minutes: 26,
    rbi_governor_speech: 24,
    ecb_policy: 30,
    boj_policy: 22,
    cpi: 32,
    core_cpi: 30,
    gdp: 30,
    quarterly_gdp: 28,
    msci_review: 34,
    wpi: 18,
    ppi: 20,
    pmi: 16,
    pmi_services: 15,
    iip: 16,
    unemployment_rate: 22,
    trade_balance: 14,
    current_account: 14,
    forex_reserves: 10,
    reverse_repo: 14,
    crr: 24,
    slr: 12,
    gst_collection: 12,
    government_borrowing: 14,
    oil_inventory: 16,
    crude_prices: 26,
    ftse_review: 28,
    quarterly_results: 22,
    annual_results: 24,
    conference_call: 14,
    dividend: 12,
    bonus: 8,
    stock_split: 10,
    buyback: 16,
    rights_issue: 14,
    merger: 28,
    demerger: 22,
    open_offer: 20,
    ipo: 18,
    listing: 12,
    delisting: 16,
    agm: 6,
    egm: 8,
    generic_economic: 14,
  });

export const IMPORTANCE_CRITICALITY: Readonly<
  Record<"critical" | "high" | "medium" | "low", number>
> = Object.freeze({
  critical: 22,
  high: 16,
  medium: 10,
  low: 4,
});

export const FREQUENCY_SCORE: Readonly<
  Record<"monthly" | "quarterly" | "annual" | "adhoc", number>
> = Object.freeze({
  adhoc: 10,
  annual: 9,
  quarterly: 7,
  monthly: 5,
});

/** Soft alias map from free-text sector labels → NSE matrix sectors. */
export const SECTOR_ALIASES: Readonly<Record<string, NseSector>> = Object.freeze({
  banks: "Banking",
  banking: "Banking",
  "private banks": "Banking",
  "private banks (margins)": "Banking",
  "psu banks": "Banking",
  financials: "Banking",
  nbfc: "NBFC",
  nbfcs: "NBFC",
  insurance: "Insurance",
  insurers: "Insurance",
  "duration-sensitive insurers": "Insurance",
  it: "IT",
  "information technology": "IT",
  "it services": "IT",
  "it (on dovish cut)": "IT",
  "it on soft ppi / dovish fed odds": "IT",
  "it on soft nfp / cut odds": "IT",
  auto: "Auto",
  "auto exporters": "Auto",
  aviation: "Auto",
  pharma: "Pharma",
  fmcg: "FMCG",
  "fmcg (on soft print)": "FMCG",
  consumer: "FMCG",
  "consumer durables": "FMCG",
  "consumer discretionary": "FMCG",
  "capital goods": "Capital Goods",
  industrials: "Capital Goods",
  realty: "Real Estate",
  "real estate": "Real Estate",
  metals: "Metals",
  "commodity producers": "Metals",
  energy: "Energy",
  "oil & gas": "Energy",
  omcs: "Energy",
  "upstream producers": "Energy",
  chemicals: "Chemicals",
  paints: "Chemicals",
  tyres: "Auto",
  infrastructure: "Infrastructure",
  defence: "Infrastructure",
  telecom: "Telecom",
  utilities: "Utilities",
  hospitality: "FMCG",
  exporters: "IT",
});

export function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function resolveSector(label: string): NseSector | null {
  const key = label.trim().toLowerCase();
  if (!key || key === "all") return null;
  if (SECTOR_ALIASES[key]) return SECTOR_ALIASES[key];
  const direct = (
    [
      "Banking",
      "IT",
      "Auto",
      "Pharma",
      "FMCG",
      "Capital Goods",
      "Real Estate",
      "Metals",
      "Energy",
      "Chemicals",
      "Infrastructure",
      "Telecom",
      "Utilities",
      "NBFC",
      "Insurance",
    ] as const
  ).find((s) => s.toLowerCase() === key);
  return direct ?? null;
}
