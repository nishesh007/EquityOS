/**
 * Sprint 10C.R7 — global keyboard shortcut map.
 *
 * App-wide shortcuts (palette, navigation, help). Workspace-scoped
 * shortcuts from R6 live in workspace/workspaceShortcuts.ts.
 */

export type GlobalShortcutId =
  | "command-palette"
  | "toggle-sidebar"
  | "go-dashboard"
  | "go-portfolio"
  | "go-research"
  | "go-watchlists"
  | "open-settings"
  | "shortcut-help"
  | "close-dialog";

export interface GlobalShortcut {
  id: GlobalShortcutId;
  label: string;
  /** Requires Ctrl (or Cmd on macOS). */
  mod: boolean;
  shift: boolean;
  /** KeyboardEvent.key, lowercase. */
  key: string;
  display: string;
  /** Navigation target for go-* shortcuts. */
  href?: string;
}

export const GLOBAL_SHORTCUTS: readonly GlobalShortcut[] = Object.freeze([
  { id: "command-palette", label: "Command palette / search", mod: true, shift: false, key: "k", display: "Ctrl+K" },
  { id: "toggle-sidebar", label: "Toggle sidebar", mod: true, shift: false, key: "b", display: "Ctrl+B" },
  { id: "go-dashboard", label: "Go to Dashboard", mod: true, shift: true, key: "d", display: "Ctrl+Shift+D", href: "/" },
  { id: "go-portfolio", label: "Go to Portfolio", mod: true, shift: true, key: "p", display: "Ctrl+Shift+P", href: "/portfolio" },
  { id: "go-research", label: "Go to Research", mod: true, shift: true, key: "r", display: "Ctrl+Shift+R", href: "/research" },
  { id: "go-watchlists", label: "Go to Watchlists", mod: true, shift: true, key: "w", display: "Ctrl+Shift+W", href: "/watchlist" },
  { id: "open-settings", label: "Open Settings", mod: true, shift: false, key: ",", display: "Ctrl+,", href: "/settings" },
  { id: "shortcut-help", label: "Shortcut help", mod: false, shift: false, key: "?", display: "?" },
  { id: "close-dialog", label: "Close dialogs", mod: false, shift: false, key: "escape", display: "Esc" },
]);

export interface GlobalKeyEvent {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

/** Match a keyboard event against the global shortcut map. */
export function matchGlobalShortcut(
  event: GlobalKeyEvent
): GlobalShortcutId | null {
  if (event.altKey) return null;
  const mod = event.ctrlKey || event.metaKey;
  const key = event.key.toLowerCase();
  const match = GLOBAL_SHORTCUTS.find((shortcut) => {
    if (shortcut.key !== key) return false;
    if (shortcut.mod !== mod) return false;
    // "?" is typed with Shift on most layouts — don't require shift parity.
    if (shortcut.key === "?" || shortcut.key === "escape") return true;
    return shortcut.shift === event.shiftKey;
  });
  return match?.id ?? null;
}
