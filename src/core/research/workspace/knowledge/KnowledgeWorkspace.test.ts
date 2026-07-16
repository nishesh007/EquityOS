/**
 * Institutional Research Knowledge — tests (Sprint 10A.R4).
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  KNOWLEDGE_EMPTY,
  bookmarkResearch,
  createAnnotation,
  createNote,
  createWorkspace,
  deleteNote,
  emptyKnowledgeView,
  favoriteNote,
  getAiObservations,
  getEvidence,
  getKnowledge,
  getMemoryTimeline,
  getPreviousConclusions,
  highlightAiInsight,
  highlightMetric,
  ingestEvidenceBag,
  listAnnotations,
  listBookmarks,
  listNotes,
  normalizeNote,
  pinNote,
  recordConclusion,
  recordMemoryDecision,
  recordObservation,
  resetResearchWorkspace,
  updateNote,
} from "../index";

describe("Sprint 10A.R4 — Research Knowledge Layer", () => {
  let workspaceId = "";

  beforeEach(() => {
    resetResearchWorkspace();
    workspaceId = createWorkspace({ name: "Knowledge Desk" }).id;
  });

  afterEach(() => {
    resetResearchWorkspace();
  });

  describe("notes", () => {
    it("createNote / updateNote / deleteNote round-trip with version history", () => {
      const note = createNote({
        workspaceId,
        ticker: "INFY",
        title: "Thesis",
        body: "Initial thesis",
        format: "markdown",
      });
      expect(note.empty).toBe(false);
      expect(note.autoSaved).toBe(true);

      const updated = updateNote(note.id, {
        body: "Updated thesis with catalysts",
        pinned: true,
      });
      expect(updated.body).toContain("Updated");
      expect(updated.pinned).toBe(true);
      expect(updated.versions.length).toBeGreaterThanOrEqual(1);

      expect(deleteNote(note.id)).toBe(true);
      expect(listNotes({ workspaceId }).length).toBe(0);
    });

    it("pin and favorite notes", () => {
      const note = createNote({
        workspaceId,
        ticker: "TCS",
        title: "Pinned",
        body: "Content",
      });
      expect(pinNote(note.id, true).pinned).toBe(true);
      expect(favoriteNote(note.id, true).favorite).toBe(true);
      expect(
        listNotes({ workspaceId, pinnedOnly: true }).some((n) => n.id === note.id)
      ).toBe(true);
    });

    it("returns No Notes empty for missing update", () => {
      const missing = updateNote("missing", { body: "x" });
      expect(missing.emptyMessage).toBe(KNOWLEDGE_EMPTY.noNotes);
    });

    it("creates markdown notes with auto-save enabled", () => {
      const note = createNote({
        workspaceId,
        ticker: "RELIANCE",
        title: "Thesis",
        body: "## Bull case\n- Margin expansion",
        format: "markdown",
      });
      expect(note.format).toBe("markdown");
      expect(note.autoSaved).toBe(true);
      expect(note.versions.length).toBe(1);
    });

    it("accumulates version history on body edits", () => {
      const note = createNote({
        workspaceId,
        body: "Draft v1",
      });
      const v2 = updateNote(note.id, { body: "Draft v2" });
      const v3 = updateNote(note.id, { body: "Draft v3" });
      expect(v3.versions.length).toBeGreaterThanOrEqual(2);
      expect(v3.body).toBe("Draft v3");
    });

    it("listNotes supports favoriteOnly filter", () => {
      const a = createNote({ workspaceId, title: "A", body: "a" });
      const b = createNote({ workspaceId, title: "B", body: "b" });
      favoriteNote(a.id, true);
      expect(listNotes({ workspaceId, favoriteOnly: true }).map((n) => n.id)).toEqual([
        a.id,
      ]);
      expect(listNotes({ workspaceId, favoriteOnly: true })).not.toContainEqual(
        expect.objectContaining({ id: b.id })
      );
    });

    it("sorts pinned notes ahead of unpinned", () => {
      const low = createNote({ workspaceId, title: "Low", body: "x" });
      const high = createNote({ workspaceId, title: "High", body: "y" });
      pinNote(high.id, true);
      const ids = listNotes({ workspaceId }).map((n) => n.id);
      expect(ids.indexOf(high.id)).toBeLessThan(ids.indexOf(low.id));
    });

    it("createNote records research memory timeline entry", () => {
      createNote({
        workspaceId,
        ticker: "WIPRO",
        title: "Memory note",
        body: "Saved thesis",
      });
      const timeline = getMemoryTimeline({ ticker: "WIPRO" });
      expect(timeline.some((e) => e.kind === "note")).toBe(true);
    });
  });

  describe("annotations", () => {
    it("createAnnotation for metric, chart, AI, earnings, alert, screener", () => {
      const targets = [
        highlightMetric(workspaceId, "INFY", "ROE", "ROE improved to 28%"),
        createAnnotation({
          workspaceId,
          ticker: "INFY",
          target: "chart",
          label: "Price chart",
          excerpt: "Breakout above resistance",
        }),
        highlightAiInsight(workspaceId, "INFY", "Accumulate on dips"),
        createAnnotation({
          workspaceId,
          ticker: "INFY",
          target: "earnings",
          label: "Earnings beat",
          excerpt: "Revenue beat consensus",
        }),
        createAnnotation({
          workspaceId,
          ticker: "INFY",
          target: "alert",
          label: "Critical alert",
          excerpt: "Margin compression alert",
        }),
        createAnnotation({
          workspaceId,
          ticker: "INFY",
          target: "screener",
          label: "Screen match",
          excerpt: "Momentum screen leader",
        }),
      ];
      expect(targets.every((a) => !a.empty)).toBe(true);
      expect(targets[0].route).toContain("/company/INFY");
      expect(targets[2].route).toContain("/ai/research");
      expect(listAnnotations({ workspaceId, ticker: "INFY" }).length).toBe(6);
    });

    it("highlightMetric targets metric panel route", () => {
      const ann = highlightMetric(workspaceId, "SBIN", "NIM", "NIM stable at 3.2%");
      expect(ann.target).toBe("metric");
      expect(ann.route).toContain("/company/SBIN");
      expect(ann.excerpt).toContain("NIM");
    });
  });

  describe("bookmarks", () => {
    it("bookmarkResearch for company, report, research, alert, screen, strategy, workspace", () => {
      const kinds = [
        bookmarkResearch({
          workspaceId,
          kind: "company",
          label: "Infosys",
          target: "INFY",
          ticker: "INFY",
        }),
        bookmarkResearch({
          workspaceId,
          kind: "report",
          label: "Report",
          target: "INFY",
          ticker: "INFY",
        }),
        bookmarkResearch({
          workspaceId,
          kind: "research",
          label: "AI Desk",
          target: "desk",
          ticker: "INFY",
        }),
        bookmarkResearch({
          workspaceId,
          kind: "alert",
          label: "Alerts",
          target: "alerts",
          ticker: "INFY",
        }),
        bookmarkResearch({
          workspaceId,
          kind: "screen",
          label: "Momentum",
          target: "momentum",
          ticker: "INFY",
        }),
        bookmarkResearch({
          workspaceId,
          kind: "strategy",
          label: "Growth",
          target: "growth",
        }),
        bookmarkResearch({
          workspaceId,
          kind: "workspace",
          label: "Desk",
          target: workspaceId,
        }),
      ];
      expect(kinds.every((b) => !b.empty)).toBe(true);
      expect(listBookmarks({ workspaceId }).length).toBe(7);
      expect(kinds[0].route).toContain("/company/INFY");
      expect(kinds[6].route).toBe("/research");
    });

    it("empty bookmarks surface No Bookmarks in knowledge view", () => {
      const fresh = createWorkspace({ name: "No Bookmarks" }).id;
      const view = getKnowledge({ workspaceId: fresh });
      expect(view.bookmarks.length).toBe(0);
      expect(view.empty).toBe(true);
      expect(KNOWLEDGE_EMPTY.noBookmarks).toBe("No Bookmarks");
    });
  });

  describe("evidence", () => {
    it("ingestEvidenceBag maps bull bear catalysts risks and module evidence", () => {
      const items = ingestEvidenceBag({
        workspaceId,
        ticker: "HAL",
        bull: ["Order book visibility"],
        bear: ["Cyclical demand risk"],
        catalysts: ["Defence capex"],
        risks: ["Execution delays"],
        management: ["Confident guidance"],
        financial: ["Margin expansion"],
        technical: ["Uptrend intact"],
        news: ["Large contract win"],
        confidence: ["Validation pass"],
      });
      expect(items.length).toBe(9);
      const view = getEvidence({ workspaceId, ticker: "HAL" });
      expect(view.empty).toBe(false);
      expect(view.bull.length).toBeGreaterThanOrEqual(1);
      expect(view.bear.length).toBeGreaterThanOrEqual(1);
      expect(view.catalysts.length).toBeGreaterThanOrEqual(1);
      expect(view.risks.length).toBeGreaterThanOrEqual(1);
    });

    it("empty evidence uses No Evidence", () => {
      const view = getEvidence({ workspaceId, ticker: "ZZZ" });
      expect(view.empty).toBe(true);
      expect(view.emptyMessage).toBe(KNOWLEDGE_EMPTY.noEvidence);
    });

    it("ingestEvidenceBag maps management financial technical news confidence", () => {
      ingestEvidenceBag({
        workspaceId,
        ticker: "LT",
        management: ["Guidance raised"],
        financial: ["ROE above 15%"],
        technical: ["Above 200 DMA"],
        news: ["Order win"],
        confidence: ["High conviction"],
      });
      const view = getEvidence({ workspaceId, ticker: "LT" });
      expect(view.byKind.management.length).toBeGreaterThanOrEqual(1);
      expect(view.byKind.financial.length).toBeGreaterThanOrEqual(1);
      expect(view.byKind.technical.length).toBeGreaterThanOrEqual(1);
      expect(view.byKind.news.length).toBeGreaterThanOrEqual(1);
      expect(view.byKind.confidence.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("knowledge", () => {
    it("getKnowledge aggregates notes annotations bookmarks evidence memory", () => {
      createNote({
        workspaceId,
        ticker: "INFY",
        title: "Note",
        body: "Body",
      });
      createAnnotation({
        workspaceId,
        ticker: "INFY",
        target: "metric",
        label: "PE",
        excerpt: "PE at 24x",
      });
      bookmarkResearch({
        workspaceId,
        kind: "company",
        label: "INFY",
        target: "INFY",
        ticker: "INFY",
      });
      ingestEvidenceBag({
        workspaceId,
        ticker: "INFY",
        bull: ["Quality compounder"],
      });
      recordConclusion("INFY", "Accumulate on weakness");
      recordMemoryDecision("INFY", "Add 2% position");
      recordObservation("INFY", "AI flagged improving margins");

      const knowledge = getKnowledge({
        workspaceId,
        ticker: "INFY",
        sector: "IT",
        themes: ["AI", "Offshoring"],
      });
      expect(knowledge.empty).toBe(false);
      expect(knowledge.notes.length).toBeGreaterThanOrEqual(1);
      expect(knowledge.annotations.length).toBeGreaterThanOrEqual(1);
      expect(knowledge.bookmarks.length).toBeGreaterThanOrEqual(1);
      expect(knowledge.evidence.bull.length).toBeGreaterThanOrEqual(1);
      expect(knowledge.knowledge.relatedCompanies).toContain("INFY");
      expect(knowledge.knowledge.relatedSectors).toContain("IT");
      expect(knowledge.knowledge.relatedThemes).toContain("AI");
      expect(knowledge.memory.length).toBeGreaterThanOrEqual(3);
      expect(knowledge.surfaceHints.research).toBe("/research");
    });

    it("empty knowledge uses Knowledge Base Empty", () => {
      const fresh = createWorkspace({ name: "Empty Knowledge" }).id;
      const view = getKnowledge({ workspaceId: fresh, ticker: "EMPTY" });
      expect(view.empty).toBe(true);
      expect(view.emptyMessage).toBe(KNOWLEDGE_EMPTY.knowledgeBaseEmpty);
      expect(emptyKnowledgeView().emptyMessage).toBe(
        KNOWLEDGE_EMPTY.knowledgeBaseEmpty
      );
    });

    it("relatedCompanies derives from linked notes not query ticker alone", () => {
      createNote({
        workspaceId,
        ticker: "HDFCBANK",
        title: "Bank thesis",
        body: "Quality franchise",
      });
      const view = getKnowledge({ workspaceId, ticker: "HDFCBANK" });
      expect(view.knowledge.relatedCompanies).toContain("HDFCBANK");
    });
  });

  describe("memory", () => {
    it("tracks conclusions decisions observations timeline", () => {
      recordConclusion("TCS", "Hold");
      recordMemoryDecision("TCS", "Trim on strength");
      recordObservation("TCS", "Valuation stretched");
      expect(getPreviousConclusions("TCS").length).toBe(1);
      expect(getMemoryTimeline({ ticker: "TCS" }).length).toBe(3);
      expect(getAiObservations("TCS").length).toBe(1);
    });

    it("getMemoryTimeline includes decision entries", () => {
      recordMemoryDecision("INFY", "Hold position");
      const decisions = getMemoryTimeline({ ticker: "INFY" }).filter(
        (e) => e.kind === "decision"
      );
      expect(decisions.length).toBe(1);
      expect(decisions[0].detail).toContain("Hold");
    });
  });

  describe("presentation", () => {
    it("normalizeNote never surfaces sentinel strings", () => {
      const note = normalizeNote({
        id: "n1",
        workspaceId,
        title: "null",
        body: "undefined",
      });
      expect(note.title).not.toBe("null");
      expect(note.body).not.toBe("undefined");
    });

    it("KNOWLEDGE_EMPTY copy is institutional", () => {
      expect(KNOWLEDGE_EMPTY.noNotes).toBe("No Notes");
      expect(KNOWLEDGE_EMPTY.noEvidence).toBe("No Evidence");
      expect(KNOWLEDGE_EMPTY.noBookmarks).toBe("No Bookmarks");
      expect(KNOWLEDGE_EMPTY.awaitingResearch).toBe("Awaiting Research");
      expect(KNOWLEDGE_EMPTY.knowledgeBaseEmpty).toBe("Knowledge Base Empty");
    });
  });

  describe("regression", () => {
    it("public APIs never throw on bad input", () => {
      expect(() => createNote({ workspaceId: "", ticker: "X" })).not.toThrow();
      expect(() => updateNote("", {})).not.toThrow();
      expect(() => deleteNote("")).not.toThrow();
      expect(() =>
        createAnnotation({
          workspaceId: "",
          target: "metric",
          label: "x",
          excerpt: "y",
        })
      ).not.toThrow();
      expect(() =>
        bookmarkResearch({
          workspaceId: "",
          kind: "company",
          label: "x",
          target: "y",
        })
      ).not.toThrow();
      expect(() => getKnowledge()).not.toThrow();
      expect(() => getEvidence()).not.toThrow();
    });

    it("does not rebuild R1–R3 — workspace still creatable", () => {
      const ws = createWorkspace({ name: "Still Works" });
      expect(ws.empty).toBe(false);
      createNote({ workspaceId: ws.id, body: "note" });
      expect(listNotes({ workspaceId: ws.id }).length).toBe(1);
    });

    it("resetResearchWorkspace clears knowledge stores", () => {
      createNote({ workspaceId, body: "temp" });
      bookmarkResearch({
        workspaceId,
        kind: "workspace",
        label: "Desk",
        target: workspaceId,
      });
      resetResearchWorkspace();
      expect(listNotes({ workspaceId }).length).toBe(0);
      expect(listBookmarks({ workspaceId }).length).toBe(0);
      expect(getKnowledge({ workspaceId }).empty).toBe(true);
    });
  });
});
