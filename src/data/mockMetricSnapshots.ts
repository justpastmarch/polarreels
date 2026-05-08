import type { ReelMetricSnapshot } from "@/types/reel";

const day = 24 * 60 * 60 * 1000;

const createSnapshots = ({
  reelId,
  startDate,
  startViews,
  startLikes,
  startComments,
  viewStep,
  likeStep,
  commentStep,
}: {
  reelId: string;
  startDate: string;
  startViews: number;
  startLikes: number;
  startComments: number;
  viewStep: number;
  likeStep: number;
  commentStep: number;
}): ReelMetricSnapshot[] => {
  const start = new Date(startDate).getTime();
  return Array.from({ length: 16 }, (_, index) => ({
    reelId,
    capturedAt: new Date(start + index * day).toISOString(),
    views: startViews + viewStep * index + Math.round(index * index * viewStep * 0.08),
    likes: startLikes + likeStep * index + Math.round(index * index * likeStep * 0.06),
    comments: startComments + commentStep * index + Math.round(index * index * commentStep * 0.04),
  }));
};

export const mockMetricSnapshots: ReelMetricSnapshot[] = [
  ...createSnapshots({
    reelId: "reel-005",
    startDate: "2026-04-09T09:00:00.000Z",
    startViews: 4200,
    startLikes: 320,
    startComments: 36,
    viewStep: 2100,
    likeStep: 180,
    commentStep: 20,
  }),
  ...createSnapshots({
    reelId: "reel-007",
    startDate: "2026-04-13T09:00:00.000Z",
    startViews: 6800,
    startLikes: 540,
    startComments: 58,
    viewStep: 2500,
    likeStep: 230,
    commentStep: 26,
  }),
  ...createSnapshots({
    reelId: "reel-009",
    startDate: "2026-04-17T09:00:00.000Z",
    startViews: 5200,
    startLikes: 410,
    startComments: 47,
    viewStep: 2200,
    likeStep: 190,
    commentStep: 22,
  }),
  ...createSnapshots({
    reelId: "reel-017",
    startDate: "2026-05-03T09:00:00.000Z",
    startViews: 1600,
    startLikes: 140,
    startComments: 18,
    viewStep: 420,
    likeStep: 34,
    commentStep: 4,
  }),
  ...createSnapshots({
    reelId: "reel-020",
    startDate: "2026-05-09T09:00:00.000Z",
    startViews: 2100,
    startLikes: 180,
    startComments: 24,
    viewStep: 560,
    likeStep: 45,
    commentStep: 7,
  }),
];
