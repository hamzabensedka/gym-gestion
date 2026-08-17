import Link from "next/link";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { addDays, format, startOfWeek } from "date-fns";
import { ClassesPanel } from "@/components/classes/classes-panel";
import type {
  ClassRowView,
  DeskSessionView,
  RosterRowView,
} from "@/components/classes/types";
import { PageHeader } from "@/components/ui/page-header";
import { StaggerGroup } from "@/components/ui/stagger-group";
import { buttonVariants } from "@/components/ui/button";
import {
  isBookingError,
  listClasses,
  listDeskSessions,
  listSessionRoster,
} from "@/lib/class-booking";
import { prisma } from "@/lib/db";
import { getGymBilling } from "@/lib/gym-features";
import { createTranslator } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { planHasFeature } from "@/lib/plans";
import { getSession } from "@/lib/session";
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

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; session?: string }>;
}) {
  const session = await getSession();
  if (!session || (session.role !== Role.ADMIN && session.role !== Role.STAFF)) {
    redirect("/scan");
  }

  const locale = await getLocale();
  const t = createTranslator(locale);
  const gym = await getGymBilling(session.gymId);
  const unlocked = planHasFeature(gym.plan, "class_booking");
  const canUpgrade = session.role === Role.ADMIN;

  if (!unlocked) {
    return (
      <StaggerGroup className="mx-auto max-w-2xl space-y-5">
        <PageHeader
          title={t("classes.title")}
          subtitle={t("classes.lockedSubtitle")}
        />
        <div className="space-y-4">
          <p className="text-pretty text-sm text-muted-foreground">
            {t("classes.upgradeBody")}
          </p>
          {canUpgrade ? (
            <Link
              href="/settings"
              className={cn(buttonVariants({ variant: "default" }), "inline-flex")}
            >
              {t("classes.upgradeCta")}
            </Link>
          ) : null}
        </div>
      </StaggerGroup>
    );
  }

  const { week: weekParam, session: sessionParam } = await searchParams;
  const weekStart = parseWeekParam(weekParam);
  const weekKey = format(weekStart, "yyyy-MM-dd");
  const from = weekStart;
  const to = addDays(weekStart, 7);

  const [classes, deskSessions] = await Promise.all([
    listClasses(prisma, session.gymId),
    listDeskSessions(prisma, { gymId: session.gymId, from, to }),
  ]);

  const classRows: ClassRowView[] = classes.map((klass) => ({
    id: klass.id,
    name: klass.name,
    defaultCapacity: klass.defaultCapacity,
    active: klass.active,
  }));

  const sessionRows: DeskSessionView[] = deskSessions.map((row) => ({
    id: row.id,
    classId: row.classId,
    className: row.className,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    capacity: row.capacity,
    remaining: row.remaining,
    coachName: row.coachName,
    audience: row.audience,
    status: row.status,
    bookedCount: row.bookedCount,
  }));

  let rosterRows: RosterRowView[] | null = null;
  if (sessionParam) {
    try {
      const roster = await listSessionRoster(prisma, {
        gymId: session.gymId,
        sessionId: sessionParam,
      });
      rosterRows = roster.map((row) => ({
        memberId: row.memberId,
        fullName: row.fullName,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
        cancelledAt: row.cancelledAt?.toISOString() ?? null,
      }));
    } catch (error) {
      if (!isBookingError(error) || error.code !== "NOT_FOUND") {
        throw error;
      }
      rosterRows = [];
    }
  }

  const rosterSession =
    sessionParam != null
      ? (sessionRows.find((row) => row.id === sessionParam) ?? null)
      : null;

  return (
    <StaggerGroup className="space-y-5">
      <PageHeader title={t("classes.title")} subtitle={t("classes.subtitle")} />
      <ClassesPanel
        weekKey={weekKey}
        classes={classRows}
        sessions={sessionRows}
        rosterSessionId={sessionParam ?? null}
        rosterSession={rosterSession}
        roster={rosterRows}
      />
    </StaggerGroup>
  );
}
