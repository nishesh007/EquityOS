"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import {
  getTranscriptDrawerSection,
  transcriptBadgeVariant,
  TRANSCRIPT_EMPTY,
  type TranscriptDrawerSectionView,
} from "@/src/core/earnings/transcripts";

interface TranscriptIntelligenceSectionProps {
  ticker: string;
  resultDate: string;
}

function SubSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-medium uppercase tracking-wider text-text-faint">
        {title}
      </p>
      <div className="text-xs text-text-secondary">{children}</div>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return (
      <p className="text-xs text-text-muted">{TRANSCRIPT_EMPTY.commentaryPending}</p>
    );
  }
  return (
    <ul className="list-disc space-y-1 pl-4">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function TranscriptIntelligenceSection({
  ticker,
  resultDate,
}: TranscriptIntelligenceSectionProps) {
  const [section, setSection] = useState<TranscriptDrawerSectionView | null>(
    null
  );

  useEffect(() => {
    // Lazy-load transcript analysis when the drawer section mounts.
    setSection(getTranscriptDrawerSection(ticker, resultDate));
  }, [ticker, resultDate]);

  if (!section) {
    return (
      <section className="space-y-1.5">
        <p className="text-[10px] font-medium uppercase tracking-wider text-text-faint">
          Transcript Intelligence
        </p>
        <p className="text-xs text-text-muted">{TRANSCRIPT_EMPTY.transcriptAwaited}</p>
      </section>
    );
  }

  const research = section.research;

  return (
    <section className="space-y-3 rounded-lg border border-surface-border-subtle bg-surface/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-medium uppercase tracking-wider text-text-faint">
          {section.title}
        </p>
        <div className="flex flex-wrap gap-1">
          {research.badges.map((badge) => (
            <Badge key={badge} variant={transcriptBadgeVariant(badge)} size="sm">
              {badge}
            </Badge>
          ))}
        </div>
      </div>

      {!research.available ? (
        <p className="text-xs text-text-muted">{research.emptyMessage}</p>
      ) : (
        <div className="space-y-3">
          <SubSection title="Executive Summary">
            {research.summary.executiveSummary}
          </SubSection>
          <SubSection title="Management Commentary">
            {research.summary.operationalCommentary}
          </SubSection>
          <SubSection title="Positive Signals">
            <BulletList items={research.positiveSignals} />
          </SubSection>
          <SubSection title="Negative Signals">
            <BulletList items={research.negativeSignals} />
          </SubSection>
          <SubSection title="Guidance Changes">
            {research.guidance.available ? (
              <ul className="space-y-1">
                {research.guidance.items.map((item) => (
                  <li key={item.topic}>
                    {item.topic}: {item.direction} · {item.current}
                  </li>
                ))}
              </ul>
            ) : (
              <p>{research.guidance.emptyMessage}</p>
            )}
          </SubSection>
          <SubSection title="Risk Factors">
            {research.risks.available ? (
              <ul className="space-y-1">
                {research.risks.risks.map((risk) => (
                  <li key={`${risk.category}-${risk.detail}`}>
                    {risk.category}: {risk.detail}
                  </li>
                ))}
              </ul>
            ) : (
              <p>{research.risks.emptyMessage}</p>
            )}
          </SubSection>
          <SubSection title="Catalysts">
            {research.catalysts.available ? (
              <ul className="space-y-1">
                {research.catalysts.catalysts.map((c) => (
                  <li key={`${c.category}-${c.detail}`}>
                    {c.category}: {c.detail}
                  </li>
                ))}
              </ul>
            ) : (
              <p>{research.catalysts.emptyMessage}</p>
            )}
          </SubSection>
          <SubSection title="Analyst Q&A">
            {research.questions.available ? (
              <div className="space-y-2">
                <BulletList items={research.questions.topAnalystQuestions} />
                <p className="text-[10px] text-text-faint">Areas of concern</p>
                <BulletList items={research.questions.areasOfConcern} />
              </div>
            ) : (
              <p>{research.questions.emptyMessage}</p>
            )}
          </SubSection>
          <SubSection title="AI Verdict">{research.aiVerdict}</SubSection>
          <SubSection title="Confidence">{research.confidence}</SubSection>
        </div>
      )}
    </section>
  );
}
