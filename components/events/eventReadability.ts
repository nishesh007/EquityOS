/**
 * Event Intelligence readability tokens (typography / contrast pass).
 * Prefer these over text-text-faint for research-dense surfaces.
 */

/** Primary headings / page titles */
export const EI_HEADING = "text-text-primary";

/** Section titles — bright, scannable */
export const EI_SECTION =
  "text-[10px] font-semibold uppercase tracking-[0.12em] text-text-primary";

/** Subsection labels inside cards */
export const EI_LABEL =
  "text-[10px] font-semibold uppercase tracking-[0.1em] text-text-secondary";

/** Compact field labels (dt / meta) */
export const EI_META = "text-[10px] font-medium text-text-muted";

/** Body / paragraph copy */
export const EI_BODY = "text-xs leading-relaxed text-text-secondary";

/** Emphasized body (executive narrative) */
export const EI_BODY_EMPHASIS = "text-xs leading-relaxed text-text-primary";

/** Secondary supporting line */
export const EI_SUPPORT = "text-[11px] leading-relaxed text-text-secondary";

/** Empty / placeholder copy */
export const EI_EMPTY = "text-[11px] text-text-muted";

/** Table header */
export const EI_TABLE_HEAD =
  "bg-surface-overlay/70 text-[10px] font-semibold uppercase tracking-wide text-text-secondary";

/** Table body row */
export const EI_TABLE_ROW =
  "border-t border-surface-border-subtle/80 text-text-primary transition-colors hover:bg-surface-hover/40";

/** Metric value */
export const EI_VALUE = "text-xs font-medium text-text-primary";
