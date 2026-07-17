"use client";

/**
 * Sprint 10C.R6 — customizable workspace dashboard.
 *
 * Server pages supply rendered widget content keyed by widget id; this
 * component arranges it according to the active workspace: drag & drop
 * reorder/docking (Ctrl+drop swaps), drag-handle resizing snapped to the
 * 12-column grid, hide/pin/collapse, saved profiles, templates and
 * import/export. Every change auto-saves to localStorage.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ChevronDown,
  ChevronUp,
  EyeOff,
  GripVertical,
  Pin,
  PinOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ContextMenu } from "../productivity/ContextMenu";
import { recordActivity } from "../productivity/activityFeed";
import {
  WORKSPACE_REGIONS,
  WORKSPACE_SIZES,
  WORKSPACE_SIZE_LABELS,
  WORKSPACE_SIZE_SPANS,
  getWidgetDefinition,
  sizeFromSpan,
  type WidgetDefinition,
  type WorkspaceRegion,
  type WorkspaceSize,
} from "../widgets/widgetRegistry";
import type { WidgetPlacement } from "../layouts/dashboardTemplates";
import {
  addWidgetToWorkspace,
  applyTemplate,
  createWorkspace,
  deleteWorkspace,
  duplicateWorkspace,
  exportWorkspace,
  getActiveWorkspace,
  getDefaultWorkspace,
  hiddenWidgets,
  importWorkspace,
  listWorkspaces,
  moveWidget,
  placementsForRegion,
  renameWorkspace,
  resetWorkspace,
  resizeWidget,
  saveWorkspace,
  setActiveWorkspace,
  setWidgetCollapsed,
  setWidgetPinned,
  setWidgetVisible,
  swapWidgets,
  type Workspace,
} from "./workspaceEngine";
import { matchShortcut } from "./workspaceShortcuts";
import { WorkspaceToolbar } from "./WorkspaceToolbar";

/** 12-col span → responsive Tailwind classes (mobile stacks everything). */
const SPAN_CLASSES: Readonly<Record<number, string>> = Object.freeze({
  4: "col-span-12 lg:col-span-4",
  6: "col-span-12 lg:col-span-6",
  8: "col-span-12 lg:col-span-8",
  10: "col-span-12 lg:col-span-10",
  12: "col-span-12",
});

const REGION_LABELS: Readonly<Record<WorkspaceRegion, string>> = Object.freeze({
  snapshot: "Market snapshot",
  main: "Main workspace",
  bottom: "Bottom band",
});

/** Horizontal pixels of drag per one grid-size step while resizing. */
const RESIZE_STEP_PX = 120;

export interface WorkspaceDashboardProps {
  /** Rendered widget content keyed by registered widget id. */
  widgets: Record<string, ReactNode>;
}

interface DragState {
  widgetId: string;
}

export function WorkspaceDashboard({ widgets }: WorkspaceDashboardProps) {
  const [workspace, setWorkspace] = useState<Workspace>(getDefaultWorkspace);
  const [profiles, setProfiles] = useState<Workspace[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const workspaceRef = useRef(workspace);

  useEffect(() => {
    workspaceRef.current = workspace;
  }, [workspace]);

  // Hydrate the persisted workspace after mount (SSR renders the default).
  useEffect(() => {
    setWorkspace(getActiveWorkspace());
    setProfiles(listWorkspaces());
    setHydrated(true);
  }, []);

  /** Apply a mutation and auto-save. */
  const commit = useCallback((next: Workspace) => {
    setWorkspace(saveWorkspace(next));
    setProfiles(listWorkspaces());
  }, []);

  /** Refresh local state from the store (after lifecycle operations). */
  const sync = useCallback(() => {
    setWorkspace(getActiveWorkspace());
    setProfiles(listWorkspaces());
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (typeof document === "undefined") return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.();
  }, []);

  // Workspace keyboard shortcuts.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(input|textarea|select)$/i.test(target.tagName)) return;
      const shortcut = matchShortcut(event);
      if (!shortcut) return;
      if (shortcut === "toggle-sidebar") return; // handled by AppShell
      event.preventDefault();
      if (shortcut === "save-workspace") commit({ ...workspace });
      else if (shortcut === "reset-workspace") {
        resetWorkspace(workspace.id);
        sync();
      } else if (shortcut === "open-widget-picker") setPickerOpen(true);
      else if (shortcut === "workspace-search") setSearchOpen(true);
      else if (shortcut === "toggle-fullscreen") toggleFullscreen();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [workspace, commit, sync, toggleFullscreen]);

  // -------------------------------------------------------------------------
  // Drag & drop
  // -------------------------------------------------------------------------

  const onDragStart = (event: React.DragEvent, widgetId: string) => {
    dragRef.current = { widgetId };
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", widgetId);
  };

  const onDropOnWidget = (event: React.DragEvent, target: WidgetPlacement) => {
    event.preventDefault();
    event.stopPropagation();
    setDropTarget(null);
    const source = dragRef.current?.widgetId;
    dragRef.current = null;
    if (!source || source === target.widgetId) return;
    if (event.ctrlKey || event.metaKey) {
      commit(swapWidgets(workspace, source, target.widgetId));
      return;
    }
    const ordered = placementsForRegion(workspace, target.region);
    const index = ordered.findIndex((p) => p.widgetId === target.widgetId);
    commit(moveWidget(workspace, source, { region: target.region, index }));
  };

  const onDropOnRegion = (event: React.DragEvent, region: WorkspaceRegion) => {
    event.preventDefault();
    setDropTarget(null);
    const source = dragRef.current?.widgetId;
    dragRef.current = null;
    if (!source) return;
    commit(
      moveWidget(workspace, source, {
        region,
        index: placementsForRegion(workspace, region).length,
      })
    );
  };

  // -------------------------------------------------------------------------
  // Drag-handle resizing (pointer events, snapped to grid sizes)
  // -------------------------------------------------------------------------

  const onResizeStart = (
    event: React.PointerEvent,
    placement: WidgetPlacement
  ) => {
    event.preventDefault();
    const startX = event.clientX;
    const startSpan = WORKSPACE_SIZE_SPANS[placement.size];
    let current = placement.size;
    const onMove = (move: PointerEvent) => {
      const steps = Math.round((move.clientX - startX) / RESIZE_STEP_PX);
      const span = Math.max(4, Math.min(12, startSpan + steps * 2));
      const size = sizeFromSpan(span);
      if (size !== current) {
        current = size;
        const next = saveWorkspace(
          resizeWidget(workspaceRef.current, placement.widgetId, size)
        );
        workspaceRef.current = next;
        setWorkspace(next);
      }
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // -------------------------------------------------------------------------
  // Keyboard reorder on the drag handle (accessibility)
  // -------------------------------------------------------------------------

  const onHandleKeyDown = (
    event: React.KeyboardEvent,
    placement: WidgetPlacement
  ) => {
    const ordered = placementsForRegion(workspace, placement.region);
    const index = ordered.findIndex((p) => p.widgetId === placement.widgetId);
    if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      if (index > 0) {
        commit(moveWidget(workspace, placement.widgetId, { index: index - 1 }));
      }
    } else if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      if (index < ordered.length - 1) {
        commit(moveWidget(workspace, placement.widgetId, { index: index + 1 }));
      }
    }
  };

  // -------------------------------------------------------------------------
  // Toolbar callbacks
  // -------------------------------------------------------------------------

  const handleAddWidget = (definition: WidgetDefinition) => {
    commit(
      addWidgetToWorkspace(workspace, {
        widgetId: definition.id,
        region: definition.defaultRegion,
        order: 0,
        size: definition.defaultSize,
        visible: true,
        pinned: false,
        collapsed: false,
      })
    );
  };

  const handleExport = () => {
    const json = exportWorkspace(workspace.id);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `equityos-workspace-${workspace.name.toLowerCase().replace(/\s+/g, "-")}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    recordActivity("export", `Exported workspace "${workspace.name}" as JSON`);
  };

  const hidden = hiddenWidgets(workspace);

  const renderPlacement = (placement: WidgetPlacement) => {
    const content = widgets[placement.widgetId];
    if (!content || !placement.visible) return null;
    const definition = getWidgetDefinition(placement.widgetId);
    const label = definition?.label ?? placement.widgetId;
    const span = WORKSPACE_SIZE_SPANS[placement.size];
    const isDropTarget = dropTarget === placement.widgetId;

    return (
      <div
        key={placement.widgetId}
        role="group"
        aria-label={`${label} widget`}
        className={cn(
          "group/widget relative min-w-0 transition-all duration-300",
          SPAN_CLASSES[span],
          isDropTarget && "rounded-lg ring-2 ring-accent/60 ring-offset-2 ring-offset-surface"
        )}
        onDragOver={(event) => {
          if (!dragRef.current) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          setDropTarget(placement.widgetId);
        }}
        onDragLeave={() => setDropTarget((current) => (current === placement.widgetId ? null : current))}
        onDrop={(event) => onDropOnWidget(event, placement)}
      >
        {/* Widget frame controls — visible on hover / keyboard focus. */}
        <div
          className={cn(
            "absolute -top-2.5 right-3 z-20 flex items-center gap-0.5 rounded-md border border-surface-border bg-card px-1 py-0.5 shadow-dropdown",
            "opacity-0 transition-opacity duration-200 group-hover/widget:opacity-100 focus-within:opacity-100"
          )}
        >
          <button
            type="button"
            draggable
            onDragStart={(event) => onDragStart(event, placement.widgetId)}
            onDragEnd={() => {
              dragRef.current = null;
              setDropTarget(null);
            }}
            onKeyDown={(event) => onHandleKeyDown(event, placement)}
            title="Drag to move · arrows to reorder"
            aria-label={`Move ${label}. Use arrow keys to reorder.`}
            className="cursor-grab rounded p-1 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary active:cursor-grabbing"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
          <select
            value={placement.size}
            onChange={(event) =>
              commit(resizeWidget(workspace, placement.widgetId, event.target.value as WorkspaceSize))
            }
            aria-label={`Resize ${label}`}
            title="Widget size"
            className="rounded border-0 bg-transparent py-0.5 pl-1 pr-4 text-[10px] text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
          >
            {WORKSPACE_SIZES.map((size) => (
              <option key={size} value={size}>
                {WORKSPACE_SIZE_LABELS[size]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => commit(setWidgetPinned(workspace, placement.widgetId, !placement.pinned))}
            title={placement.pinned ? "Unpin" : "Pin to top"}
            aria-label={placement.pinned ? `Unpin ${label}` : `Pin ${label}`}
            aria-pressed={placement.pinned}
            className={cn(
              "rounded p-1 transition-colors hover:bg-surface-hover",
              placement.pinned ? "text-accent" : "text-text-muted hover:text-text-primary"
            )}
          >
            {placement.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => commit(setWidgetCollapsed(workspace, placement.widgetId, !placement.collapsed))}
            title={placement.collapsed ? "Expand" : "Collapse"}
            aria-label={placement.collapsed ? `Expand ${label}` : `Collapse ${label}`}
            aria-expanded={!placement.collapsed}
            className="rounded p-1 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
          >
            {placement.collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => commit(setWidgetVisible(workspace, placement.widgetId, false))}
            title="Hide widget"
            aria-label={`Hide ${label}`}
            className="rounded p-1 text-text-muted transition-colors hover:bg-surface-hover hover:text-loss"
          >
            <EyeOff className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Sprint 10C.R7 — right-click context menu on every widget. */}
        <ContextMenu
          items={[
            {
              id: "pin",
              label: placement.pinned ? "Unpin widget" : "Pin widget",
              icon: placement.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />,
              onSelect: () => commit(setWidgetPinned(workspace, placement.widgetId, !placement.pinned)),
            },
            {
              id: "collapse",
              label: placement.collapsed ? "Expand widget" : "Collapse widget",
              icon: placement.collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />,
              onSelect: () => commit(setWidgetCollapsed(workspace, placement.widgetId, !placement.collapsed)),
            },
            ...WORKSPACE_SIZES.filter((size) => size !== placement.size).map((size) => ({
              id: `size-${size}`,
              label: `Resize · ${WORKSPACE_SIZE_LABELS[size]}`,
              onSelect: () => commit(resizeWidget(workspace, placement.widgetId, size)),
            })),
            {
              id: "hide",
              label: "Hide widget",
              icon: <EyeOff className="h-3.5 w-3.5" />,
              danger: true,
              onSelect: () => commit(setWidgetVisible(workspace, placement.widgetId, false)),
            },
          ]}
        >
          {placement.collapsed ? (
            <div className="flex items-center justify-between rounded-lg border border-surface-border bg-card px-4 py-2.5">
              <span className="text-xs font-medium text-text-secondary">{label}</span>
              <span className="text-[10px] uppercase tracking-wider text-text-muted">Collapsed</span>
            </div>
          ) : (
            <div className="min-w-0">{content}</div>
          )}
        </ContextMenu>

        {/* Resize drag handle — right edge. */}
        {!placement.collapsed && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label={`Resize ${label} by dragging`}
            title="Drag to resize"
            onPointerDown={(event) => onResizeStart(event, placement)}
            className="absolute inset-y-3 -right-1.5 z-10 hidden w-2 cursor-col-resize rounded-full opacity-0 transition-opacity hover:bg-accent/40 group-hover/widget:opacity-100 lg:block"
          />
        )}
      </div>
    );
  };

  return (
    <div className={cn("space-y-5", !hydrated && "pointer-events-none")}>
      <WorkspaceToolbar
        workspace={workspace}
        workspaces={profiles.length > 0 ? profiles : [workspace]}
        hidden={hidden}
        pickerOpen={pickerOpen}
        onPickerOpenChange={setPickerOpen}
        searchOpen={searchOpen}
        onSearchOpenChange={setSearchOpen}
        onSwitch={(id) => {
          setActiveWorkspace(id);
          sync();
        }}
        onCreate={(name, templateId) => {
          createWorkspace(name, templateId);
          recordActivity("workspace", `Created workspace profile "${name}"`);
          sync();
        }}
        onRename={(name) => {
          renameWorkspace(workspace.id, name);
          sync();
        }}
        onDuplicate={() => {
          duplicateWorkspace(workspace.id);
          sync();
        }}
        onDelete={() => {
          deleteWorkspace(workspace.id);
          sync();
        }}
        onReset={() => {
          resetWorkspace(workspace.id);
          recordActivity("workspace", `Reset workspace "${workspace.name}" to its template`);
          sync();
        }}
        onApplyTemplate={(templateId) => {
          applyTemplate(workspace.id, templateId);
          recordActivity("workspace", `Applied the "${templateId}" dashboard template`);
          sync();
        }}
        onExport={handleExport}
        onImport={(json) => {
          importWorkspace(json);
          recordActivity("workspace", "Imported a workspace from JSON backup");
          sync();
        }}
        onAddWidget={handleAddWidget}
        onRestoreHidden={(widgetId) => {
          if (widgetId) commit(setWidgetVisible(workspace, widgetId, true));
          else commit({ ...workspace, placements: workspace.placements.map((p) => ({ ...p, visible: true })) });
        }}
        onFullscreen={toggleFullscreen}
      />

      {WORKSPACE_REGIONS.map((region) => {
        const placements = placementsForRegion(workspace, region).filter(
          (placement) => placement.visible && widgets[placement.widgetId]
        );
        if (placements.length === 0) return null;
        return (
          <section
            key={region}
            aria-label={REGION_LABELS[region]}
            className="grid grid-cols-12 gap-5"
            onDragOver={(event) => {
              if (dragRef.current) event.preventDefault();
            }}
            onDrop={(event) => onDropOnRegion(event, region)}
          >
            {placements.map(renderPlacement)}
          </section>
        );
      })}
    </div>
  );
}
