/**
 * Sprint 10C.R6 — workspace engine, drag & drop model, docking, profiles,
 * templates, import/export, shortcuts, accessibility and regression tests.
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  addWidgetToWorkspace,
  createWorkspace,
  deleteWorkspace,
  duplicateWorkspace,
  exportWorkspace,
  getActiveWorkspace,
  getDefaultWorkspace,
  hiddenWidgets,
  importWorkspace,
  listWorkspaces,
  loadWorkspace,
  loadWorkspaceStore,
  moveWidget,
  placementsForRegion,
  removeWidgetFromWorkspace,
  renameWorkspace,
  resetWorkspace,
  resizeWidget,
  restoreHiddenWidgets,
  saveWorkspace,
  setActiveWorkspace,
  setWidgetCollapsed,
  setWidgetPinned,
  setWidgetVisible,
  swapWidgets,
  type Workspace,
  type WorkspaceStorage,
} from "./workspace/workspaceEngine";
import {
  WORKSPACE_SHORTCUTS,
  matchShortcut,
} from "./workspace/workspaceShortcuts";
import {
  DASHBOARD_TEMPLATES,
  DEFAULT_TEMPLATE_ID,
  getTemplate,
  searchTemplates,
} from "./layouts/dashboardTemplates";
import {
  WORKSPACE_SIZES,
  WORKSPACE_SIZE_SPANS,
  getWidgetDefinition,
  listWidgetDefinitions,
  registerWidget,
  resetWidgetRegistryForTests,
  searchWidgets,
  sizeFromSpan,
} from "./widgets/widgetRegistry";
import { getDesignSystem } from "./DesignSystem";

/** In-memory localStorage stand-in. */
function memoryStorage(): WorkspaceStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

let storage: ReturnType<typeof memoryStorage>;

beforeEach(() => {
  storage = memoryStorage();
  resetWidgetRegistryForTests();
});

describe("Sprint 10C.R6 — workspace persistence", () => {
  it("returns a valid default workspace when storage is empty", () => {
    const workspace = getActiveWorkspace(storage);
    expect(workspace.name).toBe("My Workspace");
    expect(workspace.templateId).toBe(DEFAULT_TEMPLATE_ID);
    expect(workspace.placements.length).toBeGreaterThan(0);
  });

  it("createWorkspace persists and activates the new profile (auto-save)", () => {
    const created = createWorkspace("My Research", "research", storage);
    expect(storage.data.size).toBe(1);
    const active = getActiveWorkspace(storage);
    expect(active.id).toBe(created.id);
    expect(active.templateId).toBe("research");
  });

  it("saveWorkspace + loadWorkspace round-trips widget state", () => {
    const workspace = createWorkspace("Trading", "swing-trader", storage);
    const mutated = resizeWidget(workspace, "watchlist", "full");
    saveWorkspace(mutated, storage);
    const loaded = loadWorkspace(workspace.id, storage);
    expect(
      loaded?.placements.find((p) => p.widgetId === "watchlist")?.size
    ).toBe("full");
  });

  it("recovers to the default store when persisted JSON is corrupted", () => {
    storage.setItem("equityos.workspace.store", "{not json");
    const store = loadWorkspaceStore(storage);
    expect(store.workspaces).toHaveLength(1);
    expect(store.activeId).toBe(store.workspaces[0].id);
  });

  it("resetWorkspace restores the workspace to its template placements", () => {
    const workspace = createWorkspace("Reset Me", "minimal", storage);
    saveWorkspace(setWidgetVisible(workspace, "watchlist", false), storage);
    const reset = resetWorkspace(workspace.id, storage);
    const template = getTemplate("minimal")!;
    expect(reset.placements).toEqual(template.placements);
  });
});

describe("Sprint 10C.R6 — profiles", () => {
  it("supports unlimited custom profiles", () => {
    for (const name of ["My Research", "My Trading", "My Investments", "My Portfolio"]) {
      createWorkspace(name, DEFAULT_TEMPLATE_ID, storage);
    }
    const names = listWorkspaces(storage).map((w) => w.name);
    expect(names).toContain("My Research");
    expect(names).toContain("My Trading");
    expect(names).toContain("My Investments");
    expect(names).toContain("My Portfolio");
  });

  it("duplicates, renames and deletes profiles", () => {
    const original = createWorkspace("Alpha", DEFAULT_TEMPLATE_ID, storage);
    const copy = duplicateWorkspace(original.id, storage);
    expect(copy?.name).toBe("Alpha (Copy)");
    expect(copy?.placements).toEqual(original.placements);

    const renamed = renameWorkspace(copy!.id, "Beta", storage);
    expect(renamed?.name).toBe("Beta");

    expect(deleteWorkspace(copy!.id, storage)).toBe(true);
    expect(loadWorkspace(copy!.id, storage)).toBeNull();
  });

  it("refuses to delete the last remaining workspace", () => {
    const only = getActiveWorkspace(storage);
    saveWorkspace(only, storage);
    expect(deleteWorkspace(only.id, storage)).toBe(false);
  });

  it("switches the active profile", () => {
    const first = createWorkspace("First", DEFAULT_TEMPLATE_ID, storage);
    createWorkspace("Second", DEFAULT_TEMPLATE_ID, storage);
    setActiveWorkspace(first.id, storage);
    expect(getActiveWorkspace(storage).id).toBe(first.id);
  });
});

describe("Sprint 10C.R6 — drag & drop model", () => {
  let workspace: Workspace;

  beforeEach(() => {
    workspace = getDefaultWorkspace();
  });

  it("reorders a widget within its region", () => {
    const before = placementsForRegion(workspace, "snapshot").map((p) => p.widgetId);
    // Pinned market-snapshot stays on top; breadth moves ahead of pulse.
    expect(before).toEqual(["market-snapshot", "market-pulse", "market-breadth"]);
    const moved = moveWidget(workspace, "market-breadth", { index: 0 });
    const after = placementsForRegion(moved, "snapshot").map((p) => p.widgetId);
    expect(after).toEqual(["market-snapshot", "market-breadth", "market-pulse"]);
  });

  it("docks a widget into another region (drop across regions)", () => {
    const moved = moveWidget(workspace, "watchlist", { region: "bottom", index: 0 });
    const placement = moved.placements.find((p) => p.widgetId === "watchlist");
    expect(placement?.region).toBe("bottom");
    expect(placementsForRegion(moved, "bottom")[0].widgetId).toBe("watchlist");
  });

  it("swaps two widgets' positions", () => {
    const a = workspace.placements.find((p) => p.widgetId === "portfolio-summary")!;
    const b = workspace.placements.find((p) => p.widgetId === "watchlist")!;
    const swapped = swapWidgets(workspace, "portfolio-summary", "watchlist");
    const a2 = swapped.placements.find((p) => p.widgetId === "portfolio-summary")!;
    const b2 = swapped.placements.find((p) => p.widgetId === "watchlist")!;
    expect(a2.order).toBe(b.order);
    expect(b2.order).toBe(a.order);
    expect(a2.region).toBe(b.region);
    expect(b2.region).toBe(a.region);
  });

  it("clamps the drop index to the region bounds", () => {
    const moved = moveWidget(workspace, "watchlist", { index: 999 });
    const ordered = placementsForRegion(moved, "main");
    expect(ordered[ordered.length - 1].widgetId).toBe("watchlist");
  });

  it("keeps pinned widgets ahead of unpinned ones in display order", () => {
    let next = setWidgetPinned(workspace, "ai-opportunities", false);
    next = setWidgetPinned(next, "market-news", true);
    const ordered = placementsForRegion(next, "main");
    expect(ordered[0].widgetId).toBe("market-news");
  });
});

describe("Sprint 10C.R6 — resize & snap to grid", () => {
  it("resizes a widget through every supported size", () => {
    let workspace = getDefaultWorkspace();
    for (const size of WORKSPACE_SIZES) {
      workspace = resizeWidget(workspace, "watchlist", size);
      expect(
        workspace.placements.find((p) => p.widgetId === "watchlist")?.size
      ).toBe(size);
    }
  });

  it("rejects unknown sizes", () => {
    expect(() =>
      resizeWidget(getDefaultWorkspace(), "watchlist", "tiny" as never)
    ).toThrow(/Unknown widget size/);
  });

  it("maps sizes onto the 12-column grid and snaps arbitrary spans", () => {
    expect(WORKSPACE_SIZE_SPANS.small).toBe(4);
    expect(WORKSPACE_SIZE_SPANS.full).toBe(12);
    expect(sizeFromSpan(4)).toBe("small");
    expect(sizeFromSpan(7)).toBe("medium");
    expect(sizeFromSpan(12)).toBe("full");
  });
});

describe("Sprint 10C.R6 — visibility, pin, collapse", () => {
  it("hides, lists and restores hidden widgets", () => {
    let workspace = getDefaultWorkspace();
    workspace = setWidgetVisible(workspace, "watchlist", false);
    workspace = setWidgetVisible(workspace, "market-news", false);
    expect(hiddenWidgets(workspace).map((p) => p.widgetId)).toEqual([
      "watchlist",
      "market-news",
    ]);
    const restored = restoreHiddenWidgets(workspace);
    expect(hiddenWidgets(restored)).toHaveLength(0);
  });

  it("collapses and expands a widget", () => {
    let workspace = getDefaultWorkspace();
    workspace = setWidgetCollapsed(workspace, "ai-brief", true);
    expect(
      workspace.placements.find((p) => p.widgetId === "ai-brief")?.collapsed
    ).toBe(true);
    workspace = setWidgetCollapsed(workspace, "ai-brief", false);
    expect(
      workspace.placements.find((p) => p.widgetId === "ai-brief")?.collapsed
    ).toBe(false);
  });

  it("adds widgets from the library and removes them again", () => {
    let workspace = getDefaultWorkspace();
    workspace = removeWidgetFromWorkspace(workspace, "watchlist");
    expect(workspace.placements.some((p) => p.widgetId === "watchlist")).toBe(false);
    workspace = addWidgetToWorkspace(workspace, {
      widgetId: "watchlist",
      region: "main",
      order: 0,
      size: "small",
      visible: true,
      pinned: false,
      collapsed: false,
    });
    expect(workspace.placements.some((p) => p.widgetId === "watchlist")).toBe(true);
  });
});

describe("Sprint 10C.R6 — dashboard templates", () => {
  it("ships all eight required templates", () => {
    const ids = DASHBOARD_TEMPLATES.map((t) => t.id);
    expect(ids).toEqual([
      "institutional",
      "research",
      "portfolio",
      "swing-trader",
      "investor",
      "minimal",
      "executive",
      "custom",
    ]);
  });

  it("references only registered widgets with valid sizes", () => {
    for (const template of DASHBOARD_TEMPLATES) {
      for (const placement of template.placements) {
        expect(getWidgetDefinition(placement.widgetId)).not.toBeNull();
        expect(WORKSPACE_SIZES).toContain(placement.size);
      }
    }
  });

  it("searches layouts by name and description", () => {
    expect(searchTemplates("swing").map((t) => t.id)).toEqual(["swing-trader"]);
    expect(searchTemplates("").length).toBe(DASHBOARD_TEMPLATES.length);
  });
});

describe("Sprint 10C.R6 — widget library & registry", () => {
  it("covers the required dockable widget categories", () => {
    const categories = new Set(listWidgetDefinitions().map((w) => w.category));
    for (const required of [
      "charts",
      "tables",
      "portfolio",
      "watchlists",
      "recommendations",
      "market",
      "calendar",
      "news",
      "ai",
      "validation",
    ]) {
      expect(categories.has(required as never)).toBe(true);
    }
  });

  it("registerWidget adds a widget and rejects duplicate ids", () => {
    registerWidget({
      id: "custom-notes",
      label: "Notes",
      description: "Personal research notes",
      category: "research",
      defaultRegion: "main",
      defaultSize: "small",
    });
    expect(getWidgetDefinition("custom-notes")?.label).toBe("Notes");
    expect(() =>
      registerWidget({
        id: "custom-notes",
        label: "Duplicate",
        description: "",
        category: "research",
        defaultRegion: "main",
        defaultSize: "small",
      })
    ).toThrow(/already registered/);
  });

  it("searches widgets by label, description and category", () => {
    expect(searchWidgets("portfolio").length).toBeGreaterThanOrEqual(2);
    expect(searchWidgets("news")[0].id).toBe("market-news");
    expect(searchWidgets("").length).toBe(listWidgetDefinitions().length);
  });
});

describe("Sprint 10C.R6 — import / export", () => {
  it("exports a workspace as JSON and re-imports it", () => {
    const workspace = createWorkspace("Portable", "executive", storage);
    const json = exportWorkspace(workspace.id, storage);
    const parsed = JSON.parse(json);
    expect(parsed.format).toBe("equityos-workspace");
    expect(parsed.version).toBe(1);

    const imported = importWorkspace(json, storage);
    expect(imported.id).not.toBe(workspace.id);
    expect(imported.name).toBe("Portable");
    expect(imported.placements).toEqual(workspace.placements);
    expect(getActiveWorkspace(storage).id).toBe(imported.id);
  });

  it("rejects invalid JSON and foreign payloads", () => {
    expect(() => importWorkspace("not-json", storage)).toThrow(/not valid JSON/);
    expect(() => importWorkspace('{"format":"other"}', storage)).toThrow(
      /not an EquityOS workspace backup/
    );
    expect(() =>
      importWorkspace(
        JSON.stringify({
          format: "equityos-workspace",
          version: 1,
          workspace: { id: "x", name: "Bad", placements: [] },
        }),
        storage
      )
    ).toThrow(/payload is invalid/);
  });

  it("drops malformed placements during import sanitization", () => {
    const workspace = createWorkspace("Sanitize", DEFAULT_TEMPLATE_ID, storage);
    const payload = JSON.parse(exportWorkspace(workspace.id, storage));
    payload.workspace.placements.push({ widgetId: "evil", region: "nowhere" });
    const imported = importWorkspace(JSON.stringify(payload), storage);
    expect(imported.placements.some((p) => p.widgetId === "evil")).toBe(false);
    expect(imported.placements).toHaveLength(workspace.placements.length);
  });
});

describe("Sprint 10C.R6 — keyboard shortcuts & accessibility", () => {
  it("defines the six required workspace shortcuts", () => {
    const ids = WORKSPACE_SHORTCUTS.map((s) => s.id);
    expect(ids).toEqual([
      "save-workspace",
      "reset-workspace",
      "open-widget-picker",
      "workspace-search",
      "toggle-fullscreen",
      "toggle-sidebar",
    ]);
  });

  it("matches keyboard events to shortcuts (Ctrl and Cmd)", () => {
    expect(
      matchShortcut({ key: "S", ctrlKey: true, metaKey: false, shiftKey: true, altKey: false })
    ).toBe("save-workspace");
    expect(
      matchShortcut({ key: "b", ctrlKey: false, metaKey: true, shiftKey: false, altKey: false })
    ).toBe("toggle-sidebar");
    expect(
      matchShortcut({ key: "s", ctrlKey: false, metaKey: false, shiftKey: true, altKey: false })
    ).toBeNull();
    expect(
      matchShortcut({ key: "s", ctrlKey: true, metaKey: false, shiftKey: true, altKey: true })
    ).toBeNull();
  });

  it("gives every widget an accessible label and description", () => {
    for (const widget of listWidgetDefinitions()) {
      expect(widget.label.length).toBeGreaterThan(0);
      expect(widget.description.length).toBeGreaterThan(0);
    }
  });
});

describe("Sprint 10C.R6 — regression", () => {
  it("keeps the design system aggregate intact (8 themes, tokens present)", () => {
    const system = getDesignSystem();
    expect(system.themes).toHaveLength(8);
    expect(system.spacing).toBeDefined();
    expect(system.typography).toBeDefined();
  });

  it("workspace mutations never mutate the source workspace (pure ops)", () => {
    const workspace = getDefaultWorkspace();
    const snapshot = JSON.stringify(workspace);
    moveWidget(workspace, "watchlist", { region: "bottom", index: 0 });
    resizeWidget(workspace, "watchlist", "full");
    setWidgetVisible(workspace, "watchlist", false);
    swapWidgets(workspace, "watchlist", "market-news");
    restoreHiddenWidgets(workspace);
    expect(JSON.stringify(workspace)).toBe(snapshot);
  });

  it("engine APIs are SSR-safe when no storage exists", () => {
    expect(() => getActiveWorkspace(undefined)).not.toThrow();
    expect(getActiveWorkspace(undefined).placements.length).toBeGreaterThan(0);
  });
});
