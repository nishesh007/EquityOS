/**
 * Sprint 10C.R4 — institutional table framework tests.
 * Tables, density, column customization, sorting, filtering, keyboard,
 * accessibility and regression.
 */

import { describe, expect, it } from "vitest";
import {
  applyTablePreferences,
  applySortClick,
  CELL_TONE_PILL_CLASS,
  CELL_TONE_TEXT_CLASS,
  createInstitutionalTable,
  cycleDensity,
  defaultColumnAlign,
  DENSITY_CELL_CLASSES,
  DENSITY_MODES,
  filterRows,
  filterRowsAdvanced,
  isColumnSearchable,
  moveColumn,
  moveFocus,
  paginateRows,
  processTable,
  registerColumn,
  renderCell,
  resetTableLayout,
  resolveSortStack,
  restoreTablePreferences,
  saveTablePreferences,
  searchRows,
  setColumnWidth,
  sortRows,
  sortRowsMulti,
  TABLE_CLASSES,
  tablePreferencesFromState,
  toCsv,
  toggleColumnVisibility,
  visibleColumns,
  type TableColumn,
  type TableState,
} from "./index";

interface Row {
  symbol: string;
  name: string;
  price: number | null;
  changePercent: number;
}

const COLUMNS: TableColumn<Row>[] = [
  { id: "symbol", label: "Symbol", kind: "text", sticky: true },
  { id: "name", label: "Company", kind: "text", hidden: true },
  { id: "price", label: "Price", kind: "price", width: 100 },
  { id: "changePercent", label: "Change", kind: "trend" },
];

const ROWS: Row[] = [
  { symbol: "TCS", name: "Tata Consultancy", price: 4100, changePercent: 1.2 },
  { symbol: "INFY", name: "Infosys", price: 1600, changePercent: -0.8 },
  { symbol: "HDFCBANK", name: "HDFC Bank", price: 1720, changePercent: 0.4 },
  { symbol: "WIPRO", name: "Wipro", price: null, changePercent: 0 },
];

function makeTable() {
  return createInstitutionalTable<Row>({ id: "test-table", columns: COLUMNS });
}

class FakeStorage {
  private data = new Map<string, string>();
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
}

describe("table creation and column registry", () => {
  it("createInstitutionalTable derives a complete default state", () => {
    const table = makeTable();
    expect(table.id).toBe("test-table");
    expect(table.defaultState.columnOrder).toEqual([
      "symbol",
      "name",
      "price",
      "changePercent",
    ]);
    expect(table.defaultState.hiddenColumns).toEqual(["name"]);
    expect(table.defaultState.columnWidths).toEqual({ price: 100 });
    expect(table.defaultState.pageSize).toBe(25);
    expect(table.defaultState.density).toBe("comfortable");
    expect(table.defaultState.sorts).toEqual([]);
    expect(table.defaultState.pinLeft).toEqual(["symbol"]);
    expect(table.defaultState.rangeFilters).toEqual({});
  });

  it("registerColumn appends without mutating and rejects duplicates", () => {
    const table = makeTable();
    const extended = registerColumn(table, {
      id: "volume",
      label: "Volume",
      kind: "number",
    });
    expect(extended.columns).toHaveLength(5);
    expect(extended.defaultState.columnOrder).toContain("volume");
    expect(table.columns).toHaveLength(4);
    expect(() =>
      registerColumn(table, { id: "symbol", label: "Dup", kind: "text" })
    ).toThrow(/already registered/);
  });

  it("derives alignment and searchability from cell kind", () => {
    expect(defaultColumnAlign(COLUMNS[0] as TableColumn<never>)).toBe("left");
    expect(defaultColumnAlign(COLUMNS[2] as TableColumn<never>)).toBe("right");
    expect(isColumnSearchable(COLUMNS[0] as TableColumn<never>)).toBe(true);
    expect(isColumnSearchable(COLUMNS[2] as TableColumn<never>)).toBe(false);
  });
});

describe("sorting", () => {
  it("sorts numeric columns in both directions", () => {
    const priceCol = COLUMNS[2];
    const asc = sortRows(ROWS, priceCol, "asc").map((row) => row.symbol);
    const desc = sortRows(ROWS, priceCol, "desc").map((row) => row.symbol);
    expect(asc.slice(0, 3)).toEqual(["INFY", "HDFCBANK", "TCS"]);
    expect(desc.slice(0, 3)).toEqual(["TCS", "HDFCBANK", "INFY"]);
  });

  it("sinks missing values to the bottom regardless of direction", () => {
    const priceCol = COLUMNS[2];
    expect(sortRows(ROWS, priceCol, "asc").at(-1)?.symbol).toBe("WIPRO");
    expect(sortRows(ROWS, priceCol, "desc").at(-1)?.symbol).toBe("WIPRO");
  });

  it("sorts text columns with locale comparison", () => {
    const symbolCol = COLUMNS[0];
    expect(sortRows(ROWS, symbolCol, "asc").map((row) => row.symbol)).toEqual([
      "HDFCBANK",
      "INFY",
      "TCS",
      "WIPRO",
    ]);
  });

  it("supports multi-column sort via applySortClick", () => {
    const table = makeTable();
    let state = table.defaultState;
    state = applySortClick(state, "changePercent", false);
    state = applySortClick(state, "price", true);
    expect(resolveSortStack(state).map((s) => s.columnId)).toEqual([
      "changePercent",
      "price",
    ]);
    const ordered = sortRowsMulti(ROWS, COLUMNS, resolveSortStack(state)).map(
      (row) => row.symbol
    );
    expect(ordered[0]).toBe("TCS");
  });

  it("applies numeric range and multi-select filters", () => {
    const filtered = filterRowsAdvanced(
      ROWS,
      COLUMNS,
      { price: { min: 1600, max: 2000 } },
      { symbol: ["INFY", "HDFCBANK"] }
    );
    expect(filtered.map((row) => row.symbol).sort()).toEqual([
      "HDFCBANK",
      "INFY",
    ]);
  });
});

describe("search and filtering", () => {
  it("searches textual columns case-insensitively", () => {
    const hits = searchRows(ROWS, COLUMNS, "infosys");
    expect(hits.map((row) => row.symbol)).toEqual(["INFY"]);
    expect(searchRows(ROWS, COLUMNS, "")).toHaveLength(4);
  });

  it("does not match numeric-only columns in global search", () => {
    expect(searchRows(ROWS, COLUMNS, "4100")).toHaveLength(0);
  });

  it("applies per-column substring filters", () => {
    const hits = filterRows(ROWS, COLUMNS, { symbol: "in" });
    expect(hits.map((row) => row.symbol)).toEqual(["INFY"]);
    expect(filterRows(ROWS, COLUMNS, { symbol: "  " })).toHaveLength(4);
  });
});

describe("pagination and pipeline", () => {
  it("paginates and clamps out-of-range pages", () => {
    const page = paginateRows(ROWS, 99, 2);
    expect(page.pageCount).toBe(2);
    expect(page.page).toBe(1);
    expect(page.rows).toHaveLength(2);
  });

  it("processTable runs filter → search → sort → paginate", () => {
    const table = makeTable();
    const state: TableState = {
      ...table.defaultState,
      sort: { columnId: "price", direction: "desc" },
      pageSize: 2,
      page: 0,
    };
    const result = processTable(table, ROWS, state);
    expect(result.totalRows).toBe(4);
    expect(result.filteredCount).toBe(4);
    expect(result.pageCount).toBe(2);
    expect(result.rows.map((row) => row.symbol)).toEqual(["TCS", "HDFCBANK"]);
    expect(result.columns.map((column) => column.id)).toEqual([
      "symbol",
      "price",
      "changePercent",
    ]);
  });
});

describe("column customization", () => {
  it("toggles column visibility both ways", () => {
    const table = makeTable();
    const shown = toggleColumnVisibility(table.defaultState, "name");
    expect(shown.hiddenColumns).not.toContain("name");
    const hidden = toggleColumnVisibility(shown, "name");
    expect(hidden.hiddenColumns).toContain("name");
  });

  it("reorders columns and respects boundaries", () => {
    const table = makeTable();
    const moved = moveColumn(table.defaultState, "price", -1);
    expect(moved.columnOrder).toEqual([
      "symbol",
      "price",
      "name",
      "changePercent",
    ]);
    const unchanged = moveColumn(table.defaultState, "symbol", -1);
    expect(unchanged.columnOrder).toEqual(table.defaultState.columnOrder);
  });

  it("resizes columns with a minimum width clamp", () => {
    const table = makeTable();
    const resized = setColumnWidth(table.defaultState, "price", 240);
    expect(resized.columnWidths.price).toBe(240);
    const clamped = setColumnWidth(table.defaultState, "price", 4);
    expect(clamped.columnWidths.price).toBe(56);
  });

  it("visibleColumns ignores unknown ids and appends unlisted columns", () => {
    const cols = visibleColumns(COLUMNS, {
      hiddenColumns: [],
      columnOrder: ["price", "ghost", "symbol"],
    });
    expect(cols.map((column) => column.id)).toEqual([
      "price",
      "symbol",
      "name",
      "changePercent",
    ]);
  });

  it("resetTableLayout restores layout but keeps sort and search", () => {
    const table = makeTable();
    let state: TableState = {
      ...toggleColumnVisibility(table.defaultState, "name"),
      sort: { columnId: "price", direction: "asc" },
      search: "tcs",
      density: "ultra",
    };
    state = setColumnWidth(state, "symbol", 300);
    const reset = resetTableLayout(table, state);
    expect(reset.hiddenColumns).toEqual(["name"]);
    expect(reset.columnWidths).toEqual({ price: 100 });
    expect(reset.density).toBe("comfortable");
    expect(reset.sort).toEqual({ columnId: "price", direction: "asc" });
    expect(reset.search).toBe("tcs");
  });
});

describe("density modes", () => {
  it("supports comfortable, compact and ultra compact", () => {
    expect(DENSITY_MODES).toEqual(["comfortable", "compact", "ultra"]);
    for (const mode of DENSITY_MODES) {
      expect(DENSITY_CELL_CLASSES[mode]).toMatch(/px-|py-/);
    }
  });

  it("cycles through all density modes and wraps around", () => {
    expect(cycleDensity("comfortable")).toBe("compact");
    expect(cycleDensity("compact")).toBe("ultra");
    expect(cycleDensity("ultra")).toBe("comfortable");
  });
});

describe("keyboard navigation", () => {
  it("moves the focused cell with arrow keys and clamps at edges", () => {
    expect(moveFocus({ row: 0, col: 0 }, "ArrowDown", 3, 4)).toEqual({
      row: 1,
      col: 0,
    });
    expect(moveFocus({ row: 0, col: 0 }, "ArrowUp", 3, 4)).toEqual({
      row: 0,
      col: 0,
    });
    expect(moveFocus({ row: 2, col: 3 }, "ArrowRight", 3, 4)).toEqual({
      row: 2,
      col: 3,
    });
    expect(moveFocus({ row: 1, col: 2 }, "ArrowLeft", 3, 4)).toEqual({
      row: 1,
      col: 1,
    });
  });

  it("supports Home, End, PageUp and PageDown", () => {
    expect(moveFocus({ row: 1, col: 2 }, "Home", 3, 4).col).toBe(0);
    expect(moveFocus({ row: 1, col: 2 }, "End", 3, 4).col).toBe(3);
    expect(moveFocus({ row: 2, col: 1 }, "PageUp", 3, 4).row).toBe(0);
    expect(moveFocus({ row: 0, col: 1 }, "PageDown", 3, 4).row).toBe(2);
  });

  it("ignores non-navigation keys and empty grids", () => {
    expect(moveFocus({ row: 1, col: 1 }, "a", 3, 4)).toEqual({ row: 1, col: 1 });
    expect(moveFocus({ row: 1, col: 1 }, "ArrowDown", 0, 0)).toEqual({
      row: 1,
      col: 1,
    });
  });
});

describe("preferences persistence", () => {
  it("saves and restores preferences through a storage backend", () => {
    const storage = new FakeStorage();
    const table = makeTable();
    const state: TableState = { ...table.defaultState, density: "ultra" };
    const ok = saveTablePreferences(
      table.id,
      tablePreferencesFromState(state),
      storage
    );
    expect(ok).toBe(true);
    const restored = restoreTablePreferences(table.id, storage);
    expect(restored?.density).toBe("ultra");
    expect(restored?.columnOrder).toEqual(state.columnOrder);
  });

  it("returns null for missing or corrupt preferences", () => {
    const storage = new FakeStorage();
    expect(restoreTablePreferences("missing", storage)).toBeNull();
    storage.setItem("equityos.table.bad", "{not json");
    expect(restoreTablePreferences("bad", storage)).toBeNull();
  });

  it("applyTablePreferences ignores invalid stored values", () => {
    const table = makeTable();
    const merged = applyTablePreferences(table.defaultState, {
      density: "gigantic" as never,
      pageSize: -3,
      columnWidths: { price: Number.NaN, symbol: 140 } as never,
    });
    expect(merged.density).toBe("comfortable");
    expect(merged.pageSize).toBe(25);
    expect(merged.columnWidths).toEqual({ symbol: 140 });
  });
});

describe("professional cell rendering", () => {
  it("formats price, currency and percent cells", () => {
    expect(renderCell("price", 4100.5).text).toBe("₹4,100.50");
    expect(renderCell("price", 4100.5).align).toBe("right");
    expect(renderCell("percent", 2.5)).toMatchObject({
      text: "+2.50%",
      tone: "positive",
    });
    expect(renderCell("percent", -1.25).tone).toBe("negative");
    expect(renderCell("currency", -50_000).tone).toBe("negative");
  });

  it("adds trend arrows and handles missing values", () => {
    expect(renderCell("trend", 3.1).arrow).toBe("up");
    expect(renderCell("trend", -0.4).arrow).toBe("down");
    expect(renderCell("trend", 0).arrow).toBeNull();
    expect(renderCell("price", null).text).toBe("—");
    expect(renderCell("text", undefined).text).toBe("—");
  });

  it("maps risk and status values to semantic tones", () => {
    expect(renderCell("risk", "Low").tone).toBe("positive");
    expect(renderCell("risk", "High").tone).toBe("negative");
    expect(renderCell("status", "ACTIVE").tone).toBe("positive");
    expect(renderCell("status", "DEGRADED").tone).toBe("warning");
    expect(renderCell("status", "OFFLINE").tone).toBe("negative");
    expect(renderCell("status", "NEEDS ATTENTION").tone).toBe("warning");
  });

  it("formats dates and passes through unknown text", () => {
    const rendered = renderCell("date", "2026-07-17T10:30:00Z");
    expect(rendered.text).toMatch(/Jul/);
    expect(renderCell("date", null).text).toBe("—");
    expect(renderCell("tag", "Momentum").text).toBe("Momentum");
  });
});

describe("export", () => {
  it("serializes visible columns to CSV with proper escaping", () => {
    const columns: TableColumn<{ a: string; b: number }>[] = [
      { id: "a", label: "Name, Inc", kind: "text" },
      { id: "b", label: "Value", kind: "number" },
    ];
    const csv = toCsv(columns, [
      { a: 'He said "hi"', b: 1 },
      { a: "plain", b: 2 },
    ]);
    const lines = csv.split("\n");
    expect(lines[0]).toBe('"Name, Inc",Value');
    expect(lines[1]).toBe('"He said ""hi""",1');
    expect(lines[2]).toBe("plain,2");
  });
});

describe("accessibility and regression", () => {
  it("defines themed text and pill classes for every cell tone", () => {
    for (const tone of ["positive", "negative", "warning", "neutral"] as const) {
      expect(CELL_TONE_TEXT_CLASS[tone]).toBeTruthy();
      expect(CELL_TONE_PILL_CLASS[tone]).toBeTruthy();
    }
  });

  it("keeps institutional table chrome tokens intact (R2 regression)", () => {
    expect(TABLE_CLASSES.container).toBe("institutional-table-container");
    expect(TABLE_CLASSES.table).toBe("institutional-table");
    expect(TABLE_CLASSES.stickyCol).toBe("institutional-table-sticky-col");
  });

  it("keeps table processing pure — inputs are never mutated", () => {
    const table = makeTable();
    const rows = ROWS.map((row) => ({ ...row }));
    const snapshot = JSON.stringify(rows);
    processTable(table, rows, {
      ...table.defaultState,
      sort: { columnId: "price", direction: "asc" },
      search: "t",
      filters: { symbol: "t" },
    });
    expect(JSON.stringify(rows)).toBe(snapshot);
    expect(JSON.stringify(table.defaultState.columnOrder)).toBe(
      JSON.stringify(["symbol", "name", "price", "changePercent"])
    );
  });
});
