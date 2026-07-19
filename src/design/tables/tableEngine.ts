/**
 * Sprint 10C.R4 — Institutional table engine.
 *
 * Pure presentation logic: column registry, sorting, filtering, search,
 * pagination, density modes, column customization and keyboard navigation.
 * No business logic, no data fetching — operates on rows it is given.
 */

/** Cell kinds understood by the institutional cell renderer. */
export type CellKind =
  | "text"
  | "number"
  | "price"
  | "percent"
  | "currency"
  | "badge"
  | "tag"
  | "trend"
  | "sparkline"
  | "gauge"
  | "progress"
  | "risk"
  | "status"
  | "date";

/** Cell kinds rendered right-aligned in monospace numerals. */
export const NUMERIC_CELL_KINDS: readonly CellKind[] = [
  "number",
  "price",
  "percent",
  "currency",
  "trend",
  "gauge",
  "progress",
];

export type CellAlign = "left" | "right" | "center";

export interface TableColumn<Row = Record<string, unknown>> {
  id: string;
  label: string;
  kind: CellKind;
  /** Value extractor. Defaults to `row[id]`. */
  accessor?: (row: Row) => unknown;
  align?: CellAlign;
  /** Defaults to true. */
  sortable?: boolean;
  /** Included in global search. Defaults to true for textual kinds. */
  searchable?: boolean;
  /** Hidden by default (user can enable via column menu). */
  hidden?: boolean;
  /** Preferred width in px (user-resizable). */
  width?: number;
  minWidth?: number;
  /** Sticky first column support. */
  sticky?: boolean;
  /** Optional column group header. */
  group?: string;
}

export type SortDirection = "asc" | "desc";

export interface SortSpec {
  columnId: string;
  direction: SortDirection;
}

export type DensityMode = "comfortable" | "compact" | "ultra";

export const DENSITY_MODES: readonly DensityMode[] = [
  "comfortable",
  "compact",
  "ultra",
];

/** Spec labels: Spacious / Comfortable / Compact. */
export const DENSITY_LABELS: Record<DensityMode, string> = {
  comfortable: "Spacious",
  compact: "Comfortable",
  ultra: "Compact",
};

/** Cell padding / text-size classes per density mode. */
export const DENSITY_CELL_CLASSES: Record<DensityMode, string> = {
  comfortable: "px-3 py-3 text-sm",
  compact: "px-2.5 py-1.5 text-xs",
  ultra: "px-2 py-1 text-[11px]",
};

export function cycleDensity(mode: DensityMode): DensityMode {
  const index = DENSITY_MODES.indexOf(mode);
  return DENSITY_MODES[(index + 1) % DENSITY_MODES.length];
}

/** Numeric / date range filter (inclusive). */
export interface RangeFilter {
  min?: number | null;
  max?: number | null;
}

export interface TableState {
  /** Primary sort (backward compatible). */
  sort: SortSpec | null;
  /** Multi-column sort — applied left-to-right after `sort` when present. */
  sorts: readonly SortSpec[];
  search: string;
  /** Per-column substring filters (case-insensitive). */
  filters: Record<string, string>;
  /** Per-column numeric range filters. */
  rangeFilters: Record<string, RangeFilter>;
  /** Multi-select equality filters (string values). */
  multiFilters: Record<string, readonly string[]>;
  page: number;
  pageSize: number;
  density: DensityMode;
  hiddenColumns: readonly string[];
  columnOrder: readonly string[];
  columnWidths: Record<string, number>;
  /** Extra pinned column ids (in addition to column.sticky). */
  pinLeft: readonly string[];
  pinRight: readonly string[];
}


export interface InstitutionalTableConfig<Row> {
  /** Unique id — also used as the preferences persistence key. */
  id: string;
  columns: readonly TableColumn<Row>[];
  pageSize?: number;
  density?: DensityMode;
  defaultSort?: { columnId: string; direction: SortDirection };
}

export interface InstitutionalTableDef<Row> {
  id: string;
  columns: readonly TableColumn<Row>[];
  defaultState: TableState;
}

const TEXTUAL_KINDS: readonly CellKind[] = [
  "text",
  "badge",
  "tag",
  "status",
  "risk",
  "date",
];

export function isColumnSearchable(column: TableColumn<never>): boolean {
  if (column.searchable !== undefined) return column.searchable;
  return TEXTUAL_KINDS.includes(column.kind);
}

export function defaultColumnAlign(column: TableColumn<never>): CellAlign {
  if (column.align) return column.align;
  return NUMERIC_CELL_KINDS.includes(column.kind) ? "right" : "left";
}

/**
 * Public API — build an institutional table definition with a derived
 * default state (order, visibility, sizing, density, pagination).
 */
export function createInstitutionalTable<Row>(
  config: InstitutionalTableConfig<Row>
): InstitutionalTableDef<Row> {
  const columns = config.columns.map((column) => ({ ...column }));
  const defaultState: TableState = {
    sort: config.defaultSort ?? null,
    sorts: config.defaultSort ? [config.defaultSort] : [],
    search: "",
    filters: {},
    rangeFilters: {},
    multiFilters: {},
    page: 0,
    pageSize: config.pageSize ?? 25,
    density: config.density ?? "comfortable",
    hiddenColumns: columns
      .filter((column) => column.hidden)
      .map((column) => column.id),
    columnOrder: columns.map((column) => column.id),
    columnWidths: Object.fromEntries(
      columns
        .filter((column) => column.width !== undefined)
        .map((column) => [column.id, column.width as number])
    ),
    pinLeft: columns.filter((c) => c.sticky).map((c) => c.id),
    pinRight: [],
  };
  return { id: config.id, columns, defaultState };
}

/**
 * Public API — register an additional column on an existing table
 * definition. Returns a new definition (does not mutate).
 */
export function registerColumn<Row>(
  table: InstitutionalTableDef<Row>,
  column: TableColumn<Row>
): InstitutionalTableDef<Row> {
  if (table.columns.some((existing) => existing.id === column.id)) {
    throw new Error(`Column "${column.id}" already registered on "${table.id}"`);
  }
  return {
    ...table,
    columns: [...table.columns, column],
    defaultState: {
      ...table.defaultState,
      columnOrder: [...table.defaultState.columnOrder, column.id],
      hiddenColumns: column.hidden
        ? [...table.defaultState.hiddenColumns, column.id]
        : table.defaultState.hiddenColumns,
    },
  };
}

export function columnValue<Row>(column: TableColumn<Row>, row: Row): unknown {
  if (column.accessor) return column.accessor(row);
  return (row as Record<string, unknown>)[column.id];
}

function comparableValue(value: unknown): { num: number | null; text: string } {
  if (typeof value === "number" && Number.isFinite(value)) {
    return { num: value, text: String(value) };
  }
  if (value === null || value === undefined) return { num: null, text: "" };
  const text = String(value);
  return { num: null, text };
}

export function sortRows<Row>(
  rows: readonly Row[],
  column: TableColumn<Row>,
  direction: SortDirection
): Row[] {
  const factor = direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const va = comparableValue(columnValue(column, a));
    const vb = comparableValue(columnValue(column, b));
    // Null/missing values always sink to the bottom regardless of direction.
    const aMissing = va.num === null && va.text === "";
    const bMissing = vb.num === null && vb.text === "";
    if (aMissing && bMissing) return 0;
    if (aMissing) return 1;
    if (bMissing) return -1;
    if (va.num !== null && vb.num !== null) return (va.num - vb.num) * factor;
    return va.text.localeCompare(vb.text, undefined, { numeric: true }) * factor;
  });
}

export function searchRows<Row>(
  rows: readonly Row[],
  columns: readonly TableColumn<Row>[],
  query: string
): Row[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...rows];
  const searchable = columns.filter((column) => isColumnSearchable(column));
  return rows.filter((row) =>
    searchable.some((column) => {
      const value = columnValue(column, row);
      return value !== null && value !== undefined
        ? String(value).toLowerCase().includes(needle)
        : false;
    })
  );
}

export function filterRows<Row>(
  rows: readonly Row[],
  columns: readonly TableColumn<Row>[],
  filters: Record<string, string>
): Row[] {
  const active = Object.entries(filters).filter(
    ([, value]) => value.trim().length > 0
  );
  if (active.length === 0) return [...rows];
  return rows.filter((row) =>
    active.every(([columnId, filterValue]) => {
      const column = columns.find((candidate) => candidate.id === columnId);
      if (!column) return true;
      const value = columnValue(column, row);
      if (value === null || value === undefined) return false;
      return String(value)
        .toLowerCase()
        .includes(filterValue.trim().toLowerCase());
    })
  );
}

export function filterRowsAdvanced<Row>(
  rows: readonly Row[],
  columns: readonly TableColumn<Row>[],
  rangeFilters: Record<string, RangeFilter>,
  multiFilters: Record<string, readonly string[]>
): Row[] {
  let working = [...rows];
  for (const [columnId, range] of Object.entries(rangeFilters)) {
    if (range.min == null && range.max == null) continue;
    const column = columns.find((c) => c.id === columnId);
    if (!column) continue;
    working = working.filter((row) => {
      const raw = columnValue(column, row);
      const num =
        typeof raw === "number"
          ? raw
          : typeof raw === "string"
            ? Number.parseFloat(raw)
            : NaN;
      if (!Number.isFinite(num)) return false;
      if (range.min != null && num < range.min) return false;
      if (range.max != null && num > range.max) return false;
      return true;
    });
  }
  for (const [columnId, values] of Object.entries(multiFilters)) {
    if (!values || values.length === 0) continue;
    const column = columns.find((c) => c.id === columnId);
    if (!column) continue;
    const allowed = new Set(values.map((v) => v.toLowerCase()));
    working = working.filter((row) => {
      const raw = columnValue(column, row);
      if (raw === null || raw === undefined) return false;
      return allowed.has(String(raw).toLowerCase());
    });
  }
  return working;
}

/** Resolve active sort stack (multi-sort with primary fallback). */
export function resolveSortStack(state: TableState): SortSpec[] {
  if (state.sorts && state.sorts.length > 0) return [...state.sorts];
  if (state.sort) return [state.sort];
  return [];
}

export function sortRowsMulti<Row>(
  rows: readonly Row[],
  columns: readonly TableColumn<Row>[],
  specs: readonly SortSpec[]
): Row[] {
  if (specs.length === 0) return [...rows];
  const resolved = specs
    .map((spec) => ({
      spec,
      column: columns.find((c) => c.id === spec.columnId),
    }))
    .filter(
      (entry): entry is { spec: SortSpec; column: TableColumn<Row> } =>
        entry.column != null && entry.column.sortable !== false
    );
  if (resolved.length === 0) return [...rows];

  return [...rows].sort((a, b) => {
    for (const { spec, column } of resolved) {
      const factor = spec.direction === "asc" ? 1 : -1;
      const va = comparableValue(columnValue(column, a));
      const vb = comparableValue(columnValue(column, b));
      const aMissing = va.num === null && va.text === "";
      const bMissing = vb.num === null && vb.text === "";
      if (aMissing && bMissing) continue;
      if (aMissing) return 1;
      if (bMissing) return -1;
      let cmp = 0;
      if (va.num !== null && vb.num !== null) cmp = va.num - vb.num;
      else
        cmp = va.text.localeCompare(vb.text, undefined, { numeric: true });
      if (cmp !== 0) return cmp * factor;
    }
    return 0;
  });
}

/**
 * Toggle / cycle sort. Shift+click appends secondary sorts.
 */
export function applySortClick(
  state: TableState,
  columnId: string,
  multi: boolean
): TableState {
  const stack = resolveSortStack(state);
  const existing = stack.findIndex((s) => s.columnId === columnId);

  if (!multi) {
    const direction: SortDirection =
      existing === 0 && stack[0]?.direction === "desc" ? "asc" : "desc";
    const next: SortSpec = { columnId, direction };
    return { ...state, sort: next, sorts: [next], page: 0 };
  }

  const nextStack = [...stack];
  if (existing >= 0) {
    const current = nextStack[existing];
    if (current.direction === "desc") {
      nextStack[existing] = { columnId, direction: "asc" };
    } else {
      nextStack.splice(existing, 1);
    }
  } else {
    nextStack.push({ columnId, direction: "desc" });
  }
  return {
    ...state,
    sorts: nextStack,
    sort: nextStack[0] ?? null,
    page: 0,
  };
}

export function paginateRows<Row>(
  rows: readonly Row[],
  page: number,
  pageSize: number
): { rows: Row[]; page: number; pageCount: number } {
  const size = Math.max(1, pageSize);
  const pageCount = Math.max(1, Math.ceil(rows.length / size));
  const safePage = Math.min(Math.max(0, page), pageCount - 1);
  return {
    rows: rows.slice(safePage * size, safePage * size + size),
    page: safePage,
    pageCount,
  };
}

/** Visible columns in user order (unknown ids ignored, new ids appended). */
export function visibleColumns<Row>(
  columns: readonly TableColumn<Row>[],
  state: Pick<TableState, "hiddenColumns" | "columnOrder">
): TableColumn<Row>[] {
  const byId = new Map(columns.map((column) => [column.id, column]));
  const ordered: TableColumn<Row>[] = [];
  for (const id of state.columnOrder) {
    const column = byId.get(id);
    if (column) {
      ordered.push(column);
      byId.delete(id);
    }
  }
  ordered.push(...byId.values());
  return ordered.filter((column) => !state.hiddenColumns.includes(column.id));
}

export interface ProcessedTable<Row> {
  columns: TableColumn<Row>[];
  rows: Row[];
  totalRows: number;
  filteredCount: number;
  page: number;
  pageCount: number;
}

/** Full pipeline: filter → search → sort → paginate → project columns. */
export function processTable<Row>(
  table: InstitutionalTableDef<Row>,
  rows: readonly Row[],
  state: TableState
): ProcessedTable<Row> {
  let working = filterRows(rows, table.columns, state.filters);
  working = filterRowsAdvanced(
    working,
    table.columns,
    state.rangeFilters ?? {},
    state.multiFilters ?? {}
  );
  working = searchRows(working, table.columns, state.search);
  const specs = resolveSortStack(state);
  if (specs.length > 0) {
    working = sortRowsMulti(working, table.columns, specs);
  }
  const filteredCount = working.length;
  const paged = paginateRows(working, state.page, state.pageSize);
  return {
    columns: visibleColumns(table.columns, state),
    rows: paged.rows,
    totalRows: rows.length,
    filteredCount,
    page: paged.page,
    pageCount: paged.pageCount,
  };
}

// ---------------------------------------------------------------------------
// Column customization state transitions
// ---------------------------------------------------------------------------

export function toggleColumnVisibility(
  state: TableState,
  columnId: string
): TableState {
  const hidden = state.hiddenColumns.includes(columnId)
    ? state.hiddenColumns.filter((id) => id !== columnId)
    : [...state.hiddenColumns, columnId];
  return { ...state, hiddenColumns: hidden };
}

export function moveColumn(
  state: TableState,
  columnId: string,
  direction: -1 | 1
): TableState {
  const order = [...state.columnOrder];
  const index = order.indexOf(columnId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= order.length) return state;
  [order[index], order[target]] = [order[target], order[index]];
  return { ...state, columnOrder: order };
}

export function setColumnWidth(
  state: TableState,
  columnId: string,
  width: number,
  minWidth = 56
): TableState {
  return {
    ...state,
    columnWidths: {
      ...state.columnWidths,
      [columnId]: Math.max(minWidth, Math.round(width)),
    },
  };
}

/** Reset layout customizations back to the table definition defaults. */
export function resetTableLayout<Row>(
  table: InstitutionalTableDef<Row>,
  state: TableState
): TableState {
  return {
    ...state,
    hiddenColumns: table.defaultState.hiddenColumns,
    columnOrder: table.defaultState.columnOrder,
    columnWidths: table.defaultState.columnWidths,
    density: table.defaultState.density,
    pinLeft: table.defaultState.pinLeft,
    pinRight: table.defaultState.pinRight,
    filters: {},
    rangeFilters: {},
    multiFilters: {},
  };
}

// ---------------------------------------------------------------------------
// Keyboard navigation
// ---------------------------------------------------------------------------

export interface CellPosition {
  row: number;
  col: number;
}

/**
 * Arrow / Home / End / Page navigation for a focused cell.
 * Returns the same position when the key is not a navigation key.
 */
export function moveFocus(
  position: CellPosition,
  key: string,
  rowCount: number,
  colCount: number
): CellPosition {
  if (rowCount <= 0 || colCount <= 0) return position;
  const clamp = (pos: CellPosition): CellPosition => ({
    row: Math.min(Math.max(0, pos.row), rowCount - 1),
    col: Math.min(Math.max(0, pos.col), colCount - 1),
  });
  switch (key) {
    case "ArrowUp":
      return clamp({ ...position, row: position.row - 1 });
    case "ArrowDown":
      return clamp({ ...position, row: position.row + 1 });
    case "ArrowLeft":
      return clamp({ ...position, col: position.col - 1 });
    case "ArrowRight":
      return clamp({ ...position, col: position.col + 1 });
    case "Home":
      return clamp({ ...position, col: 0 });
    case "End":
      return clamp({ ...position, col: colCount - 1 });
    case "PageUp":
      return clamp({ ...position, row: 0 });
    case "PageDown":
      return clamp({ ...position, row: rowCount - 1 });
    default:
      return position;
  }
}

// ---------------------------------------------------------------------------
// CSV export (presentation-only serialization of visible data)
// ---------------------------------------------------------------------------

export function toCsv<Row>(
  columns: readonly TableColumn<Row>[],
  rows: readonly Row[]
): string {
  const escape = (value: unknown): string => {
    const text = value === null || value === undefined ? "" : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const header = columns.map((column) => escape(column.label)).join(",");
  const body = rows.map((row) =>
    columns.map((column) => escape(columnValue(column, row))).join(",")
  );
  return [header, ...body].join("\n");
}
