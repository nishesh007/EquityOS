/** Sprint 10C.R5 — motion system. */

export {
  MOTION_PREFERENCES,
  MOTION_STORAGE_KEY,
  getMotionPreference,
  setMotionPreference,
  hydrateMotionFromStorage,
  resolveEffectiveMotion,
  type MotionPreference,
} from "./motionPreference";

export {
  MOTION_CLASSES,
  MOTION_PRESET_NAMES,
  FOCUS_RING_CLASS,
  type MotionPresetName,
} from "./motionPresets";

export { CountUp } from "./CountUp";
