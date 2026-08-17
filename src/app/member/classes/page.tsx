import Link from "next/link";
import { addDays, format, startOfWeek } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { MemberClassesList } from "@/components/member/member-classes-list";
import { MemberShell } from "@/components/member/member-shell";
import { ensureMemberSession } from "@/app/member/layout";
import { listMemberSessions } from "@/lib/class-booking";
import { prisma } from "@/lib/db";
import { createTranslator } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { planHasFeature } from "@/lib/plans";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function parseWeekParam(raw?: string): Date {
  if (raw) {
    const ymd = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
    if (ymd) {
      const date = new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
      if (!Number.isNaN(date.getTime())) {
        return startOfWeek(date, { weekStartsOn: 1 });
      }
    }
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return startOfWeek(parsed, { weekStartsOn: 1 });
    }
  }
  return startOfWeek(new Date(), { weekStartsOn: 1 });
}

function BackToCard({ label }: { label: string }) {
  return (
    <Link
      href="/member"
      className={cn(
        buttonVariants({ variant: "outline", size: "sm" }),
        "min-h-10 gap-1.5 rounded-full border-white/12 bg-white/[0.06] px-3.5 font-medium text-foreground shadow-none",
        "transition-[transform,background-color,color] duration-150",
        "hover:bg-white/[0.1] hover:text-foreground active:scale-[0.96]",
      )}
    >
      <ArrowLeft className="size-4 flip-rtl" />
      {label}
    </Link>
  );
}

export default async function MemberClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; session?: string }>;
}) {
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
      <MemberShell title={t("classes.memberTitle")} showClassesNav>
        <div className="mx-auto max-w-[340px] space-y-4 pt-2">
          <BackToCard label={t("common.back")} />
          <p className="text-pretty text-sm text-muted-foreground">
            {t("classes.memberLocked")}
          </p>
        </div>
      </MemberShell>
    );
  }

  const { week: weekParam, session: sessionParam } = await searchParams;
  const weekStart = parseWeekParam(weekParam);
  const weekKey = format(weekStart, "yyyy-MM-dd");
  const rows = await listMemberSessions(prisma, {
    gymId: session.gymId,
    memberId: session.memberId,
    from: weekStart,
    to: addDays(weekStart, 7),
  });

  return (
    <MemberShell title={t("classes.memberTitle")} showClassesNav>
      <div className="space-y-4 pt-2">
        <BackToCard label={t("common.back")} />
        <MemberClassesList
          weekKey={weekKey}
          selectedId={sessionParam ?? null}
          sessions={rows.map((row) => ({
            id: row.id,
            className: row.className,
            startsAt: row.startsAt.toISOString(),
            endsAt: row.endsAt.toISOString(),
            remaining: row.remaining,
            coachName: row.coachName,
            audience: row.audience,
            myBooking: row.myBooking,
          }))}
        />
      </div>
    </MemberShell>
  );
}
