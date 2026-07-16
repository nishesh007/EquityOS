/**
 * Research Copilot — public exports (Sprint 10A.R6).
 */

export {
  COPILOT_EMPTY,
  DECISION_GUIDANCE_IDS,
  QUESTION_INTENTS,
  emptyQuestionAnswer,
  emptyResearchSummary,
  emptyComparisonView,
  emptyDecisionAssistant,
  emptyRecommendations,
  emptyExplainabilityView,
  normalizeLines,
} from "./CopilotPresentationModels";
export type {
  CopilotEmptyMessage,
  DecisionGuidanceId,
  QuestionIntent,
  ExplainabilityContext,
  ResearchQuestionInput,
  ResearchQuestionAnswer,
  ResearchSummaryView,
  ComparisonDimension,
  ResearchComparisonView,
  DecisionGuidance,
  DecisionAssistantView,
  ResearchRecommendationView,
  CopilotExplainabilityView,
} from "./CopilotPresentationModels";

export {
  askResearchQuestion,
  resetResearchQuestions,
} from "./ResearchQuestionEngine";

export {
  generateResearchSummary,
} from "./ResearchSummaryEngine";
export type { GenerateSummaryInput } from "./ResearchSummaryEngine";

export {
  compareResearch,
} from "./ResearchComparisonEngine";
export type { CompareResearchInput } from "./ResearchComparisonEngine";

export {
  buildDecisionAssistant,
} from "./ResearchDecisionAssistant";
export type { BuildDecisionAssistantInput } from "./ResearchDecisionAssistant";

export {
  getResearchRecommendations,
} from "./ResearchRecommendationEngine";
export type { RecommendationInput } from "./ResearchRecommendationEngine";

export {
  buildCopilotExplainability,
  ResearchCopilotEngine,
} from "./ResearchCopilotEngine";
export type { BuildExplainabilityInput } from "./ResearchCopilotEngine";

import { resetResearchQuestions } from "./ResearchQuestionEngine";

export function resetCopilotEngines(): void {
  resetResearchQuestions();
}
