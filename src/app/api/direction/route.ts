import { NextResponse } from "next/server";
import { generateDirectionInsight } from "@/lib/llmDirectionReport";
import type { DirectionInsight, AnalysisPayload } from "@/types/reel";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    reels?: AnalysisPayload["reels"];
    report?: AnalysisPayload["report"];
  };

  if (!body.reels || !body.report) {
    return NextResponse.json(
      { error: "reels와 report 데이터가 필요합니다." },
      { status: 400 },
    );
  }

  const result = await generateDirectionInsight(body.reels, body.report);

  return NextResponse.json({
    ok: true,
    ...result,
  });
}
