/**
 * AI Discovery Engine — public exports (Sprint 9D.R6).
 */

export {
  DISCOVERY_EMPTY,
  DISCOVERY_IDEA_CATEGORIES,
  DISCOVERY_KINDS,
  THEME_IDS,
  THEME_LABELS,
  THEME_MATCHERS,
  emptyDiscoveryScoreFactors,
  emptyDiscoveryIdeaCard,
  emptyThemeCard,
  emptySectorRotationCard,
  emptyDiscoveryInsight,
  emptyDiscoveryResult,
  normalizeDiscoveryScoreFactors,
  normalizeDiscoveryIdeaCard,
  normalizeThemeCard,
  normalizeSectorRotationCard,
  normalizeDiscoveryInsight,
} from "./DiscoveryPresentationModels";
export type {
  DiscoveryEmptyMessage,
  DiscoveryIdeaCategory,
  DiscoveryKind,
  ThemeId,
  DiscoveryScoreFactors,
  DiscoveryCandidate,
  DiscoveryIdeaCard,
  ThemeCard,
  SectorRotationCard,
  DiscoveryInsight,
  DiscoveryResult,
} from "./DiscoveryPresentationModels";

export {
  toInstitutionalFromDiscovery,
  composeDiscoveryScoreFactors,
  rankIdeas,
  IdeaRankingEngine,
} from "./IdeaRankingEngine";

export {
  matchThemes,
  discoverThemes,
  ThemeDiscoveryEngine,
} from "./ThemeDiscoveryEngine";

export {
  discoverSectorRotation,
  SectorRotationDiscoveryEngine,
} from "./SectorRotationDiscovery";

export {
  generateInstitutionalIdeas,
  InstitutionalIdeaEngine,
} from "./InstitutionalIdeaEngine";
export type { InstitutionalIdeaOptions } from "./InstitutionalIdeaEngine";

export {
  classifyDiscoveryKinds,
  discoverIdeas,
  OpportunityDiscoveryEngine,
} from "./OpportunityDiscoveryEngine";
export type { OpportunityDiscoveryOptions } from "./OpportunityDiscoveryEngine";

export {
  toDiscoveryCandidate,
  mapToDiscoveryCandidates,
  buildDiscoveryInsights,
  discoverIdeasPublic,
  generateInstitutionalIdeasPublic,
  discoverThemesPublic,
  discoverSectorRotationPublic,
  rankIdeasPublic,
  DiscoveryEngine,
} from "./DiscoveryEngine";
export type { DiscoveryUniverseCandidate } from "./DiscoveryEngine";
