import { ResearchWorkspace } from "@/components/ai/ResearchWorkspace";
import Link from "next/link";
import { fetchInstitutionalScreenerHealth } from "@/services/screenerData";
import {
  ensureDefaultResearchWorkspace,
  fetchResearchWorkspaceHealth,
} from "@/services/researchWorkspace";

const suggestions = [
  "Analyse Tata Motors",
  "Should I buy Persistent Systems?",
  "Compare Infosys vs TCS",
  "Analyse Elecon Engineering",
  "Best hotel stocks in India",
  "Top defence stocks",
];

const quickLinks = [
  { href: "/markets", label: "Markets" },
  { href: "/screener", label: "Companies" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/watchlist", label: "Watchlist" },
] as const;

export default function AIResearchPage() {
  const screenerHealth = fetchInstitutionalScreenerHealth();
  ensureDefaultResearchWorkspace({ name: "AI Research Analyst Desk" });
  const researchWorkspace = fetchResearchWorkspaceHealth();

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex-shrink-0 border-b border-surface-border-subtle px-4 py-4 md:px-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary md:text-3xl">
              AI Research Analyst
            </h1>
            <p className="mt-1 text-sm text-text-muted md:mt-2">
              Institutional-grade equity research powered by AI ·{" "}
              {screenerHealth.screenCount} AI screens ·{" "}
              {screenerHealth.portfolioScreens} portfolio screens ·{" "}
              {screenerHealth.strategyTemplateCount} strategy templates ·
              discovery{" "}
              {screenerHealth.discoveryReady
                ? `${screenerHealth.themeCount} themes`
                : screenerHealth.emptyMessage}{" "}
              · workspace{" "}
              {screenerHealth.workspaceReady ? "ready" : screenerHealth.emptyMessage}{" "}
              · executive{" "}
              {screenerHealth.executiveReady
                ? screenerHealth.sprint9DFrozen
                  ? "9D frozen"
                  : screenerHealth.executiveSummary
                : screenerHealth.emptyMessage}{" "}
              · research desk{" "}
              {researchWorkspace.ready
                ? `${researchWorkspace.openSessions} sessions`
                : researchWorkspace.emptyMessage}
              .
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/research"
              className="rounded-lg border border-surface-border-subtle px-3 py-1.5 text-xs font-medium text-text-muted transition hover:bg-surface-hover hover:text-text-secondary"
            >
              Research Workspace
            </Link>
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg border border-surface-border-subtle px-3 py-1.5 text-xs font-medium text-text-muted transition hover:bg-surface-hover hover:text-text-secondary"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <ResearchWorkspace suggestions={suggestions} />
    </div>
  );
}
