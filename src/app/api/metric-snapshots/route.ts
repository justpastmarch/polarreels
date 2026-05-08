import { NextRequest, NextResponse } from "next/server";
import { getMetricSnapshotsForAccount } from "@/lib/reelRepository";

export async function GET(request: NextRequest) {
  const account = request.nextUrl.searchParams.get("account")?.trim();

  if (!account) {
    return NextResponse.json({ error: "account 쿼리 파라미터가 필요합니다." }, { status: 400 });
  }

  const snapshots = await getMetricSnapshotsForAccount(account);

  return NextResponse.json({ snapshots });
}
