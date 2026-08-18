"use server";

import { headers } from "next/headers";
import { Role } from "@prisma/client";
import { createPlanRequest } from "@gym/shared/plan-requests";
import { prisma } from "@/lib/db";
import { sendPlanLeadEmail } from "@/lib/email";
import { requireSession } from "@/lib/session";

function publicRateLimitKey(forwardedFor: string | null, email: unknown) {
  const forwarded = forwardedFor?.split(",")[0]?.trim() ?? "unknown";
  const mail = typeof email === "string" ? email.trim().toLowerCase() : "";
  return `${forwarded}:${mail}`;
}

export async function submitPublicLeadAction(formData: FormData) {
  const headerList = await headers();
  const result = await createPlanRequest(prisma, sendPlanLeadEmail, {
    source: "PUBLIC",
    rateLimitKey: publicRateLimitKey(
      headerList.get("x-forwarded-for"),
      formData.get("email"),
    ),
    body: {
      gymName: formData.get("gymName"),
      city: formData.get("city"),
      phone: formData.get("phone"),
      email: formData.get("email"),
      plan: formData.get("plan"),
    },
  });
  if (!result.ok) return { error: result.error };
  return { ok: true };
}

export async function requestGymPlanAction(formData: FormData) {
  const session = await requireSession();
  if (session.role !== Role.ADMIN) return { error: "Non autorisé" };

  const gym = await prisma.gym.findUnique({
    where: { id: session.gymId },
    select: { id: true, name: true, location: true, plan: true },
  });
  if (!gym) return { error: "Non autorisé" };

  const result = await createPlanRequest(prisma, sendPlanLeadEmail, {
    source: "GYM",
    body: { plan: formData.get("plan") },
    gym,
    adminEmail: session.email,
    adminPhone: "—",
  });
  if (!result.ok) return { error: result.error };
  return { ok: true };
}
