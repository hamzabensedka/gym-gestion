import { Role, type PaymentMethod } from "@prisma/client";
import { format } from "date-fns";
import { listPayments } from "@/lib/payments";
import { getSession } from "@/lib/session";

function csvCell(value: string | number): string {
  const str = String(value ?? "");
  if (/[",\n;]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const methodLabels: Record<PaymentMethod, string> = {
  CASH: "Espèces",
  D17: "D17",
  BANK_TRANSFER: "Virement bancaire",
  CARD: "Carte bancaire",
  OTHER: "Autre",
};

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.role !== Role.ADMIN) {
    return new Response("Non autorisé", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const method = (searchParams.get("method") as PaymentMethod | null) ?? undefined;

  const payments = await listPayments(session.gymId, { from, to, method });

  const header = ["Date", "Membre", "Montant", "Mode", "Note", "Enregistré par"];

  const rows = payments.map((payment) =>
    [
      format(payment.paidAt, "yyyy-MM-dd"),
      payment.member.fullName,
      Number(payment.amount).toFixed(2),
      methodLabels[payment.method],
      payment.note ?? "",
      payment.recordedBy.name,
    ]
      .map(csvCell)
      .join(","),
  );

  const csv = "\uFEFF" + [header.join(","), ...rows].join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="paiements-${format(new Date(), "yyyy-MM-dd")}.csv"`,
    },
  });
}
