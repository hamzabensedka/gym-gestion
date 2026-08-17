import { addDays, startOfDay } from "date-fns";
import { MemberClassesList } from "@/components/member/member-classes-list";
import { MemberShell } from "@/components/member/member-shell";
import { ensureMemberSession } from "@/app/member/layout";
import { listMemberSessions } from "@/lib/class-booking";
import { prisma } from "@/lib/db";
import { createTranslator } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { planHasFeature } from "@/lib/plans";

export default async function MemberClassesPage() {
  const session = await ensureMemberSession();
  const locale = await getLocale();
  const t = createTranslator(locale);

  const member = await prisma.member.findFirst({
    where: { id: session.memberId, gymId: session.gymId },
    include: { gym: { select: { plan: true } } },
  });

  if (!member) {
    return null;
  }

  if (!planHasFeature(member.gym.plan, "class_booking")) {
    return (
      <MemberShell title={t("classes.memberTitle")}>
        <div className="mx-auto max-w-[340px] pt-2">
          <p className="text-pretty text-sm text-muted-foreground">
            {t("classes.memberLocked")}
          </p>
        </div>
      </MemberShell>
    );
  }

  const from = startOfDay(new Date());
  const to = addDays(from, 14);
  const rows = await listMemberSessions(prisma, {
    gymId: session.gymId,
    memberId: session.memberId,
    from,
    to,
  });

  return (
    <MemberShell title={t("classes.memberTitle")}>
      <div className="mx-auto max-w-[340px] space-y-4 pt-2">
        <MemberClassesList
          sessions={rows.map((row) => ({
            id: row.id,
            className: row.className,
            startsAt: row.startsAt.toISOString(),
            endsAt: row.endsAt.toISOString(),
            remaining: row.remaining,
            coachName: row.coachName,
            myBooking: row.myBooking,
          }))}
        />
      </div>
    </MemberShell>
  );
}
