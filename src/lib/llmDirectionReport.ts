import type { DirectionInsight, ReelItem, PolarReelsAnalysis } from "@/types/reel";

const getApiKey = () => (process.env.OPENAI_API_KEY ?? "").trim();

export const isLlmConfigured = () => Boolean(getApiKey());

const extractJson = (content: string) => {
  const fenced = content.match(/```json\s*([\s\S]*?)\s*```/i)?.[1];
  return JSON.parse(fenced ?? content) as DirectionInsight;
};

export type InsightResult = {
  insight: DirectionInsight;
  mode: "llm" | "fallback";
};

const buildFallback = (report: PolarReelsAnalysis): DirectionInsight => ({
  summary: report.repeatedPatternSummary.slice(0, 120),
  patterns: [
    report.repeatedPatternSummary,
    report.postResponseSummary,
    report.hookSummary,
    report.topicSummary,
  ],
  observations: report.reflectionQuestions.slice(0, 3),
  reflectionPoints: report.reflectionQuestions.slice(0, 3),
  topicIdeas: [
    { title: `${report.topicSummary} 이 흐름을 바탕으로 한 장면형 영상`, reason: `최근 소재 분포(${report.scores.topicDiversity}점)를 고려할 때, 현재 범위 안에서 깊이를 더할 수 있는 소재입니다.` },
    { title: `${report.hookSummary} 이 도입 방식을 다른 소재에 적용한 영상`, reason: `후킹 집중도(${report.scores.hookConcentration}점)가 한쪽으로 쏠리지 않았다면, 현재 방식의 변주를 시도해볼 수 있습니다.` },
    { title: `${report.postResponseSummary} 이 변화가 드러나는 비교형 영상`, reason: `고반응 이후 패턴 유사도(${report.scores.postResponseSimilarity}점)가 높다면, 반응 형식보다 소재 변화에 집중해볼 시점입니다.` },
  ],
});

export async function generateDirectionInsight(
  reels: ReelItem[],
  report: PolarReelsAnalysis,
): Promise<InsightResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { insight: buildFallback(report), mode: "fallback" };
  }

  const reelSummaries = reels.map((r) => ({
    title: r.title,
    caption: r.caption?.slice(0, 200),
    views: r.views,
    likes: r.likes,
    comments: r.comments,
    hookType: r.hookType,
    structureType: r.structureType,
    topicTags: r.topicTags,
    toneTags: r.toneTags,
    platformClicheLevel: r.platformClicheLevel,
  }));

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "You analyze a creator's Instagram Reels data and produce a concise direction insight. Return ONLY valid JSON. Never suggest viral tactics, growth hacks, or stronger hooks. All output must be written in Korean.",
        },
        {
          role: "user",
          content: JSON.stringify({
            task: "Synthesize the following Reel data and analysis into creative direction insight.",
            outputSchema: {
              summary: "One-paragraph summary of the overall creative direction (Korean, 2-3 sentences)",
              patterns: ["3-4 specific pattern observations based on actual data (Korean)"],
              observations: ["2-3 observations about what the data shows, not what to change (Korean)"],
              reflectionPoints: ["2-3 questions the creator could ask themselves (Korean, non-prescriptive)"],
              topicIdeas: [
                {
                  title: "topic title (Korean, concrete, 5-8 words)",
                  reason: "why this topic fits this account's recent flow, referencing specific patterns or scores from the data (Korean, 2-3 sentences)",
                },
              ],
            },
            analysisScores: {
              structureRepetition: report.scores.structureRepetition,
              postResponseSimilarity: report.scores.postResponseSimilarity,
              hookConcentration: report.scores.hookConcentration,
              topicDiversity: report.scores.topicDiversity,
            },
            analysisSummaries: {
              repeatedPattern: report.repeatedPatternSummary,
              postResponse: report.postResponseSummary,
              hook: report.hookSummary,
              topic: report.topicSummary,
            },
            reels: reelSummaries,
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    return { insight: buildFallback(report), mode: "fallback" };
  }

  const completion = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = completion.choices?.[0]?.message?.content;
  if (!content) {
    return { insight: buildFallback(report), mode: "fallback" };
  }

  try {
    const parsed = extractJson(content);
    const insight: DirectionInsight = {
      summary: typeof parsed.summary === "string" ? parsed.summary : buildFallback(report).summary,
      patterns: Array.isArray(parsed.patterns) ? parsed.patterns.slice(0, 6) : buildFallback(report).patterns,
      observations: Array.isArray(parsed.observations) ? parsed.observations.slice(0, 5) : buildFallback(report).observations,
      reflectionPoints: Array.isArray(parsed.reflectionPoints) ? parsed.reflectionPoints.slice(0, 5) : buildFallback(report).reflectionPoints,
      topicIdeas: Array.isArray(parsed.topicIdeas) ? parsed.topicIdeas.slice(0, 5) : buildFallback(report).topicIdeas,
    };
    return { insight, mode: "llm" };
  } catch {
    return { insight: buildFallback(report), mode: "fallback" };
  }
}
