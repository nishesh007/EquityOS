/**
 * Sprint 10C.R5 — motion class presets.
 *
 * Named entrance/interaction animations mapping to the keyframes registered
 * in tailwind.config.ts. All are suppressed under reduced motion via the
 * `[data-motion="reduced"]` rule in styles/globals.css.
 */

export type MotionPresetName =
  | "fade"
  | "scale"
  | "slide"
  | "reveal"
  | "cardHover"
  | "tooltip"
  | "dropdown"
  | "modal"
  | "pageTransition"
  | "progress";

export const MOTION_CLASSES: Readonly<Record<MotionPresetName, string>> =
  Object.freeze({
    fade: "animate-fade-in",
    scale: "animate-scale-in",
    slide: "animate-slide-in",
    reveal: "animate-fade-in-up",
    cardHover:
      "transition-[box-shadow,border-color,transform] duration-200 hover:-translate-y-0.5 hover:shadow-floating",
    tooltip: "animate-fade-in",
    dropdown: "animate-scale-in origin-top",
    modal: "animate-scale-in",
    pageTransition: "animate-fade-in-up",
    progress: "transition-[width,stroke-dashoffset] duration-500 ease-out",
  });

export const MOTION_PRESET_NAMES: readonly MotionPresetName[] = Object.freeze(
  Object.keys(MOTION_CLASSES) as MotionPresetName[]
);
