"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  clampReplayCursor,
  jumpReplayToDate,
  sliceReplayVisibleState,
  tickIntervalMs,
  type ReplayBundle,
  type ReplaySpeed,
  type ReplayVisibleState,
} from "@/lib/backtesting/replay";

export function useReplayController(bundle: ReplayBundle | null) {
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<ReplaySpeed>(1);
  const startedAtRef = useRef<number | null>(null);
  const [nowMs, setNowMs] = useState(0);

  useEffect(() => {
    setCursor(0);
    setPlaying(false);
    startedAtRef.current = null;
    setNowMs(0);
  }, [bundle?.session.id]);

  const totalSteps = bundle?.steps.length ?? 0;

  const visible: ReplayVisibleState | null = useMemo(() => {
    if (!bundle) return null;
    return sliceReplayVisibleState(bundle, cursor, {
      startedAtMs: startedAtRef.current ?? 0,
      nowMs: startedAtRef.current == null ? 0 : nowMs,
    });
  }, [bundle, cursor, nowMs]);

  const play = useCallback(() => {
    if (!bundle || totalSteps <= 0) return;
    if (startedAtRef.current == null) {
      startedAtRef.current = Date.now();
      setNowMs(startedAtRef.current);
    }
    setPlaying(true);
  }, [bundle, totalSteps]);

  const pause = useCallback(() => setPlaying(false), []);

  const restart = useCallback(() => {
    setPlaying(false);
    setCursor(0);
    startedAtRef.current = null;
    setNowMs(0);
  }, []);

  const next = useCallback(() => {
    setCursor((c) => clampReplayCursor(c + 1, totalSteps));
  }, [totalSteps]);

  const previous = useCallback(() => {
    setCursor((c) => clampReplayCursor(c - 1, totalSteps));
  }, [totalSteps]);

  const jumpToDate = useCallback(
    (isoDate: string) => {
      if (!bundle) return;
      setCursor(jumpReplayToDate(bundle, isoDate));
      setPlaying(false);
    },
    [bundle]
  );

  useEffect(() => {
    if (!playing || !bundle) return;
    if (cursor >= totalSteps - 1) {
      setPlaying(false);
      return;
    }
    const id = window.setInterval(() => {
      setNowMs(Date.now());
      setCursor((c) => {
        const nextCursor = clampReplayCursor(c + 1, totalSteps);
        if (nextCursor >= totalSteps - 1) setPlaying(false);
        return nextCursor;
      });
    }, tickIntervalMs(speed));
    return () => window.clearInterval(id);
  }, [playing, bundle, cursor, speed, totalSteps]);

  return {
    cursor,
    playing,
    speed,
    setSpeed,
    visible,
    play,
    pause,
    restart,
    next,
    previous,
    jumpToDate,
    totalSteps,
  };
}
