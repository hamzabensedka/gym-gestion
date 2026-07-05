"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { MemberInviteStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getMemberStatus } from "@/lib/auth";
import { normalizePhone } from "@/lib/format";
import { extendSubscription } from "@/lib/subscription";
import { resolveMemberStatusOnSubscriptionChange, freezeMember, unfreezeMember } from "@/lib/freeze";
import { issueMemberInvite } from "@/lib/member-invite";
import { requireSession } from "@/lib/session";
import { canAccessAdmin, canAccessDesk } from "@/lib/auth";
import { memberSchema } from "@/lib/validations";

function parseDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

function normalizeEmail(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.toLowerCase() : null;
}

export async function createMemberAction(formData: FormData) {
  const session = await requireSession();
  if (!canAccessAdmin(session.role)) return { error: "Non autorisé" };

  const parsed = memberSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    email: formData.get("email") || undefined,
    subscriptionStart: formData.get("subscriptionStart"),
    subscriptionEnd: formData.get("subscriptionEnd"),
    notes: formData.get("notes") || undefined,
    monthlyFee: formData.get("monthlyFee"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }

  const subscriptionEnd = parseDate(parsed.data.subscriptionEnd);
  const email = normalizeEmail(parsed.data.email);
  const sendInvite = formData.get("sendInvite") === "on";
  let newId: string;

  try {
    const created = await prisma.member.create({
      data: {
        gymId: session.gymId,
        fullName: parsed.data.fullName.trim(),
        phone: normalizePhone(parsed.data.phone),
        email,
        subscriptionStart: parseDate(parsed.data.subscriptionStart),
        subscriptionEnd,
        status: getMemberStatus(subscriptionEnd),
        notes: parsed.data.notes?.trim() || null,
        monthlyFee: parsed.data.monthlyFee,
        inviteStatus: email && sendInvite ? MemberInviteStatus.PENDING : null,
      },
      select: { id: true },
    });
    newId = created.id;
  } catch {
    return { error: "form.phoneExists" };
  }

  if (email && sendInvite) {
    const inviteResult = await issueMemberInvite(newId, session.gymId);
    if ("error" in inviteResult && inviteResult.error) {
      return { error: inviteResult.error };
    }
  }

  revalidatePath("/members");
  revalidatePath("/dashboard");
  redirect(`/members/${newId}`);
}

export async function updateMemberAction(memberId: string, formData: FormData) {
  const session = await requireSession();
  if (!canAccessAdmin(session.role)) return { error: "Non autorisé" };

  const parsed = memberSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    email: formData.get("email") || undefined,
    subscriptionStart: formData.get("subscriptionStart"),
    subscriptionEnd: formData.get("subscriptionEnd"),
    notes: formData.get("notes") || undefined,
    monthlyFee: formData.get("monthlyFee"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }

  const subscriptionEnd = parseDate(parsed.data.subscriptionEnd);
  const email = normalizeEmail(parsed.data.email);
  const sendInvite = formData.get("sendInvite") === "on";

  const existing = await prisma.member.findFirst({
    where: { id: memberId, gymId: session.gymId },
    select: { email: true, inviteStatus: true, status: true },
  });
  if (!existing) return { error: "form.phoneExists" };

  const emailChanged = email !== existing.email;

  try {
    await prisma.member.update({
      where: { id: memberId, gymId: session.gymId },
      data: {
        fullName: parsed.data.fullName.trim(),
        phone: normalizePhone(parsed.data.phone),
        email,
        subscriptionStart: parseDate(parsed.data.subscriptionStart),
        subscriptionEnd,
        status: resolveMemberStatusOnSubscriptionChange(existing.status, subscriptionEnd),
        notes: parsed.data.notes?.trim() || null,
        monthlyFee: parsed.data.monthlyFee,
      },
    });
  } catch {
    return { error: "form.phoneExists" };
  }

  if (email && (sendInvite || emailChanged) && existing.inviteStatus !== MemberInviteStatus.ACTIVE) {
    const inviteResult = await issueMemberInvite(memberId, session.gymId);
    if ("error" in inviteResult && inviteResult.error) {
      return { error: inviteResult.error };
    }
  }

  revalidatePath("/members");
  revalidatePath(`/members/${memberId}`);
  revalidatePath("/dashboard");
  redirect(`/members/${memberId}`);
}

export async function renewMemberAction(memberId: string, months: number) {
  const session = await requireSession();
  if (!canAccessDesk(session.role)) return;

  const member = await prisma.member.findFirst({
    where: { id: memberId, gymId: session.gymId },
    select: { subscriptionEnd: true, status: true },
  });
  if (!member) return;

  const subscriptionEnd = extendSubscription(member.subscriptionEnd, months);

  await prisma.member.update({
    where: { id: memberId, gymId: session.gymId },
    data: {
      subscriptionEnd,
      status: resolveMemberStatusOnSubscriptionChange(member.status, subscriptionEnd),
    },
  });

  revalidatePath(`/members/${memberId}`);
  revalidatePath("/members");
  revalidatePath("/dashboard");
}

export async function deleteMemberAction(memberId: string) {
  const session = await requireSession();
  if (!canAccessAdmin(session.role)) return { error: "Non autorisé" };

  await prisma.member.delete({
    where: { id: memberId, gymId: session.gymId },
  });

  revalidatePath("/members");
  revalidatePath("/dashboard");
  redirect("/members");
}

export async function freezeMemberAction(memberId: string, formData: FormData) {
  const session = await requireSession();
  if (!canAccessAdmin(session.role)) return { error: "Non autorisé" };
  const until = formData.get("until")?.toString();
  const result = await freezeMember(session.gymId, memberId, until || undefined);
  if ("error" in result) return { error: result.error };

  revalidatePath(`/members/${memberId}`);
  revalidatePath("/members");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function unfreezeMemberAction(memberId: string) {
  const session = await requireSession();
  if (!canAccessAdmin(session.role)) return { error: "Non autorisé" };
  const result = await unfreezeMember(session.gymId, memberId);
  if ("error" in result) return { error: result.error };

  revalidatePath(`/members/${memberId}`);
  revalidatePath("/members");
  revalidatePath("/dashboard");
  return { ok: true, extendedDays: result.extendedDays };
}
