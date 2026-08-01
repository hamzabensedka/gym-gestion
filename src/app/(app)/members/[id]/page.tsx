import Link from "next/link";
import { MemberStatus } from "@prisma/client";
import { format, startOfMonth } from "date-fns";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Phone,
  CalendarRange,
  History,
  TicketCheck,
  CalendarDays,
  Hash,
} from "lucide-react";
import { updateMemberAction } from "@/app/actions/members";
import { MemberForm } from "@/components/members/member-form";
import { QrDisplay } from "@/components/members/qr-display";
import { RenewControls, DeleteMemberButton } from "@/components/members/member-actions";
import { MemberInviteControls, ResendInviteButton } from "@/components/members/member-invite-controls";
import { FreezeControls } from "@/components/members/freeze-controls";
import { PaymentForm } from "@/components/members/payment-form";
import { PaymentHistory } from "@/components/members/payment-history";
import { listMemberPayments } from "@/lib/payments";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WhatsAppLink } from "@/components/ui/whatsapp-link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StaggerGroup } from "@/components/ui/stagger-group";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { daysUntil, buildWhatsappUrl } from "@/lib/subscription";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { canAccessDesk, canAccessAdmin } from "@/lib/auth";
import { getLocale } from "@/lib/locale";
import { createTranslator } from "@/lib/i18n";
import { getGymBilling } from "@/lib/gym-features";
import { planHasFeature } from "@/lib/plans";

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session || !canAccessDesk(session.role)) {
    redirect("/login");
  }

  const isAdmin = canAccessAdmin(session.role);

  const locale = await getLocale();
  const t = createTranslator(locale);
  const { id } = await params;

  const member = await prisma.member.findFirst({
    where: { id, gymId: session.gymId },
    include: {
      gym: { select: { name: true } },
      _count: { select: { checkins: true } },
      checkins: {
        orderBy: { timestamp: "desc" },
        take: 12,
        select: { id: true, timestamp: true },
      },
    },
  });

  if (!member) {
    notFound();
  }

  const gymBilling = await getGymBilling(session.gymId);
  const showBadgeField = planHasFeature(gymBilling.plan, "badge_numbers");

  const monthCheckins = await prisma.checkin.count({
    where: { memberId: member.id, timestamp: { gte: startOfMonth(new Date()) } },
  });

  const payments = (await listMemberPayments(session.gymId, member.id)) ?? [];

  const updateAction = isAdmin ? updateMemberAction.bind(null, member.id) : undefined;
  const expired = member.status === MemberStatus.EXPIRED;
  const frozen = member.status === MemberStatus.FROZEN;
  const days = daysUntil(member.subscriptionEnd);
  const lastVisit = member.checkins[0]?.timestamp;

  const waMessage = t(expired ? "detail.waExpired" : "detail.waActive", {
    name: member.fullName,
    gym: member.gym.name,
    date: formatDate(member.subscriptionEnd, locale),
  });
  const waUrl = buildWhatsappUrl(member.phone, waMessage);

  return (
    <StaggerGroup className="mx-auto max-w-3xl space-y-5">
      <Link
        href="/members"
        className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-foreground"
      >
        <ArrowLeft className="size-4 flip-rtl" />
        {t("nav.members")}
      </Link>

      {/* Profile header */}
      <Card className="overflow-hidden p-0">
        <div className="flex items-center gap-4 p-5">
          <Avatar className="size-16 rounded-xl">
            <AvatarFallback
              className={`rounded-xl text-2xl ${
                expired ? "bg-muted text-muted-foreground" : "bg-brand/15 text-brand"
              }`}
            >
              {member.fullName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold text-foreground">{member.fullName}</h1>
            <p className="tnum flex items-center gap-1.5 text-sm text-muted-foreground">
              <Phone className="size-3.5" />
              {member.phone}
            </p>
            {showBadgeField && member.badgeNumber ? (
              <p className="tnum mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Hash className="size-3.5" />
                {t("detail.badgeNumber")}: {member.badgeNumber}
              </p>
            ) : null}
            <div className="mt-2 mb-3 flex flex-wrap gap-2">
              {frozen ? (
                <Badge tone="danger" dot>
                  {t("common.frozen")}
                </Badge>
              ) : expired ? (
                <Badge tone="danger" dot>
                  {t("detail.expiredSince")} {formatDate(member.subscriptionEnd, locale)}
                </Badge>
              ) : (
                <Badge tone={days <= 7 ? "warning" : "success"} dot>
                  {days} {days === 1 ? t("common.day") : t("common.days")}{" "}
                  {t("detail.daysLeft")}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x divide-border border-t border-border text-center sm:grid-cols-3 rtl:divide-x-reverse">
          <InfoCell
            icon={<CalendarRange className="size-4" />}
            label={t("detail.cardValid")}
            value={formatDate(member.subscriptionEnd, locale)}
          />
          <InfoCell
            icon={<Hash className="size-4" />}
            label={t("common.monthlyFee")}
            value={formatCurrency(Number(member.monthlyFee))}
          />
          <InfoCell
            className="col-span-2 sm:col-span-1"
            icon={<CalendarDays className="size-4" />}
            label={t("detail.memberSince")}
            value={formatDate(member.createdAt, locale)}
          />
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <QrDisplay
            memberId={member.id}
            memberName={member.fullName}
            gymName={member.gym.name}
            validUntil={formatDate(member.subscriptionEnd, locale)}
          />

          <MemberInviteControls
            memberId={member.id}
            email={member.email}
            inviteStatus={member.inviteStatus}
            inviteExpiresAt={member.inviteExpiresAt}
            hideResendButton
          />

          <Card>
            <RenewControls memberId={member.id} memberName={member.fullName} />
          </Card>

          <div className="flex w-full flex-row items-stretch gap-2">
            <WhatsAppLink
              href={waUrl}
              label={t("detail.whatsapp")}
              iconOnly
              className="h-11 flex-1"
            />
            <ResendInviteButton
              memberId={member.id}
              disabled={!member.email}
              iconOnly
            />
            {isAdmin ? (
            <DeleteMemberButton
              memberId={member.id}
              memberName={member.fullName}
              iconOnly
              className="flex-1"
            />
            ) : null}
          </div>

          {isAdmin ? (
          <Card>
            <FreezeControls
              memberId={member.id}
              status={member.status}
              frozenAt={member.frozenAt}
              frozenUntil={member.frozenUntil}
              locale={locale}
            />
          </Card>
          ) : null}

          <Card>
            <PaymentForm
              memberId={member.id}
              defaultAmount={Number(member.monthlyFee)}
            />
          </Card>
        </div>

        <div className="space-y-5">
          {/* Visit stats */}
          <div className="grid grid-cols-3 gap-3">
            <MiniStat
              icon={<TicketCheck className="size-4" />}
              label={t("detail.totalVisits")}
              value={member._count.checkins}
            />
            <MiniStat
              icon={<CalendarDays className="size-4" />}
              label={t("detail.thisMonth")}
              value={monthCheckins}
            />
            <MiniStat
              icon={<History className="size-4" />}
              label={t("detail.lastVisit")}
              value={lastVisit ? format(lastVisit, "dd/MM") : t("detail.never")}
            />
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <History className="size-5 text-muted-foreground" strokeWidth={1.75} />
                <CardTitle>{t("detail.history")}</CardTitle>
              </div>
            </CardHeader>
            {member.checkins.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {t("detail.noVisits")}
              </p>
            ) : (
              <ul className="space-y-1">
                {member.checkins.map((checkin) => (
                  <li
                    key={checkin.id}
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-sm odd:bg-muted"
                  >
                    <span className="tnum text-muted-foreground">
                      {formatDateTime(checkin.timestamp, locale)}
                    </span>
                    <span className="size-2 rounded-full bg-foreground" />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <PaymentHistory payments={payments} locale={locale} />
        </div>
      </div>

      {isAdmin && updateAction ? (
      <Card>
        <CardHeader>
          <CardTitle>{t("detail.editTitle")}</CardTitle>
        </CardHeader>
        <MemberForm
          action={updateAction}
          mode="edit"
          showBadgeField={showBadgeField}
          defaultValues={{
            fullName: member.fullName,
            phone: member.phone,
            email: member.email,
            subscriptionStart: format(member.subscriptionStart, "yyyy-MM-dd"),
            subscriptionEnd: format(member.subscriptionEnd, "yyyy-MM-dd"),
            notes: member.notes,
            monthlyFee: Number(member.monthlyFee),
            inviteStatus: member.inviteStatus,
            badgeNumber: member.badgeNumber,
          }}
        />
      </Card>
      ) : null}

    </StaggerGroup>
  );
}

function InfoCell({
  icon,
  label,
  value,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`px-3 py-4 ${className ?? ""}`}>
      <div className="mx-auto mb-1 flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        {icon}
      </div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="tnum text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 text-center shadow-sm">
      <div className="mx-auto mb-1 flex size-8 items-center justify-center rounded-lg bg-muted text-foreground">
        {icon}
      </div>
      <p className="tnum text-lg font-bold text-foreground">{value}</p>
      <p className="text-[11px] leading-tight text-muted-foreground">{label}</p>
    </div>
  );
}
