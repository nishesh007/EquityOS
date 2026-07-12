/**
 * Sector / industry / quote enrichment overlay for curated symbols.
 * Not a listing source — the equity universe comes from company-master data.
 */

import { normalizeNseSymbol } from "@/lib/fundamentals/symbols";

export interface CompanyEnrichment {
  sector: string;
  industry: string;
  price: number;
  changePercent: number;
  marketCap: string;
  description?: string;
  website?: string;
}

/** Curated metadata overlay keyed by canonical symbol. */
export const COMPANY_ENRICHMENT: Record<string, CompanyEnrichment> = {
  RELIANCE: { sector: "Conglomerate", industry: "Oil & Gas / Retail / Telecom", price: 2890.5, changePercent: 1.24, marketCap: "₹19.5L Cr", website: "ril.com" },
  TCS: { sector: "IT", industry: "IT Services & Consulting", price: 4125.8, changePercent: 0.85, marketCap: "₹15.0L Cr", website: "tcs.com" },
  HDFCBANK: { sector: "Banking", industry: "Private Sector Bank", price: 1724.3, changePercent: -0.42, marketCap: "₹13.2L Cr", website: "hdfcbank.com" },
  INFY: { sector: "IT", industry: "IT Services & Consulting", price: 1892.15, changePercent: 1.56, marketCap: "₹7.8L Cr", website: "infosys.com" },
  ICICIBANK: { sector: "Banking", industry: "Private Sector Bank", price: 1285.4, changePercent: 0.32, marketCap: "₹9.1L Cr", website: "icicibank.com" },
  BHARTIARTL: { sector: "Telecom", industry: "Telecommunications", price: 1685.4, changePercent: 1.48, marketCap: "₹9.5L Cr", website: "airtel.in" },
  SBIN: { sector: "Banking", industry: "Public Sector Bank", price: 812.35, changePercent: 0.68, marketCap: "₹7.2L Cr", website: "sbi.co.in" },
  LT: { sector: "Infrastructure", industry: "Engineering & Construction", price: 3642.8, changePercent: 1.12, marketCap: "₹5.0L Cr", website: "larsentoubro.com" },
  WIPRO: { sector: "IT", industry: "IT Services & Consulting", price: 285.6, changePercent: -0.45, marketCap: "₹1.5L Cr", website: "wipro.com" },
  ADANIENT: { sector: "Conglomerate", industry: "Infrastructure & Energy", price: 2845.2, changePercent: 2.24, marketCap: "₹3.2L Cr", website: "adani.com" },
  MARUTI: { sector: "Auto", industry: "Passenger Vehicles", price: 12450, changePercent: 0.92, marketCap: "₹3.9L Cr", website: "marutisuzuki.com" },
  ABB: { sector: "Capital Goods", industry: "Electrical Equipment", price: 6850, changePercent: 1.15, marketCap: "₹1.5L Cr", website: "abb.co.in" },
  ADANIPORTS: { sector: "Infrastructure", industry: "Port Operations", price: 1482, changePercent: 1.35, marketCap: "₹3.2L Cr", website: "adaniports.com" },
  ASIANPAINT: { sector: "Consumer", industry: "Paints & Coatings", price: 2890, changePercent: -0.8, marketCap: "₹2.8L Cr", website: "asianpaints.com" },
  BAJFINANCE: { sector: "Financial Services", industry: "NBFC", price: 6852, changePercent: 0.45, marketCap: "₹4.2L Cr", website: "bajajfinserv.in" },
  BEL: { sector: "Defence", industry: "Defence Electronics", price: 318.75, changePercent: 5.91, marketCap: "₹2.3L Cr", website: "bel-india.in" },
  COFORGE: { sector: "IT", industry: "IT Services & Consulting", price: 6842.4, changePercent: 7.82, marketCap: "₹4.2L Cr", website: "coforge.com" },
  HAL: { sector: "Defence", industry: "Aerospace & Defence", price: 4782.3, changePercent: 3.26, marketCap: "₹3.2L Cr", website: "hal-india.co.in" },
  PERSISTENT: { sector: "IT", industry: "IT Services & Consulting", price: 4938.8, changePercent: 4.88, marketCap: "₹0.8L Cr", website: "persistent.com" },
  VEDL: { sector: "Metals & Mining", industry: "Diversified Metals & Mining", price: 428.5, changePercent: 1.62, marketCap: "₹1.6L Cr", website: "vedantalimited.com" },
  "M&M": { sector: "Auto", industry: "Passenger & Utility Vehicles", price: 2924.8, changePercent: 2.12, marketCap: "₹3.9L Cr", website: "mahindra.com" },
  MM: { sector: "Auto", industry: "Passenger & Utility Vehicles", price: 2924.8, changePercent: 2.12, marketCap: "₹3.9L Cr", website: "mahindra.com" },
  PIDILITIND: { sector: "Consumer", industry: "Adhesives & Construction Chemicals", price: 3042.7, changePercent: -2.51, marketCap: "₹1.6L Cr", website: "pidilite.com" },
  KPITTECH: { sector: "IT", industry: "Automotive Software", price: 1685.2, changePercent: 1.65, marketCap: "₹0.5L Cr", website: "kpit.com" },
  LTM: { sector: "IT", industry: "IT Services & Consulting", price: 5824.5, changePercent: 0.78, marketCap: "₹1.7L Cr", website: "ltm.com" },
  TATAELXSI: { sector: "IT", industry: "Product Engineering Services", price: 7824.5, changePercent: 1.35, marketCap: "₹0.5L Cr", website: "tataelxsi.com" },
};

export function getCompanyEnrichment(symbol: string): CompanyEnrichment | null {
  return COMPANY_ENRICHMENT[normalizeNseSymbol(symbol)] ?? null;
}
