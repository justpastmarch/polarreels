import { NextResponse } from "next/server";
import { upsertUserInFirestore } from "@/lib/reelRepository";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { label?: string };
  const label = body.label?.trim();

  if (!label) {
    return NextResponse.json({ error: "로그인 이름이 필요합니다." }, { status: 400 });
  }

  const user = await upsertUserInFirestore(label);
  return NextResponse.json({ user });
}
