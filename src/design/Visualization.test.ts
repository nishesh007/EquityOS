import { afterEach, describe, expect, it } from "vitest";
import {
  CONVICTION_BANDS,
  DEFAULT_THEME_ID,
  RISK_BANDS,
  classifyBand,
  getDashboardGrid,
  getDesignSystem,
  getThemeEngine,
  getVisualizationTheme,
  isValidHexColor,
  renderAllocationChart,
  renderGauge,
  renderHeatmap,
  renderProgressWidget,
  renderSparkline,
  setTheme,
} from "./index";

afterEach(() => {
  getThemeEngine().setTheme(DEFAULT_THEME_ID);
});

describe("sparklines", () => {
  it("builds line and area paths inside the viewbox", () => {
    const render = renderSparkline([10, 12, 11, 15], { width: 100, height: 30, padding: 2 });
    expect(render.empty).toBe(false);
    expect(render.path.startsWith("M")).toBe(true);
    expect(render.areaPath.endsWith("Z")).toBe(true);
    // Every coordinate stays within the padded viewbox.
    const coords = render.path.match(/-?\d+(\.\d+)?/g)!.map(Number);
    for (let i = 0; i < coords.length; i += 2) {
      expect(coords[i]).toBeGreaterThanOrEqual(2);
      expect(coords[i]).toBeLessThanOrEqual(98);
      expect(coords[i + 1]).toBeGreaterThanOrEqual(2);
      expect(coords[i + 1]).toBeLessThanOrEqual(28);
    }
  });

  it("derives trend direction and presentation delta", () => {
    expect(renderSparkline([100, 110]).trend).toBe("up");
    expect(renderSparkline([100, 110]).changePercent).toBe(10);
    expect(renderSparkline([100, 90]).trend).toBe("down");
    expect(renderSparkline([100, 100]).trend).toBe("flat");
  });

  it("returns an empty render for short or invalid series", () => {
    expect(renderSparkline([]).empty).toBe(true);
    expect(renderSparkline([42]).empty).toBe(true);
    expect(renderSparkline([Number.NaN, Number.POSITIVE_INFINITY]).empty).toBe(true);
  });

  it("filters non-finite values before drawing", () => {
    const render = renderSparkline([10, Number.NaN, 20]);
    expect(render.empty).toBe(false);
    expect(render.changePercent).toBe(100);
  });

  it("scales geometry with the requested size (responsive resize)", () => {
    const small = renderSparkline([1, 2, 3], { width: 60, height: 20 });
    const large = renderSparkline([1, 2, 3], { width: 240, height: 80 });
    expect(small.width).toBe(60);
    expect(large.width).toBe(240);
    expect(small.path).not.toBe(large.path);
    // Flat-range position metadata is size-independent.
    expect(renderSparkline([5, 5, 5]).lastPositionInRange).toBe(0.5);
  });
});

describe("gauges", () => {
  it("conviction bands cover 0–100 contiguously with institutional labels", () => {
    expect(CONVICTION_BANDS.map((band) => band.label)).toEqual([
      "Weak",
      "Average",
      "Good",
      "Strong",
      "Excellent",
    ]);
    expect(CONVICTION_BANDS[0].from).toBe(0);
    expect(CONVICTION_BANDS[CONVICTION_BANDS.length - 1].to).toBe(100);
    for (let i = 1; i < CONVICTION_BANDS.length; i++) {
      expect(CONVICTION_BANDS[i].from).toBe(CONVICTION_BANDS[i - 1].to);
    }
  });

  it("risk bands cover 0–100 with Low → Extreme", () => {
    expect(RISK_BANDS.map((band) => band.label)).toEqual([
      "Low",
      "Moderate",
      "High",
      "Extreme",
    ]);
    for (let i = 1; i < RISK_BANDS.length; i++) {
      expect(RISK_BANDS[i].from).toBe(RISK_BANDS[i - 1].to);
    }
  });

  it("classifies boundary values into the correct band", () => {
    expect(classifyBand(39.9, CONVICTION_BANDS).id).toBe("weak");
    expect(classifyBand(40, CONVICTION_BANDS).id).toBe("average");
    expect(classifyBand(85, CONVICTION_BANDS).id).toBe("excellent");
    expect(classifyBand(100, CONVICTION_BANDS).id).toBe("excellent");
    expect(classifyBand(91, CONVICTION_BANDS).label).toBe("Excellent");
    expect(classifyBand(0, RISK_BANDS).id).toBe("low");
    expect(classifyBand(80, RISK_BANDS).id).toBe("extreme");
  });

  it("clamps out-of-range and non-finite values", () => {
    expect(renderGauge(150).value).toBe(100);
    expect(renderGauge(-20).value).toBe(0);
    expect(renderGauge(Number.NaN).value).toBe(0);
  });

  it("sweeps the needle across the institutional dial", () => {
    expect(renderGauge(0).needleAngle).toBe(-110);
    expect(renderGauge(50).needleAngle).toBe(0);
    expect(renderGauge(100).needleAngle).toBe(110);
    expect(renderGauge(91).fraction).toBeCloseTo(0.91);
  });

  it("lays band segments contiguously across the full sweep", () => {
    const { segments } = renderGauge(50, CONVICTION_BANDS);
    expect(segments[0].startAngle).toBe(-110);
    expect(segments[segments.length - 1].endAngle).toBe(110);
    for (let i = 1; i < segments.length; i++) {
      expect(segments[i].startAngle).toBe(segments[i - 1].endAngle);
    }
  });
});

describe("heatmaps", () => {
  it("buckets values onto the five-step theme heat scale", () => {
    const render = renderHeatmap([
      { id: "a", label: "A", value: -3 },
      { id: "b", label: "B", value: 0 },
      { id: "c", label: "C", value: 3 },
    ]);
    expect(render.buckets).toBe(5);
    expect(render.cells[0].bucket).toBe(0);
    expect(render.cells[2].bucket).toBe(4);
    expect(render.cells[1].bucket).toBeGreaterThan(0);
    expect(render.cells[1].bucket).toBeLessThan(4);
    for (const cell of render.cells) {
      expect(isValidHexColor(cell.color)).toBe(true);
    }
  });

  it("respects a fixed domain and clamps intensity to 0–1", () => {
    const render = renderHeatmap(
      [
        { id: "hot", label: "Hot", value: 10 },
        { id: "cold", label: "Cold", value: -10 },
      ],
      { domain: [-3, 3] },
    );
    expect(render.min).toBe(-3);
    expect(render.max).toBe(3);
    expect(render.cells[0].intensity).toBe(1);
    expect(render.cells[1].intensity).toBe(0);
  });

  it("returns an empty render when no valid cells exist", () => {
    expect(renderHeatmap([]).empty).toBe(true);
    expect(renderHeatmap([{ id: "x", label: "X", value: Number.NaN }]).empty).toBe(true);
  });
});

describe("allocation rings", () => {
  it("computes shares and percentages that sum to the whole", () => {
    const render = renderAllocationChart([
      { id: "a", label: "A", value: 50 },
      { id: "b", label: "B", value: 30 },
      { id: "c", label: "C", value: 20 },
    ]);
    expect(render.total).toBe(100);
    expect(render.segments.map((s) => s.percent)).toEqual([50, 30, 20]);
    const shareSum = render.segments.reduce((sum, s) => sum + s.share, 0);
    expect(shareSum).toBeCloseTo(1, 5);
    expect(render.segments[render.segments.length - 1].endAngle).toBeCloseTo(360, 0);
  });

  it("groups the tail into Others beyond maxSlices", () => {
    const slices = Array.from({ length: 9 }, (_, i) => ({
      id: `s${i}`,
      label: `S${i}`,
      value: 10 + i,
    }));
    const render = renderAllocationChart(slices, { maxSlices: 4 });
    expect(render.segments).toHaveLength(5);
    expect(render.segments[4].id).toBe("others");
    expect(render.segments[4].label).toBe("Others");
  });

  it("filters non-positive slices and reports empty when nothing remains", () => {
    const render = renderAllocationChart([
      { id: "a", label: "A", value: 0 },
      { id: "b", label: "B", value: -5 },
    ]);
    expect(render.empty).toBe(true);
    expect(render.segments).toHaveLength(0);
  });

  it("keeps dash geometry consistent with the ring circumference", () => {
    const render = renderAllocationChart(
      [
        { id: "a", label: "A", value: 1 },
        { id: "b", label: "B", value: 1 },
      ],
      { radius: 40 },
    );
    expect(render.circumference).toBeCloseTo(2 * Math.PI * 40, 1);
    const dashSum = render.segments.reduce((sum, s) => sum + s.dashLength, 0);
    expect(dashSum).toBeCloseTo(render.circumference, 0);
  });
});

describe("progress widgets", () => {
  it("clamps progress and assigns completion tones", () => {
    expect(renderProgressWidget(-10).percent).toBe(0);
    expect(renderProgressWidget(250).percent).toBe(100);
    expect(renderProgressWidget(Number.NaN).percent).toBe(0);
    expect(renderProgressWidget(10).tone).toBe("danger");
    expect(renderProgressWidget(45).tone).toBe("warning");
    expect(renderProgressWidget(75).tone).toBe("accent");
    expect(renderProgressWidget(100).tone).toBe("success");
  });

  it("computes circular ring dash offsets", () => {
    const zero = renderProgressWidget(0, { variant: "circular", radius: 22 });
    const full = renderProgressWidget(100, { variant: "circular", radius: 22 });
    expect(zero.dashOffset).toBeCloseTo(zero.circumference, 1);
    expect(full.dashOffset).toBe(0);
    expect(renderProgressWidget(50).widthPercent).toBe("50%");
  });

  it("flags completion at 100%", () => {
    expect(renderProgressWidget(99.9).complete).toBe(false);
    expect(renderProgressWidget(100).complete).toBe(true);
  });
});

describe("visualization theme", () => {
  it("resolves the palette from the active theme and follows switches", () => {
    const dark = getVisualizationTheme();
    expect(dark.themeId).toBe("institutional-dark");
    setTheme("emerald");
    const emerald = getVisualizationTheme();
    expect(emerald.themeId).toBe("emerald");
    expect(emerald.accent).not.toBe(dark.accent);
  });

  it("provides a complete, valid palette for charts", () => {
    const theme = getVisualizationTheme();
    expect(theme.series).toHaveLength(7);
    expect(theme.heatScale).toHaveLength(5);
    for (const color of [...theme.series, ...theme.heatScale, theme.positive, theme.negative, theme.grid, theme.track]) {
      expect(isValidHexColor(color)).toBe(true);
    }
  });
});

describe("regression", () => {
  it("exports the R3 public APIs from the design-system barrel", async () => {
    const barrel = await import("./index");
    for (const api of [
      "getVisualizationTheme",
      "renderSparkline",
      "renderGauge",
      "renderHeatmap",
      "renderAllocationChart",
      "renderProgressWidget",
    ] as const) {
      expect(typeof barrel[api], api).toBe("function");
    }
    for (const component of [
      "Sparkline",
      "GaugeChart",
      "AllocationRing",
      "Heatmap",
      "ProgressBar",
      "ProgressRing",
      "ScoreDistribution",
      "TimelineChart",
      "KpiTile",
      "ConvictionMeter",
      "RiskGauge",
      "HeatMeter",
      "StatusIndicator",
      "WidgetToolbar",
    ] as const) {
      expect(typeof barrel[component], component).toBe("function");
    }
  });

  it("R1 and R2 systems remain intact", () => {
    expect(getDesignSystem().themes).toHaveLength(5);
    expect(Object.isFrozen(getDashboardGrid())).toBe(true);
  });
});
