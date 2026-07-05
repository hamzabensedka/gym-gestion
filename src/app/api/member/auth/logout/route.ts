import { NextResponse } from "next/server";
import { destroyMemberSession, getMemberSession } from "@/lib/member-session";

export async function POST() {
  const session = await getMemberSession();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  await destroyMemberSession();
  return NextResponse.json({ redirectTo: "/login" });
}
