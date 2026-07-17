"use client";

import { useTheme, InstitutionalCard, SectionHeader, StatusBadge } from "@/src/design";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

/** Theme picker for Settings — switches the global ThemeEngine theme. */
export function ThemeSelector() {
  const { theme, themes, setTheme } = useTheme();

  return (
    <section className="mb-8">
      <SectionHeader
        title="Appearance"
        subtitle="Terminal theme — applies instantly across every page"
        actions={<StatusBadge tone="accent">{theme.label}</StatusBadge>}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 3xl:grid-cols-5">
        {themes.map((option) => {
          const active = option.id === theme.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setTheme(option.id)}
              aria-pressed={active}
              className={cn(
                "rounded-xl border p-4 text-left transition-colors duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
                active
                  ? "border-accent bg-surface-hover shadow-glow"
                  : "border-surface-border-subtle bg-surface-raised hover:border-surface-border hover:bg-surface-hover",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-text-primary">
                  {option.label}
                </span>
                {active && <Check className="h-4 w-4 text-accent" />}
              </div>
              <p className="mt-0.5 text-xs capitalize text-text-muted">
                {option.mode} mode
              </p>
              <div className="mt-3 flex gap-1.5">
                {[
                  option.colors.background,
                  option.colors.card,
                  option.colors.accent,
                  option.colors.success,
                  option.colors.danger,
                ].map((swatch, index) => (
                  <span
                    key={index}
                    className="h-5 w-5 rounded-full border border-surface-border"
                    style={{ backgroundColor: swatch }}
                  />
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
