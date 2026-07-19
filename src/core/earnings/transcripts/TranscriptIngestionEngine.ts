/**
 * Transcript ingestion — resolves concall text from seeds / uploads (no new AI pipeline).
 */

import { lookupCompanyMaster } from "@/lib/company-master";
import type { RawTranscriptDocument } from "./TranscriptModels";

interface TranscriptSeed {
  preparedRemarks: string;
  questionAnswer: string;
  hasConferenceCall?: boolean;
}

const MOCK_TRANSCRIPT_SEEDS: Record<string, TranscriptSeed> = {
  RELIANCE: {
    preparedRemarks: `
We delivered a strong quarter with Jio subscriber additions and Reliance Retail store expansion driving growth.
Demand outlook remains constructive across consumer and digital. We raised revenue guidance for retail and digital segments.
O2C margins were resilient despite crude volatility. Capex guidance for new energy remains elevated as we commission solar giga capacity.
Capital allocation priorities stay disciplined — invest in Jio, Retail, and green energy while maintaining the balance sheet.
Pricing power in retail private labels supported margins. Efficiency programs continue across the network.
We see export growth opportunities in petrochemicals and remain confident on execution of the new energy roadmap.
Weakness remains in parts of the O2C chain where utilization was uneven. Raw material costs need monitoring.
Segment highlights: Digital Services accelerated; Retail same-store growth healthy; Oil-to-Chemicals stable.
Future priorities include 5G densification, store additions, and technology investments in AI-led retail.
    `.trim(),
    questionAnswer: `
Analyst: Can you quantify retail margin outlook for the next two quarters?
Management: We expect margins to remain healthy; we will not guide a precise number but demand is strong.
Analyst: Any update on green energy capex phasing?
Management: Capex guidance is maintained; commissioning timelines are on track.
Analyst: How are you thinking about competitive intensity in telecom?
Management: Competition remains rational; we continue to invest in network quality.
Analyst: Can you discuss customer concentration in enterprise digital?
Management: We prefer not to break that out this quarter; follow-up next call.
    `.trim(),
  },
  TCS: {
    preparedRemarks: `
TCS delivered steady growth with a large deal win and GenAI practice expansion. Demand outlook is mixed by vertical but BFSI remains resilient.
We maintained revenue guidance and indicated margin guidance is stable with efficiency programs offsetting wage costs.
Hiring plans remain selective; we continue technology investments in AI Cloud.
New contracts and capacity expansion in delivery centers support medium-term growth. Pricing outlook is stable.
Weaknesses: discretionary spend soft in parts of North America manufacturing. Currency movements created a modest headwind.
Capital allocation remains shareholder friendly with buybacks continuing. Management is confident on execution of the AI roadmap.
Segment highlights: Banking strong; Retail cautious; Manufacturing soft.
Future priorities: accelerate GenAI deals, deepen client mining, and protect operating margins.
    `.trim(),
    questionAnswer: `
Analyst: Why was manufacturing demand weak this quarter?
Management: Clients deferred discretionary programs; we see a gradual recovery.
Analyst: Are you raising FY revenue guidance?
Management: Guidance is maintained; deal pipeline is healthy.
Analyst: Any risk from currency volatility?
Management: We hedge a portion of exposure; residual impact remains.
Analyst: Can you quantify attrition and hiring plans?
Management: Hiring remains calibrated; we will share more next quarter.
    `.trim(),
  },
  HDFCBANK: {
    preparedRemarks: `
Credit growth remained healthy and deposit traction improved. We guided for continued loan growth with a constructive demand outlook.
Margin guidance is cautious near term due to funding costs. Capex is not a material theme; technology investments continue.
Asset quality commentary was stable. Regulatory and competitive intensity in unsecured loans warrants monitoring.
Management tone was confident on franchise strength but acknowledged execution risk in deposit mobilization.
Capital allocation remains focused on organic growth. Strong demand in retail assets; weak demand pockets in unsecured.
Segment highlights: Retail assets healthy; Wholesale steady; Payments growing.
Future priorities: deepen liability franchise, digitize onboarding, and protect NIMs.
    `.trim(),
    questionAnswer: `
Analyst: How should we think about NIM trajectory?
Management: Near-term pressure persists; we expect gradual stabilization.
Analyst: Any guidance cut on loan growth?
Management: No cut — demand outlook remains constructive.
Analyst: Customer concentration in wholesale book?
Management: Diversified book; we monitor large exposures closely.
Analyst: Regulatory risk on unsecured?
Management: We are comfortable with current underwriting standards.
    `.trim(),
  },
  INFY: {
    preparedRemarks: `
Infosys reported steady performance. Large deal TCV improved and pricing outlook is stable. We maintained guidance.
Demand outlook is selective with strong cloud and AI programs. Hiring plans remain muted as utilization improves.
Efficiency programs and technology investments support margins. Export growth remains the core engine.
Weaknesses include prolonged deal cycles in Europe. Currency is a watch item.
Management is confident but flagged execution risk on large transformation programs.
    `.trim(),
    questionAnswer: `
Analyst: Is guidance being raised this quarter?
Management: Guidance maintained; pipeline conversion is the key monitor.
Analyst: What about margin risk from wage hikes?
Management: Efficiency programs should offset; margins guided stable.
    `.trim(),
  },
  SBIN: {
    preparedRemarks: `
SBI delivered solid credit growth with stable asset quality. Demand outlook for retail and MSME is constructive.
Margin guidance is stable. We continue technology investments and branch efficiency programs.
Regulatory environment remains a focus. Competition in liabilities is elevated.
Capital allocation supports growth with comfortable CRAR. Management confident on franchise momentum.
    `.trim(),
    questionAnswer: `
Analyst: Any stress in unsecured retail?
Management: Trends are manageable; watch items are under review.
Analyst: Deposit growth guidance?
Management: We expect healthy deposit accretion through the year.
    `.trim(),
  },
  LT: {
    preparedRemarks: `
Order inflows were healthy with government orders and export growth contributing. We raised revenue guidance for the projects portfolio.
Margin guidance is stable. Capex guidance supports capacity expansion in factories.
Execution risk on large projects remains the key watch. Supply chain and raw material costs need monitoring.
Strong demand in infrastructure; pricing power varies by segment.
    `.trim(),
    questionAnswer: `
Analyst: Can you break out international order mix?
Management: Export growth is improving; details in the presentation.
Analyst: Any guidance cut risk if execution slips?
Management: We remain on track; no cut contemplated.
    `.trim(),
  },
  WIPRO: {
    preparedRemarks: `
Performance was mixed. Demand outlook is cautious in parts of Americas. Guidance was trimmed on revenue; margin guidance maintained.
Hiring plans remain conservative. Efficiency programs are the priority.
Weak demand in consulting; technology investments continue in AI agents.
Management acknowledged competitive pressure and execution risk.
    `.trim(),
    questionAnswer: `
Analyst: Why the guidance cut?
Management: Deal closures slipped; we are resetting near-term expectations.
Analyst: Margin defense plan?
Management: Utilization and pyramid actions are underway.
    `.trim(),
  },
};

function cacheKey(ticker: string, resultDate: string): string {
  return `${ticker.trim().toUpperCase()}::${resultDate}`;
}

export class TranscriptIngestionEngine {
  private readonly cache = new Map<string, RawTranscriptDocument>();

  clearCache(): void {
    this.cache.clear();
  }

  getCached(ticker: string, resultDate: string): RawTranscriptDocument | null {
    return this.cache.get(cacheKey(ticker, resultDate)) ?? null;
  }

  ingest(input: {
    ticker: string;
    resultDate: string;
    quarter?: string;
    financialYear?: string;
    preparedRemarks?: string;
    questionAnswer?: string;
  }): RawTranscriptDocument {
    const ticker = input.ticker.trim().toUpperCase();
    const key = cacheKey(ticker, input.resultDate);
    const cached = this.cache.get(key);
    if (cached) return cached;

    const seed = MOCK_TRANSCRIPT_SEEDS[ticker];
    const master = lookupCompanyMaster(ticker);
    const prepared =
      input.preparedRemarks?.trim() ||
      seed?.preparedRemarks ||
      "";
    const qa = input.questionAnswer?.trim() || seed?.questionAnswer || "";

    const hasText = prepared.length > 40 || qa.length > 40;
    const doc: RawTranscriptDocument = {
      ticker,
      resultDate: input.resultDate,
      quarter: input.quarter ?? "—",
      financialYear: input.financialYear ?? "—",
      companyName: master?.name ?? ticker,
      hasConferenceCall: seed?.hasConferenceCall ?? hasText,
      preparedRemarks: prepared,
      questionAnswer: qa,
      source: input.preparedRemarks || input.questionAnswer
        ? "upload"
        : seed
          ? "seed"
          : "none",
    };

    this.cache.set(key, doc);
    return doc;
  }
}

let ingestionSingleton: TranscriptIngestionEngine | null = null;

export function getTranscriptIngestionEngine(): TranscriptIngestionEngine {
  if (!ingestionSingleton) ingestionSingleton = new TranscriptIngestionEngine();
  return ingestionSingleton;
}

export function resetTranscriptIngestionEngine(): void {
  ingestionSingleton?.clearCache();
  ingestionSingleton = null;
}

export function hasTranscriptSeed(ticker: string): boolean {
  return Boolean(MOCK_TRANSCRIPT_SEEDS[ticker.trim().toUpperCase()]);
}
