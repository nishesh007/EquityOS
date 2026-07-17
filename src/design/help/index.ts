/**
 * Sprint 10C.R7 — help center barrel.
 */

export {
  getShortcutGroups,
  GLOSSARY,
  GUIDES,
  FAQ,
  RELEASE_NOTES,
  type HelpShortcutGroup,
  type GlossaryEntry,
  type HelpGuide,
  type FaqEntry,
  type ReleaseNote,
} from "./helpContent";
export {
  ONBOARDING_STEPS,
  shouldShowOnboarding,
  dismissOnboarding,
  resetOnboarding,
  type OnboardingStep,
  type OnboardingStorage,
} from "./onboarding";
export { HelpCenter } from "./HelpCenter";
export { OnboardingTour } from "./OnboardingTour";
export { RichTooltip, type RichTooltipProps } from "./RichTooltip";
