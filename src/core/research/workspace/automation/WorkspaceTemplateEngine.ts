/**
 * Workspace template engine (Sprint 10A.R7).
 * Institutional templates — composes layout tabs, no recalculation.
 */

import { safeWorkspaceText } from "../WorkspaceModels";
import { applyLayoutPreset } from "../layout/WorkspaceLayoutEngine";
import type { LayoutPresetId } from "../layout/LayoutPresentationModels";
import { openTab } from "../layout/WorkspaceTabEngine";
import {
  AUTOMATION_EMPTY,
  TEMPLATE_KINDS,
  emptyTemplate,
  normalizeTemplate,
  type TemplateKind,
  type TemplateView,
  type WorkspaceTemplate,
} from "./AutomationPresentationModels";

export interface CreateTemplateInput {
  workspaceId: string;
  kind?: TemplateKind | null;
  name?: string | null;
  description?: string | null;
  ticker?: string | null;
  tabs?: string[] | null;
  layoutPreset?: string | null;
  now?: Date | null;
}

const templates = new Map<string, WorkspaceTemplate>();
let templateSeq = 0;
let templatesApplied = 0;

function stamp(now?: Date | null): string {
  return (now ?? new Date()).toISOString();
}

const BUILTIN_TABS: Record<TemplateKind, string[]> = {
  research: ["research", "company", "notes"],
  earnings: ["earnings", "company", "alerts"],
  portfolio_review: ["portfolio", "research", "opportunity"],
  company_deep_dive: ["company", "research", "notes", "alerts"],
  sector_analysis: ["research", "screener", "company"],
  watchlist_review: ["watchlist", "alerts", "screener"],
  custom: ["research"],
};

const BUILTIN_PRESETS: Partial<Record<TemplateKind, string>> = {
  research: "research",
  earnings: "trading",
  portfolio_review: "portfolio",
  company_deep_dive: "research",
  watchlist_review: "compact",
};

const BUILTIN_NAMES: Record<TemplateKind, string> = {
  research: "Research Template",
  earnings: "Earnings Template",
  portfolio_review: "Portfolio Review",
  company_deep_dive: "Company Deep Dive",
  sector_analysis: "Sector Analysis",
  watchlist_review: "Watchlist Review",
  custom: "Custom Template",
};

export function createTemplate(input: CreateTemplateInput): WorkspaceTemplate {
  const workspaceId = safeWorkspaceText(input.workspaceId, "").toLowerCase();
  if (!workspaceId) return emptyTemplate(AUTOMATION_EMPTY.awaitingWorkspace);

  const kind = TEMPLATE_KINDS.includes(input.kind as TemplateKind)
    ? (input.kind as TemplateKind)
    : "custom";
  templateSeq += 1;

  const template = normalizeTemplate({
    id: `tpl-${templateSeq}-${Date.now()}`,
    workspaceId,
    kind,
    name: safeWorkspaceText(input.name, BUILTIN_NAMES[kind]),
    description: safeWorkspaceText(
      input.description,
      `Institutional ${BUILTIN_NAMES[kind]} workflow`
    ),
    tabs: input.tabs ?? BUILTIN_TABS[kind],
    layoutPreset: input.layoutPreset ?? BUILTIN_PRESETS[kind] ?? null,
    ticker: input.ticker ? safeWorkspaceText(input.ticker, "").toUpperCase() : null,
    createdAt: stamp(input.now),
    empty: false,
  });
  templates.set(template.id, template);
  return template;
}

function tabKindFromName(name: string): Parameters<typeof openTab>[0]["kind"] {
  const key = name.toLowerCase();
  if (key === "company") return "company";
  if (key === "earnings") return "earnings";
  if (key === "alerts") return "alerts";
  if (key === "screener") return "screener";
  if (key === "portfolio") return "portfolio";
  if (key === "watchlist") return "watchlist";
  if (key === "opportunity") return "opportunity";
  if (key === "notes") return "notes";
  return "research";
}

export function applyTemplate(
  templateId: string,
  options?: { ticker?: string | null }
): { template: WorkspaceTemplate; tabsOpened: number } {
  const key = safeWorkspaceText(templateId, "").toLowerCase();
  const template = templates.get(key);
  if (!template || template.empty) {
    return { template: emptyTemplate(AUTOMATION_EMPTY.noTemplates), tabsOpened: 0 };
  }

  const ticker =
    options?.ticker != null
      ? safeWorkspaceText(options.ticker, "").toUpperCase()
      : template.ticker;

  if (template.layoutPreset) {
    applyLayoutPreset(
      template.workspaceId,
      template.layoutPreset as LayoutPresetId
    );
  }

  let tabsOpened = 0;
  for (const tabName of template.tabs) {
    const tab = openTab({
      workspaceId: template.workspaceId,
      kind: tabKindFromName(tabName),
      ticker,
    });
    if (!tab.empty) tabsOpened += 1;
  }

  templatesApplied += 1;
  return { template, tabsOpened };
}

export function listTemplates(options?: {
  workspaceId?: string | null;
  kind?: TemplateKind | null;
}): WorkspaceTemplate[] {
  const wid = options?.workspaceId
    ? safeWorkspaceText(options.workspaceId, "").toLowerCase()
    : null;
  return Array.from(templates.values()).filter((t) => {
    if (t.empty) return false;
    if (wid && t.workspaceId !== wid) return false;
    if (options?.kind && t.kind !== options.kind) return false;
    return true;
  });
}

export function getTemplateView(options?: {
  workspaceId?: string | null;
}): TemplateView {
  const items = listTemplates(options);
  if (items.length === 0) {
    return { templates: [], empty: true, emptyMessage: AUTOMATION_EMPTY.noTemplates };
  }
  return {
    templates: items,
    empty: false,
    emptyMessage: AUTOMATION_EMPTY.awaitingWorkspace,
  };
}

export function getTemplatesAppliedCount(): number {
  return templatesApplied;
}

export function resetWorkspaceTemplates(): void {
  templates.clear();
  templateSeq = 0;
  templatesApplied = 0;
}

export class WorkspaceTemplateEngine {
  createTemplate = createTemplate;
  applyTemplate = applyTemplate;
  listTemplates = listTemplates;
  reset = resetWorkspaceTemplates;
}
