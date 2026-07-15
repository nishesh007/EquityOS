/**
 * Institutional Research Workspace — primary analyst surface (Sprint 10A.R1).
 * Composes existing module routes via workspace panels.
 */

import Link from "next/link";
import {
  ensureDefaultResearchWorkspace,
  fetchResearchWorkspaceHealth,
  fetchResearchWorkspaceView,
} from "@/services/researchWorkspace";
import { WORKSPACE_EMPTY } from "@/src/core/research/workspace";

export default function ResearchPage() {
  ensureDefaultResearchWorkspace({ name: "Institutional Research Workspace" });
  const health = fetchResearchWorkspaceHealth();
  const view = fetchResearchWorkspaceView();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-text-primary">
          Institutional Research Workspace
        </h1>
        <p className="mt-0.5 text-sm text-text-muted">
          Primary analyst working environment ·{" "}
          {health.workspaceCount > 0
            ? `${health.workspaceCount} workspace${health.workspaceCount === 1 ? "" : "s"}`
            : health.emptyMessage}{" "}
          · {health.openSessions} open sessions · research{" "}
          {health.researchCount > 0 ? health.researchCount : WORKSPACE_EMPTY.awaitingResearch}
        </p>
      </div>

      {view.empty ? (
        <div className="rounded-lg border border-surface-border-subtle px-4 py-10 text-center text-sm text-text-muted">
          {view.emptyMessage}
        </div>
      ) : (
        <div className="space-y-6">
          {view.active ? (
            <section>
              <h2 className="mb-2 text-sm font-medium text-text-secondary">
                Active workspace
              </h2>
              <p className="text-sm text-text-primary">{view.active.title}</p>
              <p className="text-xs text-text-muted">{view.active.subtitle}</p>
            </section>
          ) : null}

          <section>
            <h2 className="mb-2 text-sm font-medium text-text-secondary">
              Research panels
            </h2>
            {view.panels.length === 0 ? (
              <p className="text-sm text-text-muted">{WORKSPACE_EMPTY.awaitingResearch}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {view.panels.map((panel) => (
                  <Link
                    key={panel.id}
                    href={panel.route}
                    className="rounded-lg border border-surface-border-subtle px-3 py-1.5 text-xs font-medium text-text-muted transition hover:bg-surface-hover hover:text-text-secondary"
                  >
                    {panel.label}
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-sm font-medium text-text-secondary">
              Recent sessions
            </h2>
            {view.sessions.length === 0 ? (
              <p className="text-sm text-text-muted">
                {WORKSPACE_EMPTY.noRecentSessions}
              </p>
            ) : (
              <ul className="space-y-1 text-sm text-text-primary">
                {view.sessions.map((session) => (
                  <li key={session.id}>
                    {session.title}
                    <span className="ml-2 text-xs text-text-muted">
                      {session.subtitle}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
