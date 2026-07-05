import Link from "next/link";
import { Activity, CalendarRange, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, StatCard } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageHeader } from "@/components/ui/page-header";
import { StaggerGroup } from "@/components/ui/stagger-group";
import { WhatsAppLink } from "@/components/ui/whatsapp-link";
import { formatDate, formatTime } from "@/lib/format";
import { buildWhatsappUrl, daysUntil } from "@/lib/subscription";
import { getDeskTodayData } from "@/lib/desk";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { canAccessDesk } from "@/lib/auth";
import { getLocale } from "@/lib/locale";
import { createTranslator } from "@/lib/i18n";
import { redirect } from "next/navigation";

export default async function TodayPage() {
  const session = await getSession();
  if (!session || !canAccessDesk(session.role)) {
    redirect("/login");
  }

  const locale = await getLocale();
  const t = createTranslator(locale);
  const [data, gym] = await Promise.all([
    getDeskTodayData(session.gymId),
    prisma.gym.findUnique({ where: { id: session.gymId }, select: { name: true } }),
  ]);
  const gymName = gym?.name ?? "Gym";

  return (
    <StaggerGroup className="space-y-5">
      <PageHeader title={t("today.title")} subtitle={t("today.subtitle")} />

      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label={t("today.checkins")}
          value={data.todayCheckins}
          tone="brand"
          icon={<Activity className="size-5" strokeWidth={1.75} />}
        />
        <StatCard
          label={t("today.expiring")}
          value={data.expiringSoon}
          tone="warning"
          icon={<CalendarRange className="size-5" strokeWidth={1.75} />}
        />
        <StatCard
          label={t("today.expired")}
          value={data.expired}
          tone="danger"
          icon={<AlertCircle className="size-5" strokeWidth={1.75} />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("today.checkins")}</CardTitle>
        </CardHeader>
        <CardContent>
          {data.checkins.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t("today.noCheckins")}
            </p>
          ) : (
            <ul className="space-y-2">
              {data.checkins.map((checkin) => (
                <li
                  key={checkin.id}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 odd:bg-muted"
                >
                  <Avatar className="size-9 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-brand/15 text-sm text-brand">
                      {checkin.member.fullName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{checkin.member.fullName}</p>
                    <p className="tnum text-xs text-muted-foreground">{checkin.member.phone}</p>
                  </div>
                  <span className="tnum shrink-0 text-sm text-muted-foreground">
                    {formatTime(new Date(checkin.timestamp), locale)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {data.expiringMembers.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("today.expiringList")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.expiringMembers.map((member) => {
                const days = daysUntil(new Date(member.subscriptionEnd));
                const waMessage = t("detail.waActive", {
                  name: member.fullName,
                  gym: gymName,
                  date: formatDate(new Date(member.subscriptionEnd), locale),
                });
                return (
                  <li
                    key={member.id}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 odd:bg-muted"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{member.fullName}</p>
                      <p className="text-xs text-muted-foreground">
                        {days} {days === 1 ? t("common.day") : t("common.days")} ·{" "}
                        {formatDate(new Date(member.subscriptionEnd), locale)}
                      </p>
                    </div>
                    <WhatsAppLink
                      href={buildWhatsappUrl(member.phone, waMessage)}
                      label={t("detail.whatsapp")}
                      iconOnly
                      className="size-10 shrink-0"
                    />
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </StaggerGroup>
  );
}
