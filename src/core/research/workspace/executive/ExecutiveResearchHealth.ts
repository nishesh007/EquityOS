/**
 * Executive Research Health — institutional layer health (Sprint 10A.R8).
 */

import { WORKSPACE_EMPTY } from "../WorkspaceModels";
import { KNOWLEDGE_EMPTY } from "../knowledge/KnowledgePresentationModels";
import { INTEGRATION_EMPTY } from "../integration/ResearchIntegrationModels";
import { COPILOT_EMPTY } from "../copilot/CopilotPresentationModels";
import { AUTOMATION_EMPTY } from "../automation/AutomationPresentationModels";
import {
  EXECUTIVE_RESEARCH_EMPTY,
  formatScore,
  safeNumeric,
  type ExecutiveResearchHealthView,
  type ResearchLayerHealth,
} from "./ExecutiveResearchModels";
import type { ExecutiveResearchMetricBundle } from "./ExecutiveResearchModels";

export interface ExecutiveHealthComposeInput {
  workspaceReady: boolean;
  copilotReady: boolean;
  knowledgeReady: boolean;
  automationReady: boolean;
  timelineReady: boolean;
  decisionReady: boolean;
  integrationReady: boolean;
}

function layerHealth(
  id: string,
  label: string,
  ready: boolean,
  score: number,
  emptyMessage: string
): ResearchLayerHealth {
  const numeric = ready ? safeNumeric(score, 0) : 0;
  return {
    id,
    label,
    score: numeric,
    scoreLabel: ready && numeric > 0 ? formatScore(numeric) : "—",
    ready,
    emptyMessage,
  };
}

export class ExecutiveResearchHealth {
  build(
    metrics: ExecutiveResearchMetricBundle,
    flags: ExecutiveHealthComposeInput
  ): ExecutiveResearchHealthView {
    const inactive =
      !flags.workspaceReady &&
      !flags.knowledgeReady &&
      !flags.timelineReady &&
      metrics.companiesResearched === 0 &&
      metrics.openTabs === 0;

    if (inactive) {
      const emptyLayer = (id: string, label: string, msg: string) =>
        layerHealth(id, label, false, 0, msg);
      const layers = [
        emptyLayer("workspace", "Workspace", WORKSPACE_EMPTY.noWorkspace),
        emptyLayer("copilot", "Copilot", COPILOT_EMPTY.noAiSummary),
        emptyLayer("knowledge", "Knowledge", KNOWLEDGE_EMPTY.knowledgeBaseEmpty),
        emptyLayer("automation", "Automation", AUTOMATION_EMPTY.awaitingWorkspace),
        emptyLayer("timeline", "Timeline", INTEGRATION_EMPTY.noTimeline),
        emptyLayer("decisions", "Decision Journal", INTEGRATION_EMPTY.noDecisions),
        emptyLayer("integration", "Integration", INTEGRATION_EMPTY.awaitingResearchActivity),
      ];
      return {
        overallHealthScore: 0,
        overallHealthLabel: "—",
        workspaceHealth: layers[0]!,
        copilotHealth: layers[1]!,
        knowledgeHealth: layers[2]!,
        automationHealth: layers[3]!,
        timelineHealth: layers[4]!,
        decisionJournalHealth: layers[5]!,
        integrationHealth: layers[6]!,
        layers,
        empty: true,
        emptyMessage: EXECUTIVE_RESEARCH_EMPTY.awaitingResearch,
      };
    }

    const workspaceScore = Math.min(
      100,
      metrics.openTabs * 12 + (flags.workspaceReady ? 40 : 0)
    );
    const copilotScore = flags.copilotReady
      ? Math.min(100, metrics.averageConviction + 10)
      : 0;
    const knowledgeScore = Math.min(
      100,
      metrics.noteCount * 8 + metrics.evidenceCount * 10
    );
    const automationScore = Math.min(
      100,
      metrics.templateCount * 10 +
        metrics.taskCompleted * 8 +
        (flags.automationReady ? 25 : 0)
    );
    const timelineScore = Math.min(100, metrics.timelineCount * 8);
    const decisionScore = Math.min(100, metrics.decisionCount * 15);
    const integrationScore = Math.min(
      100,
      Math.round(
        (metrics.validationCoverage + metrics.trustCoverage) / 2
      )
    );

    const layers = [
      layerHealth(
        "workspace",
        "Workspace",
        flags.workspaceReady,
        workspaceScore,
        WORKSPACE_EMPTY.noWorkspace
      ),
      layerHealth(
        "copilot",
        "Copilot",
        flags.copilotReady,
        copilotScore,
        COPILOT_EMPTY.noAiSummary
      ),
      layerHealth(
        "knowledge",
        "Knowledge",
        flags.knowledgeReady,
        knowledgeScore,
        KNOWLEDGE_EMPTY.knowledgeBaseEmpty
      ),
      layerHealth(
        "automation",
        "Automation",
        flags.automationReady,
        automationScore,
        AUTOMATION_EMPTY.noAutomationRules
      ),
      layerHealth(
        "timeline",
        "Timeline",
        flags.timelineReady,
        timelineScore,
        INTEGRATION_EMPTY.noTimeline
      ),
      layerHealth(
        "decisions",
        "Decision Journal",
        flags.decisionReady,
        decisionScore,
        INTEGRATION_EMPTY.noDecisions
      ),
      layerHealth(
        "integration",
        "Integration",
        flags.integrationReady,
        integrationScore,
        INTEGRATION_EMPTY.awaitingResearchActivity
      ),
    ];

    const readyLayers = layers.filter((l) => l.ready);
    const overall = readyLayers.length
      ? Math.round(
          readyLayers.reduce((sum, l) => sum + l.score, 0) / readyLayers.length
        )
      : 0;

    return {
      overallHealthScore: overall,
      overallHealthLabel: formatScore(overall),
      workspaceHealth: layers[0]!,
      copilotHealth: layers[1]!,
      knowledgeHealth: layers[2]!,
      automationHealth: layers[3]!,
      timelineHealth: layers[4]!,
      decisionJournalHealth: layers[5]!,
      integrationHealth: layers[6]!,
      layers,
      empty: false,
      emptyMessage: EXECUTIVE_RESEARCH_EMPTY.noCoverage,
    };
  }
}

export function getExecutiveResearchHealth(
  metrics: ExecutiveResearchMetricBundle,
  flags: ExecutiveHealthComposeInput
): ExecutiveResearchHealthView {
  return new ExecutiveResearchHealth().build(metrics, flags);
}
