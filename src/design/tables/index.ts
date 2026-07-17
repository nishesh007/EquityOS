/** Sprint 10C.R4 — institutional table framework. */

export {
  createInstitutionalTable,
  registerColumn,
  processTable,
  sortRows,
  searchRows,
  filterRows,
  paginateRows,
  visibleColumns,
  columnValue,
  toggleColumnVisibility,
  moveColumn,
  setColumnWidth,
  resetTableLayout,
  moveFocus,
  toCsv,
  cycleDensity,
  isColumnSearchable,
  defaultColumnAlign,
  DENSITY_MODES,
  DENSITY_LABELS,
  DENSITY_CELL_CLASSES,
  NUMERIC_CELL_KINDS,
} from "./tableEngine";
export type {
  CellKind,
  CellAlign,
  CellPosition,
  DensityMode,
  InstitutionalTableConfig,
  InstitutionalTableDef,
  ProcessedTable,
  SortDirection,
  TableColumn,
  TableState,
} from "./tableEngine";

export {
  saveTablePreferences,
  restoreTablePreferences,
  clearTablePreferences,
  applyTablePreferences,
  tablePreferencesFromState,
} from "./tablePreferences";
export type { TablePreferences } from "./tablePreferences";

export { InstitutionalTable } from "./InstitutionalTable";
export type { BulkAction } from "./InstitutionalTable";
