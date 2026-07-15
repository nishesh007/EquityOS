/**
 * Institutional AI Screener — screen registry (Sprint 9D.R1).
 * Built-in, custom, and future marketplace screens. Versioned + enable/disable.
 */

import {
  DEFAULT_SCREEN_WEIGHTS,
  resolveScreenWeights,
  SCREEN_TYPES,
  type ScreenDefinition,
  type ScreenDefinitionInput,
  type ScreenType,
} from "./ScreenDefinition";
import { safeScreenText } from "./ScreenModels";

const screens = new Map<string, ScreenDefinition>();
let builtinsRegistered = false;

const BUILTIN_SCREENS: Array<{
  id: string;
  name: string;
  description: string;
  category: ScreenType;
  universe: ScreenDefinition["universe"];
  rules: ScreenDefinition["rules"];
  sortOrder?: ScreenDefinition["sortOrder"];
  resultLimit?: number;
}> = [
  {
    id: "momentum-leaders",
    name: "Momentum Leaders",
    description: "Compose Opportunity Engine momentum signals across NSE/BSE",
    category: "Momentum",
    universe: "nse-bse",
    rules: [
      {
        id: "mom-ai",
        field: "aiScore",
        operator: "gte",
        value: 60,
        weight: 1,
        description: "Minimum AI momentum score",
      },
    ],
  },
  {
    id: "breakout-candidates",
    name: "Breakout Candidates",
    description: "Compose Opportunity Engine breakout shortlist",
    category: "Breakout",
    universe: "nse-bse",
    rules: [
      {
        id: "brk-ai",
        field: "aiScore",
        operator: "gte",
        value: 55,
        description: "Minimum breakout AI score",
      },
    ],
  },
  {
    id: "swing-setups",
    name: "Swing Setups",
    description: "Compose swing opportunities with trust and validation gates",
    category: "Swing",
    universe: "nse-bse",
    rules: [
      {
        id: "swing-ai",
        field: "aiScore",
        operator: "gte",
        value: 50,
      },
      {
        id: "swing-trust",
        field: "trustScore",
        operator: "gte",
        value: 40,
      },
    ],
  },
  {
    id: "quality-compounders",
    name: "Quality Compounders",
    description: "Quality screen — Research + Trust composition",
    category: "Quality",
    universe: "nse-bse",
    rules: [
      {
        id: "qual-trust",
        field: "trustScore",
        operator: "gte",
        value: 60,
      },
      {
        id: "qual-val",
        field: "validationScore",
        operator: "gte",
        value: 50,
      },
    ],
  },
  {
    id: "value-opportunities",
    name: "Value Opportunities",
    description: "Value screen composed from research valuation signals",
    category: "Value",
    universe: "nse-bse",
    rules: [
      {
        id: "val-ai",
        field: "aiScore",
        operator: "gte",
        value: 45,
      },
    ],
  },
  {
    id: "growth-leaders",
    name: "Growth Leaders",
    description: "Growth screen — fundamentals + opportunity composition",
    category: "Growth",
    universe: "nse-bse",
    rules: [
      {
        id: "growth-ai",
        field: "aiScore",
        operator: "gte",
        value: 55,
      },
    ],
  },
  {
    id: "income-yield",
    name: "Income Yield",
    description: "Income screen for dividend-oriented names",
    category: "Income",
    universe: "nse-bse",
    rules: [
      {
        id: "inc-conf",
        field: "confidence",
        operator: "gte",
        value: 40,
      },
    ],
  },
  {
    id: "technical-trend",
    name: "Technical Trend",
    description: "Technical screen composing Market + Opportunity signals",
    category: "Technical",
    universe: "nse-bse",
    rules: [
      {
        id: "tech-ai",
        field: "aiScore",
        operator: "gte",
        value: 50,
      },
    ],
  },
  {
    id: "fundamental-strength",
    name: "Fundamental Strength",
    description: "Fundamental screen via Research + Validation composition",
    category: "Fundamental",
    universe: "nse-bse",
    rules: [
      {
        id: "fund-val",
        field: "validationScore",
        operator: "gte",
        value: 55,
      },
    ],
  },
  {
    id: "turnaround-watch",
    name: "Turnaround Watch",
    description: "Turnaround themes with elevated validation scrutiny",
    category: "Turnaround",
    universe: "nse-bse",
    rules: [
      {
        id: "turn-val",
        field: "validationScore",
        operator: "gte",
        value: 35,
      },
    ],
  },
  {
    id: "sector-focus",
    name: "Sector Focus",
    description: "Sector universe screen — provide sector at run time",
    category: "Sector",
    universe: "sector",
    rules: [],
  },
  {
    id: "theme-focus",
    name: "Theme Focus",
    description: "Theme universe screen — provide theme at run time",
    category: "Theme",
    universe: "theme",
    rules: [],
  },
  {
    id: "portfolio-screen",
    name: "Portfolio Screen",
    description: "Screen restricted to portfolio holdings",
    category: "Portfolio",
    universe: "portfolio",
    rules: [],
  },
  {
    id: "watchlist-screen",
    name: "Watchlist Screen",
    description: "Screen restricted to watchlist symbols",
    category: "Watchlist",
    universe: "watchlist",
    rules: [],
  },
  {
    id: "custom-blank",
    name: "Custom Screen",
    description: "Blank custom screen template",
    category: "Custom",
    universe: "custom",
    rules: [],
  },
];

export function registerScreen(
  input: ScreenDefinitionInput,
  options?: { force?: boolean }
): { registered: boolean; skipped: boolean; definition: ScreenDefinition } {
  const id = safeScreenText(input.id, "").toLowerCase();
  if (!id) {
    throw new Error("Screen id is required");
  }

  const existing = screens.get(id);
  if (existing && !options?.force) {
    return { registered: false, skipped: true, definition: existing };
  }

  const now = new Date().toISOString();
  const definition: ScreenDefinition = {
    id,
    name: safeScreenText(input.name, id),
    description: safeScreenText(input.description, ""),
    category: input.category,
    universe: input.universe,
    universeSymbols: input.universeSymbols
      ? [...input.universeSymbols]
      : undefined,
    sector: input.sector,
    theme: input.theme,
    rules: (input.rules ?? []).map((rule) => ({ ...rule })),
    weights: resolveScreenWeights(input.weights),
    sortOrder: input.sortOrder ?? "aiScore",
    resultLimit: Number.isFinite(input.resultLimit)
      ? Math.max(1, Math.floor(input.resultLimit!))
      : 50,
    cacheTtlMs: Number.isFinite(input.cacheTtlMs)
      ? Math.max(0, Math.floor(input.cacheTtlMs!))
      : 60_000,
    version: safeScreenText(input.version, "1.0.0"),
    origin: input.origin ?? "custom",
    enabled: input.enabled !== false,
    createdAt: input.createdAt ?? existing?.createdAt ?? now,
    updatedAt: now,
  };

  screens.set(id, definition);
  return { registered: true, skipped: false, definition };
}

export function registerBuiltinScreens(options?: {
  force?: boolean;
}): { registered: number; skipped: number; total: number } {
  if (builtinsRegistered && !options?.force) {
    return { registered: 0, skipped: screens.size, total: screens.size };
  }

  let added = 0;
  let skipped = 0;
  for (const builtin of BUILTIN_SCREENS) {
    const result = registerScreen(
      {
        ...builtin,
        origin: "built-in",
        enabled: true,
        version: "1.0.0",
        weights: DEFAULT_SCREEN_WEIGHTS,
        sortOrder: builtin.sortOrder ?? "aiScore",
        resultLimit: builtin.resultLimit ?? 50,
        cacheTtlMs: 60_000,
      },
      { force: options?.force }
    );
    if (result.registered) added += 1;
    else skipped += 1;
  }

  // Ensure every screen type has at least one builtin
  for (const category of SCREEN_TYPES) {
    const hasCategory = [...screens.values()].some(
      (s) => s.category === category && s.origin === "built-in"
    );
    if (!hasCategory) {
      registerScreen(
        {
          id: `${category.toLowerCase()}-default`,
          name: `${category} Default`,
          description: `Default ${category} screen`,
          category,
          universe: "nse-bse",
          rules: [],
          sortOrder: "aiScore",
          resultLimit: 50,
          cacheTtlMs: 60_000,
          origin: "built-in",
          enabled: true,
          version: "1.0.0",
        },
        { force: options?.force }
      );
      added += 1;
    }
  }

  builtinsRegistered = true;
  return { registered: added, skipped, total: screens.size };
}

export function getScreen(screenId: string): ScreenDefinition | null {
  return screens.get(safeScreenText(screenId, "").toLowerCase()) ?? null;
}

export function listScreens(options?: {
  enabledOnly?: boolean;
  origin?: ScreenDefinition["origin"];
  category?: ScreenType;
}): ScreenDefinition[] {
  let list = [...screens.values()];
  if (options?.enabledOnly) list = list.filter((s) => s.enabled);
  if (options?.origin) list = list.filter((s) => s.origin === options.origin);
  if (options?.category)
    list = list.filter((s) => s.category === options.category);
  return list.sort((a, b) => a.name.localeCompare(b.name));
}

export function setScreenEnabled(
  screenId: string,
  enabled: boolean
): ScreenDefinition | null {
  const existing = getScreen(screenId);
  if (!existing) return null;
  const updated: ScreenDefinition = {
    ...existing,
    enabled,
    updatedAt: new Date().toISOString(),
  };
  screens.set(existing.id, updated);
  return updated;
}

export function isScreenEnabled(screenId: string): boolean {
  const screen = getScreen(screenId);
  return screen?.enabled === true;
}

export function resetScreenRegistry(): void {
  screens.clear();
  builtinsRegistered = false;
}
