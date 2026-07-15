/**
 * Institutional Earnings Transcript Intelligence — domain models (Sprint 9B.R4).
 */

export type TranscriptSentiment =
  | "Very Positive"
  | "Positive"
  | "Neutral"
  | "Negative"
  | "Very Negative";

export type GuidanceDirection = "Raised" | "Cut" | "Maintained" | "Not Discussed";

export type TranscriptBadgeId =
  | "Guidance Raised"
  | "Guidance Cut"
  | "Management Confident"
  | "Execution Risk"
  | "Positive Commentary"
  | "Negative Commentary"
  | "Capital Allocation"
  | "Strong Demand"
  | "Weak Demand";

export type RiskCategory =
  | "Demand Risk"
  | "Margin Risk"
  | "Competition"
  | "Currency"
  | "Regulatory"
  | "Execution"
  | "Supply Chain"
  | "Raw Material"
  | "Pricing"
  | "Customer Concentration";

export type CatalystCategory =
  | "New Products"
  | "Capacity Expansion"
  | "New Contracts"
  | "Acquisitions"
  | "Government Orders"
  | "Export Growth"
  | "Pricing Power"
  | "Efficiency Programs"
  | "Technology Investments";

export const TRANSCRIPT_EMPTY = {
  transcriptAwaited: "Transcript Awaited",
  transcriptNotAvailable: "Transcript Not Available",
  commentaryPending: "Management Commentary Pending",
  noConferenceCall: "No Conference Call",
} as const;

export interface RawTranscriptDocument {
  ticker: string;
  resultDate: string;
  quarter: string;
  financialYear: string;
  companyName: string;
  hasConferenceCall: boolean;
  preparedRemarks: string;
  questionAnswer: string;
  source: "seed" | "upload" | "rag" | "none";
}

export interface TranscriptSummaryView {
  executiveSummary: string;
  topManagementQuotes: string[];
  keyBusinessUpdates: string[];
  segmentHighlights: string[];
  growthDrivers: string[];
  weaknesses: string[];
  capitalAllocation: string;
  demandOutlook: string;
  managementGuidance: string;
  futurePriorities: string[];
  operationalCommentary: string;
  available: boolean;
  emptyMessage: string;
}

export interface ManagementSentimentView {
  overall: TranscriptSentiment;
  confidence: string;
  managementConfidence: string;
  guidanceConfidence: string;
  executionConfidence: string;
  available: boolean;
  emptyMessage: string;
}

export interface GuidanceItem {
  topic: string;
  current: string;
  previous: string;
  direction: GuidanceDirection;
}

export interface GuidanceChangesView {
  items: GuidanceItem[];
  available: boolean;
  emptyMessage: string;
}

export interface ExtractedRisk {
  category: RiskCategory;
  detail: string;
}

export interface ExtractedRisksView {
  risks: ExtractedRisk[];
  available: boolean;
  emptyMessage: string;
}

export interface ExtractedCatalyst {
  category: CatalystCategory;
  detail: string;
}

export interface CatalystsView {
  catalysts: ExtractedCatalyst[];
  available: boolean;
  emptyMessage: string;
}

export interface QuestionAnalysisView {
  topAnalystQuestions: string[];
  managementResponses: string[];
  questionsAvoided: string[];
  importantFollowUps: string[];
  areasOfConcern: string[];
  available: boolean;
  emptyMessage: string;
}

export interface TranscriptResearchView {
  ticker: string;
  resultDate: string;
  summary: TranscriptSummaryView;
  sentiment: ManagementSentimentView;
  guidance: GuidanceChangesView;
  risks: ExtractedRisksView;
  catalysts: CatalystsView;
  questions: QuestionAnalysisView;
  positiveSignals: string[];
  negativeSignals: string[];
  aiVerdict: string;
  confidence: string;
  badges: TranscriptBadgeId[];
  available: boolean;
  emptyMessage: string;
}

export interface TranscriptDrawerSectionView {
  title: string;
  research: TranscriptResearchView;
}
