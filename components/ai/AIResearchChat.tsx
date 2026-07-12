"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatInput } from "@/components/ai/ChatInput";
import {
  ChatMessage,
  type ChatMessageData,
} from "@/components/ai/ChatMessage";
import { FollowUpQuestions } from "@/components/ai/FollowUpQuestions";
import { TypingIndicator } from "@/components/ai/TypingIndicator";
import { postStream } from "@/lib/ai/core/stream";
import type { ExplainTarget } from "@/lib/ai/explainEngine";
import type { FollowUpBundle } from "@/lib/ai/followUpEngine";
import {
  appendConversationMessages,
  getConversation,
  getOrCreateActiveConversation,
} from "@/lib/ai/conversation";
import { buildAdaptiveSuggestions } from "@/lib/ai/questionGenerator";
import { saveResearchEntry } from "@/lib/ai/researchMemory";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

interface AIResearchChatProps {
  suggestions?: string[];
  symbol?: string | null;
  pageContext?: string | null;
  initialPrompt?: string | null;
  explainTarget?: ExplainTarget | null;
  conversationId?: string | null;
  className?: string;
}

function createMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

async function fetchFollowUpBundle(input: {
  prompt: string;
  answer: string;
  symbol: string | null;
}): Promise<FollowUpBundle | null> {
  try {
    const response = await fetch("/api/ai/workspace/follow-up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!response.ok) return null;
    return (await response.json()) as FollowUpBundle;
  } catch {
    return null;
  }
}

function AIResearchChatComponent({
  suggestions = [],
  symbol = null,
  pageContext = null,
  initialPrompt = null,
  explainTarget = null,
  conversationId = null,
  className,
}: AIResearchChatProps) {
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [followUps, setFollowUps] = useState<Record<string, FollowUpBundle>>({});
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    conversationId
  );
  const scrollAnchorRef = useRef<HTMLDivElement>(null);
  const initialPromptSent = useRef(false);

  useEffect(() => {
    if (!conversationId) return;
    const conversation = getConversation(conversationId);
    if (!conversation) return;
    setActiveConversationId(conversation.id);
    setMessages(
      conversation.messages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
      }))
    );
  }, [conversationId]);

  const adaptiveSuggestions = useMemo(
    () => buildAdaptiveSuggestions({ symbol, pageContext }),
    [symbol, pageContext]
  );

  const mergedSuggestions = useMemo(() => {
    const merged = [...suggestions, ...adaptiveSuggestions];
    const seen = new Set<string>();
    return merged
      .filter((item) => {
        const key = item.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 6);
  }, [suggestions, adaptiveSuggestions]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    scrollAnchorRef.current?.scrollIntoView({ behavior, block: "end" });
  }, []);

  useEffect(() => {
    scrollToBottom(messages.length <= 1 ? "auto" : "smooth");
  }, [messages, isStreaming, followUps, scrollToBottom]);

  const sendMessage = useCallback(
    async (content: string, options?: { explain?: ExplainTarget | null }) => {
      const trimmed = content.trim();
      if (!trimmed || isStreaming) return;

      const conversation =
        getOrCreateActiveConversation({
          conversationId: activeConversationId ?? undefined,
          symbol,
          pageContext,
        }) ?? null;

      if (conversation) {
        setActiveConversationId(conversation.id);
      }

      const userMessage: ChatMessageData = {
        id: createMessageId(),
        role: "user",
        content: trimmed,
      };
      const assistantId = createMessageId();

      setMessages((current) => [...current, userMessage]);
      setInput("");
      setIsStreaming(true);

      let assistantContent = "";
      let assistantMessageAdded = false;
      const explain = options?.explain ?? null;

      try {
        const streamUrl = explain ? "/api/ai/workspace/explain" : "/api/ai/chat";
        const streamBody = explain
          ? { target: explain }
          : { prompt: trimmed, symbol, conversationId: conversation?.id };

        await postStream(
          streamUrl,
          streamBody,
          (chunk) => {
            assistantContent += chunk;
            if (!assistantMessageAdded) {
              assistantMessageAdded = true;
              setMessages((current) => [
                ...current,
                { id: assistantId, role: "assistant", content: assistantContent },
              ]);
              return;
            }
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantId
                  ? { ...message, content: assistantContent }
                  : message
              )
            );
          },
          { retries: 1, retryDelayMs: 700 }
        );

        if (!assistantMessageAdded) {
          setMessages((current) => [
            ...current,
            {
              id: assistantId,
              role: "assistant",
              content: "No response was returned. Please try again.",
            },
          ]);
        } else if (assistantContent.trim()) {
          if (conversation) {
            appendConversationMessages(conversation.id, [
              { role: "user", content: trimmed },
              { role: "assistant", content: assistantContent },
            ]);
          }

          saveResearchEntry({
            prompt: trimmed,
            answer: assistantContent,
            symbol,
            pageContext,
          });

          const bundle = await fetchFollowUpBundle({
            prompt: trimmed,
            answer: assistantContent,
            symbol,
          });
          if (bundle) {
            setFollowUps((current) => ({ ...current, [assistantId]: bundle }));
          }
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to generate research response.";

        if (assistantMessageAdded) {
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantId
                ? {
                    ...message,
                    content: `${assistantContent}\n\n**Error:** ${errorMessage}`,
                  }
                : message
            )
          );
        } else {
          setMessages((current) => [
            ...current,
            {
              id: assistantId,
              role: "assistant",
              content: `**Error:** ${errorMessage}`,
            },
          ]);
        }
      } finally {
        setIsStreaming(false);
      }
    },
    [isStreaming, symbol, pageContext, activeConversationId]
  );

  useEffect(() => {
    if (!initialPrompt || initialPromptSent.current) return;
    initialPromptSent.current = true;
    void sendMessage(initialPrompt, { explain: explainTarget });
  }, [initialPrompt, explainTarget, sendMessage]);

  const showEmptyState = messages.length === 0 && !isStreaming;

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div className="flex-1 overflow-y-auto px-3 py-4 md:px-6 md:py-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-6">
          {showEmptyState && (
            <div className="flex flex-col items-center justify-center py-8 text-center md:py-16">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 ring-1 ring-accent/20">
                <Sparkles className="h-6 w-6 text-accent" />
              </div>
              <h2 className="text-lg font-semibold text-text-primary">
                What would you like to research?
              </h2>
              <p className="mt-2 max-w-md text-sm text-text-muted">
                Ask about any listed company, sector screen, or investment thesis.
                EquityOS AI returns structured institutional briefs with intelligent follow-ups.
              </p>

              {mergedSuggestions.length > 0 && (
                <div className="mt-8 grid w-full gap-3 sm:grid-cols-2">
                  {mergedSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => sendMessage(suggestion)}
                      disabled={isStreaming}
                      className="glass-card p-4 text-left text-sm text-text-secondary transition hover:border-accent/30 hover:bg-surface-hover/60 hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id}>
              <ChatMessage message={message} />
              {message.role === "assistant" && followUps[message.id] && (
                <FollowUpQuestions
                  bundle={followUps[message.id]}
                  onSelectQuestion={(question) => sendMessage(question)}
                />
              )}
            </div>
          ))}

          {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
            <TypingIndicator />
          )}

          <div ref={scrollAnchorRef} aria-hidden className="h-px shrink-0" />
        </div>
      </div>

      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={sendMessage}
        disabled={isStreaming}
      />
    </div>
  );
}

export const AIResearchChat = memo(AIResearchChatComponent);
