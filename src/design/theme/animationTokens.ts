/**
 * Motion tokens for the EquityOS design system.
 * Components must reference duration/easing tokens — never hardcoded values.
 * Reduced-motion preferences are honored globally in styles/globals.css.
 */

export const DURATIONS_MS = Object.freeze({
  instant: 0,
  fast: 120,
  normal: 200,
  slow: 320,
  slower: 500,
  skeleton: 1400,
} as const);

export type DurationToken = keyof typeof DURATIONS_MS;

export const EASINGS = Object.freeze({
  standard: "cubic-bezier(0.4, 0, 0.2, 1)",
  decelerate: "cubic-bezier(0, 0, 0.2, 1)",
  accelerate: "cubic-bezier(0.4, 0, 1, 1)",
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
} as const);

export type EasingToken = keyof typeof EASINGS;

export interface AnimationPreset {
  duration: DurationToken;
  easing: EasingToken;
  /** CSS properties the preset transitions/animates. */
  properties: readonly string[];
}

export type AnimationPresetName =
  | "hover"
  | "cardElevation"
  | "fade"
  | "scale"
  | "slide"
  | "loading"
  | "skeleton";

export const ANIMATION_PRESETS: Readonly<
  Record<AnimationPresetName, AnimationPreset>
> = Object.freeze({
  hover: {
    duration: "fast",
    easing: "standard",
    properties: ["background-color", "border-color", "color"],
  },
  cardElevation: {
    duration: "normal",
    easing: "decelerate",
    properties: ["box-shadow", "transform", "border-color"],
  },
  fade: {
    duration: "normal",
    easing: "standard",
    properties: ["opacity"],
  },
  scale: {
    duration: "normal",
    easing: "spring",
    properties: ["transform", "opacity"],
  },
  slide: {
    duration: "slow",
    easing: "decelerate",
    properties: ["transform", "opacity"],
  },
  loading: {
    duration: "slower",
    easing: "standard",
    properties: ["opacity", "transform"],
  },
  skeleton: {
    duration: "skeleton",
    easing: "standard",
    properties: ["opacity"],
  },
});

/** Build a CSS transition string from a preset. */
export function transitionFor(name: AnimationPresetName): string {
  const preset = ANIMATION_PRESETS[name];
  const duration = `${DURATIONS_MS[preset.duration]}ms`;
  const easing = EASINGS[preset.easing];
  return preset.properties
    .map((property) => `${property} ${duration} ${easing}`)
    .join(", ");
}
