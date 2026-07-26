"use client";

import { useMemo, useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import {
  BacktestingEmptyState,
  BacktestingRecoveryPanel,
} from "@/components/backtesting/hardening";
import { SessionExplorer } from "@/components/backtesting/SessionExplorer";
import { ReplayControls } from "@/components/backtesting/ReplayControls";
import { ReplayCandleChart } from "@/components/backtesting/ReplayCandleChart";
import { ReplayStatisticsPanel } from "@/components/backtesting/ReplayStatisticsPanel";
import { RecommendationSnapshotPanel } from "@/components/backtesting/RecommendationSnapshotPanel";
import {
  HistoricalEventTimelinePanel,
  RecommendationTimelinePanel,
  TradeTimelinePanel,
} from "@/components/backtesting/ReplayTimelines";
import { useReplayController } from "@/components/backtesting/useReplayController";
import type { ReplayCenterDashboard } from "@/services/backtesting";

interface HistoricalReplayCenterProps {
  dashboard: ReplayCenterDashboard;
}

export function HistoricalReplayCenter({
  dashboard,
}: HistoricalReplayCenterProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    dashboard.defaultSessionId
  );
  const [sessionError, setSessionError] = useState<string | null>(null);

  const bundle = useMemo(() => {
    if (!selectedId) return null;
    return dashboard.bundlesBySessionId[selectedId] ?? null;
  }, [dashboard.bundlesBySessionId, selectedId]);

  const replay = useReplayController(bundle);

  function selectSession(id: string) {
    setSessionError(null);
    if (!dashboard.bundlesBySessionId[id]) {
      setSessionError(
        "The selected session bundle is missing or corrupt. Choose another session."
      );
      setSelectedId(id);
      return;
    }
    setSelectedId(id);
  }

  if (dashboard.sessions.length === 0) {
    return (
      <div className="space-y-4" data-testid="historical-replay-center">
        <BacktestingEmptyState kind="no_sessions" />
      </div>
    );
  }

  return (
    <div
      className="space-y-4 contrast-more:[&_button]:border-text-primary"
      data-testid="historical-replay-center"
    >
      <SessionExplorer
        sessions={dashboard.sessions}
        selectedId={selectedId}
        onSelect={selectSession}
      />

      {sessionError ? (
        <BacktestingRecoveryPanel
          kind="corrupt_session"
          message={sessionError}
          onRetry={() => {
            if (dashboard.defaultSessionId) {
              selectSession(dashboard.defaultSessionId);
            } else {
              setSessionError(null);
            }
          }}
        />
      ) : null}

      <ReplayControls
        playing={replay.playing}
        speed={replay.speed}
        onPlay={replay.play}
        onPause={replay.pause}
        onPrevious={replay.previous}
        onNext={replay.next}
        onRestart={replay.restart}
        onSpeedChange={replay.setSpeed}
        onJumpToDate={replay.jumpToDate}
        disabled={!bundle || Boolean(sessionError)}
        asOf={replay.visible?.asOf}
      />

      <ReplayStatisticsPanel stats={replay.visible?.statistics ?? null} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card hover={false} padding="sm" className="xl:col-span-2">
          <CardHeader
            title="Market Replay"
            subtitle={
              bundle
                ? `${bundle.session.universe.symbols.join(", ")} · candle-by-candle · no future data`
                : "Select a session"
            }
            timestamp={
              replay.visible?.asOf
                ? new Date(replay.visible.asOf).toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : undefined
            }
          />
          {bundle && replay.visible && !sessionError ? (
            <ReplayCandleChart
              bars={replay.visible.visibleBars}
              markers={replay.visible.visibleMarkers}
            />
          ) : selectedId && !bundle ? (
            <BacktestingEmptyState kind="corrupt_session" />
          ) : (
            <BacktestingEmptyState kind="no_sessions" />
          )}
        </Card>

        <RecommendationSnapshotPanel
          recommendation={replay.visible?.activeRecommendation ?? null}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <RecommendationTimelinePanel
          recommendations={replay.visible?.recommendationTimeline ?? []}
        />
        <TradeTimelinePanel events={replay.visible?.tradeTimeline ?? []} />
        <HistoricalEventTimelinePanel
          events={replay.visible?.visibleEvents ?? []}
          corporateActions={replay.visible?.visibleCorporateActions ?? []}
        />
      </div>
    </div>
  );
}
