/**
 * Structured recommendation pipeline audit — stage counts + rejection reasons.
 * Diagnostics only; does not change scoring or filters.
 */

export type PipelineAuditStage =
  | "stage1_input_stocks"
  | "stage2_after_enrichment"
  | "stage3_after_technicals"
  | "stage4_after_fundamentals"
  | "stage5_after_scoring"
  | "stage6_after_confidence"
  | "stage7_ui_formatting";

export interface PipelineRejection {
  symbol: string;
  stage: PipelineAuditStage | string;
  reason: string;
}

export interface PipelineAuditSnapshot {
  stage1_inputStocks: number;
  stage2_afterEnrichment: number;
  stage3_afterTechnicals: number;
  stage4_afterFundamentals: number;
  stage5_afterScoring: number;
  stage6_afterConfidence: number;
  stage7_uiFormatting: number;
  firstZeroStage: PipelineAuditStage | null;
  rejectionCounts: Record<string, number>;
  rejectionSamples: PipelineRejection[];
}

const MAX_REJECTION_SAMPLES = 40;

export class PipelineAuditLedger {
  private counts = {
    stage1_inputStocks: 0,
    stage2_afterEnrichment: 0,
    stage3_afterTechnicals: 0,
    stage4_afterFundamentals: 0,
    stage5_afterScoring: 0,
    stage6_afterConfidence: 0,
    stage7_uiFormatting: 0,
  };
  private rejectionCounts: Record<string, number> = {};
  private rejectionSamples: PipelineRejection[] = [];

  setStage(stage: PipelineAuditStage, remaining: number): void {
    switch (stage) {
      case "stage1_input_stocks":
        this.counts.stage1_inputStocks = remaining;
        break;
      case "stage2_after_enrichment":
        this.counts.stage2_afterEnrichment = remaining;
        break;
      case "stage3_after_technicals":
        this.counts.stage3_afterTechnicals = remaining;
        break;
      case "stage4_after_fundamentals":
        this.counts.stage4_afterFundamentals = remaining;
        break;
      case "stage5_after_scoring":
        this.counts.stage5_afterScoring = remaining;
        break;
      case "stage6_after_confidence":
        this.counts.stage6_afterConfidence = remaining;
        break;
      case "stage7_ui_formatting":
        this.counts.stage7_uiFormatting = remaining;
        break;
    }
    console.info(
      `[RecommendationPipeline] ${stageLabel(stage)} Remaining Stocks = ${remaining}`
    );
  }

  reject(
    symbol: string,
    reason: string,
    stage: PipelineAuditStage | string = "stage5_after_scoring"
  ): void {
    const key = reason.trim() || "Unknown rejection";
    this.rejectionCounts[key] = (this.rejectionCounts[key] ?? 0) + 1;
    if (this.rejectionSamples.length < MAX_REJECTION_SAMPLES) {
      this.rejectionSamples.push({ symbol: symbol.toUpperCase(), stage, reason: key });
    }
  }

  snapshot(): PipelineAuditSnapshot {
    const ordered: PipelineAuditStage[] = [
      "stage1_input_stocks",
      "stage2_after_enrichment",
      "stage3_after_technicals",
      "stage4_after_fundamentals",
      "stage5_after_scoring",
      "stage6_after_confidence",
      "stage7_ui_formatting",
    ];
    const values = [
      this.counts.stage1_inputStocks,
      this.counts.stage2_afterEnrichment,
      this.counts.stage3_afterTechnicals,
      this.counts.stage4_afterFundamentals,
      this.counts.stage5_afterScoring,
      this.counts.stage6_afterConfidence,
      this.counts.stage7_uiFormatting,
    ];
    let firstZeroStage: PipelineAuditStage | null = null;
    for (let i = 0; i < values.length; i += 1) {
      if (values[i] === 0) {
        firstZeroStage = ordered[i];
        break;
      }
    }
    return {
      ...this.counts,
      firstZeroStage,
      rejectionCounts: { ...this.rejectionCounts },
      rejectionSamples: [...this.rejectionSamples],
    };
  }

  logSummary(label: string, extra?: Record<string, unknown>): void {
    const snap = this.snapshot();
    console.info(
      `[RecommendationPipeline] ${label}`,
      JSON.stringify({
        Input_Stocks: snap.stage1_inputStocks,
        After_enrichment: snap.stage2_afterEnrichment,
        After_technicals: snap.stage3_afterTechnicals,
        After_fundamentals: snap.stage4_afterFundamentals,
        After_scoring: snap.stage5_afterScoring,
        After_confidence: snap.stage6_afterConfidence,
        Recommendations_to_frontend: snap.stage7_uiFormatting,
        firstZeroStage: snap.firstZeroStage,
        rejectionCounts: snap.rejectionCounts,
        rejectionSamples: snap.rejectionSamples,
        ...extra,
      })
    );
  }
}

function stageLabel(stage: PipelineAuditStage): string {
  switch (stage) {
    case "stage1_input_stocks":
      return "Stage 1 — Input Stocks";
    case "stage2_after_enrichment":
      return "Stage 2 — After data enrichment";
    case "stage3_after_technicals":
      return "Stage 3 — After technical calculations";
    case "stage4_after_fundamentals":
      return "Stage 4 — After fundamental filters";
    case "stage5_after_scoring":
      return "Stage 5 — After recommendation scoring";
    case "stage6_after_confidence":
      return "Stage 6 — After confidence filtering";
    case "stage7_ui_formatting":
      return "Stage 7 — After UI formatting";
  }
}
