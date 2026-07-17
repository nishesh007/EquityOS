/**
 * Institutional table styling tokens. The concrete CSS lives in
 * styles/globals.css under `.institutional-table`; these constants are the
 * canonical class names so components never hand-write table chrome.
 */

export const TABLE_CLASSES = Object.freeze({
  /** Scroll container that enables the sticky header. */
  container: "institutional-table-container",
  /** Applied to <table>. Sticky header, hover rows, aligned numerics. */
  table: "institutional-table",
  /** Right-aligned numeric cell (tabular numerals). */
  numericCell: "institutional-table-numeric",
  /** Highlighted row (selection / emphasis). */
  highlightRow: "institutional-table-highlight",
} as const);

export type TableClassToken = keyof typeof TABLE_CLASSES;

export const TABLE_CLASS_TOKENS: readonly TableClassToken[] = Object.freeze([
  "container",
  "table",
  "numericCell",
  "highlightRow",
]);
