import { NextResponse } from "next/server";
import { generateQuickTake } from "@/lib/llmQuickTake";
import type { AnalysisPayload } from "@/types/reel";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    accountLabel?: string;
    reels?: AnalysisPayload["reels"];
    report?: AnalysisPayload["report"];
  };

  if (!body.reels || !body.report) {
    return NextResponse.json({ error: "reels와 report 데이터가 필요합니다." }, { status: 400 });
  }

  const result = await generateQuickTake(body.accountLabel ?? "", body.reels, body.report);

  return NextResponse.json({ ok: true, ...result });
}
