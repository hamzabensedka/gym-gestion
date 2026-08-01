import Link from "next/link";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import {
  Users,
  UserCheck,
  UserX,
  Activity,
  TrendingUp,
  ChevronRight,
  Clock,
  CalendarClock,
  Wallet,
  Download,
  Receipt,
  CupSoda,
} from "lucide-react";
import { formatPeakHourRange } from "@gym/shared/peak-hours";
import { Card, CardContent, CardHeader, CardTitle, StatCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StaggerGroup } from "@/components/ui/stagger-group";
import { TrendChips } from "@/components/dashboard/trend-chips";
import { WeeklyChart } from "@/components/dashboard/weekly-chart";
import { ActionItems } from "@/components/dashboard/action-items";
import { buildWhatsappQueue } from "@gym/shared/subscription";
import { BulkWhatsappReminder } from "@/components/members/bulk-whatsapp-reminder";
import { formatCurrency, formatDate, formatTime } from "@/lib/format";
import { getDashboardData } from "@/lib/dashboard";
import { getGymBilling } from "@/lib/gym-features";
import { planHasFeature } from "@/lib/plans";
import { getSession } from "@/lib/session";
import { getLocale } from "@/lib/locale";
import { createTranslator, type TranslationKey } from "@/lib/i18n";
import type { PaymentMethod } from "@prisma/client";
import { format } from "date-fns";

const paymentMethodKeys = {
  CASH: "payments.method.CASH",
  D17: "payments.method.D17",
  BANK_TRANSFER: "payments.method.BANK_TRANSFER",
  CARD: "payments.method.CARD",
  OTHER: "payments.method.OTHER",
} as const satisfies Record<PaymentMethod, TranslationKey>;

export default async function DashboardPage() {
  const session = await getSession();
  if (!session || session.role !== Role.ADMIN) {
    redirect("/scan");
  }

  const locale = await getLocale();
  const t = createTranslator(locale);
  const [data, gymBilling] = await Promise.all([
    getDashboardData(session.gymId),
    getGymBilling(session.gymId),
  ]);
  const canCsvExport = planHasFeature(gymBilling.plan, "csv_export");
  const showUtilityBills = data.utilityBillsThisMonth !== null;
  const showDrinksRevenue = data.drinksRevenueThisMonth !== null;

  const total = data.totalMembers || 1;
  const activePct = (data.activeMembers / total) * 100;
  const expiringPct = (data.expiringCount / total) * 100;
  const expiredPct = (data.expiredMembers / total) * 100;
  const monthStart = format(new Date(), "yyyy-MM-dd");
  const today = format(new Date(), "yyyy-MM-dd");
  const paymentsExportHref = `/api/payments/export?from=${monthStart}&to=${today}`;
  const expiringWhatsappQueue = buildWhatsappQueue(
    data.expiringSoon.map((member) => ({
      id: member.id,
      fullName: member.fullName,
      phone: member.phone,
    })),
    (member) => {
      const full = data.expiringSoon.find((item) => item.id === member.id)!;
      return t("detail.waActive", {
        name: member.fullName,
        gym: data.gymName,
        date: formatDate(full.subscriptionEnd, locale),
      });
    },
  );

  return (
    <StaggerGroup className="space-y-5">
      <PageHeader title={t("dash.title")} subtitle={t("dash.subtitle")} />

      <ActionItems
        actionItems={data.actionItems}
        gymName={data.gymName}
        locale={locale}
      />

      <div className="relative overflow-hidden rounded-xl border border-brand/25 border-l-4 border-l-brand bg-card p-5 shadow-sm">
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-brand/80">
              {t("dash.collectedThisMonth")}
            </p>
            <p className="tnum mt-1 text-4xl font-bold tracking-tight text-foreground">
              {formatCurrency(data.collectedThisMonth)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t("dash.expectedRevenueHint", {
                amount: formatCurrency(data.expectedMonthlyRevenue),
              })}
            </p>
            <p className="mt-1 text-xs font-medium text-foreground/70">
              {t("dash.collectedToday")} : {formatCurrency(data.collectedToday)}
            </p>
          </div>
          <span className="flex size-10 items-center justify-center rounded-lg bg-brand/15 text-brand">
            <TrendingUp className="size-5" strokeWidth={1.75} />
          </span>
        </div>
      </div>

      <TrendChips trends={data.trends} locale={locale} />

      {showUtilityBills || showDrinksRevenue ? (
        <div className="grid grid-cols-2 gap-3">
          {showUtilityBills ? (
            <StatCard
              label={t("dash.utilityBillsThisMonth")}
              value={formatCurrency(data.utilityBillsThisMonth!)}
              icon={<Receipt className="size-5" strokeWidth={1.75} />}
            />
          ) : null}
          {showDrinksRevenue ? (
            <StatCard
              label={t("dash.drinksRevenueThisMonth")}
              value={formatCurrency(data.drinksRevenueThisMonth!)}
              tone="brand"
              icon={<CupSoda className="size-5" strokeWidth={1.75} />}
            />
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={t("dash.totalMembers")}
          value={data.totalMembers}
          icon={<Users className="size-5" strokeWidth={1.75} />}
        />
        <StatCard
          label={t("dash.activeMembers")}
          value={data.activeMembers}
          tone="success"
          icon={<UserCheck className="size-5" strokeWidth={1.75} />}
        />
        <StatCard
          label={t("dash.expiredMembers")}
          value={data.expiredMembers}
          tone="danger"
          icon={<UserX className="size-5" strokeWidth={1.75} />}
        />
        <StatCard
          label={t("dash.todayCheckins")}
          value={data.todayCheckins}
          tone="brand"
          icon={<Activity className="size-5" strokeWidth={1.75} />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("dash.statusSplit")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
            <div className="bg-brand" style={{ width: `${activePct}%` }} />
            <div className="bg-foreground/50" style={{ width: `${expiringPct}%` }} />
            <div className="bg-foreground/25" style={{ width: `${expiredPct}%` }} />
          </div>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <Legend color="bg-brand" label={t("common.active")} value={data.activeMembers} />
            <Legend color="bg-foreground/50" label={t("common.expiringSoon")} value={data.expiringCount} />
            <Legend color="bg-foreground/25" label={t("common.expired")} value={data.expiredMembers} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("dash.weeklyAttendance")}</CardTitle>
        </CardHeader>
        <CardContent>
          <WeeklyChart data={data.weeklyAttendance} />
          {data.busiestHour !== null ? (
            <p className="mt-3 text-sm text-muted-foreground">
              {t("dash.busiestHour")}:{" "}
              <span className="font-semibold text-foreground">
                {formatPeakHourRange(data.busiestHour, locale)}
              </span>
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <CalendarClock className="size-5 text-brand" strokeWidth={1.75} />
                <CardTitle>{t("dash.expiringTitle")}</CardTitle>
              </div>
              {data.expiringSoon.length > 0 ? (
                <BulkWhatsappReminder queue={expiringWhatsappQueue} />
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            {data.expiringSoon.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {t("dash.noExpiring")}
              </p>
            ) : (
              <div className="space-y-2">
                {data.expiringSoon.map((member) => (
                  <Link
                    key={member.id}
                    href={`/members/${member.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted px-3 py-2.5 transition-colors hover:bg-accent"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">
                        {member.fullName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("dash.expiresOn")} {formatDate(member.subscriptionEnd, locale)}
                      </p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-foreground flip-rtl" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="size-5 text-brand" strokeWidth={1.75} />
              <CardTitle>{t("dash.recentActivity")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {data.recentCheckins.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {t("att.noToday")}
              </p>
            ) : (
              <div className="space-y-1">
                {data.recentCheckins.map((checkin) => (
                  <Link
                    key={checkin.id}
                    href={`/members/${checkin.member.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-accent"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {checkin.member.fullName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <p className="truncate font-medium">{checkin.member.fullName}</p>
                    </div>
                    <Badge tone="neutral" className="tnum shrink-0">
                      {formatTime(checkin.timestamp, locale)}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Wallet className="size-5 text-brand" strokeWidth={1.75} />
              <CardTitle>{t("dash.recentPayments")}</CardTitle>
            </div>
            {canCsvExport ? (
              <a href={paymentsExportHref} title={t("members.export")}>
                <Button variant="outline" size="sm" className="px-3">
                  <Download className="size-4" />
                  <span className="hidden sm:inline">{t("members.export")}</span>
                </Button>
              </a>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {data.recentPayments.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t("dash.noPayments")}
            </p>
          ) : (
            <div className="space-y-1">
              {data.recentPayments.map((payment) => (
                <Link
                  key={payment.id}
                  href={`/members/${payment.member.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-accent"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{payment.member.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      {t(paymentMethodKeys[payment.method])} ·{" "}
                      {formatDate(new Date(payment.paidAt), locale)}
                    </p>
                  </div>
                  <Badge tone="success" className="tnum shrink-0">
                    {formatCurrency(payment.amount)}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </StaggerGroup>
  );
}

function Legend({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number;
}) {
  return (
    <span className="flex items-center gap-2 text-foreground">
      <span className={`size-2.5 rounded-full ${color}`} />
      {label}
      <span className="tnum font-bold">{value}</span>
    </span>
  );
}
