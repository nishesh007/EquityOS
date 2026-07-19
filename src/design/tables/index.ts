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
  applySortClick,
  resolveSortStack,
  sortRowsMulti,
  filterRowsAdvanced,
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
  SortSpec,
  RangeFilter,
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

export {
  listSavedViews,
  saveNamedView,
  deleteNamedView,
  applyNamedView,
  BUILTIN_VIEW_PRESETS,
} from "./savedViews";
export type { SavedTableView } from "./savedViews";

export { InstitutionalTable } from "./InstitutionalTable";
export type { BulkAction } from "./InstitutionalTable";

export { ResearchDataGrid } from "./ResearchDataGrid";
export type { ResearchDataGridProps } from "./ResearchDataGrid";

export { AdvancedFilterBar } from "./AdvancedFilterBar";
export { highlightSearchText } from "./searchHighlight";
