import { NextResponse } from "next/server";
import { generatePolarReelsReport } from "@/lib/reportGenerator";
import { extractInstagramUsername, mapApifyInstagramItemToReel, normalizeInstagramInput } from "@/lib/instagramMapper";
import { saveAnalysisToFirestore } from "@/lib/reelRepository";
import { tagReelsWithLlm } from "@/lib/llmTagger";

type AnalyzeRequest = {
  account?: string;
};

const getActorId = () => (process.env.APIFY_ACTOR_ID || "apify/instagram-reel-scraper").replace("/", "~");

export async function POST(request: Request) {
  const token = process.env.APIFY_TOKEN;
  const body = (await request.json().catch(() => ({}))) as AnalyzeRequest;
  const account = body.account?.trim();

  if (!account) {
    return NextResponse.json({ error: "Instagram 핸들 또는 프로필 URL을 입력해 주세요." }, { status: 400 });
  }

  if (!token) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "APIFY_TOKEN이 설정되어 있지 않아 실제 Instagram 데이터를 불러올 수 없습니다. .env.local에 APIFY_TOKEN을 추가한 뒤 다시 시도해 주세요.",
        code: "APIFY_TOKEN_MISSING",
      },
      { status: 200 },
    );
  }

  const profileUrl = normalizeInstagramInput(account);
  const username = extractInstagramUsername(account);
  if (!username) {
    return NextResponse.json({ error: "Instagram 계정명을 확인할 수 없습니다." }, { status: 400 });
  }

  const actorId = getActorId();
  const endpoint = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?format=json&clean=true&maxItems=12&maxTotalChargeUsd=0.25`;

  const apifyInput = {
    username: [username],
    directUrls: [profileUrl],
    resultsLimit: 12,
    skipPinnedPosts: true,
    includeSharesCount: false,
    includeTranscript: false,
    includeDownloadedVideo: false,
  };

  const apifyResponse = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(apifyInput),
    cache: "no-store",
  });

  if (!apifyResponse.ok) {
    const errorText = await apifyResponse.text();
    return NextResponse.json(
      {
        error: "Apify에서 Instagram 데이터를 불러오지 못했습니다.",
        detail: errorText.slice(0, 500),
      },
      { status: 502 },
    );
  }

  const rawItems = (await apifyResponse.json()) as unknown[];
  const ruleTaggedReels = rawItems
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map(mapApifyInstagramItemToReel)
    .filter((reel) => reel.caption || reel.title)
    .slice(0, 12);

  if (ruleTaggedReels.length === 0) {
    return NextResponse.json(
      { error: "공개 Reels 데이터를 찾지 못했습니다. 공개 계정인지, Reels가 있는 계정인지 확인해 주세요." },
      { status: 404 },
    );
  }

  const { reels, status: tagging } = await tagReelsWithLlm(ruleTaggedReels);
  const persistence = await saveAnalysisToFirestore({ accountLabel: username, reels });

  return NextResponse.json({
    ok: true,
    source: "live",
    accountLabel: username,
    reels,
    report: generatePolarReelsReport(reels),
    persistence,
    tagging,
  });
}
