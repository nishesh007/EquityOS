/**
 * Sprint 10C.R7 — built-in help center content.
 *
 * Terminology, guides, FAQ and release notes as pure data. Keyboard
 * shortcuts are sourced from the shortcut maps — never re-declared.
 */

import { GLOBAL_SHORTCUTS, type GlobalShortcut } from "../command/globalShortcuts";
import {
  WORKSPACE_SHORTCUTS,
  type WorkspaceShortcut,
} from "../workspace/workspaceShortcuts";

export interface HelpShortcutGroup {
  title: string;
  shortcuts: readonly { label: string; display: string }[];
}

/** All keyboard shortcuts, grouped for the help dialog. */
export function getShortcutGroups(): HelpShortcutGroup[] {
  return [
    {
      title: "Global",
      shortcuts: GLOBAL_SHORTCUTS.map((s: GlobalShortcut) => ({
        label: s.label,
        display: s.display,
      })),
    },
    {
      title: "Workspace",
      shortcuts: WORKSPACE_SHORTCUTS.map((s: WorkspaceShortcut) => ({
        label: s.label,
        display: s.display,
      })),
    },
  ];
}

export interface GlossaryEntry {
  term: string;
  definition: string;
}

export const GLOSSARY: readonly GlossaryEntry[] = Object.freeze([
  { term: "Conviction Score", definition: "Composite 0–100 confidence measure combining fundamentals, technicals, institutional flow and AI validation for a recommendation." },
  { term: "Trust Score", definition: "Reliability of the underlying data and model agreement backing a recommendation." },
  { term: "Validation Score", definition: "How thoroughly a recommendation has been cross-checked by the validation engine's independent modules." },
  { term: "Risk Level", definition: "Categorized downside exposure (Low / Moderate / High / Extreme) derived from volatility, liquidity and drawdown characteristics." },
  { term: "Market Breadth", definition: "Ratio of advancing to declining stocks — a participation measure of market strength." },
  { term: "Put/Call Ratio", definition: "Options positioning gauge; readings above 1 indicate hedging or bearish positioning." },
  { term: "FII / DII", definition: "Foreign and Domestic Institutional Investor net cash-market flows on Indian exchanges." },
  { term: "Workspace", definition: "A saved dashboard arrangement — widget positions, sizes and visibility — switchable per workflow." },
  { term: "Holding Period", definition: "The strategy-defined time horizon a recommendation is expected to play out over." },
  { term: "Allocation Ring", definition: "Donut visualization of portfolio distribution across sectors, capital or risk buckets." },
]);

export interface HelpGuide {
  id: string;
  title: string;
  steps: readonly string[];
}

export const GUIDES: readonly HelpGuide[] = Object.freeze([
  {
    id: "customize-dashboard",
    title: "Customize your dashboard",
    steps: [
      "Open the dashboard and hover any widget to reveal its controls.",
      "Drag the grip handle to reorder or dock widgets into another band.",
      "Use the size selector or the right-edge handle to resize.",
      "Hide widgets you don't need — restore them from Hidden in the toolbar.",
      "Save different arrangements as workspace profiles.",
    ],
  },
  {
    id: "research-workflow",
    title: "Run a research workflow",
    steps: [
      "Press Ctrl+K and type a company name or ticker.",
      "Review the company page: fundamentals, technicals and AI scores.",
      "Add promising names to a watchlist for tracking.",
      "Check AI Insights for conviction-ranked recommendations.",
      "Export a report when your thesis is ready.",
    ],
  },
  {
    id: "themes",
    title: "Personalize appearance",
    steps: [
      "Open Settings → Appearance.",
      "Pick one of eight institutional themes and six accent colors.",
      "Tune density, font size and animation preferences.",
      "Everything persists automatically per browser.",
    ],
  },
]);

export interface FaqEntry {
  question: string;
  answer: string;
}

export const FAQ: readonly FaqEntry[] = Object.freeze([
  { question: "How do I open the command palette?", answer: "Press Ctrl+K anywhere (Cmd+K on macOS), or use the search box in the top bar." },
  { question: "Where did a hidden widget go?", answer: "Open the dashboard toolbar and use Hidden (n) to restore individual widgets or everything at once." },
  { question: "Are my layouts synced across devices?", answer: "Workspaces persist in this browser's storage. Use Export / Import in the dashboard toolbar to move them between machines as JSON." },
  { question: "Why is market data delayed?", answer: "Quotes are sourced on a delayed feed; the status badge on each index card shows the feed state." },
  { question: "How do I reset everything to defaults?", answer: "Dashboard → toolbar → Reset restores the active workspace's template. Settings → Restore Defaults resets appearance." },
]);

export interface ReleaseNote {
  version: string;
  title: string;
  highlights: readonly string[];
}

export const RELEASE_NOTES: readonly ReleaseNote[] = Object.freeze([
  {
    version: "UI v1.0",
    title: "Sprint 10C.1 Release Candidate",
    highlights: [
      "Research data grid, command palette, productivity hub",
      "Market internals, heatmap, chart workspace",
      "Design system frozen — EquityOS UI v1.0",
    ],
  },
  { version: "10C.R7", title: "Command palette & productivity", highlights: ["Global command palette (Ctrl+K)", "Notification center and activity feed", "Breadcrumbs, status bar and help center", "Onboarding tour and context menus"] },
  { version: "10C.R6", title: "Workspace personalization", highlights: ["Drag & drop dashboard with docking", "Saved workspace profiles and 8 templates", "Widget library and JSON import/export"] },
  { version: "10C.R5", title: "Premium appearance", highlights: ["8 institutional themes and 6 accents", "Typography, motion and glass systems"] },
  { version: "10C.R4", title: "Institutional tables", highlights: ["Sticky headers, density modes, column customization", "Premium cell rendering and CSV export"] },
]);
