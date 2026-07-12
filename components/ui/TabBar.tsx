"use client";

import { cn } from "@/lib/utils";

export interface TabItem<T extends string> {
  id: T;
  label: string;
}

interface TabBarProps<T extends string> {
  tabs: TabItem<T>[];
  activeTab: T;
  onTabChange: (tab: T) => void;
  size?: "sm" | "md";
  className?: string;
}

const sizeStyles = {
  sm: "px-2.5 py-1 text-[10px]",
  md: "px-3 py-1.5 text-xs",
};

export function TabBar<T extends string>({
  tabs,
  activeTab,
  onTabChange,
  size = "md",
  className,
}: TabBarProps<T>) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg border border-surface-border-subtle bg-surface-overlay/50 p-0.5",
        className
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "rounded-md font-medium transition-all",
            sizeStyles[size],
            activeTab === tab.id
              ? "bg-accent/15 text-accent shadow-glow"
              : "text-text-muted hover:bg-surface-hover hover:text-text-secondary"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
