/**
 * Sector Impact Matrix Engine (Sprint 10D.4).
 */

import { getEventCategory } from "@/constants/eventTypes";
import type { EventIntelligenceEvent } from "@/types/event";
import type {
  NseSector,
  SectorImpactAnalysis,
  SectorImpactRow,
  SectorImpactTone,
} from "@/types/eventIntelligence";
import { NSE_SECTORS } from "@/types/eventIntelligence";
import { resolveSector } from "@/src/core/events/intelligence/constants";

const DEFAULT_TONE: SectorImpactTone = "neutral";

function bump(
  map: Map<NseSector, { tone: SectorImpactTone; note: string }>,
  sector: NseSector,
  tone: SectorImpactTone,
  note: string
) {
  const rank: Record<SectorImpactTone, number> = {
    strong_negative: 0,
    negative: 1,
    neutral: 2,
    positive: 3,
    strong_positive: 4,
  };
  const existing = map.get(sector);
  if (!existing || Math.abs(rank[tone] - 2) >= Math.abs(rank[existing.tone] - 2)) {
    map.set(sector, { tone, note });
  }
}

function templateForType(event: EventIntelligenceEvent): Array<{
  sector: NseSector;
  tone: SectorImpactTone;
  note: string;
}> {
  const category = getEventCategory(event.eventType);
  switch (event.eventType) {
    case "rbi_policy":
    case "repo_rate":
      return [
        { sector: "Banking", tone: "strong_positive", note: "Credit impulse / valuation beta" },
        { sector: "NBFC", tone: "positive", note: "Funding cost relief on cuts" },
        { sector: "Real Estate", tone: "positive", note: "Rate-sensitive demand" },
        { sector: "Auto", tone: "positive", note: "EMI affordability" },
        { sector: "Insurance", tone: "negative", note: "Yield / float sensitivity" },
      ];
    case "fed_meeting":
    case "nfp":
      return [
        { sector: "IT", tone: "positive", note: "USD / global risk channel" },
        { sector: "Metals", tone: "positive", note: "Global beta" },
        { sector: "Banking", tone: "neutral", note: "Indirect via FII flows" },
        { sector: "Energy", tone: "neutral", note: "Oil / USDINR spillover" },
      ];
    case "gdp":
    case "quarterly_gdp":
    case "iip":
      return [
        { sector: "Capital Goods", tone: "strong_positive", note: "Cyclical growth beta" },
        { sector: "Infrastructure", tone: "strong_positive", note: "Capex cycle" },
        { sector: "Metals", tone: "positive", note: "Industrial demand" },
        { sector: "Banking", tone: "positive", note: "Credit growth" },
        { sector: "FMCG", tone: "neutral", note: "Defensive rotation risk on beat" },
      ];
    case "cpi":
    case "core_cpi":
      return [
        { sector: "FMCG", tone: "positive", note: "Soft print supports volumes / rates" },
        { sector: "Banking", tone: "negative", note: "Hot print delays easing" },
        { sector: "NBFC", tone: "negative", note: "Funding cost risk on hot CPI" },
      ];
    case "quarterly_results":
    case "annual_results":
      return event.sector
        ? [
            {
              sector: resolveSector(event.sector) ?? "IT",
              tone: "positive",
              note: "Issuer / peer sentiment",
            },
          ]
        : [];
    case "dividend":
      return [
        { sector: resolveSector(event.sector ?? "") ?? "FMCG", tone: "positive", note: "Income / yield support" },
      ];
    default:
      if (category === "corporate_actions") {
        return [
          {
            sector: resolveSector(event.sector ?? "") ?? "Banking",
            tone: "neutral",
            note: "Stock-specific corporate action",
          },
        ];
      }
      return [];
  }
}

export function computeSectorImpactMatrix(
  event: EventIntelligenceEvent
): SectorImpactAnalysis {
  const map = new Map<NseSector, { tone: SectorImpactTone; note: string }>();
  for (const sector of NSE_SECTORS) {
    map.set(sector, { tone: DEFAULT_TONE, note: "No direct mapping." });
  }

  for (const row of templateForType(event)) {
    bump(map, row.sector, row.tone, row.note);
  }

  for (const label of event.macroDetail?.sectorImpact.positive ?? []) {
    const sector = resolveSector(label);
    if (sector) bump(map, sector, "positive", `Catalog beneficiary: ${label}`);
  }
  for (const label of event.macroDetail?.sectorImpact.negative ?? []) {
    const sector = resolveSector(label);
    if (sector) bump(map, sector, "negative", `Catalog risk: ${label}`);
  }

  // Promote strong tones when template already marks positive and catalog agrees.
  const templateSectors = new Set(
    templateForType(event)
      .filter((t) => t.tone === "positive" || t.tone === "strong_positive")
      .map((t) => t.sector)
  );
  for (const label of event.macroDetail?.sectorImpact.positive ?? []) {
    const sector = resolveSector(label);
    if (!sector || !templateSectors.has(sector)) continue;
    const cur = map.get(sector);
    if (cur?.tone === "positive") {
      bump(map, sector, "strong_positive", cur.note);
    }
  }

  const rows: SectorImpactRow[] = NSE_SECTORS.map((sector) => {
    const entry = map.get(sector) ?? { tone: DEFAULT_TONE, note: "No direct mapping." };
    return { sector, tone: entry.tone, note: entry.note };
  });

  const primaryBeneficiaries = rows
    .filter((r) => r.tone === "strong_positive" || r.tone === "positive")
    .map((r) => r.sector);
  const primaryRisks = rows
    .filter((r) => r.tone === "strong_negative" || r.tone === "negative")
    .map((r) => r.sector);

  return { rows, primaryBeneficiaries, primaryRisks };
}

export const sectorImpactEngine = {
  compute: computeSectorImpactMatrix,
};
