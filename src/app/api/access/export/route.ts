import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { assertFeature } from "@/lib/gym-features";
import { buildAccessExportCsv } from "@/lib/access-export";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== Role.ADMIN) {
    return new Response("Non autorisé", { status: 401 });
  }

  try {
    await assertFeature(session.gymId, "access_export");
  } catch (error) {
    if (error instanceof Error && error.message === "FEATURE_LOCKED") {
      return Response.json({ error: "FEATURE_LOCKED" }, { status: 403 });
    }
    throw error;
  }

  const members = await prisma.member.findMany({
    where: {
      gymId: session.gymId,
      badgeNumber: { not: null },
    },
    select: {
      fullName: true,
      phone: true,
      badgeNumber: true,
      status: true,
      subscriptionEnd: true,
      frozenAt: true,
    },
    orderBy: { fullName: "asc" },
  });

  const csv = buildAccessExportCsv(members);

  await prisma.gym.update({
    where: { id: session.gymId },
    data: { lastAccessExportAt: new Date() },
  });

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="access-allowed.csv"',
    },
  });
}
