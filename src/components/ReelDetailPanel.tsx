"use client";

import React, { useState } from "react";
import type { ReelItem, ReelMetricSnapshot, ReelMetricSummary, TimeRange } from "@/types/reel";
import { TIME_RANGE_LABELS, TIME_RANGE_OPTIONS } from "@/types/reel";
import { formatDelta, formatMetric } from "@/lib/metricTracking";

type ReelDetailPanelProps = {
  reel: ReelItem;
  metricSummary: ReelMetricSummary;
  onClose: () => void;
};

const getChartPoints = (snapshots: ReelMetricSnapshot[]) => {
  const maxViews = Math.max(...snapshots.map((snapshot) => snapshot.views), 1);
  return snapshots
    .map((snapshot, index) => {
      const x = snapshots.length === 1 ? 0 : (index / (snapshots.length - 1)) * 100;
      const y = 100 - (snapshot.views / maxViews) * 100;
      return `${x},${y}`;
    })
    .join(" ");
};

export function ReelDetailPanel({ reel, metricSummary, onClose }: ReelDetailPanelProps) {
  const [selectedRange, setSelectedRange] = useState<TimeRange>("7d");
  const latest = metricSummary.latestSnapshot;
  const chartPoints = getChartPoints(metricSummary.snapshots);

  const rangeDelta = metricSummary.rangeDeltas?.[selectedRange] ?? metricSummary.sevenDayDelta;
  const hasDelta = Boolean(rangeDelta);
  const isTracking = metricSummary.hasHistory;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/20 backdrop-blur-sm md:items-center md:justify-center"
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <button
        type="button"
        onClick={onClose}
        className="fixed right-5 top-5 z-[60] flex h-10 w-10 items-center justify-center rounded-full border border-polar-line bg-polar-panel text-lg font-bold text-polar-text shadow-neon transition hover:bg-polar-panelSoft md:right-8 md:top-8"
        aria-label="Close detail panel"
      >
        ✕
      </button>
      <section className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[2rem] border border-polar-line bg-polar-panel p-6 shadow-neon md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-polar-cyan">Reel Detail</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-polar-text">{reel.title}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-polar-muted">{reel.caption}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <MetricBlock label="현재 조회수" value={latest ? formatMetric(latest.views) : formatMetric(reel.views)} />
          <MetricBlock label="현재 좋아요" value={latest ? formatMetric(latest.likes) : formatMetric(reel.likes)} />
          <MetricBlock label="현재 댓글" value={latest ? formatMetric(latest.comments) : formatMetric(reel.comments)} />
          <MetricBlock label={<><span>신뢰도</span><span className={`ml-1.5 inline-block h-2.5 w-2.5 rounded-full ${reel.platformClicheLevel >= 50 ? "bg-green-500" : reel.platformClicheLevel >= 25 ? "bg-yellow-500" : "bg-red-500"}`} /></>} />
        </div>

        {/* Time range selector */}
        <div className="mt-6">
          <div className="flex flex-wrap gap-1.5">
            {TIME_RANGE_OPTIONS.map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setSelectedRange(range)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                  selectedRange === range
                    ? "bg-polar-cyan text-white"
                    : "border border-polar-line bg-polar-panelSoft/40 text-polar-muted hover:bg-polar-panelSoft"
                }`}
              >
                {TIME_RANGE_LABELS[range]}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_0.8fr]">
          <div className="rounded-3xl border border-polar-line bg-polar-panelSoft/50 p-5">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h3 className="text-lg font-bold text-polar-text">지표 변화</h3>
                <p className="mt-1 text-sm text-polar-muted">
                  {TIME_RANGE_LABELS[selectedRange]}
                  {isTracking ? " 기준 변화량" : " — 데이터가 쌓이는 중입니다"}
                </p>
              </div>
              {rangeDelta ? (
                <span className="rounded-full bg-polar-cyan/10 px-3 py-1 text-sm font-semibold text-polar-cyan">
                  조회 {formatDelta(rangeDelta.views)}
                </span>
              ) : null}
            </div>

            <div className="mt-5 h-44 rounded-2xl border border-polar-line bg-polar-panel p-4">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full overflow-visible">
                <polyline fill="none" stroke="#2f6f73" strokeWidth="3" points={chartPoints} vectorEffect="non-scaling-stroke" />
              </svg>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <DeltaBlock label="조회수 변화" value={hasDelta ? formatDelta(rangeDelta!.views) : "추적 대기"} />
              <DeltaBlock label="좋아요 변화" value={hasDelta ? formatDelta(rangeDelta!.likes) : "추적 대기"} />
              <DeltaBlock label="댓글 변화" value={hasDelta ? formatDelta(rangeDelta!.comments) : "추적 대기"} />
            </div>
          </div>

          <div className="rounded-3xl border border-polar-line bg-polar-panelSoft/50 p-5">
            <div className="space-y-3 text-sm leading-6 text-polar-muted">
              <p>도입: {reel.hookType}</p>
              <p>구조: {reel.structureType}</p>
              <p>소재: {reel.topicTags.join(" · ")}</p>
              <p>톤: {reel.toneTags.join(" · ")}</p>
            </div>
            {reel.analysisReason ? (
              <div className="mt-5 rounded-2xl bg-polar-panel p-4 text-sm leading-6 text-polar-muted">
                {reel.analysisReason}
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricBlock({ label, value }: { label: React.ReactNode; value?: string }) {
  return (
    <div className="rounded-3xl border border-polar-line bg-polar-panelSoft/50 p-4">
      <p className="flex items-center gap-1.5 text-xs text-polar-muted">{label}</p>
      <p className="mt-2 text-2xl font-black text-polar-text">{value}</p>
    </div>
  );
}

function DeltaBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-polar-line bg-polar-panel px-4 py-3">
      <p className="text-xs text-polar-muted">{label}</p>
      <p className="mt-1 text-sm font-bold text-polar-text">{value}</p>
    </div>
  );
}
