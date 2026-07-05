import { NextResponse } from "next/server";
import { getMemberSession } from "@/lib/member-session";
import { generateMemberQrPayload } from "@/lib/member-qr";

export async function GET() {
  const session = await getMemberSession();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  return NextResponse.json({
    memberId: session.memberId,
    payload: generateMemberQrPayload(session.memberId),
  });
}
