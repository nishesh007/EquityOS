"use client";

/**
 * Sprint 10C.R5 — premium appearance settings.
 * Accent color, motion, font size and density preferences with live
 * preview (every control applies instantly) and Restore Defaults.
 */

import { useEffect, useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ACCENT_COLORS,
  DEFAULT_THEME_ID,
  FONT_SCALES,
  FONT_SCALE_LABELS,
  GlassBadge,
  InstitutionalCard,
  MOTION_PREFERENCES,
  SectionHeader,
  UI_DENSITIES,
  getAccentColor,
  getFontScale,
  getMotionPreference,
  getUiDensity,
  setAccentColor,
  setFontScale,
  setMotionPreference,
  setTheme,
  setUiDensity,
  useTheme,
  type FontScale,
  type MotionPreference,
  type UiDensity,
} from "@/src/design";

const MOTION_LABELS: Record<MotionPreference, string> = {
  system: "System",
  full: "Full",
  reduced: "Reduced",
};

const DENSITY_LABELS: Record<UiDensity, string> = {
  comfortable: "Comfortable",
  compact: "Compact",
  ultra: "Ultra compact",
};

function OptionButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors duration-200",
        active
          ? "border-accent bg-accent/10 text-accent"
          : "border-surface-border bg-surface-raised text-text-secondary hover:bg-surface-hover hover:text-text-primary"
      )}
    >
      {children}
    </button>
  );
}

export function AppearanceSettings() {
  const { theme } = useTheme();
  // Preferences live in the design-system engines; local state mirrors them
  // for rendering only (hydrated after mount to avoid SSR mismatches).
  const [accentId, setAccentId] = useState<string | null>(null);
  const [motion, setMotion] = useState<MotionPreference>("system");
  const [fontScale, setFontScaleState] = useState<FontScale>("medium");
  const [density, setDensityState] = useState<UiDensity>("comfortable");

  useEffect(() => {
    setAccentId(getAccentColor()?.id ?? null);
    setMotion(getMotionPreference());
    setFontScaleState(getFontScale());
    setDensityState(getUiDensity());
  }, []);

  const restoreDefaults = () => {
    setTheme(DEFAULT_THEME_ID);
    setAccentColor(null);
    setAccentId(null);
    setMotionPreference("system");
    setMotion("system");
    setFontScale("medium");
    setFontScaleState("medium");
    setUiDensity("comfortable");
    setDensityState("comfortable");
  };

  return (
    <section className="mb-8">
      <SectionHeader
        title="Personalization"
        subtitle="Accent, motion, type size and density — changes preview live"
        actions={
          <button
            type="button"
            onClick={restoreDefaults}
            className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restore Defaults
          </button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <InstitutionalCard padding="lg">
          <p className="text-sm font-medium text-text-primary">Accent Color</p>
          <p className="mt-0.5 text-xs text-text-muted">
            Recolors buttons, links, charts, badges, gauges and focus rings
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setAccentColor(null);
                setAccentId(null);
              }}
              aria-pressed={accentId === null}
              className={cn(
                "flex h-9 items-center rounded-lg border px-3 text-xs font-medium transition-colors",
                accentId === null
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-surface-border text-text-secondary hover:bg-surface-hover"
              )}
            >
              Theme default
            </button>
            {ACCENT_COLORS.map((accent) => {
              const active = accentId === accent.id;
              return (
                <button
                  key={accent.id}
                  type="button"
                  onClick={() => {
                    setAccentColor(accent.id);
                    setAccentId(accent.id);
                  }}
                  aria-pressed={active}
                  aria-label={`${accent.label} accent`}
                  title={accent.label}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full border-2 transition-transform hover:scale-105",
                    active ? "border-text-primary" : "border-transparent"
                  )}
                  style={{ backgroundColor: accent.accent }}
                >
                  {active && <Check className="h-4 w-4 text-black/70" />}
                </button>
              );
            })}
          </div>
          <div className="mt-4">
            <GlassBadge>
              Previewing: {theme.label}
              {accentId ? ` · ${accentId} accent` : ""}
            </GlassBadge>
          </div>
        </InstitutionalCard>

        <InstitutionalCard padding="lg">
          <div className="space-y-5">
            <div>
              <p className="text-sm font-medium text-text-primary">Animation</p>
              <p className="mt-0.5 text-xs text-text-muted">
                Reduced disables all motion, matching prefers-reduced-motion
              </p>
              <div className="mt-2.5 flex gap-2" role="radiogroup" aria-label="Motion preference">
                {MOTION_PREFERENCES.map((preference) => (
                  <OptionButton
                    key={preference}
                    active={motion === preference}
                    onClick={() => {
                      setMotionPreference(preference);
                      setMotion(preference);
                    }}
                  >
                    {MOTION_LABELS[preference]}
                  </OptionButton>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-text-primary">Font Size</p>
              <div className="mt-2.5 flex gap-2" role="radiogroup" aria-label="Font size">
                {FONT_SCALES.map((scale) => (
                  <OptionButton
                    key={scale}
                    active={fontScale === scale}
                    onClick={() => {
                      setFontScale(scale);
                      setFontScaleState(scale);
                    }}
                  >
                    {FONT_SCALE_LABELS[scale]}
                  </OptionButton>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-text-primary">Density</p>
              <p className="mt-0.5 text-xs text-text-muted">
                Default data density for tables and dense widgets
              </p>
              <div className="mt-2.5 flex gap-2" role="radiogroup" aria-label="Density">
                {UI_DENSITIES.map((mode) => (
                  <OptionButton
                    key={mode}
                    active={density === mode}
                    onClick={() => {
                      setUiDensity(mode);
                      setDensityState(mode);
                    }}
                  >
                    {DENSITY_LABELS[mode]}
                  </OptionButton>
                ))}
              </div>
            </div>
          </div>
        </InstitutionalCard>
      </div>
    </section>
  );
}
