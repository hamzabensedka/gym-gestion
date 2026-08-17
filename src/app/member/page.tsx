import Link from "next/link";
import { getMemberStatus } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { createTranslator } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { prisma } from "@/lib/db";
import { planHasFeature } from "@/lib/plans";
import { MemberShell } from "@/components/member/member-shell";
import { WalletCard } from "@/components/member/wallet-card";
import { ensureMemberSession } from "@/app/member/layout";
import { resolveGymCardTheme } from "@/lib/gym-card-themes";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function MemberWalletPage() {
  const session = await ensureMemberSession();
  const locale = await getLocale();
  const t = createTranslator(locale);

  const member = await prisma.member.findFirst({
    where: { id: session.memberId, gymId: session.gymId },
    include: { gym: { select: { name: true, cardTheme: true, plan: true } } },
  });

  if (!member) {
    return null;
  }

  const status = getMemberStatus(member.subscriptionEnd);
  const cardTheme = resolveGymCardTheme(member.gym.cardTheme, member.gym.name);
  const showClasses = planHasFeature(member.gym.plan, "class_booking");

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
        {showClasses ? (
          <Link
            href="/member/classes"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-10 min-h-10 w-full border-white/12 bg-white/[0.06] text-foreground hover:bg-white/[0.1]",
            )}
          >
            {t("classes.memberEntry")}
          </Link>
        ) : null}
      </div>
    </MemberShell>
  );
}
