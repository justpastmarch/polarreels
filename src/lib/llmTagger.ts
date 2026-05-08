import type { HookType, ReelItem, StructureType, TaggingStatus } from "@/types/reel";

type LlmTagResult = {
  topicTags?: string[];
  toneTags?: string[];
  hookType?: HookType;
  structureType?: StructureType;
  platformClicheLevel?: number;
  analysisReason?: string;
};

const allowedHookTypes: HookType[] = [
  "question",
  "confession",
  "shock_claim",
  "comparison",
  "numbered_list",
  "relatable_situation",
  "result_first",
  "quiet_observation",
];

const allowedStructureTypes: StructureType[] = [
  "storytelling",
  "listicle",
  "problem_solution",
  "before_after",
  "skit",
  "vlog",
  "commentary",
  "tutorial",
];

const safeList = (value: unknown, fallback: string[]) => {
  if (!Array.isArray(value)) return fallback;
  const tags = value.map(String).map((tag) => tag.trim()).filter(Boolean).slice(0, 3);
  return tags.length > 0 ? tags : fallback;
};

const safeNumber = (value: unknown, fallback: number) => {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(100, Math.round(parsed)));
};

const safeHook = (value: unknown, fallback: HookType): HookType => {
  const hook = String(value);
  return allowedHookTypes.includes(hook as HookType) ? (hook as HookType) : fallback;
};

const safeStructure = (value: unknown, fallback: StructureType): StructureType => {
  const structure = String(value);
  return allowedStructureTypes.includes(structure as StructureType) ? (structure as StructureType) : fallback;
};

const extractJson = (content: string) => {
  const fenced = content.match(/```json\s*([\s\S]*?)\s*```/i)?.[1];
  return JSON.parse(fenced ?? content) as LlmTagResult;
};

const getApiKey = () => (process.env.OPENAI_API_KEY ?? "").trim();

export const isLlmConfigured = () => Boolean(getApiKey());

export const tagReelsWithLlm = async (reels: ReelItem[]) => {
  const apiKey = getApiKey();

  if (!apiKey) {
    return {
      reels: reels.map((reel) => ({ ...reel, tagSource: "rule" as const })),
      status: {
        mode: "rule",
        message: "OPENAI_API_KEY가 없어 규칙 기반 태깅을 사용했습니다.",
      } satisfies TaggingStatus,
    };
  }

  const taggedReels = await Promise.all(
    reels.map(async (reel) => {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content:
                "You classify Instagram Reels for a creator-direction tool. Never suggest growth hacks, viral tactics, stronger hooks, or trends. Return JSON only.",
            },
            {
              role: "user",
              content: JSON.stringify({
                task: "Classify the Reel into creative-direction taxonomy.",
                allowedHookTypes,
                allowedStructureTypes,
                outputSchema: {
                  topicTags: ["short snake_case tags, max 3"],
                  toneTags: ["short snake_case tags, max 3"],
                  hookType: "one allowedHookTypes value",
                  structureType: "one allowedStructureTypes value",
                  platformClicheLevel: "0-100; signal of platform grammar reliance, not quality",
                  analysisReason: "Korean one sentence explaining the classification without judging the creator",
                },
                reel: {
                  title: reel.title,
                  caption: reel.caption,
                  hashtags: reel.hashtags,
                  views: reel.views,
                  likes: reel.likes,
                  comments: reel.comments,
                },
              }),
            },
          ],
        }),
      });

      if (!response.ok) {
        return { ...reel, tagSource: "rule" as const };
      }

      const completion = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const content = completion.choices?.[0]?.message?.content;
      if (!content) return { ...reel, tagSource: "rule" as const };

      try {
        const result = extractJson(content);
        return {
          ...reel,
          topicTags: safeList(result.topicTags, reel.topicTags),
          toneTags: safeList(result.toneTags, reel.toneTags),
          hookType: safeHook(result.hookType, reel.hookType),
          structureType: safeStructure(result.structureType, reel.structureType),
          platformClicheLevel: safeNumber(result.platformClicheLevel, reel.platformClicheLevel),
          analysisReason: typeof result.analysisReason === "string" ? result.analysisReason : undefined,
          tagSource: "llm" as const,
        };
      } catch {
        return { ...reel, tagSource: "rule" as const };
      }
    }),
  );

  const llmCount = taggedReels.filter((reel) => reel.tagSource === "llm").length;

  return {
    reels: taggedReels,
    status: {
      mode: llmCount > 0 ? "llm" : "rule",
      message:
        llmCount > 0
          ? `LLM 기반 태깅을 ${llmCount}개 Reel에 적용했습니다.`
          : "LLM 응답을 적용하지 못해 규칙 기반 태깅을 사용했습니다.",
    } satisfies TaggingStatus,
  };
};
