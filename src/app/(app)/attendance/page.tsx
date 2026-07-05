import { MemberStatus, Role } from "@prisma/client";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  CalendarRange,
  Flame,
  Clock,
  MoonStar,
  BarChart3,
} from "lucide-react";
import { formatPeakHourRange } from "@gym/shared/peak-hours";
import { Card, CardContent, CardHeader, CardTitle, StatCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { WhatsAppLink } from "@/components/ui/whatsapp-link";
import { PageHeader } from "@/components/ui/page-header";
import { StaggerGroup } from "@/components/ui/stagger-group";
import { buildWhatsappQueue } from "@gym/shared/subscription";
import { BulkWhatsappReminder } from "@/components/members/bulk-whatsapp-reminder";
import { formatTime } from "@/lib/format";
import { buildWhatsappUrl } from "@/lib/subscription";
import { getAttendanceData } from "@/lib/attendance";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getLocale } from "@/lib/locale";
import { createTranslator } from "@/lib/i18n";

export default async function AttendancePage() {
  const session = await getSession();
  if (!session || session.role !== Role.ADMIN) {
    redirect("/scan");
  }

  const locale = await getLocale();
  const t = createTranslator(locale);
  const [data, gym] = await Promise.all([
    getAttendanceData(session.gymId),
    prisma.gym.findUnique({ where: { id: session.gymId }, select: { name: true } }),
  ]);
  const gymName = gym?.name ?? "Gym";
  const topCount = data.mostActive[0]?.count ?? 1;
  const peakWithCounts = data.peakHours.filter((bucket) => bucket.count > 0);
  const topPeakCount = peakWithCounts.reduce((max, bucket) => Math.max(max, bucket.count), 1);
  const inactiveWhatsappQueue = buildWhatsappQueue(
    data.inactiveMembers,
    (member) => t("att.waInactive", { name: member.fullName, gym: gymName }),
  );

  return (
    <StaggerGroup className="space-y-5">
      <PageHeader title={t("att.title")} subtitle={t("att.subtitle")} />

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label={t("att.todayCheckins")}
          value={data.dailyCheckins.length}
          tone="brand"
          icon={<Activity className="size-5" strokeWidth={1.75} />}
        />
        <StatCard
          label={t("att.weekCheckins")}
          value={data.weeklyCount}
          icon={<CalendarRange className="size-5" strokeWidth={1.75} />}
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="size-5 text-brand" strokeWidth={1.75} />
            <CardTitle>{t("att.peakHoursTitle")}</CardTitle>
          </div>
          <p className="text-xs text-muted-foreground">{t("att.peakHoursSubtitle")}</p>
        </CardHeader>
        <CardContent>
          {peakWithCounts.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("att.noData")}</p>
          ) : (
            <div className="space-y-3">
              {data.busiestHour !== null ? (
                <p className="text-sm text-muted-foreground">
                  {t("att.busiestHour")}:{" "}
                  <span className="font-semibold text-foreground">
                    {formatPeakHourRange(data.busiestHour, locale)}
                  </span>
                </p>
              ) : null}
              {peakWithCounts.map((bucket) => (
                <div key={bucket.hour} className="flex items-center gap-3">
                  <div className="flex w-28 shrink-0 items-center gap-2">
                    <span className="tnum text-sm font-semibold">
                      {formatPeakHourRange(bucket.hour, locale)}
                    </span>
                    {bucket.hour === data.busiestHour ? (
                      <Badge tone="brand" className="text-[10px]">
                        {t("att.busiestHour")}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex justify-end">
                      <span className="tnum text-xs font-bold text-muted-foreground">
                        {bucket.count}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-brand"
                        style={{ width: `${(bucket.count / topPeakCount) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="size-5 text-brand" strokeWidth={1.75} />
            <CardTitle>{t("att.todayTitle")}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {data.dailyCheckins.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("att.noToday")}</p>
          ) : (
            <ul className="space-y-1">
              {data.dailyCheckins.map((checkin) => (
                <li
                  key={checkin.id}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent"
                >
                  <Avatar>
                    <AvatarFallback>
                      {checkin.member.fullName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{checkin.member.fullName}</p>
                    <p className="tnum text-xs text-muted-foreground">{checkin.member.phone}</p>
                  </div>
                  <Badge tone="neutral" className="tnum">
                    {formatTime(checkin.timestamp, locale)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Flame className="size-5 text-foreground" strokeWidth={1.75} />
            <CardTitle>{t("att.mostActive")}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {data.mostActive.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("att.noData")}</p>
          ) : (
            <div className="space-y-3">
              {data.mostActive.map((member, index) => (
                <Link
                  key={member.memberId}
                  href={`/members/${member.memberId}`}
                  className="block"
                >
                  <div className="flex items-center gap-3">
                    <span className="tnum w-5 text-center text-sm font-bold text-muted-foreground">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold">{member.fullName}</p>
                        <span className="tnum shrink-0 text-xs font-bold text-muted-foreground">
                          {member.count} {t("common.visits")}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-brand"
                          style={{ width: `${(member.count / topCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <MoonStar className="size-5 text-muted-foreground" strokeWidth={1.75} />
                <CardTitle>{t("att.inactiveTitle")}</CardTitle>
              </div>
              <p className="text-xs text-muted-foreground">{t("att.inactiveSubtitle")}</p>
            </div>
            <BulkWhatsappReminder queue={inactiveWhatsappQueue} />
          </div>
        </CardHeader>
        <CardContent>
          {data.inactiveMembers.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("att.allActive")}</p>
          ) : (
            <div className="space-y-2">
              {data.inactiveMembers.map((member) => {
                const waUrl = buildWhatsappUrl(
                  member.phone,
                  t("att.waInactive", { name: member.fullName, gym: gymName }),
                );
                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 rounded-lg bg-muted px-3 py-2.5"
                  >
                    <Link href={`/members/${member.id}`} className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{member.fullName}</p>
                      <p className="tnum text-xs text-muted-foreground">{member.phone}</p>
                    </Link>
                    {member.status === MemberStatus.EXPIRED ? (
                      <Badge tone="danger">{t("common.expired")}</Badge>
                    ) : null}
                    <WhatsAppLink
                      href={waUrl}
                      iconOnly
                      title={t("att.reminder")}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </StaggerGroup>
  );
}
