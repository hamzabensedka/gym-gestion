import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withOnboardedMemberFilter } from "@/lib/member-auth";
import { getSession } from "@/lib/session";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json([]);
  }

  const members = await prisma.member.findMany({
    where: withOnboardedMemberFilter({
      gymId: session.gymId,
      OR: [
        { fullName: { contains: query, mode: "insensitive" } },
        { phone: { contains: query } },
      ],
    }),
    orderBy: { fullName: "asc" },
    take: 10,
    select: {
      id: true,
      fullName: true,
      phone: true,
      status: true,
      subscriptionEnd: true,
    },
  });

  return NextResponse.json(members);
}
