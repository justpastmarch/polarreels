import { NextResponse } from "next/server";
import {
  getFavoriteAccountsFromFirestore,
  getTrackedAccountsFromFirestore,
  removeFavoriteAccountFromFirestore,
  saveFavoriteAccountToFirestore,
} from "@/lib/reelRepository";

export async function GET(request: Request) {
  try {
    const userId = new URL(request.url).searchParams.get("userId");
    const accounts = userId ? await getFavoriteAccountsFromFirestore(userId) : await getTrackedAccountsFromFirestore();
    return NextResponse.json({ accounts });
  } catch {
    return NextResponse.json({ accounts: [] });
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { userId?: string; accountLabel?: string };

  if (!body.userId || !body.accountLabel) {
    return NextResponse.json({ error: "userId와 accountLabel이 필요합니다." }, { status: 400 });
  }

  await saveFavoriteAccountToFirestore(body.userId, body.accountLabel);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const userId = searchParams.get("userId");
  const accountLabel = searchParams.get("accountLabel");

  if (!userId || !accountLabel) {
    return NextResponse.json({ error: "userId와 accountLabel이 필요합니다." }, { status: 400 });
  }

  await removeFavoriteAccountFromFirestore(userId, accountLabel);
  return NextResponse.json({ ok: true });
}
