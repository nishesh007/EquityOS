/**
 * Follow-up engine — generates intelligent follow-ups after every AI answer.
 */

import {
  loadCompanyContext,
  resolveSymbolsFromPrompt,
} from "@/lib/ai/context/companyContext";
import type { CompanyContext } from "@/lib/ai/context/companyContext";
import { buildFollowUpQuestions } from "@/lib/ai/questionGenerator";
import { getCompanyMasterRecords } from "@/lib/company-master";

export interface RelatedCompany {
  symbol: string;
  name: string;
  sector: string;
  reason: string;
}

export interface RelatedSector {
  sector: string;
  reason: string;
  exampleSymbols: string[];
}

export interface FollowUpBundle {
  questions: Array<{ id: string; text: string; category: string }>;
  relatedCompanies: RelatedCompany[];
  relatedSectors: RelatedSector[];
  resolvedSymbol: string | null;
  generatedAt: string;
}

function buildRelatedCompanies(
  context: CompanyContext | null,
  symbol: string | null
): RelatedCompany[] {
  const related: RelatedCompany[] = [];
  const seen = new Set<string>();

  if (context) {
    for (const peer of context.peerComparison) {
      if (peer.symbol === context.profile.symbol) continue;
      if (seen.has(peer.symbol)) continue;
      seen.add(peer.symbol);
      related.push({
        symbol: peer.symbol,
        name: peer.name,
        sector: context.profile.sector,
        reason: `Peer comparison — P/E ${peer.pe}x, ROE ${peer.roe ?? "—"}%`,
      });
    }
  }

  if (related.length < 3 && symbol) {
    const master = getCompanyMasterRecords();
    const current = master.find((item) => item.displaySymbol === symbol);
    if (current) {
      for (const candidate of master) {
        if (candidate.displaySymbol === symbol) continue;
        if (seen.has(candidate.displaySymbol)) continue;
        if (candidate.sector !== current.sector) continue;
        seen.add(candidate.displaySymbol);
        related.push({
          symbol: candidate.displaySymbol,
          name: candidate.name,
          sector: candidate.sector,
          reason: `Same sector (${current.sector}) peer`,
        });
        if (related.length >= 3) break;
      }
    }
  }

  return related.slice(0, 3);
}

function buildRelatedSectors(
  context: CompanyContext | null,
  symbol: string | null
): RelatedSector[] {
  const sectors: RelatedSector[] = [];
  const seen = new Set<string>();
  const master = getCompanyMasterRecords();

  const addSector = (sector: string, reason: string) => {
    if (!sector || seen.has(sector)) return;
    seen.add(sector);
    const examples = master
      .filter((item) => item.sector === sector)
      .slice(0, 3)
      .map((item) => item.displaySymbol);
    sectors.push({ sector, reason, exampleSymbols: examples });
  };

  if (context) {
    addSector(context.profile.sector, `Primary sector for ${context.profile.symbol}`);

    for (const peer of context.peerComparison.slice(0, 4)) {
      const peerRecord = master.find((item) => item.displaySymbol === peer.symbol);
      if (peerRecord) {
        addSector(peerRecord.sector, `Peer ecosystem around ${context.profile.symbol}`);
      }
    }
  }

  if (symbol && sectors.length < 3) {
    const current = master.find((item) => item.displaySymbol === symbol);
    if (current) {
      const adjacent = master
        .filter((item) => item.sector !== current.sector)
        .slice(0, 6);
      for (const item of adjacent) {
        addSector(item.sector, `Adjacent sector for diversified research`);
        if (sectors.length >= 3) break;
      }
    }
  }

  return sectors.slice(0, 3);
}

export async function buildFollowUpBundle(input: {
  prompt: string;
  answer: string;
  symbol?: string | null;
}): Promise<FollowUpBundle> {
  const resolved =
    input.symbol ??
    resolveSymbolsFromPrompt(input.prompt, null)[0] ??
    null;

  const context = resolved ? await loadCompanyContext(resolved) : null;
  const questions = buildFollowUpQuestions({
    prompt: input.prompt,
    answer: input.answer,
    symbol: resolved,
    context,
  });

  return {
    questions: questions.map((q) => ({
      id: q.id,
      text: q.text,
      category: q.category,
    })),
    relatedCompanies: buildRelatedCompanies(context, resolved),
    relatedSectors: buildRelatedSectors(context, resolved),
    resolvedSymbol: resolved,
    generatedAt: new Date().toISOString(),
  };
}
