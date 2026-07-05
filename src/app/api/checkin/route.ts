import { NextResponse } from "next/server";
import { performCheckin, parseMemberIdFromQr } from "@/lib/checkin";
import { getSession } from "@/lib/session";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = (await request.json()) as { memberId?: string; qrData?: string };
  const memberId = body.memberId ?? parseMemberIdFromQr(body.qrData ?? "");

  if (!memberId) {
    return NextResponse.json(
      { success: false, outcome: "INVALID" },
      { status: 400 },
    );
  }

  const result = await performCheckin(session.gymId, memberId);
  return NextResponse.json(result, { status: result.success ? 200 : 200 });
}
