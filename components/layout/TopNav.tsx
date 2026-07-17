"use client";

import { AskAIButton } from "@/components/ai/AskAIButton";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { showNotificationCenter } from "@/src/design/command/uiBus";
import {
  subscribeNotifications,
  unreadCount,
} from "@/src/design/productivity/notificationEngine";
import { Bell, User } from "lucide-react";
import { useEffect, useState } from "react";

interface TopNavProps {
  sidebarWidth?: string;
}

export function TopNav({ sidebarWidth = "240px" }: TopNavProps) {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    setUnread(unreadCount());
    return subscribeNotifications(() => setUnread(unreadCount()));
  }, []);

  return (
    <header
      className="fixed right-0 top-0 z-30 flex h-14 items-center justify-between border-b border-surface-border-subtle bg-surface/80 px-6 backdrop-blur-xl transition-[left] duration-300"
      style={{ left: sidebarWidth }}
    >
      <div className="flex flex-1 items-center gap-4 max-w-xl">
        <GlobalSearch />
      </div>

      <div className="flex items-center gap-3">
        <AskAIButton variant="button" label="Ask AI" className="hidden md:inline-flex" />
        <AskAIButton variant="icon" label="Ask AI" className="md:hidden" />
        <div className="hidden items-center gap-2 rounded-lg border border-surface-border bg-surface-overlay px-3 py-1.5 md:flex">
          <span className="h-2 w-2 rounded-full bg-gain animate-pulse-slow" />
          <span className="text-xs font-medium text-text-secondary">
            Markets Open
          </span>
          <span className="text-xs text-text-muted">NSE · BSE</span>
        </div>

        <button
          onClick={() => showNotificationCenter()}
          aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
          className="relative rounded-lg p-2 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-secondary"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-accent" />
          )}
        </button>

        <button className="flex items-center gap-2 rounded-lg border border-surface-border bg-surface-overlay px-2 py-1.5 transition-colors hover:bg-surface-hover">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent/20">
            <User className="h-3.5 w-3.5 text-accent" />
          </div>
          <span className="hidden text-xs font-medium text-text-secondary sm:block">
            Trader
          </span>
        </button>
      </div>
    </header>
  );
}
