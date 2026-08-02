import { Hono } from "hono";
import { UtilityType } from "@prisma/client";
import { format } from "date-fns";
import { periodMonthStart, sumBillsForMonth } from "@gym/shared/bills";
import { prisma } from "../db";
import { requireGymFeature } from "../lib/features";
import { requireAdmin } from "../middleware/auth";

const UTILITY_TYPES = new Set<string>(Object.values(UtilityType));

export function parseMonthQuery(raw?: string): Date {
  if (raw) {
    const match = /^(\d{4})-(\d{2})$/.exec(raw);
    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]);
      if (month >= 1 && month <= 12) {
        return periodMonthStart(new Date(year, month - 1, 1));
      }
    }
  }
  return periodMonthStart(new Date());
}

export function parsePeriodMonthInput(raw: unknown): Date | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const value = raw.trim();
  const match = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return periodMonthStart(new Date(year, month - 1, 1));
}

export function parseOptionalDateInput(raw: unknown): Date | null | undefined {
  if (raw == null || raw === "") return undefined;
  if (typeof raw !== "string") return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export const billsRoutes = new Hono();

billsRoutes.use("*", requireAdmin);
billsRoutes.use("*", requireGymFeature("utility_bills"));

billsRoutes.get("/", async (c) => {
  const staff = c.get("staff");
  const monthStart = parseMonthQuery(c.req.query("month"));
  const monthKey = format(monthStart, "yyyy-MM");

  const bills = await prisma.utilityBill.findMany({
    where: { gymId: staff.gymId, periodMonth: monthStart },
    orderBy: [{ type: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      type: true,
      amount: true,
      periodMonth: true,
      dueDate: true,
      paidAt: true,
      note: true,
    },
  });

  const rows = bills.map((bill) => ({
    id: bill.id,
    type: bill.type,
    amount: Number(bill.amount),
    periodMonth: bill.periodMonth.toISOString(),
    dueDate: bill.dueDate?.toISOString() ?? null,
    paidAt: bill.paidAt?.toISOString() ?? null,
    note: bill.note,
  }));

  const summary = sumBillsForMonth(
    rows.map((bill) => ({
      type: bill.type,
      amount: bill.amount,
      periodMonth: new Date(bill.periodMonth),
    })),
    monthStart,
  );

  return c.json({
    data: {
      month: monthKey,
      bills: rows,
      total: summary.total,
      byType: summary.byType,
    },
  });
});

billsRoutes.post("/", async (c) => {
  const staff = c.get("staff");
  const body = await c.req.json();

  const typeRaw = body.type;
  const amountRaw = body.amount;
  const periodMonth = parsePeriodMonthInput(body.periodMonth);
  const dueDate = parseOptionalDateInput(body.dueDate);
  const noteRaw = body.note;

  if (typeof typeRaw !== "string" || !UTILITY_TYPES.has(typeRaw)) {
    return c.json({ error: { code: "VALIDATION", message: "Type invalide" } }, 422);
  }
  if (periodMonth == null) {
    return c.json({ error: { code: "VALIDATION", message: "Période invalide" } }, 422);
  }
  if (dueDate === null) {
    return c.json({ error: { code: "VALIDATION", message: "Échéance invalide" } }, 422);
  }

  const amount = Number(amountRaw);
  if (!Number.isFinite(amount) || amount < 0) {
    return c.json({ error: { code: "VALIDATION", message: "Montant invalide" } }, 422);
  }

  const note =
    typeof noteRaw === "string" && noteRaw.trim() ? noteRaw.trim() : undefined;

  const created = await prisma.utilityBill.create({
    data: {
      gymId: staff.gymId,
      type: typeRaw as UtilityType,
      periodMonth,
      amount,
      dueDate: dueDate ?? null,
      note,
      recordedById: staff.sub,
    },
    select: { id: true },
  });

  return c.json({ data: { id: created.id } }, 201);
});

billsRoutes.post("/:id/pay", async (c) => {
  const staff = c.get("staff");
  const id = c.req.param("id");
  if (!id) {
    return c.json({ error: { code: "NOT_FOUND", message: "Facture introuvable" } }, 404);
  }

  const result = await prisma.utilityBill.updateMany({
    where: { id, gymId: staff.gymId, paidAt: null },
    data: { paidAt: new Date() },
  });

  if (result.count === 0) {
    return c.json({ error: { code: "NOT_FOUND", message: "Facture introuvable" } }, 404);
  }

  return c.json({ data: { ok: true } });
});

billsRoutes.delete("/:id", async (c) => {
  const staff = c.get("staff");
  const id = c.req.param("id");
  if (!id) {
    return c.json({ error: { code: "NOT_FOUND", message: "Facture introuvable" } }, 404);
  }

  const result = await prisma.utilityBill.deleteMany({
    where: { id, gymId: staff.gymId },
  });

  if (result.count === 0) {
    return c.json({ error: { code: "NOT_FOUND", message: "Facture introuvable" } }, 404);
  }

  return c.json({ data: { ok: true } });
});
