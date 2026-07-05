import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getMemberStatus } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { getLocale } from "@/lib/locale";
import { createTranslator } from "@/lib/i18n";
import { prisma } from "@/lib/db";
import { MemberQrScreen } from "@/components/member/member-qr-screen";
import { ensureMemberSession } from "@/app/member/layout";
import { resolveGymCardTheme } from "@/lib/gym-card-themes";

export default async function MemberCardPage() {
  const session = await ensureMemberSession();
  const locale = await getLocale();
  const t = createTranslator(locale);

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
    <>
      <div className="safe-top absolute inset-x-0 top-0 z-10 px-5 py-4">
        <Link
          href="/member"
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-black/60 px-3 text-sm font-medium text-foreground backdrop-blur-sm"
        >
          <ArrowLeft className="size-4 flip-rtl" />
          {t("common.back")}
        </Link>
      </div>
      <MemberQrScreen
        memberId={member.id}
        memberName={member.fullName}
        gymName={member.gym.name}
        validUntil={formatDate(member.subscriptionEnd, locale)}
        status={status}
        cardTheme={cardTheme}
      />
    </>
  );
}
