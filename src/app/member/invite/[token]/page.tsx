import { notFound } from "next/navigation";
import { MemberInviteStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { InviteSetPasswordForm } from "@/components/member/invite-set-password-form";

export default async function MemberInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const member = await prisma.member.findFirst({
    where: { inviteToken: token },
    include: { gym: { select: { name: true } } },
  });

  if (!member) {
    notFound();
  }

  const expired =
    member.inviteStatus === MemberInviteStatus.DISABLED ||
    !member.inviteExpiresAt ||
    member.inviteExpiresAt < new Date();

  return (
    <InviteSetPasswordForm
      token={token}
      gymName={member.gym.name}
      memberName={member.fullName}
      expired={expired}
    />
  );
}
