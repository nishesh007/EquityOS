"use client";

import { useState } from "react";
import { AIResearchChat } from "@/components/ai/AIResearchChat";
import { ResearchHistory } from "@/components/ai/ResearchHistory";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import type { Conversation } from "@/lib/ai/conversation";

interface ResearchWorkspaceProps {
  suggestions: string[];
}

export function ResearchWorkspace({ suggestions }: ResearchWorkspaceProps) {
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(
    null
  );

  return (
    <div className="flex min-h-0 flex-1">
      <div className="hidden w-80 flex-shrink-0 border-r border-surface-border-subtle xl:block">
        <ResearchHistory
          onSelectConversation={setActiveConversation}
          className="h-full"
        />
      </div>
      <ErrorBoundary title="AI Research chat failed">
        <AIResearchChat
          key={activeConversation?.id ?? "new"}
          suggestions={suggestions}
          symbol={activeConversation?.symbol ?? null}
          conversationId={activeConversation?.id ?? null}
          pageContext="research"
          className="min-h-0 flex-1"
        />
      </ErrorBoundary>
    </div>
  );
}
