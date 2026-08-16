import { NextResponse } from "next/server";
import { performCheckinFromInput } from "@/lib/checkin";
import { getSession } from "@/lib/session";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = (await request.json()) as {
    memberId?: string;
    qrData?: string;
    code?: string;
  };
  const result = await performCheckinFromInput(session.gymId, body);

  if (result.outcome === "INVALID") {
    return NextResponse.json(
      { success: false, outcome: "INVALID" },
      { status: 400 },
    );
  }

  return NextResponse.json(result, { status: 200 });
}
