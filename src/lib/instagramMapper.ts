import type { HookType, ReelItem, StructureType } from "@/types/reel";

type ApifyInstagramItem = Record<string, unknown>;

const topicRules = [
  { tag: "relationship", keywords: ["관계", "친구", "연락", "대화", "말투", "사람"] },
  { tag: "work_style", keywords: ["일", "직장", "회의", "출근", "집중"] },
  { tag: "daily_observation", keywords: ["일상", "동네", "카페", "지하철", "산책", "관찰"] },
  { tag: "creator_reflection", keywords: ["창작", "릴스", "조회수", "정체성", "기준"] },
  { tag: "personal_reflection", keywords: ["생각", "마음", "회복", "혼자", "기록"] },
];

const includesAny = (text: string, keywords: string[]) => keywords.some((keyword) => text.includes(keyword));

const asString = (value: unknown) => (typeof value === "string" ? value : "");
const asNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const getFirstString = (item: ApifyInstagramItem, keys: string[]) => {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return "";
};

const getFirstNumber = (item: ApifyInstagramItem, keys: string[]) => {
  for (const key of keys) {
    const number = asNumber(item[key]);
    if (number > 0) return number;
  }
  return 0;
};

const getSafeThumbnailUrl = (item: ApifyInstagramItem) => {
  const rawUrl = getFirstString(item, ["displayUrl", "thumbnailUrl", "imageUrl", "url"]);
  if (!rawUrl) return undefined;
  if (/cdninstagram|fbcdn|instagram\.f/i.test(rawUrl)) return `/api/thumbnail?url=${encodeURIComponent(rawUrl)}`;
  return rawUrl;
};

const getHashtags = (caption: string) => Array.from(caption.matchAll(/#[\p{L}\p{N}_]+/gu)).map((match) => match[0].slice(1));

const inferTopics = (text: string) => {
  const topics = topicRules.filter((rule) => includesAny(text, rule.keywords)).map((rule) => rule.tag);
  return topics.length > 0 ? topics.slice(0, 2) : ["daily_life"];
};

const inferToneTags = (text: string) => {
  if (includesAny(text, ["ㅋㅋ", "특징", "꼭 있음", "공감"])) return ["humorous", "relatable"];
  if (includesAny(text, ["생각", "기록", "마음", "기준", "정체성"])) return ["reflective", "calm"];
  if (includesAny(text, ["진짜", "무조건", "충격", "대박"])) return ["urgent", "provocative"];
  return ["reflective"];
};

const inferHookType = (text: string): HookType => {
  if (text.includes("?")) return "question";
  if (includesAny(text, ["3가지", "4가지", "5가지", "가지"])) return "numbered_list";
  if (includesAny(text, ["솔직히", "내가", "기록", "돌아가기"])) return "confession";
  if (includesAny(text, ["꼭 있음", "다들", "공감"])) return "relatable_situation";
  if (includesAny(text, ["충격", "대박", "모르면"])) return "shock_claim";
  return "quiet_observation";
};

const inferStructureType = (text: string, hookType: HookType): StructureType => {
  if (hookType === "numbered_list") return "listicle";
  if (includesAny(text, ["이유", "방법", "구분법"])) return "problem_solution";
  if (includesAny(text, ["기록", "생각", "돌아가기"])) return "commentary";
  return "storytelling";
};

const inferPlatformClicheLevel = (text: string, hookType: HookType) => {
  let score = 15;
  if (["numbered_list", "shock_claim", "relatable_situation", "question"].includes(hookType)) score += 30;
  if (includesAny(text, ["꼭", "진짜", "다들", "모르면", "특징", "가지"])) score += 25;
  return Math.max(0, Math.min(100, score));
};

export const normalizeInstagramInput = (input: string) => {
  const trimmed = input.trim();
  if (trimmed.startsWith("http")) return trimmed;
  const handle = trimmed.replace(/^@/, "").replace(/\/$/, "");
  return `https://www.instagram.com/${handle}/`;
};

export const extractInstagramUsername = (input: string) => {
  const trimmed = input.trim();
  if (!trimmed) return "";
  if (!trimmed.startsWith("http")) return trimmed.replace(/^@/, "").replace(/\/$/, "");

  try {
    const url = new URL(trimmed);
    return url.pathname.split("/").filter(Boolean)[0] ?? "";
  } catch {
    return "";
  }
};

export const mapApifyInstagramItemToReel = (item: ApifyInstagramItem, index: number): ReelItem => {
  const caption = getFirstString(item, ["caption", "description", "text", "alt"]);
  const title = caption.split("\n").find(Boolean)?.slice(0, 42) || `Instagram Reel ${index + 1}`;
  const hashtags = Array.isArray(item.hashtags)
    ? item.hashtags.map(String)
    : getHashtags(caption);
  const combinedText = `${title} ${caption} ${hashtags.join(" ")}`;
  const hookType = inferHookType(combinedText);
  const structureType = inferStructureType(combinedText, hookType);

  return {
    id: getFirstString(item, ["id", "shortCode", "shortcode", "url"]) || `live-reel-${index + 1}`,
    title,
    caption,
    hashtags,
    postedAt: getFirstString(item, ["timestamp", "takenAt", "postedAt", "createdAt"]) || "unknown",
    views: getFirstNumber(item, ["videoViewCount", "videoPlayCount", "viewCount", "viewsCount", "playsCount"]),
    likes: getFirstNumber(item, ["likesCount", "likeCount", "likes"]),
    comments: getFirstNumber(item, ["commentsCount", "commentCount", "comments"]),
    thumbnailUrl: getSafeThumbnailUrl(item),
    topicTags: inferTopics(combinedText),
    toneTags: inferToneTags(combinedText),
    hookType,
    structureType,
    platformClicheLevel: inferPlatformClicheLevel(combinedText, hookType),
  };
};
