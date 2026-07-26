"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { RotateCcw, Save, SlidersHorizontal } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import type { ExportFormat } from "@/lib/analytics";
import {
  MEMORY_SOFT_LIMIT_COMBINATIONS,
  OPTIMIZATION_STRATEGIES,
  cloneConstraints,
  createInitialWorkspaceState,
  deleteProfile,
  deleteSession,
  duplicateProfile,
  duplicateSession,
  estimateCombinationCount,
  exportOptimizationSession,
  getStrategyById,
  hydrateParameters,
  hydrateWorkspaceFromStorage,
  rankResults,
  recomputeDerived,
  renameProfile,
  resetParameter,
  runOptimizationEngine,
  saveNewProfile,
  saveRecentProfileIds,
  setDefaultProfile,
  touchRecent,
  updateExistingProfile,
  updateParameterBounds,
  updateParameterValue,
  upsertSession,
  type ConstraintDefinition,
  type OptimizationResult,
  type OptimizationSession,
  type OptimizationWorkspaceState,
  type ParameterState,
  type RankingMetric,
  type RankingMode,
  type RunnerControl,
  type SearchMode,
  type SmartSearchIntensity,
  type WalkForwardConfig,
  type WalkForwardControl,
  type WalkForwardFilterState,
  type MonteCarloConfig,
  type MonteCarloControl,
  type MonteCarloFilterState,
  exportWalkForwardSession,
  runWalkForwardValidation,
  upsertWalkForwardSession,
  validateWalkForwardConfig,
  buildBaselineTradeReturns,
  exportMonteCarloSession,
  runMonteCarloSimulation,
  upsertMonteCarloSession,
  validateMonteCarloConfig,
  logOptimization,
  saveUiPreferences,
} from "@/lib/optimization";
import { StrategySelector } from "./StrategySelector";
import { ParameterEditor } from "./ParameterEditor";
import { ConstraintBuilder } from "./ConstraintBuilder";
import { ProfileManager } from "./ProfileManager";
import { ExperimentQueue } from "./ExperimentQueue";
import { RuntimeEstimator } from "./RuntimeEstimator";
import { ValidationPanel } from "./ValidationPanel";
import { SearchModeSelector } from "./SearchModeSelector";
import { RankingSelector } from "./RankingSelector";
import { OptimizationRunner } from "./OptimizationRunner";
import { ProgressPanel } from "./ProgressPanel";
import { LeaderboardTable } from "./LeaderboardTable";
import { ResultDrawer } from "./ResultDrawer";
import { ComparisonView } from "./ComparisonView";
import { SessionHistory } from "./SessionHistory";
import { ExportToolbar } from "./ExportToolbar";
import { WalkForwardWorkspace } from "./walk-forward";
import { MonteCarloWorkspace } from "./monte-carlo";
import {
  OptimizationEmptyState,
  OptimizationRecoveryBanner,
} from "./hardening";
import { cn } from "@/lib/utils";

const WORKSPACE_TABS = [
  { id: "configuration" as const, label: "Configuration" },
  { id: "results" as const, label: "Results" },
  { id: "walk-forward" as const, label: "Walk-Forward Validation" },
  { id: "monte-carlo" as const, label: "Monte Carlo & Stress Testing" },
];
function applyDerived(
  prev: OptimizationWorkspaceState,
  patch: Partial<OptimizationWorkspaceState>
): OptimizationWorkspaceState {
  const next = { ...prev, ...patch };
  const derived = recomputeDerived(next);
  return { ...next, ...derived };
}

export const StrategyOptimizationWorkspace = memo(
  function StrategyOptimizationWorkspace() {
    const [state, setState] = useState<OptimizationWorkspaceState>(() =>
      createInitialWorkspaceState()
    );
    const [activeProfileId, setActiveProfileId] = useState<string | null>(
      "profile-default"
    );
    const [hydrated, setHydrated] = useState(false);
    const [pending, startTransition] = useTransition();
    const controlRef = useRef<RunnerControl>("running");
    const runningRef = useRef(false);
    const wfvControlRef = useRef<WalkForwardControl>("running");
    const mcControlRef = useRef<MonteCarloControl>("running");

    useEffect(() => {
      const next = hydrateWorkspaceFromStorage(createInitialWorkspaceState());
      setState(next);
      const def =
        next.profiles.find((p) => p.isDefault) ?? next.profiles[0] ?? null;
      setActiveProfileId(def?.id ?? null);
      setHydrated(true);
    }, []);

    /** Cancel in-flight jobs on unmount — prevent leaked async updates. */
    useEffect(() => {
      return () => {
        controlRef.current = "cancelled";
        wfvControlRef.current = "cancelled";
        mcControlRef.current = "cancelled";
        runningRef.current = false;
      };
    }, []);

    /** Persist UI prefs after hydration (tab, filters, configs). */
    useEffect(() => {
      if (!hydrated) return;
      saveUiPreferences({
        activeTab: state.activeTab,
        engineSettings: state.engineSettings,
        walkForwardConfig: state.walkForwardConfig,
        walkForwardFilters: state.walkForwardFilters,
        monteCarloConfig: state.monteCarloConfig,
        monteCarloFilters: state.monteCarloFilters,
      });
    }, [
      hydrated,
      state.activeTab,
      state.engineSettings,
      state.walkForwardConfig,
      state.walkForwardFilters,
      state.monteCarloConfig,
      state.monteCarloFilters,
    ]);

    const selectedStrategy = useMemo(
      () => getStrategyById(state.selectedStrategyId),
      [state.selectedStrategyId]
    );

    const leaderboardResults = useMemo(() => {
      const raw = state.currentSession?.results ?? [];
      return rankResults(
        raw,
        state.engineSettings.rankingMode,
        state.engineSettings.primaryMetric
      );
    }, [
      state.currentSession?.results,
      state.engineSettings.rankingMode,
      state.engineSettings.primaryMetric,
    ]);

    const selectedResult = useMemo(() => {
      if (!state.selectedResultId) return null;
      return (
        leaderboardResults.find((r) => r.id === state.selectedResultId) ?? null
      );
    }, [leaderboardResults, state.selectedResultId]);

    const isRunning =
      state.currentSession?.status === "Running" ||
      state.currentSession?.status === "Paused";

    const selectStrategy = useCallback((id: string) => {
      startTransition(() => {
        setState((prev) =>
          applyDerived(prev, { selectedStrategyId: id, runMessage: null })
        );
      });
    }, []);

    const onValueChange = useCallback(
      (id: string, value: number | boolean | string) => {
        startTransition(() => {
          setState((prev) =>
            applyDerived(prev, {
              parameters: updateParameterValue(prev.parameters, id, value),
              runMessage: null,
              profileError: null,
            })
          );
        });
      },
      []
    );

    const onBoundsChange = useCallback(
      (
        id: string,
        patch: Partial<
          Pick<ParameterState, "min" | "max" | "increment" | "enabled">
        >
      ) => {
        startTransition(() => {
          setState((prev) =>
            applyDerived(prev, {
              parameters: updateParameterBounds(prev.parameters, id, patch),
              runMessage: null,
            })
          );
        });
      },
      []
    );

    const onResetParam = useCallback((id: string) => {
      startTransition(() => {
        setState((prev) =>
          applyDerived(prev, {
            parameters: resetParameter(prev.parameters, id),
          })
        );
      });
    }, []);

    const onConstraintChange = useCallback(
      (
        id: ConstraintDefinition["id"],
        patch: Partial<ConstraintDefinition>
      ) => {
        startTransition(() => {
          setState((prev) =>
            applyDerived(prev, {
              constraints: prev.constraints.map((c) =>
                c.id === id ? { ...c, ...patch } : c
              ),
              runMessage: null,
            })
          );
        });
      },
      []
    );

    const resetWorkspace = useCallback(() => {
      startTransition(() => {
        setState((prev) =>
          applyDerived(prev, {
            parameters: hydrateParameters(),
            constraints: cloneConstraints(),
            selectedStrategyId: "swing-breakout",
            runMessage: null,
            profileError: null,
            comparison: { selectedIds: [] },
            selectedResultId: null,
          })
        );
      });
    }, []);

    const saveProfile = useCallback(
      (name: string) => {
        if (!state.selectedStrategyId) {
          setState((prev) => ({
            ...prev,
            profileError: "Select a strategy before saving a profile.",
          }));
          return;
        }
        const result = saveNewProfile({
          profiles: state.profiles,
          name,
          strategyId: state.selectedStrategyId,
          parameters: state.parameters,
          constraints: state.constraints,
        });
        if (result.error) {
          setState((prev) => ({ ...prev, profileError: result.error ?? null }));
          return;
        }
        if (result.profile) {
          const recentProfileIds = touchRecent(
            state.recentProfileIds,
            result.profile.id
          );
          saveRecentProfileIds(recentProfileIds);
          setActiveProfileId(result.profile.id);
          setState((prev) => ({
            ...prev,
            profiles: result.profiles,
            recentProfileIds,
            profileError: null,
          }));
        }
      },
      [state]
    );

    const saveActiveProfile = useCallback(() => {
      if (!activeProfileId || !state.selectedStrategyId) {
        saveProfile(`Profile ${new Date().toLocaleString()}`);
        return;
      }
      const profiles = updateExistingProfile(state.profiles, activeProfileId, {
        strategyId: state.selectedStrategyId,
        parameters: state.parameters,
        constraints: state.constraints,
      });
      const recentProfileIds = touchRecent(
        state.recentProfileIds,
        activeProfileId
      );
      saveRecentProfileIds(recentProfileIds);
      setState((prev) => ({
        ...prev,
        profiles,
        recentProfileIds,
        profileError: null,
      }));
    }, [activeProfileId, saveProfile, state]);

    const onRename = useCallback((id: string, name: string) => {
      setState((prev) => {
        const result = renameProfile(prev.profiles, id, name);
        return {
          ...prev,
          profiles: result.profiles,
          profileError: result.error ?? null,
        };
      });
    }, []);

    const onDuplicate = useCallback((id: string) => {
      setState((prev) => {
        const result = duplicateProfile(prev.profiles, id);
        if (result.profile) setActiveProfileId(result.profile.id);
        return {
          ...prev,
          profiles: result.profiles,
          profileError: result.error ?? null,
        };
      });
    }, []);

    const onDelete = useCallback(
      (id: string) => {
        setState((prev) => {
          const result = deleteProfile(prev.profiles, id);
          if (result.error) {
            return { ...prev, profileError: result.error };
          }
          const recentProfileIds = prev.recentProfileIds.filter((x) => x !== id);
          saveRecentProfileIds(recentProfileIds);
          if (activeProfileId === id) {
            const nextActive =
              result.profiles.find((p) => p.isDefault) ?? result.profiles[0];
            setActiveProfileId(nextActive?.id ?? null);
          }
          return {
            ...prev,
            profiles: result.profiles,
            recentProfileIds,
            profileError: null,
          };
        });
      },
      [activeProfileId]
    );

    const onSetDefault = useCallback((id: string) => {
      setState((prev) => ({
        ...prev,
        profiles: setDefaultProfile(prev.profiles, id),
        profileError: null,
      }));
    }, []);

    const onLoadProfile = useCallback(
      (id: string) => {
        const profile = state.profiles.find((p) => p.id === id);
        if (!profile) return;
        const recentProfileIds = touchRecent(state.recentProfileIds, id);
        saveRecentProfileIds(recentProfileIds);
        setActiveProfileId(id);
        startTransition(() => {
          setState((prev) =>
            applyDerived(prev, {
              selectedStrategyId: profile.strategyId,
              parameters: profile.parameters.map((p) => ({ ...p })),
              constraints: profile.constraints.map((c) => ({ ...c })),
              recentProfileIds,
              profileError: null,
              runMessage: null,
            })
          );
        });
      },
      [state.profiles, state.recentProfileIds]
    );

    const patchSettings = useCallback(
      (patch: Partial<OptimizationWorkspaceState["engineSettings"]>) => {
        setState((prev) => ({
          ...prev,
          engineSettings: { ...prev.engineSettings, ...patch },
        }));
      },
      []
    );

    const persistSession = useCallback((session: OptimizationSession) => {
      setState((prev) => {
        const sessionHistory = upsertSession(prev.sessionHistory, session);
        return {
          ...prev,
          currentSession: session,
          sessionHistory,
          runMessage:
            session.status === "Completed"
              ? `Completed · ${session.results.length} valid results · top score ${session.topScore ?? "—"}`
              : session.status === "Cancelled"
                ? "Optimization cancelled."
                : session.status === "Failed"
                  ? session.error ?? "Optimization failed."
                  : prev.runMessage,
        };
      });
    }, []);

    const onRun = useCallback(async () => {
      if (!state.validation.ready || !selectedStrategy || runningRef.current) {
        setState((prev) => ({
          ...prev,
          runMessage: !selectedStrategy
            ? "Select a strategy before running."
            : !prev.validation.ready
              ? "Fix validation issues before running."
              : "An optimization session is already running.",
        }));
        return;
      }

      const comboCount = estimateCombinationCount(state.parameters);
      if (comboCount > MEMORY_SOFT_LIMIT_COMBINATIONS) {
        setState((prev) => ({
          ...prev,
          runMessage: `Combination count (${comboCount.toLocaleString()}) exceeds soft memory limit (${MEMORY_SOFT_LIMIT_COMBINATIONS.toLocaleString()}). Narrow ranges or use Smart/Quick mode.`,
        }));
        return;
      }

      controlRef.current = "running";
      runningRef.current = true;
      setState((prev) => ({
        ...prev,
        runnerControl: "running",
        runMessage: "Starting optimization engine…",
        comparison: { selectedIds: [] },
        selectedResultId: null,
      }));

      try {
        const finalSession = await runOptimizationEngine({
          strategyId: selectedStrategy.id,
          strategyName: selectedStrategy.name,
          parameters: state.parameters,
          constraints: state.constraints,
          searchMode: state.engineSettings.searchMode,
          smartIntensity: state.engineSettings.smartIntensity,
          rankingMode: state.engineSettings.rankingMode,
          primaryMetric: state.engineSettings.primaryMetric,
          maxCombinations: state.engineSettings.maxCombinations,
          onProgress: persistSession,
          getControl: () => controlRef.current,
        });
        persistSession(finalSession);
      } catch (err) {
        setState((prev) => ({
          ...prev,
          runMessage:
            err instanceof Error
              ? err.message
              : "Unexpected optimization failure.",
          currentSession: prev.currentSession
            ? {
                ...prev.currentSession,
                status: "Failed",
                error:
                  err instanceof Error
                    ? err.message
                    : "Unexpected optimization failure.",
              }
            : prev.currentSession,
        }));
      } finally {
        runningRef.current = false;
        controlRef.current = "running";
        setState((prev) => ({ ...prev, runnerControl: "running" }));
      }
    }, [
      persistSession,
      selectedStrategy,
      state.constraints,
      state.engineSettings,
      state.parameters,
      state.validation.ready,
    ]);

    const onPause = useCallback(() => {
      controlRef.current = "paused";
      setState((prev) => ({ ...prev, runnerControl: "paused" }));
    }, []);

    const onResume = useCallback(() => {
      controlRef.current = "running";
      setState((prev) => ({ ...prev, runnerControl: "running" }));
    }, []);

    const onCancel = useCallback(() => {
      controlRef.current = "cancelled";
      setState((prev) => ({ ...prev, runnerControl: "cancelled" }));
    }, []);

    const onToggleCompare = useCallback((id: string) => {
      setState((prev) => {
        const has = prev.comparison.selectedIds.includes(id);
        const selectedIds = has
          ? prev.comparison.selectedIds.filter((x) => x !== id)
          : [...prev.comparison.selectedIds, id].slice(0, 4);
        return { ...prev, comparison: { selectedIds } };
      });
    }, []);

    const onExport = useCallback(
      async (format: ExportFormat) => {
        const session = state.currentSession;
        if (!session || session.results.length === 0) {
          setState((prev) => ({
            ...prev,
            exportState: {
              ...prev.exportState,
              lastMessage: "No results available to export.",
              lastFormat: format,
            },
          }));
          return;
        }
        setState((prev) => ({
          ...prev,
          exportState: { ...prev.exportState, busy: true, lastMessage: null },
        }));
        try {
          const prepared = await exportOptimizationSession({
            session,
            format,
            results: leaderboardResults.slice(
              0,
              state.engineSettings.leaderboardLimit
            ),
          });
          logOptimization(
            prepared.status === "ready" ? "info" : "error",
            prepared.status === "ready" ? "export_completed" : "export_failed",
            { format, module: "optimization", sessionId: session.id }
          );
          setState((prev) => ({
            ...prev,
            exportState: {
              busy: false,
              lastFormat: format,
              lastMessage:
                prepared.message ??
                (prepared.status === "ready"
                  ? `Exported as ${format.toUpperCase()}.`
                  : "Export failed."),
            },
          }));
        } catch (err) {
          setState((prev) => ({
            ...prev,
            exportState: {
              busy: false,
              lastFormat: format,
              lastMessage:
                err instanceof Error ? err.message : "Export failed.",
            },
          }));
        }
      },
      [
        leaderboardResults,
        state.currentSession,
        state.engineSettings.leaderboardLimit,
      ]
    );

    const wfvConfigError = useMemo(
      () => validateWalkForwardConfig(state.walkForwardConfig),
      [state.walkForwardConfig]
    );

    const onWalkForwardRun = useCallback(async () => {
      if (!selectedStrategy || state.walkForwardRunning) return;
      if (wfvConfigError) {
        setState((prev) => ({
          ...prev,
          runMessage: wfvConfigError,
        }));
        return;
      }

      wfvControlRef.current = "running";
      setState((prev) => ({ ...prev, walkForwardRunning: true }));

      const candidates = (state.currentSession?.results ?? [])
        .slice(0, 12)
        .map((r) => ({
          values: r.combination.values,
          labels: r.combination.labels,
        }));

      try {
        const final = await runWalkForwardValidation({
          strategyId: selectedStrategy.id,
          strategyName: selectedStrategy.name,
          config: state.walkForwardConfig,
          optimizationSessionId: state.currentSession?.id ?? null,
          candidates,
          getControl: () => wfvControlRef.current,
          onProgress: (session) => {
            setState((prev) => ({
              ...prev,
              walkForwardSession: session,
              walkForwardHistory: upsertWalkForwardSession(
                prev.walkForwardHistory,
                session
              ),
            }));
          },
        });
        setState((prev) => ({
          ...prev,
          walkForwardSession: final,
          walkForwardHistory: upsertWalkForwardSession(
            prev.walkForwardHistory,
            final
          ),
          walkForwardRunning: false,
          runMessage: final.message,
        }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          walkForwardRunning: false,
          runMessage:
            err instanceof Error
              ? err.message
              : "Walk-forward validation failed unexpectedly.",
        }));
      }
    }, [
      selectedStrategy,
      state.currentSession,
      state.walkForwardConfig,
      state.walkForwardRunning,
      wfvConfigError,
    ]);

    const onWalkForwardExport = useCallback(
      async (format: ExportFormat) => {
        const session = state.walkForwardSession;
        if (!session || session.cycles.length === 0) {
          setState((prev) => ({
            ...prev,
            walkForwardExport: {
              ...prev.walkForwardExport,
              lastMessage: "No walk-forward results to export.",
              lastFormat: format,
            },
          }));
          return;
        }
        setState((prev) => ({
          ...prev,
          walkForwardExport: {
            ...prev.walkForwardExport,
            busy: true,
            lastMessage: null,
          },
        }));
        try {
          const prepared = await exportWalkForwardSession({ session, format });
          setState((prev) => ({
            ...prev,
            walkForwardExport: {
              busy: false,
              lastFormat: format,
              lastMessage:
                prepared.message ??
                (prepared.status === "ready"
                  ? `Exported as ${format.toUpperCase()}.`
                  : "Export failed."),
            },
          }));
        } catch (err) {
          setState((prev) => ({
            ...prev,
            walkForwardExport: {
              busy: false,
              lastFormat: format,
              lastMessage:
                err instanceof Error ? err.message : "Export failed.",
            },
          }));
        }
      },
      [state.walkForwardSession]
    );

    const mcConfigError = useMemo(
      () => validateMonteCarloConfig(state.monteCarloConfig),
      [state.monteCarloConfig]
    );

    const onMonteCarloRun = useCallback(async () => {
      if (!selectedStrategy || state.monteCarloRunning) return;
      if (mcConfigError) {
        setState((prev) => ({ ...prev, runMessage: mcConfigError }));
        return;
      }

      mcControlRef.current = "running";
      setState((prev) => ({ ...prev, monteCarloRunning: true }));

      const top = state.currentSession?.results?.[0];
      const baseline = buildBaselineTradeReturns({
        seed: state.monteCarloConfig.randomSeed,
        expectedReturn: top?.metrics.totalReturn ?? 8,
        tradeCount: Math.max(40, top?.metrics.totalTrades ?? 80),
      });

      try {
        const final = await runMonteCarloSimulation({
          strategyId: selectedStrategy.id,
          strategyName: selectedStrategy.name,
          config: state.monteCarloConfig,
          optimizationSessionId: state.currentSession?.id ?? null,
          walkForwardSessionId: state.walkForwardSession?.id ?? null,
          baselineReturns: baseline,
          getControl: () => mcControlRef.current,
          onProgress: (session) => {
            setState((prev) => ({
              ...prev,
              monteCarloSession: session,
              monteCarloHistory: upsertMonteCarloSession(
                prev.monteCarloHistory,
                session
              ),
            }));
          },
        });
        setState((prev) => ({
          ...prev,
          monteCarloSession: final,
          monteCarloHistory: upsertMonteCarloSession(
            prev.monteCarloHistory,
            final
          ),
          monteCarloRunning: false,
          runMessage: final.message,
        }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          monteCarloRunning: false,
          runMessage:
            err instanceof Error
              ? err.message
              : "Monte Carlo simulation failed unexpectedly.",
        }));
      }
    }, [
      mcConfigError,
      selectedStrategy,
      state.currentSession,
      state.monteCarloConfig,
      state.monteCarloRunning,
      state.walkForwardSession?.id,
    ]);

    const onMonteCarloExport = useCallback(
      async (format: ExportFormat) => {
        const session = state.monteCarloSession;
        if (!session || session.results.length === 0) {
          setState((prev) => ({
            ...prev,
            monteCarloExport: {
              ...prev.monteCarloExport,
              lastMessage: "No Monte Carlo results to export.",
              lastFormat: format,
            },
          }));
          return;
        }
        setState((prev) => ({
          ...prev,
          monteCarloExport: {
            ...prev.monteCarloExport,
            busy: true,
            lastMessage: null,
          },
        }));
        try {
          const prepared = await exportMonteCarloSession({ session, format });
          setState((prev) => ({
            ...prev,
            monteCarloExport: {
              busy: false,
              lastFormat: format,
              lastMessage:
                prepared.message ??
                (prepared.status === "ready"
                  ? `Exported as ${format.toUpperCase()}.`
                  : "Export failed."),
            },
          }));
        } catch (err) {
          setState((prev) => ({
            ...prev,
            monteCarloExport: {
              busy: false,
              lastFormat: format,
              lastMessage:
                err instanceof Error ? err.message : "Export failed.",
            },
          }));
        }
      },
      [state.monteCarloSession]
    );

    if (!hydrated) {
      return (
        <div
          className="animate-pulse space-y-4"
          data-testid="strategy-optimization-workspace"
          aria-busy="true"
          aria-label="Restoring optimization workspace"
        >
          <div className="h-16 rounded-xl bg-surface-overlay/60" />
          <div className="h-10 rounded-xl bg-surface-overlay/60" />
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="h-72 rounded-xl bg-surface-overlay/60 xl:col-span-2" />
            <div className="h-72 rounded-xl bg-surface-overlay/60" />
          </div>
        </div>
      );
    }

    return (
      <div
        className="space-y-4 contrast-more:[&_button]:border-text-primary"
        data-testid="strategy-optimization-workspace"
        aria-busy={pending || isRunning}
      >
        {state.runMessage &&
        /fail|error|insufficient|exceed|invalid/i.test(state.runMessage) ? (
          <OptimizationRecoveryBanner
            message={state.runMessage}
            onDismiss={() =>
              setState((prev) => ({ ...prev, runMessage: null }))
            }
          />
        ) : null}

        <div className="mb-2 animate-fade-in-up">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <PageHeader
              accent="violet"
              icon={<SlidersHorizontal className="h-5 w-5" />}
              title="Strategy Optimization"
              subtitle="Configure and run offline optimization experiments for historical strategy improvement."
            />
            <div
              className="flex shrink-0 flex-wrap items-center gap-2 lg:-mt-2"
              role="toolbar"
              aria-label="Optimization workspace actions"
            >
              <button
                type="button"
                onClick={saveActiveProfile}
                className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border-subtle bg-surface-overlay/50 px-3 py-2 text-xs font-semibold text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              >
                <Save className="h-3.5 w-3.5" aria-hidden />
                Save Profile
              </button>
              <button
                type="button"
                onClick={resetWorkspace}
                className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border-subtle bg-surface-overlay/50 px-3 py-2 text-xs font-semibold text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                Reset
              </button>
              <button
                type="button"
                onClick={() => void onRun()}
                disabled={!state.validation.ready || isRunning}
                aria-disabled={!state.validation.ready || isRunning}
                className="inline-flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/20 px-3 py-2 text-xs font-semibold text-accent transition-colors hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:cursor-not-allowed disabled:border-surface-border-subtle disabled:bg-surface-overlay/40 disabled:text-text-faint"
              >
                Run Optimization
              </button>
            </div>
          </div>
        </div>

        {selectedStrategy ? (
          <p className="text-xs text-text-muted">
            Active strategy:{" "}
            <span className="font-semibold text-text-secondary">
              {selectedStrategy.name}
            </span>
            {" · "}
            {selectedStrategy.category}
            {" · "}
            {selectedStrategy.supportedMarket}
          </p>
        ) : null}

        <nav
          aria-label="Strategy Optimization sections"
          className="sticky top-0 z-20 -mx-1 overflow-x-auto rounded-xl border border-surface-border-subtle bg-surface-overlay/80 px-2 py-2 backdrop-blur-md"
        >
          <ul className="flex min-w-max items-center gap-1">
            {WORKSPACE_TABS.map((tab) => {
              const active = state.activeTab === tab.id;
              return (
                <li key={tab.id}>
                  <button
                    type="button"
                    onClick={() =>
                      setState((prev) => ({ ...prev, activeTab: tab.id }))
                    }
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "rounded-lg px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
                      active
                        ? "bg-accent/15 text-accent"
                        : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                    )}
                  >
                    {tab.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {state.activeTab === "configuration" ? (
          <>
            <StrategySelector
              strategies={OPTIMIZATION_STRATEGIES}
              selectedId={state.selectedStrategyId}
              onSelect={selectStrategy}
            />
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <div className="space-y-4 xl:col-span-2">
                <ParameterEditor
                  parameters={state.parameters}
                  onValueChange={onValueChange}
                  onBoundsChange={onBoundsChange}
                  onReset={onResetParam}
                />
                <ConstraintBuilder
                  constraints={state.constraints}
                  parameters={state.parameters}
                  onChange={onConstraintChange}
                />
                <SearchModeSelector
                  searchMode={state.engineSettings.searchMode}
                  smartIntensity={state.engineSettings.smartIntensity}
                  parameters={state.parameters}
                  onSearchModeChange={(mode: SearchMode) =>
                    patchSettings({ searchMode: mode })
                  }
                  onIntensityChange={(intensity: SmartSearchIntensity) =>
                    patchSettings({ smartIntensity: intensity })
                  }
                />
                <RankingSelector
                  rankingMode={state.engineSettings.rankingMode}
                  primaryMetric={state.engineSettings.primaryMetric}
                  onRankingModeChange={(mode: RankingMode) =>
                    patchSettings({ rankingMode: mode })
                  }
                  onPrimaryMetricChange={(metric: RankingMetric) =>
                    patchSettings({ primaryMetric: metric })
                  }
                />
                <ExperimentQueue items={state.queue} />
              </div>
              <div className="space-y-4">
                <OptimizationRunner
                  validation={state.validation}
                  settings={state.engineSettings}
                  running={isRunning}
                  onRun={() => void onRun()}
                />
                <ValidationPanel
                  validation={state.validation}
                  runMessage={state.runMessage}
                  onRun={() => void onRun()}
                  running={isRunning}
                />
                <ProfileManager
                  profiles={state.profiles}
                  recentProfileIds={state.recentProfileIds}
                  activeProfileId={activeProfileId}
                  error={state.profileError}
                  onSave={saveProfile}
                  onRename={onRename}
                  onDuplicate={onDuplicate}
                  onDelete={onDelete}
                  onSetDefault={onSetDefault}
                  onLoad={onLoadProfile}
                />
                <RuntimeEstimator estimate={state.runtime} />
              </div>
            </div>
          </>
        ) : null}

        {state.activeTab === "results" ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="space-y-4 xl:col-span-2">
              {!state.currentSession ? (
                <OptimizationEmptyState
                  title="No optimization results yet"
                  message="Run Grid or Smart Search from the Configuration tab to populate the leaderboard and session history."
                  actionLabel="Go to Configuration"
                  onAction={() =>
                    setState((prev) => ({
                      ...prev,
                      activeTab: "configuration",
                    }))
                  }
                />
              ) : null}
              <ProgressPanel
                session={state.currentSession}
                runnerControl={state.runnerControl}
                onPause={onPause}
                onResume={onResume}
                onCancel={onCancel}
              />
              <LeaderboardTable
                results={leaderboardResults}
                limit={state.engineSettings.leaderboardLimit}
                selectedIds={state.comparison.selectedIds}
                onLimitChange={(limit) =>
                  patchSettings({ leaderboardLimit: limit })
                }
                onRowOpen={(row: OptimizationResult) =>
                  setState((prev) => ({ ...prev, selectedResultId: row.id }))
                }
                onToggleCompare={onToggleCompare}
              />
              <ComparisonView
                results={leaderboardResults}
                selectedIds={state.comparison.selectedIds}
                onClear={() =>
                  setState((prev) => ({
                    ...prev,
                    comparison: { selectedIds: [] },
                  }))
                }
              />
            </div>
            <div className="space-y-4">
              <SessionHistory
                sessions={state.sessionHistory}
                activeSessionId={state.currentSession?.id ?? null}
                onOpen={(id) => {
                  const session = state.sessionHistory.find((s) => s.id === id);
                  if (!session) return;
                  setState((prev) =>
                    applyDerived(prev, {
                      currentSession: session,
                      selectedStrategyId: session.strategyId,
                      parameters: session.parameters.map((p) => ({ ...p })),
                      constraints: session.constraints.map((c) => ({ ...c })),
                      engineSettings: {
                        ...prev.engineSettings,
                        searchMode: session.searchMode,
                        smartIntensity: session.smartIntensity,
                        rankingMode: session.rankingMode,
                        primaryMetric: session.primaryMetric,
                      },
                      runMessage: `Opened session ${session.id}`,
                      comparison: { selectedIds: [] },
                      selectedResultId: null,
                    })
                  );
                }}
                onDelete={(id) => {
                  setState((prev) => ({
                    ...prev,
                    sessionHistory: deleteSession(prev.sessionHistory, id),
                    currentSession:
                      prev.currentSession?.id === id
                        ? null
                        : prev.currentSession,
                  }));
                }}
                onDuplicate={(id) => {
                  setState((prev) => {
                    const result = duplicateSession(prev.sessionHistory, id);
                    return {
                      ...prev,
                      sessionHistory: result.sessions,
                      currentSession: result.session ?? prev.currentSession,
                      runMessage: result.session
                        ? "Session duplicated — ready to run."
                        : prev.runMessage,
                    };
                  });
                }}
              />
              <ExportToolbar
                disabled={
                  !state.currentSession ||
                  state.currentSession.results.length === 0
                }
                exportState={state.exportState}
                onExport={(format) => void onExport(format)}
              />
            </div>
          </div>
        ) : null}

        {state.activeTab === "walk-forward" ? (
          <WalkForwardWorkspace
            config={state.walkForwardConfig}
            session={state.walkForwardSession}
            filters={state.walkForwardFilters}
            exportState={state.walkForwardExport}
            selectedCycleId={state.walkForwardSelectedCycleId}
            running={state.walkForwardRunning}
            canRun={Boolean(selectedStrategy) && !wfvConfigError}
            configError={wfvConfigError}
            onConfigChange={(patch: Partial<WalkForwardConfig>) =>
              setState((prev) => ({
                ...prev,
                walkForwardConfig: { ...prev.walkForwardConfig, ...patch },
              }))
            }
            onFilterChange={(patch: Partial<WalkForwardFilterState>) =>
              setState((prev) => ({
                ...prev,
                walkForwardFilters: { ...prev.walkForwardFilters, ...patch },
              }))
            }
            onRun={() => void onWalkForwardRun()}
            onCancel={() => {
              wfvControlRef.current = "cancelled";
            }}
            onSelectCycle={(id) =>
              setState((prev) => ({
                ...prev,
                walkForwardSelectedCycleId: id,
              }))
            }
            onExport={(format) => void onWalkForwardExport(format)}
          />
        ) : null}

        {state.activeTab === "monte-carlo" ? (
          <MonteCarloWorkspace
            config={state.monteCarloConfig}
            session={state.monteCarloSession}
            filters={state.monteCarloFilters}
            exportState={state.monteCarloExport}
            selectedId={state.monteCarloSelectedId}
            running={state.monteCarloRunning}
            canRun={Boolean(selectedStrategy) && !mcConfigError}
            configError={mcConfigError}
            onConfigChange={(patch: Partial<MonteCarloConfig>) =>
              setState((prev) => ({
                ...prev,
                monteCarloConfig: { ...prev.monteCarloConfig, ...patch },
              }))
            }
            onFilterChange={(patch: Partial<MonteCarloFilterState>) =>
              setState((prev) => ({
                ...prev,
                monteCarloFilters: { ...prev.monteCarloFilters, ...patch },
              }))
            }
            onRun={() => void onMonteCarloRun()}
            onCancel={() => {
              mcControlRef.current = "cancelled";
            }}
            onSelect={(id) =>
              setState((prev) => ({ ...prev, monteCarloSelectedId: id }))
            }
            onExport={(format) => void onMonteCarloExport(format)}
          />
        ) : null}

        <ResultDrawer
          open={Boolean(selectedResult)}
          result={selectedResult}
          onClose={() =>
            setState((prev) => ({ ...prev, selectedResultId: null }))
          }
        />
      </div>
    );
  }
);
