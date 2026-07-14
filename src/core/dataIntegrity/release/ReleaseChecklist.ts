/**
 * Release checklist — pre-release, deployment, rollback, operational, security, compliance.
 */

import type {
  ChecklistProfile,
  ReleaseConfiguration,
} from "./ReleaseConfiguration";

export type ChecklistCategory =
  | "pre_release"
  | "deployment"
  | "rollback"
  | "operational"
  | "security"
  | "compliance";

export interface ChecklistItem {
  itemId: string;
  category: ChecklistCategory;
  label: string;
  required: boolean;
  completed: boolean;
  notes?: string;
}

export interface ChecklistResult {
  profile: ChecklistProfile;
  items: ChecklistItem[];
  completionPct: number;
  requiredCompletionPct: number;
  passed: boolean;
  warnings: string[];
  errors: string[];
}

export class ReleaseChecklist {
  private config: ReleaseConfiguration;

  constructor(config: ReleaseConfiguration) {
    this.config = config;
  }

  setConfiguration(config: ReleaseConfiguration): void {
    this.config = config;
  }

  evaluate(
    profile: ChecklistProfile = this.config.checklistProfile,
    overrides?: Array<{ itemId: string; completed: boolean; notes?: string }>
  ): ChecklistResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    try {
      const items = buildChecklist(profile).slice(
        0,
        this.config.maxChecklistItems
      );
      const overrideMap = new Map(
        (overrides ?? []).map((o) => [o.itemId, o])
      );
      for (const item of items) {
        const o = overrideMap.get(item.itemId);
        if (o) {
          item.completed = o.completed;
          item.notes = o.notes;
        }
      }

      const completionPct = clamp(
        Math.round(
          (items.filter((i) => i.completed).length / Math.max(1, items.length)) *
            100
        ),
        0,
        100
      );
      const required = items.filter((i) => i.required);
      const requiredCompletionPct = clamp(
        Math.round(
          (required.filter((i) => i.completed).length /
            Math.max(1, required.length)) *
            100
        ),
        0,
        100
      );
      const passed =
        requiredCompletionPct >=
        (this.config.mode === "relaxed" ? 70 : 90);

      if (!passed) {
        warnings.push(
          `Required checklist completion ${requiredCompletionPct}% below threshold`
        );
      }

      return {
        profile,
        items,
        completionPct,
        requiredCompletionPct,
        passed,
        warnings,
        errors,
      };
    } catch (err) {
      errors.push(`checklist evaluation failed: ${String(err)}`);
      return {
        profile,
        items: [],
        completionPct: 0,
        requiredCompletionPct: 0,
        passed: false,
        warnings,
        errors,
      };
    }
  }
}

function buildChecklist(profile: ChecklistProfile): ChecklistItem[] {
  const all: ChecklistItem[] = [
    item("pre_release", "pr-health", "Module health verified", true, true),
    item("pre_release", "pr-tests", "Automated tests green", true, true),
    item("pre_release", "pr-docs", "Release notes prepared", false, true),
    item("deployment", "dep-config", "Deployment config validated", true, true),
    item("deployment", "dep-migrate", "Migration plan reviewed", true, true),
    item("deployment", "dep-infra", "Infrastructure readiness confirmed", true, true),
    item("rollback", "rb-plan", "Rollback plan documented", true, true),
    item("rollback", "rb-snapshot", "Rollback snapshot available", true, true),
    item("rollback", "rb-owner", "Rollback owner assigned", false, true),
    item("operational", "ops-monitor", "Monitoring dashboards ready", true, true),
    item("operational", "ops-oncall", "On-call coverage confirmed", true, true),
    item("operational", "ops-runbook", "Operational runbooks updated", false, true),
    item("security", "sec-scan", "Security scan completed", true, true),
    item("security", "sec-access", "Access controls reviewed", true, true),
    item("security", "sec-secrets", "Secrets rotation verified", false, false),
    item("compliance", "comp-policy", "Compliance policies satisfied", true, true),
    item("compliance", "comp-audit", "Audit trail validated", true, true),
    item("compliance", "comp-signoff", "Compliance sign-off recorded", true, false),
  ];

  if (profile === "full") return all;
  return all.filter((i) => i.category === profile);
}

function item(
  category: ChecklistCategory,
  itemId: string,
  label: string,
  required: boolean,
  completed: boolean
): ChecklistItem {
  return { itemId, category, label, required, completed };
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
