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
  RECOMMENDATION_DRAWER_PLACEHOLDER_SECTIONS,
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
  toDrawerAction,
  type RecommendationDetailContext,
  type RecommendationDrawerAction,
  type RecommendationDrawerSource,
} from "./types";
export { useEnrichedRecommendationContext } from "./useEnrichedRecommendationContext";
