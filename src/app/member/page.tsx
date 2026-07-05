import { getMemberStatus } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { getLocale } from "@/lib/locale";
import { prisma } from "@/lib/db";
import { MemberShell } from "@/components/member/member-shell";
import { WalletCard } from "@/components/member/wallet-card";
import { ensureMemberSession } from "@/app/member/layout";
import { resolveGymCardTheme } from "@/lib/gym-card-themes";

export default async function MemberWalletPage() {
  const session = await ensureMemberSession();
  const locale = await getLocale();

  const member = await prisma.member.findFirst({
    where: { id: session.memberId, gymId: session.gymId },
    include: { gym: { select: { name: true, cardTheme: true } } },
  });

  if (!member) {
    return null;
  }

  const status = getMemberStatus(member.subscriptionEnd);
  const cardTheme = resolveGymCardTheme(member.gym.cardTheme, member.gym.name);

  return (
    <MemberShell>
      <div className="mx-auto max-w-[340px] space-y-4 pt-2">
        <WalletCard
          gymName={member.gym.name}
          memberName={member.fullName}
          subscriptionEnd={formatDate(member.subscriptionEnd, locale)}
          status={status}
          href="/member/card"
          cardTheme={cardTheme}
        />
      </div>
    </MemberShell>
  );
}
