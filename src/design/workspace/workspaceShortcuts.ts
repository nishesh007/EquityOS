/**
 * Sprint 10C.R6 — workspace keyboard shortcuts.
 *
 * Declarative shortcut map plus a pure matcher so components can wire
 * a single keydown listener. Combinations avoid browser-reserved keys.
 */

export type WorkspaceShortcutId =
  | "save-workspace"
  | "reset-workspace"
  | "open-widget-picker"
  | "workspace-search"
  | "toggle-fullscreen"
  | "toggle-sidebar";

export interface WorkspaceShortcut {
  id: WorkspaceShortcutId;
  label: string;
  /** Requires Ctrl (or Cmd on macOS). */
  mod: boolean;
  shift: boolean;
  /** KeyboardEvent.key, lowercase. */
  key: string;
  display: string;
}

export const WORKSPACE_SHORTCUTS: readonly WorkspaceShortcut[] = Object.freeze([
  { id: "save-workspace", label: "Save workspace", mod: true, shift: true, key: "s", display: "Ctrl+Shift+S" },
  { id: "reset-workspace", label: "Reset workspace", mod: true, shift: true, key: "0", display: "Ctrl+Shift+0" },
  { id: "open-widget-picker", label: "Open widget picker", mod: true, shift: true, key: "a", display: "Ctrl+Shift+A" },
  { id: "workspace-search", label: "Workspace search", mod: true, shift: true, key: "f", display: "Ctrl+Shift+F" },
  { id: "toggle-fullscreen", label: "Toggle fullscreen", mod: true, shift: true, key: "enter", display: "Ctrl+Shift+Enter" },
  { id: "toggle-sidebar", label: "Toggle sidebar", mod: true, shift: false, key: "b", display: "Ctrl+B" },
]);

export interface ShortcutKeyEvent {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

/** Match a keyboard event against the workspace shortcut map. */
export function matchShortcut(event: ShortcutKeyEvent): WorkspaceShortcutId | null {
  if (event.altKey) return null;
  const mod = event.ctrlKey || event.metaKey;
  const key = event.key.toLowerCase();
  const match = WORKSPACE_SHORTCUTS.find(
    (shortcut) =>
      shortcut.key === key &&
      shortcut.mod === mod &&
      shortcut.shift === event.shiftKey
  );
  return match?.id ?? null;
}
