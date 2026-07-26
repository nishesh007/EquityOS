/**
 * Strategy Builder workspace state factory + reducer + UI persistence.
 */

import { createDefaultBuildingBlocks } from "./catalog";
import { STRATEGY_TEMPLATES, cloneTemplate } from "./templates";
import { loadLibrary } from "./library";
import type {
  BuiltStrategy,
  StrategyBuilderAction,
  StrategyBuilderState,
  StrategyBuildingBlocks,
} from "./types";

export const UI_STORAGE_KEY = "equityos.research.strategy-builder.ui.v1";

export function createInitialBuilderState(): StrategyBuilderState {
  return {
    templates: STRATEGY_TEMPLATES.map(cloneTemplate),
    library: [],
    generated: [],
    selectedId: null,
    comparisonIds: [],
    generatorBlocks: createDefaultBuildingBlocks(),
    selectedTemplateId: null,
    libraryFilters: {
      query: "",
      tag: null,
      favoritesOnly: false,
      includeArchived: false,
    },
    activeTab: "generator",
    lastExportMessage: null,
    errorMessage: null,
  };
}

export function hydrateBuilderState(
  base: StrategyBuilderState = createInitialBuilderState()
): StrategyBuilderState {
  const library = loadLibrary();
  let ui: Partial<StrategyBuilderState> = {};
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(UI_STORAGE_KEY);
      if (raw) ui = JSON.parse(raw) as Partial<StrategyBuilderState>;
    } catch {
      ui = {};
    }
  }
  return {
    ...base,
    library,
    activeTab: ui.activeTab ?? base.activeTab,
    selectedTemplateId: ui.selectedTemplateId ?? base.selectedTemplateId,
    generatorBlocks: (ui.generatorBlocks as StrategyBuildingBlocks) ?? base.generatorBlocks,
    libraryFilters: {
      ...base.libraryFilters,
      ...(ui.libraryFilters ?? {}),
    },
    comparisonIds: Array.isArray(ui.comparisonIds) ? ui.comparisonIds : [],
  };
}

export function persistBuilderUi(state: StrategyBuilderState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      UI_STORAGE_KEY,
      JSON.stringify({
        activeTab: state.activeTab,
        selectedTemplateId: state.selectedTemplateId,
        generatorBlocks: state.generatorBlocks,
        libraryFilters: state.libraryFilters,
        comparisonIds: state.comparisonIds,
      })
    );
  } catch {
    // ignore
  }
}

export function builderReducer(
  state: StrategyBuilderState,
  action: StrategyBuilderAction
): StrategyBuilderState {
  switch (action.type) {
    case "hydrate":
      return action.state;
    case "set_tab":
      return { ...state, activeTab: action.tab, errorMessage: null };
    case "set_generator_blocks":
      return { ...state, generatorBlocks: action.blocks };
    case "select_template":
      return { ...state, selectedTemplateId: action.templateId };
    case "apply_template": {
      const t = state.templates.find((x) => x.id === action.templateId);
      if (!t) return { ...state, errorMessage: "Template not found." };
      return {
        ...state,
        selectedTemplateId: t.id,
        generatorBlocks: {
          ...t.blocks,
          technicalIndicators: [...t.blocks.technicalIndicators],
          fundamentalFilters: [...t.blocks.fundamentalFilters],
          valuationFilters: [...t.blocks.valuationFilters],
          volumeFilters: [...t.blocks.volumeFilters],
          momentumFilters: [...t.blocks.momentumFilters],
          riskRules: [...t.blocks.riskRules],
          exitRules: [...t.blocks.exitRules],
        },
        errorMessage: null,
      };
    }
    case "generate":
      return {
        ...state,
        generated: [...action.strategies, ...state.generated].slice(0, 50),
        selectedId: action.strategies[0]?.id ?? state.selectedId,
        activeTab: "generated",
        errorMessage: null,
      };
    case "select":
      return { ...state, selectedId: action.id };
    case "upsert_library": {
      const idx = state.library.findIndex((s) => s.id === action.strategy.id);
      const library =
        idx >= 0
          ? state.library.map((s) =>
              s.id === action.strategy.id ? action.strategy : s
            )
          : [action.strategy, ...state.library];
      return { ...state, library, selectedId: action.strategy.id };
    }
    case "set_library":
      return { ...state, library: action.library };
    case "set_comparison":
      return { ...state, comparisonIds: action.ids.slice(0, 5) };
    case "toggle_comparison": {
      const has = state.comparisonIds.includes(action.id);
      const comparisonIds = has
        ? state.comparisonIds.filter((id) => id !== action.id)
        : [...state.comparisonIds, action.id].slice(0, 5);
      return { ...state, comparisonIds };
    }
    case "set_filters":
      return {
        ...state,
        libraryFilters: { ...state.libraryFilters, ...action.filters },
      };
    case "set_export_message":
      return { ...state, lastExportMessage: action.message };
    case "set_error":
      return { ...state, errorMessage: action.message };
    case "update_strategy": {
      const patch = (list: typeof state.library) =>
        list.map((s) => (s.id === action.strategy.id ? action.strategy : s));
      return {
        ...state,
        library: patch(state.library),
        generated: patch(state.generated),
        selectedId: action.strategy.id,
      };
    }
    default:
      return state;
  }
}

export function allStrategies(state: StrategyBuilderState): BuiltStrategy[] {
  const map = new Map<string, BuiltStrategy>();
  for (const s of state.generated) map.set(s.id, s);
  for (const s of state.library) map.set(s.id, s);
  return Array.from(map.values());
}
