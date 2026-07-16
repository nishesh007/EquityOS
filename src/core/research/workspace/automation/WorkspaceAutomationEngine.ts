/**
 * Workspace automation engine (Sprint 10A.R7).
 * Auto-open tabs, load notes, save workspace — composes R1–R6 only.
 */

import { safeWorkspaceText } from "../WorkspaceModels";
import { openTab, listOpenTabs } from "../layout/WorkspaceTabEngine";
import { saveLayout } from "../layout/WorkspaceLayoutEngine";
import { listNotes } from "../knowledge/ResearchNotesEngine";
import {
  AUTOMATION_EMPTY,
  AUTOMATION_RULES,
  emptyTemplate,
  type AutomationRule,
  type AutomationRunResult,
} from "./AutomationPresentationModels";
import { applyTemplate, listTemplates } from "./WorkspaceTemplateEngine";

export interface RunAutomationInput {
  workspaceId: string;
  ticker?: string | null;
  rules?: AutomationRule[] | null;
  templateId?: string | null;
  now?: Date | null;
}

let automationSeq = 0;
let automationsRun = 0;

function stamp(now?: Date | null): string {
  return (now ?? new Date()).toISOString();
}

export function runAutomation(input: RunAutomationInput): AutomationRunResult {
  const workspaceId = safeWorkspaceText(input.workspaceId, "").toLowerCase();
  if (!workspaceId) {
    return {
      id: "",
      workspaceId: "",
      rules: [],
      actions: [],
      tabsOpened: 0,
      notesLoaded: 0,
      saved: false,
      at: "",
      empty: true,
      emptyMessage: AUTOMATION_EMPTY.noAutomationRules,
    };
  }

  const ticker = input.ticker
    ? safeWorkspaceText(input.ticker, "").toUpperCase()
    : null;
  const rules =
    Array.isArray(input.rules) && input.rules.length > 0
      ? input.rules.filter((r): r is AutomationRule =>
          AUTOMATION_RULES.includes(r as AutomationRule)
        )
      : ([
          "auto_open_research",
          "auto_load_notes",
          "auto_save_workspace",
        ] as AutomationRule[]);

  const actions: string[] = [];
  let tabsOpened = 0;
  let notesLoaded = 0;
  let saved = false;

  if (input.templateId) {
    const applied = applyTemplate(input.templateId, { ticker });
    if (!applied.template.empty) {
      tabsOpened += applied.tabsOpened;
      actions.push(`Applied template · ${applied.template.name}`);
    }
  }

  for (const rule of rules) {
    switch (rule) {
      case "auto_open_research": {
        const tab = openTab({ workspaceId, kind: "research", ticker });
        if (!tab.empty) {
          tabsOpened += 1;
          actions.push("Opened research tab");
        }
        break;
      }
      case "auto_open_earnings": {
        const tab = openTab({ workspaceId, kind: "earnings", ticker });
        if (!tab.empty) {
          tabsOpened += 1;
          actions.push("Opened earnings tab");
        }
        break;
      }
      case "auto_open_alerts": {
        const tab = openTab({ workspaceId, kind: "alerts", ticker });
        if (!tab.empty) {
          tabsOpened += 1;
          actions.push("Opened alerts tab");
        }
        break;
      }
      case "auto_load_notes": {
        const notes = listNotes({ workspaceId, ticker: ticker ?? undefined });
        notesLoaded = notes.length;
        actions.push(`Loaded ${notesLoaded} notes`);
        break;
      }
      case "auto_load_watchlist": {
        const tab = openTab({ workspaceId, kind: "watchlist", ticker });
        if (!tab.empty) {
          tabsOpened += 1;
          actions.push("Opened watchlist tab");
        }
        break;
      }
      case "auto_load_portfolio": {
        const tab = openTab({ workspaceId, kind: "portfolio", ticker });
        if (!tab.empty) {
          tabsOpened += 1;
          actions.push("Opened portfolio tab");
        }
        break;
      }
      case "auto_save_workspace": {
        const layout = saveLayout({
          workspaceId,
          name: `Auto-save · ${stamp(input.now)}`,
        });
        if (!layout.empty) {
          saved = true;
          actions.push("Saved workspace layout");
        }
        break;
      }
      default:
        break;
    }
  }

  if (actions.length === 0) {
    return {
      id: "",
      workspaceId,
      rules,
      actions: [],
      tabsOpened: 0,
      notesLoaded: 0,
      saved: false,
      at: stamp(input.now),
      empty: true,
      emptyMessage: AUTOMATION_EMPTY.noAutomationRules,
    };
  }

  automationSeq += 1;
  automationsRun += 1;
  return {
    id: `auto-${automationSeq}-${Date.now()}`,
    workspaceId,
    rules,
    actions,
    tabsOpened,
    notesLoaded,
    saved,
    at: stamp(input.now),
    empty: false,
    emptyMessage: AUTOMATION_EMPTY.awaitingWorkspace,
  };
}

export function getAutomationsRunCount(): number {
  return automationsRun;
}

export function resetWorkspaceAutomation(): void {
  automationSeq = 0;
  automationsRun = 0;
}

export class WorkspaceAutomationEngine {
  runAutomation = runAutomation;
  reset = resetWorkspaceAutomation;
}
