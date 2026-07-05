"use server";

import { revalidatePath } from "next/cache";
import { createPayment } from "@/lib/payments";
import { requireSession } from "@/lib/session";
import { canAccessDesk } from "@/lib/auth";
import { paymentSchema } from "@/lib/validations";

export async function recordPaymentAction(memberId: string, formData: FormData) {
  const session = await requireSession();
  if (!canAccessDesk(session.role)) return { error: "Non autorisé" };

  const parsed = paymentSchema.safeParse({
    amount: formData.get("amount"),
    method: formData.get("method"),
    paidAt: formData.get("paidAt"),
    note: formData.get("note") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }

  const payment = await createPayment(session.gymId, memberId, session.userId, parsed.data);
  if (!payment) {
    return { error: "Membre introuvable" };
  }

  revalidatePath(`/members/${memberId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}
