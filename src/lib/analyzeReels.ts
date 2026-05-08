import type { PatternScores, ReelItem, SignalLevel } from "../types/reel";

type ReelSimilarity = {
  reelId: string;
  similarity: number;
};

export type AnalysisSignals = {
  scores: PatternScores;
  topRepeatedSignature: string;
  topRepeatedSignatureCount: number;
  highResponseReelIds: string[];
  postResponseSimilarities: ReelSimilarity[];
  dominantHookType: string;
  dominantTopics: string[];
};

const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const unique = <T>(items: T[]) => Array.from(new Set(items));

const intersectionSize = (left: string[], right: string[]) => {
  const rightSet = new Set(right);
  return unique(left).filter((item) => rightSet.has(item)).length;
};

const tagSimilarity = (left: ReelItem, right: ReelItem) => {
  const topicScore =
    intersectionSize(left.topicTags, right.topicTags) /
    Math.max(unique([...left.topicTags, ...right.topicTags]).length, 1);
  const toneScore =
    intersectionSize(left.toneTags, right.toneTags) /
    Math.max(unique([...left.toneTags, ...right.toneTags]).length, 1);
  const hookScore = left.hookType === right.hookType ? 1 : 0;
  const structureScore = left.structureType === right.structureType ? 1 : 0;

  return (topicScore + toneScore + hookScore + structureScore) / 4;
};

const getSignature = (reel: ReelItem) =>
  [
    [...reel.topicTags].sort().join("+"),
    reel.structureType,
    [...reel.toneTags].sort().join("+"),
    reel.hookType,
  ].join(" | ");

const getFrequencyMap = (items: string[]) =>
  items.reduce<Record<string, number>>((map, item) => {
    map[item] = (map[item] ?? 0) + 1;
    return map;
  }, {});

const getLargestSimilarityClusterSize = (reels: ReelItem[], threshold = 0.4) => {
  if (reels.length === 0) return 0;

  return Math.max(
    ...reels.map(
      (anchorReel) => reels.filter((candidateReel) => tagSimilarity(anchorReel, candidateReel) >= threshold).length,
    ),
  );
};

const getDominantItems = (items: string[], limit = 2) =>
  Object.entries(getFrequencyMap(items))
    .sort(([, leftCount], [, rightCount]) => rightCount - leftCount)
    .slice(0, limit)
    .map(([item]) => item);

export const getSignalLevel = (score: number): SignalLevel => {
  if (score <= 30) return "낮은 반복 신호";
  if (score <= 60) return "일부 반복 신호";
  if (score <= 80) return "뚜렷한 반복 신호";
  return "강한 반복 신호";
};

export const calculateStructureRepetitionScore = (reels: ReelItem[]) => {
  if (reels.length === 0) return 0;

  const maxClusterSize = getLargestSimilarityClusterSize(reels);

  return clampScore((maxClusterSize / reels.length) * 100);
};

export const calculateHookConcentrationScore = (reels: ReelItem[]) => {
  if (reels.length === 0) return 0;

  const clicheDetectedRatio =
    (reels.filter((reel) => reel.platformClicheLevel >= 50).length / reels.length) * 100;
  const averageClicheLevel =
    reels.reduce((sum, reel) => sum + reel.platformClicheLevel, 0) / reels.length;

  return clampScore(0.5 * clicheDetectedRatio + 0.5 * averageClicheLevel);
};

export const calculateTopicDiversityScore = (reels: ReelItem[]) => {
  const topics = reels.flatMap((reel) => reel.topicTags);
  if (topics.length === 0) return 0;

  const frequencies = Object.values(getFrequencyMap(topics));
  const total = topics.length;
  const topicKinds = frequencies.length;

  if (topicKinds <= 1) return 0;

  const entropy = frequencies.reduce((sum, frequency) => {
    const probability = frequency / total;
    return sum - probability * Math.log(probability);
  }, 0);
  const maxEntropy = Math.log(topicKinds);

  return clampScore((entropy / maxEntropy) * 100);
};

export const getHighResponseReels = (reels: ReelItem[]) => {
  if (reels.length === 0) return [];

  const highResponseCount = Math.max(1, Math.ceil(reels.length * 0.2));

  return [...reels]
    .sort((left, right) => {
      const leftResponse = left.views + left.likes * 10;
      const rightResponse = right.views + right.likes * 10;
      return rightResponse - leftResponse;
    })
    .slice(0, highResponseCount);
};

export const calculatePostResponseSimilarityScore = (reels: ReelItem[]) => {
  if (reels.length < 2) return 0;

  const highResponseReels = getHighResponseReels(reels).sort(
    (left, right) => reels.findIndex((reel) => reel.id === left.id) - reels.findIndex((reel) => reel.id === right.id),
  );
  const similarities: number[] = [];

  const earliestHighResponseReel = highResponseReels[0];
  if (!earliestHighResponseReel) return 0;

  [earliestHighResponseReel].forEach((highResponseReel) => {
    const highResponseIndex = reels.findIndex((reel) => reel.id === highResponseReel.id);
    const laterReels = reels.slice(highResponseIndex + 1, highResponseIndex + 6);

    laterReels.forEach((laterReel) => {
      similarities.push(tagSimilarity(highResponseReel, laterReel));
    });
  });

  if (similarities.length === 0) return 0;

  const averageSimilarity =
    similarities.reduce((sum, similarity) => sum + similarity, 0) / similarities.length;

  return clampScore(averageSimilarity * 100);
};

export const analyzeReels = (reels: ReelItem[]): AnalysisSignals => {
  const signatures = reels.map(getSignature);
  const signatureEntries = Object.entries(getFrequencyMap(signatures)).sort(
    ([, leftCount], [, rightCount]) => rightCount - leftCount,
  );
  const topSignatureEntry = signatureEntries[0];
  const topRepeatedSignature = topSignatureEntry?.[0] ?? "";
  const topRepeatedSignatureCount = topSignatureEntry?.[1] ?? 0;
  const highResponseReels = getHighResponseReels(reels);
  const postResponseSimilarities = highResponseReels.flatMap((highResponseReel) => {
    const highResponseIndex = reels.findIndex((reel) => reel.id === highResponseReel.id);
    return reels.slice(highResponseIndex + 1).map((laterReel) => ({
      reelId: laterReel.id,
      similarity: clampScore(tagSimilarity(highResponseReel, laterReel) * 100),
    }));
  });

  const hookTypes = reels.map((reel) => reel.hookType);
  const topics = reels.flatMap((reel) => reel.topicTags);

  return {
    scores: {
      structureRepetition: calculateStructureRepetitionScore(reels),
      postResponseSimilarity: calculatePostResponseSimilarityScore(reels),
      hookConcentration: calculateHookConcentrationScore(reels),
      topicDiversity: calculateTopicDiversityScore(reels),
    },
    topRepeatedSignature,
    topRepeatedSignatureCount,
    highResponseReelIds: highResponseReels.map((reel) => reel.id),
    postResponseSimilarities,
    dominantHookType: getDominantItems(hookTypes, 1)[0] ?? "",
    dominantTopics: getDominantItems(topics, 3),
  };
};
