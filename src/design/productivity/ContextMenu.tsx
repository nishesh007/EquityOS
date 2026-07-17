"use client";

/**
 * Sprint 10C.R7 — right-click context menu.
 *
 * Wrap any surface (widget, table, card) to attach a professional
 * context menu. Keyboard accessible: arrows navigate, Enter selects,
 * Escape closes.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { GLASS_CLASSES } from "../glass/glassTokens";

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  danger?: boolean;
  onSelect: () => void;
}

export interface ContextMenuProps {
  items: readonly ContextMenuItem[];
  children: React.ReactNode;
  className?: string;
}

export function ContextMenu({ items, children, className }: ContextMenuProps) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setPosition(null), []);

  useEffect(() => {
    if (!position) return;
    const onPointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        close();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((index) => Math.min(index + 1, items.length - 1));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((index) => Math.max(index - 1, 0));
      } else if (event.key === "Enter") {
        event.preventDefault();
        items[activeIndex]?.onSelect();
        close();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [position, items, activeIndex, close]);

  return (
    <div
      className={cn("relative", className)}
      onContextMenu={(event) => {
        if (items.length === 0) return;
        event.preventDefault();
        const rect = event.currentTarget.getBoundingClientRect();
        setActiveIndex(0);
        setPosition({
          x: Math.min(event.clientX - rect.left, rect.width - 200),
          y: event.clientY - rect.top,
        });
      }}
    >
      {children}
      {position && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Context menu"
          style={{ left: Math.max(0, position.x), top: position.y }}
          className={cn(
            GLASS_CLASSES.dropdown,
            "absolute z-40 min-w-[190px] p-1.5 animate-scale-in origin-top-left"
          )}
        >
          {items.map((item, index) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => {
                item.onSelect();
                close();
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors",
                index === activeIndex ? "bg-surface-hover" : "",
                item.danger
                  ? "text-loss"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
