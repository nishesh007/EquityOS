"use client";

import { cn } from "@/lib/utils";
import {
  REPLAY_SPEEDS,
  type ReplaySpeed,
} from "@/lib/backtesting/replay";
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";

interface ReplayControlsProps {
  playing: boolean;
  speed: ReplaySpeed;
  onPlay: () => void;
  onPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onRestart: () => void;
  onSpeedChange: (speed: ReplaySpeed) => void;
  onJumpToDate: (isoDate: string) => void;
  disabled?: boolean;
  asOf?: string | null;
}

export function ReplayControls({
  playing,
  speed,
  onPlay,
  onPause,
  onPrevious,
  onNext,
  onRestart,
  onSpeedChange,
  onJumpToDate,
  disabled,
  asOf,
}: ReplayControlsProps) {
  const dateValue = asOf ? asOf.slice(0, 10) : "";

  return (
    <section
      className="flex flex-col gap-3 rounded-xl border border-surface-border-subtle bg-surface-overlay/30 p-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between contrast-more:border-2"
      data-testid="replay-controls"
      role="toolbar"
      aria-label="Replay playback controls"
    >
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Playback">
        <ControlButton
          label="Previous candle"
          onClick={onPrevious}
          disabled={disabled}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </ControlButton>
        {playing ? (
          <ControlButton label="Pause" onClick={onPause} disabled={disabled} primary>
            <Pause className="h-4 w-4" aria-hidden />
            <span className="text-xs font-semibold">Pause</span>
          </ControlButton>
        ) : (
          <ControlButton label="Play" onClick={onPlay} disabled={disabled} primary>
            <Play className="h-4 w-4" aria-hidden />
            <span className="text-xs font-semibold">Play</span>
          </ControlButton>
        )}
        <ControlButton label="Next candle" onClick={onNext} disabled={disabled}>
          <ChevronRight className="h-4 w-4" aria-hidden />
        </ControlButton>
        <ControlButton label="Restart" onClick={onRestart} disabled={disabled}>
          <RotateCcw className="h-4 w-4" aria-hidden />
          <span className="text-xs font-semibold">Restart</span>
        </ControlButton>
      </div>

      <div
        className="flex flex-wrap items-center gap-2"
        role="group"
        aria-label="Playback speed"
      >
        <span className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">
          Speed
        </span>
        {REPLAY_SPEEDS.map((value) => (
          <button
            key={value}
            type="button"
            disabled={disabled}
            aria-pressed={speed === value}
            onClick={() => onSpeedChange(value)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:opacity-40",
              speed === value
                ? "border-accent/40 bg-accent/15 text-accent"
                : "border-surface-border-subtle text-text-secondary hover:bg-surface-hover"
            )}
          >
            {value}x
          </button>
        ))}
      </div>

      <label className="flex items-center gap-2 text-[11px] text-text-secondary">
        Jump to date
        <input
          type="date"
          value={dateValue}
          disabled={disabled}
          aria-label="Jump replay to date"
          onChange={(e) => {
            if (e.target.value) onJumpToDate(e.target.value);
          }}
          className="rounded-lg border border-surface-border-subtle bg-surface-overlay/50 px-2 py-1.5 text-xs text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:opacity-40"
        />
      </label>
    </section>
  );
}

function ControlButton({
  children,
  onClick,
  disabled,
  label,
  primary,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label: string;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:opacity-40",
        primary
          ? "border-accent/40 bg-accent/15 text-accent hover:bg-accent/25"
          : "border-surface-border-subtle bg-surface-overlay/40 text-text-secondary hover:bg-surface-hover hover:text-text-primary"
      )}
    >
      {children}
    </button>
  );
}
