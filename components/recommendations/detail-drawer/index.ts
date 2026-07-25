export { RecommendationDetailDrawer } from "./RecommendationDetailDrawer";
export {
  RecommendationDetailDrawerProvider,
  useOptionalRecommendationDetailDrawer,
  useRecommendationDetailDrawer,
} from "./RecommendationDetailDrawerProvider";
export { RecommendationDrawerHeader } from "./RecommendationDrawerHeader";
export {
  RecommendationDrawerSections,
  RECOMMENDATION_DRAWER_SECTIONS,
} from "./RecommendationDrawerSections";
export { RecommendationDrawerSidebar } from "./RecommendationDrawerSidebar";
export {
  buildExecutiveDecisionView,
  convictionBandFromScore,
  toDecisionAction,
  type ExecutiveDecisionView,
} from "@/lib/recommendations/executive-decision-presenter";
export {
  fromSharedRecommendation,
  fromStrategyPick,
  fromUnavailableSymbol,
  toDrawerAction,
  type RecommendationDetailContext,
  type RecommendationDrawerAction,
  type RecommendationDrawerSource,
} from "./types";
export { useEnrichedRecommendationContext } from "./useEnrichedRecommendationContext";
export { useResearchIntelligence } from "./useResearchIntelligence";
export { useInstitutionalTrust } from "./useInstitutionalTrust";
export {
  buildResearchIntelligenceView,
  buildEmptyResearchIntelligenceView,
  type ResearchIntelligenceView,
} from "@/lib/recommendations/research-intelligence-presenter";
export {
  buildInstitutionalTrustView,
  buildEmptyInstitutionalTrustView,
  type InstitutionalTrustView,
} from "@/lib/recommendations/institutional-trust-presenter";
