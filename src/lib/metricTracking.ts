import type { ReelItem, ReelMetricDelta, ReelMetricSnapshot, ReelMetricSummary, TimeRange } from "@/types/reel";

const MS_HOUR = 60 * 60 * 1000;
const MS_DAY = 24 * MS_HOUR;

const RANGE_MS: Record<TimeRange, number> = {
  "1h": 1 * MS_HOUR,
  "6h": 6 * MS_HOUR,
  "12h": 12 * MS_HOUR,
  "1d": 1 * MS_DAY,
  "7d": 7 * MS_DAY,
  "30d": 30 * MS_DAY,
  "all": 100 * 365 * MS_DAY, // way beyond any snapshot range → picks first snapshot
};

const byCapturedAt = (left: ReelMetricSnapshot, right: ReelMetricSnapshot) =>
  new Date(left.capturedAt).getTime() - new Date(right.capturedAt).getTime();

const getDelta = (first: ReelMetricSnapshot, latest: ReelMetricSnapshot): ReelMetricDelta => ({
  views: latest.views - first.views,
  likes: latest.likes - first.likes,
  comments: latest.comments - first.comments,
  shares: first.shares !== undefined && latest.shares !== undefined ? latest.shares - first.shares : undefined,
});

/**
 * Find the snapshot closest to (latestTimestamp - rangeMs) within a tolerance window.
 * Returns undefined if no snapshot is close enough.
 */
const findRangeStart = (snapshots: ReelMetricSnapshot[], latestTimestamp: number, rangeMs: number): ReelMetricSnapshot | undefined => {
  const target = latestTimestamp - rangeMs;
  const tolerance = Math.max(MS_HOUR * 2, rangeMs * 0.3); // loosen tolerance for shorter ranges

  let best = snapshots[0];
  let bestDiff = Math.abs(new Date(best.capturedAt).getTime() - target);

  for (const snap of snapshots) {
    const diff = Math.abs(new Date(snap.capturedAt).getTime() - target);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = snap;
    }
  }

  // If the best match is too far off the target, treat as unavailable
  if (bestDiff > tolerance) return undefined;
  // Don't use the latest snapshot itself as the range start
  if (new Date(best.capturedAt).getTime() === latestTimestamp) return undefined;
  return best;
};

export const getMetricSummary = (
  reel: ReelItem,
  snapshots: ReelMetricSnapshot[],
): ReelMetricSummary => {
  const reelSnapshots = snapshots.filter((snapshot) => snapshot.reelId === reel.id).sort(byCapturedAt);

  if (reelSnapshots.length < 2) {
    const currentSnapshot: ReelMetricSnapshot = {
      reelId: reel.id,
      capturedAt: new Date().toISOString(),
      views: reel.views,
      likes: reel.likes,
      comments: reel.comments,
    };

    return {
      reelId: reel.id,
      hasHistory: false,
      latestSnapshot: currentSnapshot,
      snapshots: [currentSnapshot],
    };
  }

  const firstSnapshot = reelSnapshots[0];
  const latestSnapshot = reelSnapshots[reelSnapshots.length - 1];
  const latestTs = new Date(latestSnapshot.capturedAt).getTime();

  // Compute range-specific deltas
  const rangeDeltas: Partial<Record<TimeRange, ReelMetricDelta>> = {};
  for (const [range, rangeMs] of Object.entries(RANGE_MS)) {
    const rangeStart = findRangeStart(reelSnapshots, latestTs, rangeMs);
    if (rangeStart) {
      rangeDeltas[range as TimeRange] = getDelta(rangeStart, latestSnapshot);
    }
  }

  return {
    reelId: reel.id,
    hasHistory: true,
    firstSnapshot,
    latestSnapshot,
    sevenDayDelta: getDelta(firstSnapshot, latestSnapshot),
    snapshots: reelSnapshots,
    rangeDeltas,
  };
};

export const formatDelta = (value: number) => {
  const formatter = new Intl.NumberFormat("ko-KR");
  return value >= 0 ? `+${formatter.format(value)}` : formatter.format(value);
};

export const formatMetric = (value: number) => new Intl.NumberFormat("ko-KR").format(value);
