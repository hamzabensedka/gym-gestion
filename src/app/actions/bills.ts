"use server";

import { Role, UtilityType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { periodMonthStart } from "@/lib/bills";
import { prisma } from "@/lib/db";
import { assertFeature } from "@/lib/gym-features";
import { requireSession } from "@/lib/session";

const UTILITY_TYPES = new Set<string>(Object.values(UtilityType));

async function requireBillsAdmin() {
  const session = await requireSession();
  if (session.role !== Role.ADMIN) {
    return { error: "Non autorisé" as const, session: null };
  }
  try {
    await assertFeature(session.gymId, "utility_bills");
  } catch (error) {
    if (error instanceof Error && error.message === "FEATURE_LOCKED") {
      return { error: "FEATURE_LOCKED" as const, session: null };
    }
    throw error;
  }
  return { error: null, session };
}

function parsePeriodMonth(raw: FormDataEntryValue | null): Date | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const value = raw.trim();
  // yyyy-MM or yyyy-MM-dd
  const match = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return periodMonthStart(new Date(year, month - 1, 1));
}

function parseOptionalDate(raw: FormDataEntryValue | null): Date | null | undefined {
  if (raw == null || raw === "") return undefined;
  if (typeof raw !== "string") return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export async function createBillAction(formData: FormData) {
  const gate = await requireBillsAdmin();
  if (gate.error || !gate.session) return { error: gate.error ?? "Non autorisé" };

  const typeRaw = formData.get("type");
  const amountRaw = formData.get("amount");
  const periodMonth = parsePeriodMonth(formData.get("periodMonth"));
  const dueDate = parseOptionalDate(formData.get("dueDate"));
  const noteRaw = formData.get("note");

  if (typeof typeRaw !== "string" || !UTILITY_TYPES.has(typeRaw)) {
    return { error: "Type invalide" };
  }
  if (periodMonth == null) {
    return { error: "Période invalide" };
  }
  if (dueDate === null) {
    return { error: "Échéance invalide" };
  }

  const amount = Number(amountRaw);
  if (!Number.isFinite(amount) || amount < 0) {
    return { error: "Montant invalide" };
  }

  const note =
    typeof noteRaw === "string" && noteRaw.trim() ? noteRaw.trim() : undefined;

  if (typeRaw === UtilityType.CUSTOM && !note) {
    return { error: "Nom de la charge requis" };
  }

  await prisma.utilityBill.create({
    data: {
      gymId: gate.session.gymId,
      type: typeRaw as UtilityType,
      periodMonth,
      amount,
      dueDate: dueDate ?? null,
      note,
      recordedById: gate.session.userId,
    },
  });

  revalidatePath("/bills");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function markBillPaidAction(billId: string) {
  const gate = await requireBillsAdmin();
  if (gate.error || !gate.session) return { error: gate.error ?? "Non autorisé" };
  if (!billId) return { error: "Facture introuvable" };

  const result = await prisma.utilityBill.updateMany({
    where: { id: billId, gymId: gate.session.gymId, paidAt: null },
    data: { paidAt: new Date() },
  });

  if (result.count === 0) {
    return { error: "Facture introuvable" };
  }

  revalidatePath("/bills");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteBillAction(billId: string) {
  const gate = await requireBillsAdmin();
  if (gate.error || !gate.session) return { error: gate.error ?? "Non autorisé" };
  if (!billId) return { error: "Facture introuvable" };

  const result = await prisma.utilityBill.deleteMany({
    where: { id: billId, gymId: gate.session.gymId },
  });

  if (result.count === 0) {
    return { error: "Facture introuvable" };
  }

  revalidatePath("/bills");
  revalidatePath("/dashboard");
  return { ok: true };
}
