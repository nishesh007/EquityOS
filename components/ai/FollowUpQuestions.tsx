"use client";

import type { FollowUpBundle } from "@/lib/ai/followUpEngine";
import { cn } from "@/lib/utils";
import { Building2, ChevronRight, Layers, MessageCircleQuestion } from "lucide-react";
import Link from "next/link";

interface FollowUpQuestionsProps {
  bundle: FollowUpBundle;
  onSelectQuestion: (question: string) => void;
  className?: string;
}

export function FollowUpQuestions({
  bundle,
  onSelectQuestion,
  className,
}: FollowUpQuestionsProps) {
  return (
    <div
      className={cn(
        "mt-3 space-y-4 rounded-xl border border-surface-border-subtle bg-surface-overlay/30 p-4",
        className
      )}
    >
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
          <MessageCircleQuestion className="h-3.5 w-3.5 text-accent" />
          Follow-up Questions
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {bundle.questions.map((question) => (
            <button
              key={question.id}
              type="button"
              onClick={() => onSelectQuestion(question.text)}
              className="rounded-full border border-surface-border-subtle bg-surface px-3 py-1.5 text-left text-xs text-text-secondary transition hover:border-accent/30 hover:bg-surface-hover hover:text-text-primary"
            >
              {question.text}
            </button>
          ))}
        </div>
      </div>

      {bundle.relatedCompanies.length > 0 && (
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
            <Building2 className="h-3.5 w-3.5 text-accent" />
            Related Companies
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {bundle.relatedCompanies.map((company) => (
              <Link
                key={company.symbol}
                href={`/company/${company.symbol}`}
                className="rounded-lg border border-surface-border-subtle bg-surface px-3 py-2 transition hover:border-accent/30 hover:bg-surface-hover"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-semibold text-text-primary">
                    {company.symbol}
                  </span>
                  <ChevronRight className="h-3 w-3 text-text-faint" />
                </div>
                <p className="mt-0.5 truncate text-[10px] text-text-muted">{company.name}</p>
                <p className="mt-1 text-[10px] leading-snug text-text-faint">{company.reason}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {bundle.relatedSectors.length > 0 && (
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
            <Layers className="h-3.5 w-3.5 text-accent" />
            Related Sectors
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {bundle.relatedSectors.map((sector) => (
              <div
                key={sector.sector}
                className="rounded-lg border border-surface-border-subtle bg-surface px-3 py-2"
              >
                <p className="text-xs font-semibold text-text-primary">{sector.sector}</p>
                <p className="mt-0.5 text-[10px] text-text-muted">{sector.reason}</p>
                {sector.exampleSymbols.length > 0 && (
                  <p className="mt-1 font-mono text-[10px] text-text-faint">
                    {sector.exampleSymbols.join(" · ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
