"use client";

/**
 * Sprint 10C.R7 — terminal experience host.
 *
 * Single mount point (in AppShell) for the command palette, notification
 * center, help center, onboarding tour and floating action menu, plus
 * the global keyboard shortcut handler.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CommandPalette } from "./CommandPalette";
import { GLOBAL_SHORTCUTS, matchGlobalShortcut } from "./globalShortcuts";
import {
  emitUiEvent,
  openCommandPalette,
  showShortcutHelp,
} from "./uiBus";
import { NotificationCenter } from "../productivity/NotificationCenter";
import {
  listNotifications,
  pushNotification,
} from "../productivity/notificationEngine";
import { FloatingActionMenu } from "../productivity/FloatingActionMenu";
import { HelpCenter } from "../help/HelpCenter";
import { OnboardingTour } from "../help/OnboardingTour";

function isEditable(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element) return false;
  return (
    /^(input|textarea|select)$/i.test(element.tagName) ||
    element.isContentEditable
  );
}

export function TerminalExperience() {
  const router = useRouter();

  // Global keyboard shortcuts.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const shortcut = matchGlobalShortcut(event);
      if (!shortcut) return;
      // Plain-key shortcuts must not fire while typing.
      if ((shortcut === "shortcut-help" || shortcut === "close-dialog") && isEditable(event.target)) {
        return;
      }
      if (shortcut === "close-dialog") return; // dialogs handle Escape themselves
      if (shortcut === "toggle-sidebar") return; // handled by AppShell

      event.preventDefault();
      if (shortcut === "command-palette") {
        openCommandPalette();
        return;
      }
      if (shortcut === "shortcut-help") {
        showShortcutHelp();
        return;
      }
      const target = GLOBAL_SHORTCUTS.find((s) => s.id === shortcut)?.href;
      if (target) router.push(target);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  // Palette quick actions that need navigation-level handling.
  useEffect(() => {
    const handlers = [
      ["create-workspace", () => router.push("/")],
      ["export-report", () => router.push("/validation")],
      ["create-research-note", () => router.push("/research")],
      ["refresh-market-data", () => router.refresh()],
    ] as const;
    const offs = handlers.map(([name, handler]) => {
      const listener = () => handler();
      window.addEventListener(`equityos:${name}`, listener);
      return () => window.removeEventListener(`equityos:${name}`, listener);
    });
    return () => offs.forEach((off) => off());
  }, [router]);

  // Seed a one-time welcome notification so the inbox demonstrates itself.
  useEffect(() => {
    if (listNotifications().length === 0) {
      pushNotification({
        id: "ntf-welcome",
        category: "system",
        title: "Welcome to the EquityOS terminal",
        body: "Press Ctrl+K for the command palette, ? for shortcuts, and customize your dashboard from the workspace toolbar.",
      });
    }
  }, []);

  return (
    <>
      <CommandPalette />
      <NotificationCenter />
      <HelpCenter />
      <OnboardingTour />
      <FloatingActionMenu />
    </>
  );
}

export { emitUiEvent };
