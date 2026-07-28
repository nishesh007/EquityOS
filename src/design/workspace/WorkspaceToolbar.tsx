"use client";

/**
 * Sprint 10C.R6 — professional dashboard toolbar.
 *
 * Workspace profiles, layout templates, widget library, workspace search,
 * import/export, reset, refresh, theme, fullscreen and settings. Pure
 * presentation — all state changes flow through the workspace engine
 * callbacks provided by WorkspaceDashboard.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  Download,
  Eye,
  LayoutDashboard,
  LayoutGrid,
  Maximize2,
  Palette,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleTheme } from "../theme/ThemeEngine";
import { GlassDropdown, GlassModal, GlassToolbar } from "../glass/GlassComponents";
import {
  DASHBOARD_TEMPLATES,
  searchTemplates,
  type DashboardTemplate,
  type WidgetPlacement,
} from "../layouts/dashboardTemplates";
import {
  searchWidgets,
  getWidgetDefinition,
  type WidgetDefinition,
} from "../widgets/widgetRegistry";
import { WORKSPACE_SHORTCUTS } from "./workspaceShortcuts";
import type { Workspace } from "./workspaceEngine";

const MENU_ITEM_CLASS =
  "flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-caption text-text-secondary transition-colors duration-150 hover:bg-surface-hover hover:text-text-primary focus-visible:bg-surface-hover";

const TOOLBAR_BUTTON_CLASS =
  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-transparent px-2 text-caption font-medium text-text-secondary transition-colors duration-150 hover:bg-surface-hover hover:text-text-primary";

export interface WorkspaceToolbarProps {
  workspace: Workspace;
  workspaces: Workspace[];
  hidden: WidgetPlacement[];
  editMode: boolean;
  onEditModeChange: (editMode: boolean) => void;
  pickerOpen: boolean;
  onPickerOpenChange: (open: boolean) => void;
  searchOpen: boolean;
  onSearchOpenChange: (open: boolean) => void;
  onSwitch: (id: string) => void;
  onCreate: (name: string, templateId: string) => void;
  onRename: (name: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onReset: () => void;
  onApplyTemplate: (templateId: string) => void;
  onExport: () => void;
  onImport: (json: string) => void;
  onAddWidget: (definition: WidgetDefinition) => void;
  onRestoreHidden: (widgetId: string | null) => void;
  onFullscreen: () => void;
  /** When true, render the EquityOS Dashboard title in this same toolbar row. */
  showDashboardTitle?: boolean;
  leading?: ReactNode;
}

type OpenMenu = "layouts" | "hidden" | null;

export function WorkspaceToolbar({
  workspace,
  hidden,
  editMode,
  onEditModeChange,
  pickerOpen,
  onPickerOpenChange,
  searchOpen,
  onSearchOpenChange,
  onReset,
  onApplyTemplate,
  onExport,
  onImport,
  onAddWidget,
  onRestoreHidden,
  onFullscreen,
  showDashboardTitle = true,
  leading,
}: WorkspaceToolbarProps) {
  const router = useRouter();
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [pickerQuery, setPickerQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking anywhere outside the toolbar.
  useEffect(() => {
    if (!openMenu) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [openMenu]);

  const toggleMenu = (menu: Exclude<OpenMenu, null>) =>
    setOpenMenu((current) => (current === menu ? null : menu));

  const handleImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        onImport(String(reader.result));
        setImportError(null);
      } catch (error) {
        setImportError(error instanceof Error ? error.message : "Import failed");
      }
    };
    reader.readAsText(file);
  };

  const widgetResults = searchWidgets(pickerQuery);
  const searchWidgetResults = searchWidgets(searchQuery);
  const searchTemplateResults = searchTemplates(searchQuery);
  const activeIds = new Set(
    workspace.placements.filter((p) => p.visible).map((p) => p.widgetId)
  );

  return (
    <div
      ref={rootRef}
      className="mb-2 animate-fade-in"
      role="group"
      aria-label="Dashboard workspace toolbar"
    >
      <GlassToolbar className="flex-nowrap justify-start gap-0.5 overflow-x-auto !py-1.5">
        {leading}
        {showDashboardTitle ? (
          <div className="mr-2 flex shrink-0 items-center gap-2 border-r border-surface-border pr-3">
            <span
              aria-hidden
              className="flex h-6 w-6 items-center justify-center rounded-md bg-white/5 text-text-secondary"
            >
              <LayoutDashboard className="h-4 w-4" />
            </span>
            <h1 className="whitespace-nowrap text-card-title font-semibold tracking-[-0.01em] text-text-primary">
              EquityOS Dashboard
            </h1>
          </div>
        ) : null}

        <div className="flex shrink-0 items-center gap-0.5">
          {/* Layout templates */}
          <div className="relative">
            <button
              type="button"
              onClick={() => toggleMenu("layouts")}
              aria-haspopup="menu"
              aria-expanded={openMenu === "layouts"}
              className={TOOLBAR_BUTTON_CLASS}
            >
              <LayoutGrid className="h-4 w-4" />
              Layouts
              <ChevronDown className="h-4 w-4 opacity-60" />
            </button>
            <GlassDropdown open={openMenu === "layouts"} align="left" className="w-64">
              <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                Dashboard Templates
              </p>
              {DASHBOARD_TEMPLATES.map((template: DashboardTemplate) => (
                <button
                  key={template.id}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onApplyTemplate(template.id);
                    setOpenMenu(null);
                  }}
                  className={cn(MENU_ITEM_CLASS, "flex-col items-start gap-0")}
                >
                  <span className="flex items-center gap-2 font-medium text-text-primary">
                    {template.id === workspace.templateId ? (
                      <Check className="h-3.5 w-3.5 text-accent" />
                    ) : (
                      <span className="w-3.5" />
                    )}
                    {template.name}
                  </span>
                  <span className="pl-[22px] text-[10px] text-text-muted">{template.description}</span>
                </button>
              ))}
            </GlassDropdown>
          </div>

          {/* Widget library */}
          <button type="button" onClick={() => onPickerOpenChange(true)} className={TOOLBAR_BUTTON_CLASS}>
            <Plus className="h-4 w-4" /> Add Widget
          </button>

          <button
            type="button"
            onClick={() => onEditModeChange(!editMode)}
            aria-pressed={editMode}
            className={cn(
              TOOLBAR_BUTTON_CLASS,
              editMode && "border-accent/40 bg-accent/10 text-accent"
            )}
          >
            <Pencil className="h-4 w-4" />
            {editMode ? "Done" : "Edit"}
          </button>

          {/* Hidden widgets */}
          <div className="relative">
            <button
              type="button"
              onClick={() => toggleMenu("hidden")}
              aria-haspopup="menu"
              aria-expanded={openMenu === "hidden"}
              disabled={hidden.length === 0}
              className={cn(TOOLBAR_BUTTON_CLASS, "disabled:opacity-40")}
            >
              <Eye className="h-4 w-4" />
              Hidden
              {hidden.length > 0 ? ` (${hidden.length})` : ""}
            </button>
            <GlassDropdown open={openMenu === "hidden"} align="left" className="w-56">
              {hidden.map((placement) => (
                <button
                  key={placement.widgetId}
                  type="button"
                  role="menuitem"
                  onClick={() => onRestoreHidden(placement.widgetId)}
                  className={MENU_ITEM_CLASS}
                >
                  <Eye className="h-3.5 w-3.5" />{" "}
                  {getWidgetDefinition(placement.widgetId)?.label ??
                    placement.widgetId}
                </button>
              ))}
              <div className="my-1.5 border-t border-surface-border" />
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onRestoreHidden(null);
                  setOpenMenu(null);
                }}
                className={cn(MENU_ITEM_CLASS, "font-semibold text-text-primary")}
              >
                Restore all
              </button>
            </GlassDropdown>
          </div>

          {/* Workspace search */}
          <button type="button" onClick={() => onSearchOpenChange(true)} className={TOOLBAR_BUTTON_CLASS}>
            <Search className="h-3.5 w-3.5" /> Search
          </button>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => setResetConfirmOpen(true)}
            title="Reset layout to template"
            className={TOOLBAR_BUTTON_CLASS}
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
          <button type="button" onClick={onExport} title="Export workspace (JSON)" className={TOOLBAR_BUTTON_CLASS}>
            <Download className="h-3.5 w-3.5" /> Export
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Import workspace (JSON)"
            className={TOOLBAR_BUTTON_CLASS}
          >
            <Upload className="h-3.5 w-3.5" /> Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            aria-label="Import workspace JSON file"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) handleImportFile(file);
              event.target.value = "";
            }}
          />
          <button type="button" onClick={() => router.refresh()} title="Refresh data" aria-label="Refresh data" className={TOOLBAR_BUTTON_CLASS}>
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={() => toggleTheme()} title="Toggle theme" aria-label="Toggle theme" className={TOOLBAR_BUTTON_CLASS}>
            <Palette className="h-3.5 w-3.5" /> Theme
          </button>
          <button type="button" onClick={onFullscreen} title="Fullscreen" aria-label="Toggle fullscreen" className={TOOLBAR_BUTTON_CLASS}>
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => router.push("/settings")}
            title="Appearance settings"
            aria-label="Open settings"
            className={TOOLBAR_BUTTON_CLASS}
          >
            <Settings className="h-3.5 w-3.5" /> Settings
          </button>
        </div>
      </GlassToolbar>

      {importError && (
        <p role="alert" className="mt-2 text-xs text-loss">
          {importError}
        </p>
      )}

      {/* Reset confirmation */}
      <GlassModal
        open={resetConfirmOpen}
        onClose={() => setResetConfirmOpen(false)}
        title="Reset to Default?"
      >
        <p className="text-sm text-text-secondary">
          This restores the active workspace layout to its template (
          {workspace.templateId}). Pin, hide, size and order changes will be
          discarded. Profiles themselves are kept.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setResetConfirmOpen(false)}
            className={cn(TOOLBAR_BUTTON_CLASS, "border-surface-border")}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onReset();
              setResetConfirmOpen(false);
            }}
            className="inline-flex items-center gap-1.5 rounded-md bg-loss/15 px-3 py-1.5 text-xs font-semibold text-loss transition-colors hover:bg-loss/25"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset layout
          </button>
        </div>
      </GlassModal>

      {/* Widget library picker */}
      <GlassModal
        open={pickerOpen}
        onClose={() => onPickerOpenChange(false)}
        title="Widget Library"
      >
        <input
          autoFocus
          value={pickerQuery}
          onChange={(event) => setPickerQuery(event.target.value)}
          placeholder="Search widgets…"
          aria-label="Search widgets"
          className="mb-3 w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <div className="max-h-80 space-y-1 overflow-y-auto pr-1">
          {widgetResults.map((definition) => {
            const active = activeIds.has(definition.id);
            return (
              <button
                key={definition.id}
                type="button"
                disabled={active}
                onClick={() => {
                  onAddWidget(definition);
                  onPickerOpenChange(false);
                }}
                className={cn(
                  MENU_ITEM_CLASS,
                  "items-start py-2",
                  active && "opacity-50"
                )}
              >
                <Plus className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="flex flex-col">
                  <span className="text-xs font-medium text-text-primary">
                    {definition.label}
                    {active && <span className="ml-2 text-[10px] text-text-muted">On dashboard</span>}
                  </span>
                  <span className="text-[11px] text-text-muted">{definition.description}</span>
                </span>
              </button>
            );
          })}
          {widgetResults.length === 0 && (
            <p className="py-6 text-center text-xs text-text-muted">No widgets match your search.</p>
          )}
        </div>
      </GlassModal>

      {/* Workspace search — widgets, layouts and sections */}
      <GlassModal
        open={searchOpen}
        onClose={() => onSearchOpenChange(false)}
        title="Workspace Search"
      >
        <input
          autoFocus
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search widgets, layouts, sections…"
          aria-label="Workspace search"
          className="mb-3 w-full rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">Widgets</p>
            {searchWidgetResults.slice(0, 6).map((definition) => (
              <button
                key={definition.id}
                type="button"
                onClick={() => {
                  onAddWidget(definition);
                  onSearchOpenChange(false);
                }}
                className={MENU_ITEM_CLASS}
              >
                <Plus className="h-3.5 w-3.5" /> {definition.label}
              </button>
            ))}
            {searchWidgetResults.length === 0 && (
              <p className="text-[11px] text-text-muted">No matching widgets.</p>
            )}
          </div>
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">Layouts</p>
            {searchTemplateResults.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => {
                  onApplyTemplate(template.id);
                  onSearchOpenChange(false);
                }}
                className={MENU_ITEM_CLASS}
              >
                <LayoutGrid className="h-3.5 w-3.5" /> {template.name}
              </button>
            ))}
            {searchTemplateResults.length === 0 && (
              <p className="text-[11px] text-text-muted">No matching layouts.</p>
            )}
          </div>
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">Shortcuts</p>
            {WORKSPACE_SHORTCUTS.map((shortcut) => (
              <p key={shortcut.id} className="flex items-center justify-between px-2 py-1 text-[11px] text-text-muted">
                <span>{shortcut.label}</span>
                <kbd className="rounded border border-surface-border bg-surface px-1.5 py-0.5 text-[10px]">{shortcut.display}</kbd>
              </p>
            ))}
          </div>
        </div>
      </GlassModal>
    </div>
  );
}
