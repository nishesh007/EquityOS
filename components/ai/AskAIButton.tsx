"use client";

import { useCallback, useEffect, useMemo, useState, createContext, useContext } from "react";
import { usePathname } from "next/navigation";
import { AIResearchChat } from "@/components/ai/AIResearchChat";
import { ResearchHistory } from "@/components/ai/ResearchHistory";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import type { Conversation } from "@/lib/ai/conversation";
import type { ExplainTarget } from "@/lib/ai/explainEngine";
import { buildExplainSeedPrompt } from "@/lib/ai/explainEngine";
import { cn } from "@/lib/utils";
import { Bot, History, Sparkles, X } from "lucide-react";

export interface AIWorkspaceRequest {
  prompt?: string;
  symbol?: string | null;
  explainTarget?: ExplainTarget;
  pageContext?: string | null;
}

interface AIWorkspaceContextValue {
  openWorkspace: (request?: AIWorkspaceRequest) => void;
  closeWorkspace: () => void;
  isOpen: boolean;
  resolvedSymbol: string | null;
  pageContext: string | null;
}

const AIWorkspaceContext = createContext<AIWorkspaceContextValue | null>(null);

export function useAIWorkspace(): AIWorkspaceContextValue {
  const context = useContext(AIWorkspaceContext);
  if (!context) {
    throw new Error("useAIWorkspace must be used within AIWorkspaceProvider");
  }
  return context;
}

function derivePageContext(pathname: string): string | null {
  if (pathname.startsWith("/company/")) return "company";
  if (pathname.startsWith("/screener")) return "screener";
  if (pathname.startsWith("/portfolio")) return "portfolio";
  if (pathname.startsWith("/watchlist")) return "watchlist";
  if (pathname.startsWith("/markets")) return "markets";
  if (pathname.startsWith("/ai/compare")) return "compare";
  if (pathname.startsWith("/ai/research")) return "research";
  return null;
}

function deriveSymbolFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/company\/([^/]+)/i);
  return match ? match[1].toUpperCase() : null;
}

interface AIWorkspaceProviderProps {
  children: React.ReactNode;
}

export function AIWorkspaceProvider({ children }: AIWorkspaceProviderProps) {
  const pathname = usePathname();
  const routeSymbol = useMemo(() => deriveSymbolFromPath(pathname), [pathname]);
  const routePageContext = useMemo(() => derivePageContext(pathname), [pathname]);

  const [isOpen, setIsOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [request, setRequest] = useState<AIWorkspaceRequest>({});
  const [seedPrompt, setSeedPrompt] = useState<string | null>(null);
  const [seedKey, setSeedKey] = useState(0);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const resolvedSymbol = request.symbol ?? routeSymbol;
  const pageContext = request.pageContext ?? routePageContext;

  const openWorkspace = useCallback((next?: AIWorkspaceRequest) => {
    const merged = next ?? {};
    setRequest(merged);

    if (merged.explainTarget) {
      setSeedPrompt(buildExplainSeedPrompt(merged.explainTarget));
    } else if (merged.prompt) {
      setSeedPrompt(merged.prompt);
    } else if (merged.symbol ?? routeSymbol) {
      setSeedPrompt(`Analyse ${merged.symbol ?? routeSymbol}`);
    } else {
      setSeedPrompt(null);
    }

    setActiveConversationId(null);
    setSeedKey((value) => value + 1);
    setIsOpen(true);
  }, [routeSymbol]);

  const closeWorkspace = useCallback(() => {
    setIsOpen(false);
    setShowHistory(false);
    setRequest({});
    setSeedPrompt(null);
    setActiveConversationId(null);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) closeWorkspace();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, closeWorkspace]);

  const contextValue = useMemo(
    () => ({
      openWorkspace,
      closeWorkspace,
      isOpen,
      resolvedSymbol,
      pageContext,
    }),
    [openWorkspace, closeWorkspace, isOpen, resolvedSymbol, pageContext]
  );

  return (
    <AIWorkspaceContext.Provider value={contextValue}>
      {children}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/50 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Close AI workspace"
            className="absolute inset-0"
            onClick={closeWorkspace}
          />

          <div className="relative flex h-full w-full max-w-3xl flex-col border-l border-surface-border-subtle bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-surface-border-subtle px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                  <Sparkles className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">AI Workspace</p>
                  <p className="text-[10px] text-text-muted">
                    {resolvedSymbol
                      ? `Context: ${resolvedSymbol}${pageContext ? ` · ${pageContext}` : ""}`
                      : "Institutional research assistant"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowHistory((value) => !value)}
                  className={cn(
                    "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition",
                    showHistory
                      ? "border-accent/30 bg-accent/10 text-accent"
                      : "border-surface-border-subtle text-text-muted hover:bg-surface-hover"
                  )}
                >
                  <History className="mr-1 inline h-3.5 w-3.5" />
                  History
                </button>
                <button
                  type="button"
                  onClick={closeWorkspace}
                  className="rounded-lg border border-surface-border-subtle p-2 text-text-muted transition hover:bg-surface-hover"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex min-h-0 flex-1">
              {showHistory && (
                <div className="w-72 flex-shrink-0 border-r border-surface-border-subtle">
                  <ResearchHistory
                    onSelectConversation={(conversation: Conversation) => {
                      setActiveConversationId(conversation.id);
                      setRequest({
                        symbol: conversation.symbol,
                        pageContext: conversation.pageContext,
                      });
                      setSeedPrompt(null);
                      setSeedKey((value) => value + 1);
                      setShowHistory(false);
                    }}
                    className="h-full"
                  />
                </div>
              )}

              <ErrorBoundary title="AI workspace chat failed">
                <AIResearchChat
                  key={seedKey}
                  symbol={resolvedSymbol}
                  pageContext={pageContext}
                  initialPrompt={seedPrompt}
                  explainTarget={request.explainTarget ?? null}
                  conversationId={activeConversationId}
                  className="min-h-0 flex-1"
                />
              </ErrorBoundary>
            </div>
          </div>
        </div>
      )}
    </AIWorkspaceContext.Provider>
  );
}

interface AskAIButtonProps {
  symbol?: string | null;
  prompt?: string;
  explainTarget?: ExplainTarget;
  pageContext?: string | null;
  label?: string;
  variant?: "button" | "icon" | "chip";
  className?: string;
}

export function AskAIButton({
  symbol = null,
  prompt,
  explainTarget,
  pageContext = null,
  label = "Ask AI",
  variant = "button",
  className,
}: AskAIButtonProps) {
  const { openWorkspace } = useAIWorkspace();

  const handleClick = () => {
    openWorkspace({
      symbol,
      prompt,
      explainTarget,
      pageContext,
    });
  };

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={label}
        className={cn(
          "rounded-lg border border-surface-border-subtle p-2 text-text-muted transition hover:border-accent/30 hover:bg-accent/10 hover:text-accent",
          className
        )}
      >
        <Bot className="h-4 w-4" />
      </button>
    );
  }

  if (variant === "chip") {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "rounded-full border border-surface-border-subtle px-2.5 py-1 text-[10px] font-medium text-text-muted transition hover:border-accent/30 hover:text-accent",
          className
        )}
      >
        Explain
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border border-surface-border-subtle bg-surface-overlay/50 px-3 py-2 text-xs font-medium text-text-secondary transition hover:border-accent/30 hover:bg-accent/10 hover:text-accent",
        className
      )}
    >
      <Bot className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
