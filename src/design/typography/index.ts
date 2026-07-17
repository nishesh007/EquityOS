/** Sprint 10C.R5 — professional typography system. */

export {
  TYPE_SCALE,
  TYPE_CLASSES,
  TYPE_VARIANTS,
  type TypeVariant,
} from "./typeScale";

export {
  FONT_SCALES,
  FONT_SCALE_LABELS,
  FONT_SCALE_ROOT_PX,
  FONT_SCALE_STORAGE_KEY,
  getFontScale,
  setFontScale,
  hydrateFontScaleFromStorage,
  type FontScale,
} from "./fontScale";

export { Text } from "./Text";
