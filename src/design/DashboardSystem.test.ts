import { describe, expect, it } from "vitest";
import {
  BREAKPOINT_ORDER,
  DASHBOARD_REGIONS,
  GRID_COLUMN_CLASSES,
  GRID_COLUMN_OPTIONS,
  GRID_GAP_PX,
  GRID_SPAN_CLASSES,
  MAIN_GRID_SPLIT,
  PRIORITY_RANK,
  SPACING_VALUES,
  TABLE_CLASSES,
  TABLE_CLASS_TOKENS,
  WIDGET_SIZES,
  WIDGET_SIZE_SPECS,
  getDashboardGrid,
  getDashboardLayout,
  getDesignSystem,
  getWidgetLayout,
  resolveGridColumns,
  resolveWidgetSize,
  sortByHierarchy,
  type WidgetLayout,
} from "./index";

describe("dashboard layout", () => {
  it("declares the institutional regions top to bottom", () => {
    expect(DASHBOARD_REGIONS).toEqual(["snapshot", "primary", "rail", "bottom"]);
    expect(getDashboardLayout().regions).toEqual(DASHBOARD_REGIONS);
  });

  it("assigns every widget to a declared region with a unique id", () => {
    const { widgets } = getDashboardLayout();
    expect(widgets.length).toBeGreaterThanOrEqual(10);
    const ids = widgets.map((widget) => widget.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const widget of widgets) {
      expect(DASHBOARD_REGIONS).toContain(widget.region);
      expect(WIDGET_SIZES).toContain(widget.size);
    }
  });

  it("sorts each region by priority then explicit order", () => {
    const { byRegion } = getDashboardLayout();
    for (const region of DASHBOARD_REGIONS) {
      const group = byRegion[region];
      for (let i = 1; i < group.length; i++) {
        const previous =
          PRIORITY_RANK[group[i - 1].priority] * 1000 + group[i - 1].order;
        const current = PRIORITY_RANK[group[i].priority] * 1000 + group[i].order;
        expect(current, `${region}[${i}]`).toBeGreaterThanOrEqual(previous);
      }
    }
  });

  it("puts conviction, AI, portfolio and watchlist at the top of the hierarchy", () => {
    for (const id of [
      "ai-opportunities",
      "executive-overview",
      "portfolio-summary",
      "watchlist",
    ]) {
      expect(getWidgetLayout(id)?.priority, id).toBe("high");
    }
  });

  it("splits the main grid into a 70% work column and 30% rail", () => {
    const { byRegion } = getDashboardLayout();
    expect(byRegion.primary.length).toBeGreaterThanOrEqual(4);
    expect(byRegion.rail.length).toBeGreaterThanOrEqual(4);
    expect(byRegion.rail.map((w) => w.id)).toContain("watchlist");
    expect(byRegion.rail.map((w) => w.id)).toContain("ai-brief");
  });

  it("resolves widget lookups and rejects unknown ids", () => {
    const watchlist = getWidgetLayout("watchlist");
    expect(watchlist).not.toBeNull();
    expect(watchlist?.region).toBe("rail");
    expect(getWidgetLayout("nonexistent-widget")).toBeNull();
  });

  it("sortByHierarchy orders high before medium before low", () => {
    const widgets: WidgetLayout[] = [
      { id: "c", title: "C", region: "primary", size: "s", priority: "low", order: 0 },
      { id: "b", title: "B", region: "primary", size: "s", priority: "medium", order: 0 },
      { id: "a2", title: "A2", region: "primary", size: "s", priority: "high", order: 1 },
      { id: "a1", title: "A1", region: "primary", size: "s", priority: "high", order: 0 },
    ];
    expect(sortByHierarchy(widgets).map((w) => w.id)).toEqual(["a1", "a2", "b", "c"]);
  });
});

describe("grid system", () => {
  it("supports exactly 1 to 4 columns", () => {
    expect(GRID_COLUMN_OPTIONS).toEqual([1, 2, 3, 4]);
    for (const columns of GRID_COLUMN_OPTIONS) {
      expect(GRID_COLUMN_CLASSES[columns]).toBeTruthy();
      expect(GRID_SPAN_CLASSES[columns]).toBeTruthy();
    }
  });

  it("collapses every grid to a single column on mobile", () => {
    for (const columns of GRID_COLUMN_OPTIONS) {
      expect(GRID_COLUMN_CLASSES[columns]).toContain("grid-cols-1");
    }
  });

  it("derives grid gaps from the spacing scale — no hardcoded spacing", () => {
    for (const gap of Object.values(GRID_GAP_PX)) {
      expect(SPACING_VALUES).toContain(gap);
    }
  });

  it("declares the institutional 70/30 main split once", () => {
    expect(MAIN_GRID_SPLIT.primary + MAIN_GRID_SPLIT.secondary).toBe(
      MAIN_GRID_SPLIT.tracks,
    );
    expect(MAIN_GRID_SPLIT.primary / MAIN_GRID_SPLIT.tracks).toBeCloseTo(0.7);
    expect(MAIN_GRID_SPLIT.container).toContain("grid-cols-1");
    expect(MAIN_GRID_SPLIT.container).toContain("xl:grid-cols-10");
  });

  it("getDashboardGrid() exposes the frozen shared configuration", () => {
    const grid = getDashboardGrid();
    expect(Object.isFrozen(grid)).toBe(true);
    expect(grid.columns).toEqual(GRID_COLUMN_OPTIONS);
    expect(grid.columnClasses).toBe(GRID_COLUMN_CLASSES);
    expect(grid.spanClasses).toBe(GRID_SPAN_CLASSES);
    expect(grid.mainSplit).toBe(MAIN_GRID_SPLIT);
  });
});

describe("widget sizing", () => {
  it("defines all five sizes with ascending footprint", () => {
    expect(WIDGET_SIZES).toEqual(["xs", "s", "m", "l", "xl"]);
    const heights = WIDGET_SIZES.map((size) => WIDGET_SIZE_SPECS[size].minContentHeight);
    for (let i = 1; i < heights.length; i++) {
      expect(heights[i]).toBeGreaterThanOrEqual(heights[i - 1]);
    }
    expect(WIDGET_SIZE_SPECS.xs.span).toBe(1);
    expect(WIDGET_SIZE_SPECS.xl.span).toBe(4);
  });

  it("resolves the preferred size in a full-width grid", () => {
    expect(resolveWidgetSize("m").span).toBe(2);
    expect(resolveWidgetSize("xl").span).toBe(4);
  });

  it("clamps widget spans to the grid they are mounted in", () => {
    expect(resolveWidgetSize("xl", 2).span).toBe(2);
    expect(resolveWidgetSize("l", 2).span).toBe(2);
    expect(resolveWidgetSize("m", 1).span).toBe(1);
    expect(resolveWidgetSize("xs", 4).span).toBe(1);
  });

  it("scales skeleton rows with widget size", () => {
    const rows = WIDGET_SIZES.map((size) => WIDGET_SIZE_SPECS[size].skeletonRows);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i]).toBeGreaterThan(rows[i - 1]);
    }
  });
});

describe("responsive behavior", () => {
  it("fans a 4-column grid out with viewport width", () => {
    expect(resolveGridColumns(4, "mobile")).toBe(1);
    expect(resolveGridColumns(4, "tablet")).toBe(2);
    expect(resolveGridColumns(4, "laptop")).toBe(2);
    expect(resolveGridColumns(4, "desktop")).toBe(4);
    expect(resolveGridColumns(4, "ultrawide")).toBe(4);
  });

  it("keeps 2-column grids stacked below the laptop breakpoint", () => {
    expect(resolveGridColumns(2, "mobile")).toBe(1);
    expect(resolveGridColumns(2, "tablet")).toBe(1);
    expect(resolveGridColumns(2, "laptop")).toBe(2);
    expect(resolveGridColumns(2, "ultrawide")).toBe(2);
  });

  it("never exceeds the declared track count at any breakpoint", () => {
    for (const columns of GRID_COLUMN_OPTIONS) {
      for (const breakpoint of BREAKPOINT_ORDER) {
        const resolved = resolveGridColumns(columns, breakpoint);
        expect(resolved).toBeGreaterThanOrEqual(1);
        expect(resolved).toBeLessThanOrEqual(columns);
      }
    }
  });
});

describe("skeletons and accessibility", () => {
  it("gives every widget size a fixed skeleton height so layout never jumps", () => {
    for (const size of WIDGET_SIZES) {
      expect(WIDGET_SIZE_SPECS[size].minContentHeight).toBeGreaterThanOrEqual(96);
    }
  });

  it("never hides grid content via display utilities", () => {
    const allClasses = [
      ...Object.values(GRID_COLUMN_CLASSES),
      ...Object.values(GRID_SPAN_CLASSES),
      MAIN_GRID_SPLIT.container,
      MAIN_GRID_SPLIT.primaryClass,
      MAIN_GRID_SPLIT.secondaryClass,
    ].join(" ");
    expect(allClasses).not.toMatch(/\bhidden\b/);
  });
});

describe("tables", () => {
  it("exposes the canonical institutional table class names", () => {
    expect(TABLE_CLASSES.container).toBe("institutional-table-container");
    expect(TABLE_CLASSES.table).toBe("institutional-table");
    expect(TABLE_CLASSES.numericCell).toBe("institutional-table-numeric");
    expect(TABLE_CLASSES.highlightRow).toBe("institutional-table-highlight");
  });

  it("keeps the table token list complete", () => {
    expect([...TABLE_CLASS_TOKENS].sort()).toEqual(
      Object.keys(TABLE_CLASSES).sort(),
    );
  });
});

describe("cards and regression", () => {
  it("R1 design system remains intact", async () => {
    const system = getDesignSystem();
    expect(system.themes).toHaveLength(5);
    expect(Object.values(system.spacing).sort((a, b) => a - b)).toEqual([
      ...SPACING_VALUES,
    ]);
  });

  it("exports the R2 public APIs from the design-system barrel", async () => {
    const barrel = await import("./index");
    expect(typeof barrel.getDashboardLayout).toBe("function");
    expect(typeof barrel.getWidgetLayout).toBe("function");
    expect(typeof barrel.resolveWidgetSize).toBe("function");
    expect(typeof barrel.getDashboardGrid).toBe("function");
  });

  it("exports the widget framework and card primitives", async () => {
    const barrel = await import("./index");
    expect(typeof barrel.Widget).toBe("function");
    expect(typeof barrel.WidgetEmptyState).toBe("function");
    expect(typeof barrel.WidgetSkeleton).toBe("function");
    expect(typeof barrel.DashboardGrid).toBe("function");
    expect(typeof barrel.GridItem).toBe("function");
    expect(typeof barrel.MainGrid).toBe("function");
    expect(typeof barrel.InstitutionalCard).toBe("function");
    expect(typeof barrel.GlassCard).toBe("function");
    expect(typeof barrel.MetricCard).toBe("function");
  });

  it("dashboard layout registry is immutable", () => {
    const layout = getDashboardLayout();
    expect(Object.isFrozen(layout)).toBe(true);
    expect(Object.isFrozen(layout.widgets)).toBe(true);
    expect(() => {
      (layout.widgets as WidgetLayout[]).push({
        id: "hack",
        title: "Hack",
        region: "primary",
        size: "s",
        priority: "low",
        order: 99,
      });
    }).toThrow();
  });
});
