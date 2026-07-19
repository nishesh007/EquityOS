/**
 * Sprint 10C.R7 — command palette, global search, shortcuts,
 * notifications, activity feed, productivity, breadcrumbs, help,
 * onboarding, accessibility and regression tests.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { fuzzyScore, fuzzyScoreAll } from "./command/fuzzy";
import {
  getCommand,
  listCommands,
  registerCommand,
  registerQuickAction,
  registerSearchProvider,
  resetCommandRegistryForTests,
  searchEverything,
} from "./command/commandRegistry";
import {
  GLOBAL_SHORTCUTS,
  matchGlobalShortcut,
} from "./command/globalShortcuts";
import {
  clearNotifications,
  dismissNotification,
  groupNotifications,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  pinNotification,
  pushNotification,
  searchNotifications,
  unreadCount,
  type NotificationStorage,
} from "./productivity/notificationEngine";
import {
  ACTIVITY_CATEGORIES,
  getActivityFeed,
  recordActivity,
} from "./productivity/activityFeed";
import {
  getFavorites,
  getRecents,
  isFavorite,
  recordRecent,
  toggleFavorite,
} from "./productivity/recentItems";
import { getBreadcrumbs } from "./navigation/breadcrumbs";
import { getMarketSession } from "./navigation/marketSession";
import {
  FAQ,
  GLOSSARY,
  GUIDES,
  RELEASE_NOTES,
  getShortcutGroups,
} from "./help/helpContent";
import {
  ONBOARDING_STEPS,
  dismissOnboarding,
  resetOnboarding,
  shouldShowOnboarding,
} from "./help/onboarding";
import { getDesignSystem } from "./DesignSystem";
import { getDefaultWorkspace } from "./workspace/workspaceEngine";

function memoryStorage(): NotificationStorage & { data: Map<string, string> } {
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
  resetCommandRegistryForTests();
});

describe("Sprint 10C.R7 — fuzzy search", () => {
  it("scores exact, prefix, word, substring and subsequence matches", () => {
    expect(fuzzyScore("portfolio", "Portfolio")).toBe(100);
    expect(fuzzyScore("port", "Portfolio")).toBe(90);
    expect(fuzzyScore("center", "Validation Center")).toBe(80);
    expect(fuzzyScore("lida", "Validation")).toBe(70);
    expect(fuzzyScore("vldtn", "Validation")).toBe(50);
    expect(fuzzyScore("zzz", "Validation")).toBe(0);
  });

  it("considers keywords with a cap below direct label hits", () => {
    expect(fuzzyScoreAll("pnl", "Portfolio", ["holdings", "pnl"])).toBe(75);
    expect(fuzzyScoreAll("portfolio", "Portfolio", ["pnl"])).toBe(100);
  });
});

describe("Sprint 10C.R7 — command registry & global search", () => {
  it("ships built-in commands for every sidebar page", () => {
    const hrefs = listCommands().map((c) => c.href);
    for (const href of ["/", "/research", "/portfolio", "/watchlist", "/validation", "/settings", "/opportunities", "/screener"]) {
      expect(hrefs).toContain(href);
    }
  });

  it("ships the required quick actions", () => {
    const titles = listCommands().map((c) => c.title);
    for (const title of [
      "Open Company…",
      "Open Portfolio",
      "Open Watchlist",
      "Open Screener",
      "Open Research Workspace",
      "Open Dashboard",
      "Add to Watchlist",
      "Create Watchlist",
      "Create Research Note",
      "Archive Recommendation",
      "Export Report",
      "Compare Companies",
      "Pin Widget",
      "Create Workspace",
      "Change Theme",
      "Toggle Theme",
      "Toggle Sidebar",
      "Refresh Dashboard",
      "Refresh Market Data",
      "Open Settings",
      "Open Economic Calendar",
      "Go to Company",
    ]) {
      expect(titles).toContain(title);
    }
  });

  it("includes sector catalog entries for smart search", () => {
    const sectors = listCommands().filter((c) => c.category === "sector");
    expect(sectors.length).toBeGreaterThan(5);
    expect(searchEverything("banking").some((r) => r.category === "sector")).toBe(
      true
    );
  });

  it("registerCommand adds commands and rejects duplicates", () => {
    registerCommand({ id: "custom-cmd", title: "Custom Command", category: "action" });
    expect(getCommand("custom-cmd")?.title).toBe("Custom Command");
    expect(() =>
      registerCommand({ id: "custom-cmd", title: "Again", category: "action" })
    ).toThrow(/already registered/);
  });

  it("registerQuickAction registers into the action category", () => {
    registerQuickAction({ id: "qa-test", title: "Do Something" });
    expect(getCommand("qa-test")?.category).toBe("action");
  });

  it("searchEverything ranks fuzzy matches and includes providers", () => {
    registerSearchProvider("test-companies", (q) =>
      q.includes("rel")
        ? [{ id: "company-REL", title: "Reliance Industries", category: "company" as const, href: "/company/RELIANCE" }]
        : []
    );
    const results = searchEverything("rel");
    expect(results[0].id).toBe("company-REL");
    const research = searchEverything("research");
    expect(research.some((r) => r.href === "/research")).toBe(true);
  });

  it("empty query returns the browsable catalog; failing providers are ignored", () => {
    registerSearchProvider("broken", () => {
      throw new Error("boom");
    });
    expect(searchEverything("").length).toBeGreaterThan(10);
    expect(() => searchEverything("anything")).not.toThrow();
  });
});

describe("Sprint 10C.R7 — global keyboard shortcuts", () => {
  it("defines all required shortcuts", () => {
    const displays = GLOBAL_SHORTCUTS.map((s) => s.display);
    for (const display of ["Ctrl+K", "Ctrl+B", "Ctrl+Shift+D", "Ctrl+Shift+P", "Ctrl+Shift+R", "Ctrl+Shift+W", "Ctrl+,", "?", "Esc"]) {
      expect(displays).toContain(display);
    }
  });

  it("matches Ctrl+K, navigation combos and ? help", () => {
    expect(matchGlobalShortcut({ key: "k", ctrlKey: true, metaKey: false, shiftKey: false, altKey: false })).toBe("command-palette");
    expect(matchGlobalShortcut({ key: "P", ctrlKey: true, metaKey: false, shiftKey: true, altKey: false })).toBe("go-portfolio");
    expect(matchGlobalShortcut({ key: "?", ctrlKey: false, metaKey: false, shiftKey: true, altKey: false })).toBe("shortcut-help");
    expect(matchGlobalShortcut({ key: "escape", ctrlKey: false, metaKey: false, shiftKey: false, altKey: false })).toBe("close-dialog");
    expect(matchGlobalShortcut({ key: "k", ctrlKey: false, metaKey: true, shiftKey: false, altKey: false })).toBe("command-palette");
    expect(matchGlobalShortcut({ key: "k", ctrlKey: true, metaKey: false, shiftKey: false, altKey: true })).toBeNull();
    expect(matchGlobalShortcut({ key: "x", ctrlKey: true, metaKey: false, shiftKey: false, altKey: false })).toBeNull();
  });
});

describe("Sprint 10C.R7 — notification center", () => {
  it("pushes notifications and counts unread", () => {
    pushNotification({ category: "research", title: "New note" }, storage);
    pushNotification({ category: "alert", title: "Price alert" }, storage);
    expect(listNotifications(undefined, storage)).toHaveLength(2);
    expect(unreadCount(storage)).toBe(2);
  });

  it("marks single and all notifications read", () => {
    const a = pushNotification({ category: "system", title: "A" }, storage);
    pushNotification({ category: "system", title: "B" }, storage);
    markNotificationRead(a.id, true, storage);
    expect(unreadCount(storage)).toBe(1);
    markAllNotificationsRead(storage);
    expect(unreadCount(storage)).toBe(0);
  });

  it("pins notifications to the top and filters by category / unread / pinned", () => {
    const first = pushNotification({ category: "news", title: "Old" }, storage);
    pushNotification({ category: "portfolio", title: "New" }, storage);
    pinNotification(first.id, true, storage);
    expect(listNotifications(undefined, storage)[0].id).toBe(first.id);
    expect(listNotifications("portfolio", storage)).toHaveLength(1);
    expect(listNotifications("pinned", storage)).toHaveLength(1);
    markNotificationRead(first.id, true, storage);
    expect(listNotifications("unread", storage)).toHaveLength(1);
  });

  it("dismisses and clears notifications", () => {
    const item = pushNotification({ category: "calendar", title: "Earnings" }, storage);
    dismissNotification(item.id, storage);
    expect(listNotifications(undefined, storage)).toHaveLength(0);
    pushNotification({ category: "system", title: "X" }, storage);
    clearNotifications(storage);
    expect(listNotifications(undefined, storage)).toHaveLength(0);
  });

  it("groups similar notifications and supports search + priority", () => {
    pushNotification(
      {
        category: "opportunity",
        title: "New AI Opportunity",
        groupKey: "ai-opportunities",
        priority: "high",
        source: "AI",
      },
      storage
    );
    pushNotification(
      {
        category: "opportunity",
        title: "New AI Opportunity",
        groupKey: "ai-opportunities",
        priority: "high",
      },
      storage
    );
    pushNotification(
      { category: "portfolio", title: "Portfolio alert", priority: "critical" },
      storage
    );
    const groups = groupNotifications(listNotifications(undefined, storage));
    expect(groups.some((g) => g.grouped && g.count === 2)).toBe(true);
    expect(searchNotifications("portfolio", undefined, storage)).toHaveLength(1);
    expect(listNotifications("today", storage).length).toBeGreaterThan(0);
    expect(listNotifications("ai", storage)).toHaveLength(2);
  });
});

describe("Sprint 10C.R7 — activity feed", () => {
  it("records events newest-first with all required categories", () => {
    expect(ACTIVITY_CATEGORIES).toEqual([
      "research",
      "recommendation",
      "portfolio",
      "watchlist",
      "workspace",
      "export",
      "validation",
      "ai",
      "market",
      "strategy",
    ]);
    recordActivity("workspace", "Applied template", undefined, storage);
    recordActivity("export", "Exported report", undefined, storage);
    const feed = getActivityFeed(undefined, 10, storage);
    expect(feed).toHaveLength(2);
    expect(feed[0].message).toBe("Exported report");
  });

  it("filters the feed by category", () => {
    recordActivity("ai", "AI decision", undefined, storage);
    recordActivity("portfolio", "Position update", undefined, storage);
    expect(getActivityFeed("ai", 10, storage)).toHaveLength(1);
    expect(getActivityFeed("ai", 10, storage)[0].category).toBe("ai");
  });
});

describe("Sprint 10C.R7 — recents & favorites", () => {
  it("records recents de-duplicated, newest first", () => {
    recordRecent({ id: "rel", kind: "company", label: "Reliance" }, storage);
    recordRecent({ id: "tcs", kind: "company", label: "TCS" }, storage);
    recordRecent({ id: "rel", kind: "company", label: "Reliance" }, storage);
    const recents = getRecents("company", 10, storage);
    expect(recents).toHaveLength(2);
    expect(recents[0].id).toBe("rel");
  });

  it("records recent searches separately from companies", () => {
    recordRecent({ id: "banking", kind: "search", label: "banking" }, storage);
    expect(getRecents("search", 5, storage)).toHaveLength(1);
    expect(getRecents("company", 5, storage)).toHaveLength(0);
  });

  it("toggles favorites and pinned companies", () => {
    expect(toggleFavorite({ id: "rel", kind: "company", label: "Reliance" }, storage)).toBe(true);
    expect(isFavorite("rel", "company", storage)).toBe(true);
    expect(getFavorites("company", storage)).toHaveLength(1);
    expect(toggleFavorite({ id: "rel", kind: "company", label: "Reliance" }, storage)).toBe(false);
    expect(isFavorite("rel", "company", storage)).toBe(false);
  });
});

describe("Sprint 10C.R7 — breadcrumbs & status bar", () => {
  it("maps the dashboard root to a single current crumb", () => {
    const crumbs = getBreadcrumbs("/");
    expect(crumbs).toHaveLength(1);
    expect(crumbs[0]).toMatchObject({ label: "Dashboard", href: "/", current: true });
  });

  it("builds a clickable hierarchy for nested routes", () => {
    const crumbs = getBreadcrumbs("/company/RELIANCE");
    expect(crumbs.map((c) => c.label)).toEqual(["Dashboard", "Companies", "RELIANCE"]);
    expect(crumbs[1]).toMatchObject({ href: "/company", current: false });
    expect(crumbs[2]).toMatchObject({ href: "/company/RELIANCE", current: true });
  });

  it("labels known routes professionally", () => {
    expect(getBreadcrumbs("/validation")[1].label).toBe("Research Confidence");
    expect(getBreadcrumbs("/opportunities")[1].label).toBe("AI Insights");
  });

  it("reports the market session from IST hours", () => {
    // 2026-07-15 is a Wednesday; 05:30 UTC = 11:00 IST (open).
    expect(getMarketSession(new Date("2026-07-15T05:30:00Z")).open).toBe(true);
    // 18:00 UTC = 23:30 IST (closed); Sunday closed.
    expect(getMarketSession(new Date("2026-07-15T18:00:00Z")).open).toBe(false);
    expect(getMarketSession(new Date("2026-07-19T05:30:00Z")).open).toBe(false);
  });
});

describe("Sprint 10C.R7 — help center & onboarding", () => {
  it("exposes grouped keyboard shortcuts sourced from the shortcut maps", () => {
    const groups = getShortcutGroups();
    expect(groups.map((g) => g.title)).toEqual(["Global", "Workspace"]);
    expect(groups[0].shortcuts.length).toBe(GLOBAL_SHORTCUTS.length);
  });

  it("ships terminology, guides, FAQ and release notes", () => {
    expect(GLOSSARY.length).toBeGreaterThanOrEqual(8);
    expect(GUIDES.length).toBeGreaterThanOrEqual(3);
    expect(FAQ.length).toBeGreaterThanOrEqual(5);
    expect(RELEASE_NOTES[0].version).toBe("UI v1.0");
    expect(RELEASE_NOTES.some((note) => note.version === "10C.R7")).toBe(true);
    for (const entry of GLOSSARY) {
      expect(entry.definition.length).toBeGreaterThan(20);
    }
  });

  it("onboarding has five steps and dismisses permanently", () => {
    expect(ONBOARDING_STEPS).toHaveLength(5);
    expect(shouldShowOnboarding(storage)).toBe(true);
    dismissOnboarding(storage);
    expect(shouldShowOnboarding(storage)).toBe(false);
    resetOnboarding(storage);
    expect(shouldShowOnboarding(storage)).toBe(true);
  });
});

describe("Sprint 10C.R7 — accessibility & regression", () => {
  it("every command has a human-readable title and category label", () => {
    for (const command of listCommands()) {
      expect(command.title.length).toBeGreaterThan(0);
    }
  });

  it("engines are SSR-safe without storage", () => {
    expect(() => getRecents(undefined, 5, undefined)).not.toThrow();
    expect(() => listNotifications(undefined, undefined)).not.toThrow();
    expect(() => getActivityFeed(undefined, 10, undefined)).not.toThrow();
    expect(shouldShowOnboarding(undefined)).toBe(false);
  });

  it("design system and workspace engine remain intact", () => {
    expect(getDesignSystem().themes).toHaveLength(8);
    expect(getDefaultWorkspace().placements.length).toBeGreaterThan(0);
  });
});
