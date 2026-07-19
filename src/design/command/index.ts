/**
 * Sprint 10C.R7 — command palette & global search barrel.
 */

export { fuzzyScore, fuzzyScoreAll } from "./fuzzy";
export {
  registerCommand,
  registerQuickAction,
  registerSearchProvider,
  unregisterSearchProvider,
  searchEverything,
  listCommands,
  getCommand,
  resetCommandRegistryForTests,
  COMMAND_CATEGORY_LABELS,
  SEARCH_EXAMPLES,
  type CommandCategory,
  type CommandItem,
  type SearchResult,
  type SearchProvider,
} from "./commandRegistry";
export { NSE_SECTOR_CATALOG, type SectorCatalogItem } from "./sectorCatalog";
export {
  GLOBAL_SHORTCUTS,
  matchGlobalShortcut,
  type GlobalShortcut,
  type GlobalShortcutId,
  type GlobalKeyEvent,
} from "./globalShortcuts";
export {
  emitUiEvent,
  onUiEvent,
  openCommandPalette,
  showNotificationCenter,
  showShortcutHelp,
  showHelpCenter,
  type UiEventName,
} from "./uiBus";
export { CommandPalette } from "./CommandPalette";
export { TerminalExperience } from "./TerminalExperience";
