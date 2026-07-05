import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { withOnboardedMemberFilter } from "@/lib/member-auth";
import { getSession } from "@/lib/session";
import { format } from "date-fns";

function csvCell(value: string | number): string {
  const str = String(value ?? "");
  if (/[",\n;]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.role !== Role.ADMIN) {
    return new Response("Non autorisé", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  const where = withOnboardedMemberFilter({
    gymId: session.gymId,
    ...(q
      ? {
          OR: [
            { fullName: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
          ],
        }
      : {}),
  });

  const members = await prisma.member.findMany({
    where,
    orderBy: { fullName: "asc" },
    include: { _count: { select: { checkins: true } } },
  });

  const header = [
    "Nom",
    "Telephone",
    "Statut",
    "Debut",
    "Fin",
    "Frais mensuels (TND)",
    "Visites",
    "Notes",
  ];

  const rows = members.map((m) =>
    [
      m.fullName,
      m.phone,
      m.status === "ACTIVE" ? "Actif" : "Expire",
      format(m.subscriptionStart, "yyyy-MM-dd"),
      format(m.subscriptionEnd, "yyyy-MM-dd"),
      Number(m.monthlyFee).toFixed(2),
      m._count.checkins,
      m.notes ?? "",
    ]
      .map(csvCell)
      .join(","),
  );

  // BOM so Excel reads UTF-8 (accents) correctly
  const csv = "\uFEFF" + [header.join(","), ...rows].join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="membres-${format(new Date(), "yyyy-MM-dd")}.csv"`,
    },
  });
}
