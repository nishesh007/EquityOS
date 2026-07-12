/**
 * Sector / industry enrichment overlay for curated symbols.
 * Not a listing source — the equity universe comes from company-master data.
 */

import { normalizeNseSymbol } from "@/lib/fundamentals/symbols";

export interface CompanyEnrichment {
  sector: string;
  industry: string;
  marketCap: string;
  description?: string;
  website?: string;
}

/** Curated metadata overlay keyed by canonical symbol. */
export const COMPANY_ENRICHMENT: Record<string, CompanyEnrichment> = {
  RELIANCE: { sector: "Conglomerate", industry: "Oil & Gas / Retail / Telecom", marketCap: "₹19.5L Cr", website: "ril.com" },
  TCS: { sector: "IT", industry: "IT Services & Consulting", marketCap: "₹15.0L Cr", website: "tcs.com" },
  HDFCBANK: { sector: "Banking", industry: "Private Sector Bank", marketCap: "₹13.2L Cr", website: "hdfcbank.com" },
  INFY: { sector: "IT", industry: "IT Services & Consulting", marketCap: "₹7.8L Cr", website: "infosys.com" },
  ICICIBANK: { sector: "Banking", industry: "Private Sector Bank", marketCap: "₹9.1L Cr", website: "icicibank.com" },
  BHARTIARTL: { sector: "Telecom", industry: "Telecommunications", marketCap: "₹9.5L Cr", website: "airtel.in" },
  SBIN: { sector: "Banking", industry: "Public Sector Bank", marketCap: "₹7.2L Cr", website: "sbi.co.in" },
  LT: { sector: "Infrastructure", industry: "Engineering & Construction", marketCap: "₹5.0L Cr", website: "larsentoubro.com" },
  WIPRO: { sector: "IT", industry: "IT Services & Consulting", marketCap: "₹1.5L Cr", website: "wipro.com" },
  ADANIENT: { sector: "Conglomerate", industry: "Infrastructure & Energy", marketCap: "₹3.2L Cr", website: "adani.com" },
  MARUTI: { sector: "Auto", industry: "Passenger Vehicles", marketCap: "₹3.9L Cr", website: "marutisuzuki.com" },
  ABB: { sector: "Capital Goods", industry: "Electrical Equipment", marketCap: "₹1.5L Cr", website: "abb.co.in" },
  ADANIPORTS: { sector: "Infrastructure", industry: "Port Operations", marketCap: "₹3.2L Cr", website: "adaniports.com" },
  ASIANPAINT: { sector: "Consumer", industry: "Paints & Coatings", marketCap: "₹2.8L Cr", website: "asianpaints.com" },
  BAJFINANCE: { sector: "Financial Services", industry: "NBFC", marketCap: "₹4.2L Cr", website: "bajajfinserv.in" },
  BEL: { sector: "Defence", industry: "Defence Electronics", marketCap: "₹2.3L Cr", website: "bel-india.in" },
  COFORGE: { sector: "IT", industry: "IT Services & Consulting", marketCap: "₹4.2L Cr", website: "coforge.com" },
  HAL: { sector: "Defence", industry: "Aerospace & Defence", marketCap: "₹3.2L Cr", website: "hal-india.co.in" },
  PERSISTENT: { sector: "IT", industry: "IT Services & Consulting", marketCap: "₹0.8L Cr", website: "persistent.com" },
  VEDL: { sector: "Metals & Mining", industry: "Diversified Metals & Mining", marketCap: "₹1.6L Cr", website: "vedantalimited.com" },
  "M&M": { sector: "Auto", industry: "Passenger & Utility Vehicles", marketCap: "₹3.9L Cr", website: "mahindra.com" },
  MM: { sector: "Auto", industry: "Passenger & Utility Vehicles", marketCap: "₹3.9L Cr", website: "mahindra.com" },
  PIDILITIND: { sector: "Consumer", industry: "Adhesives & Construction Chemicals", marketCap: "₹1.6L Cr", website: "pidilite.com" },
  KPITTECH: { sector: "IT", industry: "Automotive Software", marketCap: "₹0.5L Cr", website: "kpit.com" },
  LTM: { sector: "IT", industry: "IT Services & Consulting", marketCap: "₹1.7L Cr", website: "ltm.com" },
  TATAELXSI: { sector: "IT", industry: "Product Engineering Services", marketCap: "₹0.5L Cr", website: "tataelxsi.com" },
};

export function getCompanyEnrichment(symbol: string): CompanyEnrichment | null {
  return COMPANY_ENRICHMENT[normalizeNseSymbol(symbol)] ?? null;
}
