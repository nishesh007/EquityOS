"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  deleteConversation,
  listConversations,
  renameConversation,
  toggleConversationFavorite,
  type Conversation,
} from "@/lib/ai/conversation";
import { cn } from "@/lib/utils";
import { Search, Star, Trash2 } from "lucide-react";

interface ResearchHistoryProps {
  onSelectConversation?: (conversation: Conversation) => void;
  className?: string;
}

type HistoryFilter = "recent" | "favorites";

export function ResearchHistory({
  onSelectConversation,
  className,
}: ResearchHistoryProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<HistoryFilter>("recent");
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const refresh = useCallback(() => {
    setConversations(
      listConversations({
        query,
        favoritesOnly: filter === "favorites",
        limit: 50,
      })
    );
  }, [query, filter]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const tags = useMemo(() => {
    const set = new Set<string>();
    for (const conversation of conversations) {
      for (const tag of conversation.tags) set.add(tag);
    }
    return [...set].slice(0, 12);
  }, [conversations]);

  const handleRename = (conversation: Conversation) => {
    const next = window.prompt("Rename conversation", conversation.title);
    if (next === null) return;
    renameConversation(conversation.id, next);
    refresh();
  };

  const handleDelete = (id: string) => {
    deleteConversation(id);
    refresh();
  };

  const handleFavorite = (id: string) => {
    toggleConversationFavorite(id);
    refresh();
  };

  return (
    <div className={cn("flex h-full flex-col", className)}>
      <div className="border-b border-surface-border-subtle p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          Conversations
        </p>
        <div className="relative mt-2">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-text-faint" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search conversations…"
            className="w-full rounded-lg border border-surface-border-subtle bg-surface-overlay/40 py-2 pl-8 pr-3 text-xs text-text-primary outline-none focus:border-accent/40"
          />
        </div>

        <div className="mt-2 flex gap-1">
          {(["recent", "favorites"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={cn(
                "rounded-md px-2 py-1 text-[10px] font-medium capitalize transition",
                filter === item
                  ? "bg-accent/15 text-accent"
                  : "text-text-muted hover:bg-surface-hover"
              )}
            >
              {item}
            </button>
          ))}
        </div>

        {tags.length > 0 && (
          <p className="mt-2 text-[10px] text-text-faint">
            Tags: {tags.join(" · ")}
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {conversations.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-text-muted">
            No conversations yet. Start researching to build your workspace history.
          </p>
        ) : (
          <div className="space-y-2">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className="rounded-lg border border-surface-border-subtle bg-surface-overlay/20 p-3"
              >
                <button
                  type="button"
                  onClick={() => onSelectConversation?.(conversation)}
                  className="w-full text-left"
                >
                  <p className="line-clamp-2 text-xs font-medium text-text-primary">
                    {conversation.title}
                  </p>
                  <p className="mt-1 text-[10px] text-text-muted">
                    {conversation.symbol ? `${conversation.symbol} · ` : ""}
                    {conversation.messages.length} messages ·{" "}
                    {new Date(conversation.updatedAt).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </button>

                <div className="mt-2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleFavorite(conversation.id)}
                    className={cn(
                      "rounded-md p-1.5 transition hover:bg-surface-hover",
                      conversation.favorite ? "text-accent" : "text-text-faint"
                    )}
                    aria-label="Toggle favorite"
                  >
                    <Star
                      className="h-3.5 w-3.5"
                      fill={conversation.favorite ? "currentColor" : "none"}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRename(conversation)}
                    className="rounded-md px-2 py-1 text-[10px] text-text-faint transition hover:bg-surface-hover hover:text-text-muted"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(conversation.id)}
                    className="rounded-md p-1.5 text-text-faint transition hover:bg-surface-hover hover:text-loss"
                    aria-label="Delete conversation"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
