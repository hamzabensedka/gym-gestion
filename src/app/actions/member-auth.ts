"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { MemberInviteStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { canMemberLogin } from "@/lib/member-auth";
import {
  createMemberSession,
  destroyMemberSession,
} from "@/lib/member-session";
import { destroySession } from "@/lib/session";
import {
  memberLoginSchema,
  memberSetPasswordSchema,
} from "@/lib/validations";

export async function memberLoginAction(formData: FormData) {
  const parsed = memberLoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }

  const email = parsed.data.email.toLowerCase();

  const member = await prisma.member.findFirst({
    where: { email },
    include: { gym: { select: { name: true } } },
  });

  if (!member?.passwordHash || !canMemberLogin(member.inviteStatus)) {
    return { error: "member.login.error" };
  }

  const valid = await bcrypt.compare(parsed.data.password, member.passwordHash);
  if (!valid) {
    return { error: "member.login.error" };
  }

  await prisma.member.update({
    where: { id: member.id },
    data: { lastLoginAt: new Date() },
  });

  await createMemberSession({
    memberId: member.id,
    gymId: member.gymId,
    gymName: member.gym.name,
    name: member.fullName,
    email: member.email!,
  });

  redirect("/member");
}

export async function memberLogoutAction() {
  await destroyMemberSession();
  redirect("/login");
}

export async function setPasswordFromInviteAction(formData: FormData) {
  const parsed = memberSetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }

  const member = await prisma.member.findFirst({
    where: { inviteToken: parsed.data.token },
    include: { gym: { select: { name: true } } },
  });

  if (!member) {
    return { error: "member.invite.invalidToken" };
  }

  if (
    member.inviteStatus === MemberInviteStatus.DISABLED ||
    !member.inviteExpiresAt ||
    member.inviteExpiresAt < new Date()
  ) {
    return { error: "member.invite.invalidToken" };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  await prisma.member.update({
    where: { id: member.id },
    data: {
      passwordHash,
      inviteStatus: MemberInviteStatus.ACTIVE,
      inviteToken: null,
      inviteExpiresAt: null,
      emailVerifiedAt: new Date(),
      lastLoginAt: new Date(),
    },
  });

  await destroySession();
  await createMemberSession({
    memberId: member.id,
    gymId: member.gymId,
    gymName: member.gym.name,
    name: member.fullName,
    email: member.email!,
  });

  redirect("/member");
}

export async function resendMemberInviteAction(memberId: string) {
  const { requireSession } = await import("@/lib/session");
  const { canAccessDesk } = await import("@/lib/auth");
  const { issueMemberInvite } = await import("@/lib/member-invite");
  const { revalidatePath } = await import("next/cache");

  const session = await requireSession();
  if (!canAccessDesk(session.role)) return { error: "Non autorisé" };

  const result = await issueMemberInvite(memberId, session.gymId);

  if ("error" in result && result.error) {
    return { error: result.error };
  }

  revalidatePath(`/members/${memberId}`);
  return { ok: true };
}

export async function disableMemberAccessAction(memberId: string) {
  const { requireSession } = await import("@/lib/session");
  const { canAccessAdmin } = await import("@/lib/auth");
  const { revalidatePath } = await import("next/cache");

  const session = await requireSession();
  if (!canAccessAdmin(session.role)) return { error: "Non autorisé" };

  await prisma.member.update({
    where: { id: memberId, gymId: session.gymId },
    data: {
      inviteStatus: MemberInviteStatus.DISABLED,
      inviteToken: null,
      inviteExpiresAt: null,
    },
  });

  revalidatePath(`/members/${memberId}`);
  return { ok: true };
}
