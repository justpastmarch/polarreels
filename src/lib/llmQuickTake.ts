import type { QuickTake, ReelItem, PolarReelsAnalysis } from "@/types/reel";

const getApiKey = () => (process.env.OPENAI_API_KEY ?? "").trim();

const extractJson = (content: string) => {
  const fenced = content.match(/```json\s*([\s\S]*?)\s*```/i)?.[1];
  return JSON.parse(fenced ?? content) as Pick<QuickTake, "take" | "consider">;
};

const buildFallback = (report: PolarReelsAnalysis): Pick<QuickTake, "take" | "consider"> => ({
  take: report.repeatedPatternSummary.slice(0, 100),
  consider: (report.reflectionQuestions[0] ?? "").slice(0, 80),
});

export async function generateQuickTake(
  accountLabel: string,
  reels: ReelItem[],
  report: PolarReelsAnalysis,
): Promise<QuickTake> {
  const apiKey = getApiKey();
  if (!apiKey) {
    const fb = buildFallback(report);
    return { ...fb, source: "fallback" };
  }

  const reelSummaries = reels.slice(0, 12).map((r) => ({
    title: r.title?.slice(0, 60),
    views: r.views,
    likes: r.likes,
    hookType: r.hookType,
    structureType: r.structureType,
    topicTags: r.topicTags,
    cliche: r.platformClicheLevel,
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
            "You are a creative direction advisor. Based on the user's Reel data, give a concise take (2-3 Korean sentences) that judges what their current pattern suggests, and one thing they might consider. Never prescribe viral tactics. Be direct, not fluffy.",
        },
        {
          role: "user",
          content: JSON.stringify({
            account: accountLabel,
            task: "Give a brief creative-direction take and one consideration based on this data.",
            scores: {
              structureRepetition: report.scores.structureRepetition,
              postResponseSimilarity: report.scores.postResponseSimilarity,
              hookConcentration: report.scores.hookConcentration,
              topicDiversity: report.scores.topicDiversity,
            },
            summaries: {
              repeatedPattern: report.repeatedPatternSummary,
              postResponse: report.postResponseSummary,
              hook: report.hookSummary,
              topic: report.topicSummary,
            },
            reels: reelSummaries,
            outputSchema: {
              take: "2-3 Korean sentences. Judge the current direction based on data. Be specific.",
              consider: "1 Korean sentence. What the creator might reflect on based on detected patterns.",
            },
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    const fb = buildFallback(report);
    return { ...fb, source: "fallback" };
  }

  const completion = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = completion.choices?.[0]?.message?.content;
  if (!content) {
    const fb = buildFallback(report);
    return { ...fb, source: "fallback" };
  }

  try {
    const parsed = extractJson(content);
    return {
      take: typeof parsed.take === "string" ? parsed.take : buildFallback(report).take,
      consider: typeof parsed.consider === "string" ? parsed.consider : buildFallback(report).consider,
      source: "llm",
    };
  } catch {
    const fb = buildFallback(report);
    return { ...fb, source: "fallback" };
  }
}
