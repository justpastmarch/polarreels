export type HookType =
  | "question"
  | "confession"
  | "shock_claim"
  | "comparison"
  | "numbered_list"
  | "relatable_situation"
  | "result_first"
  | "quiet_observation";

export type StructureType =
  | "storytelling"
  | "listicle"
  | "problem_solution"
  | "before_after"
  | "skit"
  | "vlog"
  | "commentary"
  | "tutorial";

export type ReelItem = {
  id: string;
  title: string;
  caption: string;
  hashtags: string[];
  postedAt: string;
  views: number;
  likes: number;
  comments: number;
  thumbnailUrl?: string;
  topicTags: string[];
  toneTags: string[];
  hookType: HookType;
  structureType: StructureType;
  platformClicheLevel: number;
  tagSource?: "rule" | "llm";
  analysisReason?: string;
};

export type SignalLevel =
  | "낮은 반복 신호"
  | "일부 반복 신호"
  | "뚜렷한 반복 신호"
  | "강한 반복 신호";

export type PatternScores = {
  structureRepetition: number;
  postResponseSimilarity: number;
  hookConcentration: number;
  topicDiversity: number;
};

export type ScoreInterpretation = {
  score: number;
  level: string;
  message: string;
};

export type PolarReelsAnalysis = {
  scores: PatternScores;
  interpretations: {
    structureRepetition: ScoreInterpretation;
    postResponseSimilarity: ScoreInterpretation;
    hookConcentration: ScoreInterpretation;
    topicDiversity: ScoreInterpretation;
  };
  repeatedPatternSummary: string;
  postResponseSummary: string;
  hookSummary: string;
  topicSummary: string;
  reflectionQuestions: string[];
  reflectionPrompts: ReflectionPrompt[];
};

export type ReflectionPrompt = {
  title: string;
  basis: string;
  question: string;
  checkPoint: string;
};

export type AnalysisPayload = {
  source: "demo" | "live";
  accountLabel: string;
  reels: ReelItem[];
  report: PolarReelsAnalysis;
  persistence?: PersistenceStatus;
  tagging?: TaggingStatus;
};

export type PersistenceStatus = {
  enabled: boolean;
  saved: boolean;
  message: string;
};

export type TaggingStatus = {
  mode: "rule" | "llm";
  message: string;
};

export type DirectionInsight = {
  summary: string;
  patterns: string[];
  observations: string[];
  reflectionPoints: string[];
  topicIdeas: { title: string; reason: string }[];
};

export type QuickTake = {
  take: string;
  consider: string;
  source: "llm" | "fallback";
};

export type TrackedAccount = {
  creatorId: string;
  accountLabel: string;
  updatedAt: string;
  lastScrapedAt: string;
  reelCount: number;
  trackingEnabled: boolean;
  favoriteAddedAt?: string;
};

export type PolarUser = {
  id: string;
  label: string;
};

export type ReelMetricSnapshot = {
  reelId: string;
  capturedAt: string;
  views: number;
  likes: number;
  comments: number;
  shares?: number;
};

export type ReelMetricDelta = {
  views: number;
  likes: number;
  comments: number;
  shares?: number;
};

export type TimeRange = "1h" | "6h" | "12h" | "1d" | "7d" | "30d" | "all";

export const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  "1h": "1시간",
  "6h": "6시간",
  "12h": "12시간",
  "1d": "1일",
  "7d": "7일",
  "30d": "30일",
  "all": "전체",
};

export const TIME_RANGE_OPTIONS: TimeRange[] = ["1h", "6h", "12h", "1d", "7d", "30d", "all"];

export type ReelMetricSummary = {
  reelId: string;
  hasHistory: boolean;
  firstSnapshot?: ReelMetricSnapshot;
  latestSnapshot?: ReelMetricSnapshot;
  sevenDayDelta?: ReelMetricDelta;
  snapshots: ReelMetricSnapshot[];
  /** Deltas keyed by time range. Only ranges with sufficient data are included. */
  rangeDeltas?: Partial<Record<TimeRange, ReelMetricDelta>>;
};
