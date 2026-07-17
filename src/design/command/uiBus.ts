/**
 * Sprint 10C.R7 — tiny UI event bus.
 *
 * Lets any code open the command palette, notification center, help
 * center or shortcut help without prop drilling. SSR-safe no-ops.
 */

export type UiEventName =
  | "open-command-palette"
  | "show-notifications"
  | "show-shortcut-help"
  | "show-help-center"
  | "toggle-sidebar"
  | "refresh-dashboard"
  | "change-theme"
  | "create-workspace"
  | "open-company"
  | "export-report";

const EVENT_PREFIX = "equityos:";

export function emitUiEvent(name: UiEventName, detail?: unknown): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT_PREFIX + name, { detail }));
}

export function onUiEvent(
  name: UiEventName,
  handler: (detail?: unknown) => void
): () => void {
  if (typeof window === "undefined") return () => {};
  const listener = (event: Event) =>
    handler((event as CustomEvent).detail);
  window.addEventListener(EVENT_PREFIX + name, listener);
  return () => window.removeEventListener(EVENT_PREFIX + name, listener);
}

/** Public API — open the global command palette (Ctrl+K). */
export function openCommandPalette(initialQuery?: string): void {
  emitUiEvent("open-command-palette", initialQuery);
}

/** Public API — open the notification center panel. */
export function showNotificationCenter(): void {
  emitUiEvent("show-notifications");
}

/** Public API — open the keyboard shortcut help dialog. */
export function showShortcutHelp(): void {
  emitUiEvent("show-shortcut-help");
}

/** Public API — open the built-in help center. */
export function showHelpCenter(): void {
  emitUiEvent("show-help-center");
}
