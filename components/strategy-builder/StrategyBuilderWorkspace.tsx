"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useState,
  useTransition,
} from "react";
import { Sparkles } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import type { ExportFormat } from "@/lib/analytics";
import {
  allStrategies,
  archiveStrategy,
  builderReducer,
  createInitialBuilderState,
  deleteStrategy,
  duplicateStrategy,
  exportStrategies,
  filterLibrary,
  generateStrategies,
  hydrateBuilderState,
  persistBuilderUi,
  renameStrategy,
  resolveComparedStrategies,
  saveToLibrary,
  toggleFavorite,
  validateBuildingBlocks,
  type BuilderTab,
  type BuiltStrategy,
} from "@/lib/strategy-builder";
import { cn } from "@/lib/utils";
import { StrategyGenerator } from "./StrategyGenerator";
import { TemplateSelector } from "./TemplateSelector";
import { StrategyLibrary } from "./StrategyLibrary";
import { StrategyCard } from "./StrategyCard";
import { PerformanceDashboard } from "./PerformanceDashboard";
import { ImprovementPanel } from "./ImprovementPanel";
import { DeploymentChecklist } from "./DeploymentChecklist";
import { StrategyComparison } from "./StrategyComparison";
import { ExportToolbar } from "./ExportToolbar";

const TABS: { id: BuilderTab; label: string }[] = [
  { id: "generator", label: "Strategy Generator" },
  { id: "library", label: "Strategy Library" },
  { id: "generated", label: "Generated Strategies" },
  { id: "evaluation", label: "AI Evaluation" },
  { id: "performance", label: "Performance Dashboard" },
  { id: "comparison", label: "Comparison Workspace" },
  { id: "deployment", label: "Deployment Readiness" },
];

export const StrategyBuilderWorkspace = memo(function StrategyBuilderWorkspace() {
  const [state, dispatch] = useReducer(
    builderReducer,
    undefined,
    createInitialBuilderState
  );
  const [hydrated, setHydrated] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    dispatch({ type: "hydrate", state: hydrateBuilderState() });
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    persistBuilderUi(state);
  }, [hydrated, state]);

  const catalog = useMemo(() => allStrategies(state), [state]);
  const selected =
    catalog.find((s) => s.id === state.selectedId) ??
    state.generated[0] ??
    state.library[0] ??
    null;

  const filteredLibrary = useMemo(
    () => filterLibrary(state.library, state.libraryFilters),
    [state.library, state.libraryFilters]
  );

  const compared = useMemo(
    () => resolveComparedStrategies(catalog, state.comparisonIds),
    [catalog, state.comparisonIds]
  );

  const findStrategy = useCallback(
    (id: string): BuiltStrategy | undefined =>
      state.library.find((s) => s.id === id) ??
      state.generated.find((s) => s.id === id),
    [state.library, state.generated]
  );

  const handleGenerate = useCallback(() => {
    const validation = validateBuildingBlocks(state.generatorBlocks);
    if (!validation.valid) {
      dispatch({ type: "set_error", message: validation.message ?? "Invalid strategy" });
      return;
    }
    startTransition(() => {
      try {
        const strategies = generateStrategies({
          templateId: state.selectedTemplateId,
          blocks: state.generatorBlocks,
          nameHint: state.selectedTemplateId
            ? undefined
            : "AI Generated Strategy",
        }, 3);
        dispatch({ type: "generate", strategies });
      } catch {
        dispatch({
          type: "set_error",
          message: "Strategy generation failed unexpectedly.",
        });
      }
    });
  }, [state.generatorBlocks, state.selectedTemplateId]);

  const handleSaveToLibrary = useCallback(
    (id: string) => {
      const strategy = findStrategy(id);
      if (!strategy) return;
      const result = saveToLibrary(state.library, strategy);
      if (result.error) {
        dispatch({ type: "set_error", message: result.error });
        return;
      }
      dispatch({ type: "set_library", library: result.library });
      dispatch({ type: "select", id: result.strategy.id });
      dispatch({ type: "set_error", message: null });
    },
    [findStrategy, state.library]
  );

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      const targets =
        compared.length > 0 ? compared : selected ? [selected] : catalog.slice(0, 10);
      try {
        const result = await exportStrategies({
          strategies: targets,
          format,
          title: "AI Strategy Builder",
        });
        dispatch({
          type: "set_export_message",
          message: result.message ?? (result.status === "failed" ? "Export failed" : "Export ready"),
        });
        if (result.status === "failed") {
          dispatch({ type: "set_error", message: result.message ?? "Export failed" });
        }
      } catch {
        dispatch({ type: "set_error", message: "Export failed unexpectedly." });
      }
    },
    [catalog, compared, selected]
  );

  if (!hydrated) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="h-10 w-64 animate-pulse rounded bg-surface-raised" />
        <div className="h-40 animate-pulse rounded-xl bg-surface-raised" />
      </div>
    );
  }

  return (
    <div className="space-y-5" data-testid="strategy-builder-workspace">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          accent="violet"
          icon={<Sparkles className="h-5 w-5" />}
          title="AI Strategy Builder"
          subtitle="Generate, score, compare, and validate research strategies for paper deployment — no live trading."
        />
        <ExportToolbar
          onExport={handleExport}
          disabled={catalog.length === 0}
          message={state.lastExportMessage}
        />
      </div>

      {(state.errorMessage || pending) && (
        <div
          role="status"
          className={cn(
            "rounded-lg border px-3 py-2 text-sm",
            state.errorMessage
              ? "border-loss/40 bg-loss/10 text-loss"
              : "border-surface-border-subtle text-text-secondary"
          )}
        >
          {state.errorMessage ?? "Generating strategies…"}
        </div>
      )}

      <div
        role="tablist"
        aria-label="Strategy builder sections"
        className="flex flex-wrap gap-1 rounded-xl border border-surface-border-subtle bg-surface-overlay/40 p-1"
      >
        {TABS.map((tab) => {
          const active = state.activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                active
                  ? "bg-accent/20 text-accent"
                  : "text-text-secondary hover:bg-surface-raised"
              )}
              onClick={() => dispatch({ type: "set_tab", tab: tab.id })}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {state.activeTab === "generator" && (
        <div className="space-y-4">
          <TemplateSelector
            templates={state.templates}
            selectedId={state.selectedTemplateId}
            onSelect={(id) => dispatch({ type: "select_template", templateId: id })}
            onApply={(id) => dispatch({ type: "apply_template", templateId: id })}
          />
          <StrategyGenerator
            blocks={state.generatorBlocks}
            onChange={(blocks) =>
              dispatch({ type: "set_generator_blocks", blocks })
            }
            onGenerate={handleGenerate}
            disabled={pending}
          />
        </div>
      )}

      {state.activeTab === "library" && (
        <StrategyLibrary
          strategies={filteredLibrary}
          filters={state.libraryFilters}
          selectedId={state.selectedId}
          comparisonIds={state.comparisonIds}
          onFiltersChange={(filters) =>
            dispatch({ type: "set_filters", filters })
          }
          onSelect={(id) => dispatch({ type: "select", id })}
          onToggleCompare={(id) =>
            dispatch({ type: "toggle_comparison", id })
          }
          onFavorite={(id) =>
            dispatch({
              type: "set_library",
              library: toggleFavorite(state.library, id),
            })
          }
          onDuplicate={(id) => {
            const s = state.library.find((x) => x.id === id);
            if (!s) return;
            const result = duplicateStrategy(state.library, s);
            if (result.error) {
              dispatch({ type: "set_error", message: result.error });
              return;
            }
            dispatch({ type: "set_library", library: result.library });
            dispatch({ type: "select", id: result.strategy.id });
          }}
          onRename={(id, name) => {
            const result = renameStrategy(state.library, id, name);
            if (result.error) {
              dispatch({ type: "set_error", message: result.error });
              return;
            }
            dispatch({ type: "set_library", library: result.library });
          }}
          onArchive={(id) => {
            const current = state.library.find((s) => s.id === id);
            dispatch({
              type: "set_library",
              library: archiveStrategy(
                state.library,
                id,
                !(current?.archived ?? false)
              ),
            });
          }}
          onDelete={(id) =>
            dispatch({
              type: "set_library",
              library: deleteStrategy(state.library, id),
            })
          }
        />
      )}

      {state.activeTab === "generated" && (
        <div className="space-y-4" data-testid="generated-strategies">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-text-primary">
                Generated Strategies
              </h2>
              <p className="text-sm text-text-secondary">
                Latest AI rule-based generations from your building blocks.
              </p>
            </div>
          </div>
          {state.generated.length === 0 ? (
            <p className="rounded-xl border border-surface-border-subtle p-8 text-center text-sm text-text-secondary">
              No generated strategies yet. Use the Strategy Generator tab.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {state.generated.map((s) => (
                <div key={s.id} className="space-y-2">
                  <StrategyCard
                    strategy={s}
                    selected={state.selectedId === s.id}
                    compared={state.comparisonIds.includes(s.id)}
                    onSelect={() => dispatch({ type: "select", id: s.id })}
                    onToggleCompare={() =>
                      dispatch({ type: "toggle_comparison", id: s.id })
                    }
                  />
                  <button
                    type="button"
                    className="w-full rounded-lg border border-surface-border-subtle px-2 py-1.5 text-xs text-text-secondary hover:bg-surface-raised"
                    onClick={() => handleSaveToLibrary(s.id)}
                  >
                    Save to library
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {state.activeTab === "evaluation" && (
        <ImprovementPanel strategy={selected} />
      )}

      {state.activeTab === "performance" && (
        <PerformanceDashboard strategy={selected} />
      )}

      {state.activeTab === "comparison" && (
        <StrategyComparison strategies={compared} />
      )}

      {state.activeTab === "deployment" && (
        <DeploymentChecklist strategy={selected} />
      )}
    </div>
  );
});
