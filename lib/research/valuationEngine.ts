/**
 * Institutional valuation engine — PE, EV/EBITDA, PEG, DCF architecture, relative & historical bands.
 */

import { createAnalysisContext } from "@/lib/engine/analysis-context";
import { calculateValuation } from "@/lib/engine/calculators/valuation-engine";
import { computeDcfValuation, extractValuationInputs } from "@/lib/valuation";
import type { CompanyContext } from "@/lib/ai/context/companyContext";
import type { FundamentalsBundle } from "@/lib/fundamentals/types";
import type { CompanyProfile, ValuationAnalysis } from "@/types";

export interface DcfValuationPlaceholder {
  available: boolean;
  fairValue: number | null;
  discountRate: number;
  terminalGrowth: number;
  projectionYears: number;
  methodology: string;
  note: string;
}

export interface InstitutionalValuation {
  analysis: ValuationAnalysis;
  pe: ValuationAnalysis["pe"];
  evEbitda: ValuationAnalysis["evEbitda"];
  peg: ValuationAnalysis["peg"];
  relativeValuation: {
    vsPeers: ValuationAnalysis["relativeVsPeers"];
    peerMedianPe: number | null;
    peerCount: number;
  };
  historicalBands: ValuationAnalysis["historicalRange"];
  dcf: DcfValuationPlaceholder;
  fairValue: number;
  intrinsicValue: number;
  marginOfSafety: number;
  upsidePercent: number;
  summary: string;
}

function peerMedianPe(profile: CompanyProfile): number | null {
  const peers = profile.peers.map((peer) => peer.pe).filter((pe) => pe > 0);
  if (peers.length === 0) return null;
  return peers.reduce((sum, pe) => sum + pe, 0) / peers.length;
}

function buildDcfPlaceholder(
  profile: CompanyProfile,
  bundle: FundamentalsBundle | null,
  valuation: ValuationAnalysis
): DcfValuationPlaceholder {
  const ctx = createAnalysisContext(profile, bundle ?? undefined, profile.fundamentals);
  const inputs = extractValuationInputs(ctx);

  try {
    const dcfModel = computeDcfValuation(inputs);
    const available = dcfModel.fairValue > 0;
    return {
      available,
      fairValue: available ? dcfModel.fairValue : null,
      discountRate: 12,
      terminalGrowth: 4,
      projectionYears: 5,
      methodology: "Two-stage DCF with 5-year explicit forecast and terminal value",
      note: available
        ? dcfModel.explanation
        : "DCF requires sufficient cash flow and growth inputs from fundamentals bundle.",
    };
  } catch {
    return {
      available: false,
      fairValue: null,
      discountRate: 12,
      terminalGrowth: 4,
      projectionYears: 5,
      methodology: "Two-stage DCF with 5-year explicit forecast and terminal value",
      note: "DCF model pending complete cash flow statement data.",
    };
  }
}

export function buildInstitutionalValuation(
  context: CompanyContext,
  profile: CompanyProfile,
  bundle: FundamentalsBundle | null
): InstitutionalValuation {
  const analysisCtx = createAnalysisContext(
    profile,
    bundle ?? undefined,
    context.financialIntelligence?.fundamentals ?? profile.fundamentals
  );
  const analysis = calculateValuation(analysisCtx);
  const dcf = buildDcfPlaceholder(profile, bundle, analysis);

  return {
    analysis,
    pe: analysis.pe,
    evEbitda: analysis.evEbitda,
    peg: analysis.peg,
    relativeValuation: {
      vsPeers: analysis.relativeVsPeers,
      peerMedianPe: peerMedianPe(profile),
      peerCount: profile.peers.length,
    },
    historicalBands: analysis.historicalRange,
    dcf,
    fairValue: analysis.estimatedFairValue,
    intrinsicValue: analysis.intrinsicValue,
    marginOfSafety: analysis.marginOfSafety,
    upsidePercent: analysis.upsidePercent,
    summary: analysis.summary,
  };
}

export function formatValuationSection(valuation: InstitutionalValuation): string {
  const lines = [
    valuation.summary,
    ``,
    `| Multiple | Current | Fair | Verdict |`,
    `| --- | --- | --- | --- |`,
    `| P/E | ${valuation.pe.value.toFixed(1)}x | ${valuation.pe.fairValue.toFixed(1)}x | ${valuation.pe.verdict} |`,
    `| EV/EBITDA | ${valuation.evEbitda.value.toFixed(1)}x | ${valuation.evEbitda.fairValue.toFixed(1)}x | ${valuation.evEbitda.verdict} |`,
    `| PEG | ${valuation.peg.value.toFixed(2)}x | ${valuation.peg.fairValue.toFixed(2)}x | ${valuation.peg.verdict} |`,
    ``,
    `**Relative valuation:** ${valuation.relativeValuation.vsPeers}${
      valuation.relativeValuation.peerMedianPe
        ? ` (peer median P/E ${valuation.relativeValuation.peerMedianPe.toFixed(1)}x across ${valuation.relativeValuation.peerCount} peers)`
        : ""
    }`,
    ``,
    `**Historical valuation band:** ${valuation.historicalBands.verdict} (P/E at ${valuation.historicalBands.percentile}th percentile of estimated range)`,
    ``,
    `**Intrinsic fair value:** ₹${valuation.fairValue.toLocaleString("en-IN")} · Margin of safety ${valuation.marginOfSafety.toFixed(1)}% · Upside ${valuation.upsidePercent.toFixed(1)}%`,
    ``,
    `### DCF Architecture`,
    `- Methodology: ${valuation.dcf.methodology}`,
    `- Discount rate: ${valuation.dcf.discountRate}% · Terminal growth: ${valuation.dcf.terminalGrowth}% · Horizon: ${valuation.dcf.projectionYears} years`,
    `- Status: ${valuation.dcf.available ? `Fair value ₹${valuation.dcf.fairValue?.toLocaleString("en-IN")}` : valuation.dcf.note}`,
  ];

  return lines.join("\n");
}
