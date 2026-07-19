/**
 * NSE sector catalog for command-palette search (presentation only).
 * Links into Markets — no market-data calculations.
 */

export interface SectorCatalogItem {
  id: string;
  name: string;
  keywords: readonly string[];
}

export const NSE_SECTOR_CATALOG: readonly SectorCatalogItem[] = Object.freeze([
  { id: "it", name: "Information Technology", keywords: ["tech", "software", "it"] },
  { id: "bank", name: "Banking", keywords: ["banks", "financials", "bfsi"] },
  { id: "pharma", name: "Pharmaceuticals", keywords: ["healthcare", "drugs"] },
  { id: "auto", name: "Automobile", keywords: ["auto", "ev", "mobility"] },
  { id: "fmcg", name: "FMCG", keywords: ["consumer", "staples"] },
  { id: "energy", name: "Energy", keywords: ["oil", "gas", "power"] },
  { id: "metal", name: "Metals & Mining", keywords: ["steel", "metals", "mining"] },
  { id: "realty", name: "Realty", keywords: ["real estate", "property"] },
  { id: "infra", name: "Infrastructure", keywords: ["infra", "construction"] },
  { id: "telecom", name: "Telecom", keywords: ["communication", "mobile"] },
  { id: "chemicals", name: "Chemicals", keywords: ["specialty", "chemical"] },
  { id: "media", name: "Media & Entertainment", keywords: ["media", "broadcast"] },
  { id: "cement", name: "Cement", keywords: ["building materials"] },
  { id: "insurance", name: "Insurance", keywords: ["life", "general"] },
  { id: "nbfc", name: "NBFC", keywords: ["finance", "lending"] },
]);
