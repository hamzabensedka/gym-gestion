import Link from "next/link";
import { MemberStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import { Plus, Download, ChevronRight, Search, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StaggerGroup } from "@/components/ui/stagger-group";
import { formatCurrency, formatDate } from "@/lib/format";
import { daysUntil } from "@/lib/subscription";
import { prisma } from "@/lib/db";
import { syncMemberStatuses } from "@/lib/checkin";
import { withOnboardedMemberFilter } from "@/lib/member-auth";
import { getSession } from "@/lib/session";
import { canAccessDesk, canAccessAdmin } from "@/lib/auth";
import { getLocale } from "@/lib/locale";
import { createTranslator } from "@/lib/i18n";
import { getGymBilling } from "@/lib/gym-features";
import { planHasFeature } from "@/lib/plans";
import { addDays, endOfDay, startOfDay } from "date-fns";
import { buildWhatsappQueue } from "@gym/shared/subscription";
import { BulkWhatsappReminder } from "@/components/members/bulk-whatsapp-reminder";
import { cn } from "@/lib/utils";

type Filter = "all" | "active" | "expired" | "expiring" | "frozen";

const filters: Filter[] = ["all", "active", "expired", "expiring", "frozen"];
const filterLabelKey = {
  all: "members.filterAll",
  active: "members.filterActive",
  expired: "members.filterExpired",
  expiring: "members.filterExpiring",
  frozen: "members.filterFrozen",
} as const;

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; f?: string }>;
}) {
  const session = await getSession();
  if (!session || !canAccessDesk(session.role)) {
    redirect("/login");
  }

  const isAdmin = canAccessAdmin(session.role);

  const locale = await getLocale();
  const t = createTranslator(locale);
  const { q = "", f = "all" } = await searchParams;
  const filter = (filters.includes(f as Filter) ? f : "all") as Filter;

  const gymBilling = await getGymBilling(session.gymId);
  const canCsvExport = planHasFeature(gymBilling.plan, "csv_export");
  const canAccessExport = planHasFeature(gymBilling.plan, "access_export");

  await syncMemberStatuses(session.gymId);

  const where = withOnboardedMemberFilter({
    gymId: session.gymId,
    ...(q
      ? {
          OR: [
            { fullName: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
          ],
        }
      : {}),
  });

  if (filter === "active") where.status = MemberStatus.ACTIVE;
  if (filter === "expired") where.status = MemberStatus.EXPIRED;
  if (filter === "expiring") {
    where.status = MemberStatus.ACTIVE;
    where.subscriptionEnd = {
      gte: startOfDay(new Date()),
      lte: endOfDay(addDays(new Date(), 7)),
    };
  }
  if (filter === "frozen") where.status = MemberStatus.FROZEN;

  const members = await prisma.member.findMany({
    where,
    orderBy: { fullName: "asc" },
  });

  const gym = await prisma.gym.findUnique({
    where: { id: session.gymId },
    select: { name: true },
  });
  const gymName = gym?.name ?? "Gym";

  const exportHref = `/api/members/export${q ? `?q=${encodeURIComponent(q)}` : ""}`;
  const remindQueue =
    filter === "expired" || filter === "expiring"
      ? buildWhatsappQueue(members, (member) =>
          filter === "expired"
            ? t("detail.waExpired", {
                name: member.fullName,
                gym: gymName,
                date: formatDate(member.subscriptionEnd, locale),
              })
            : t("detail.waActive", {
                name: member.fullName,
                gym: gymName,
                date: formatDate(member.subscriptionEnd, locale),
              }),
        )
      : [];
  const buildHref = (nextFilter: Filter) =>
    `/members?f=${nextFilter}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <StaggerGroup className="space-y-5">
      <PageHeader
        title={t("members.title")}
        subtitle={`${members.length} ${members.length === 1 ? t("common.member") : t("common.members")}`}
        action={
          isAdmin ? (
          <div className="flex items-center gap-2">
            {canCsvExport ? (
              <a href={exportHref} title={t("members.export")}>
                <Button variant="outline" size="md" className="px-3">
                  <Download className="size-4" />
                  <span className="hidden sm:inline">{t("members.export")}</span>
                </Button>
              </a>
            ) : null}
            {canAccessExport ? (
              <a href="/api/access/export" title={t("members.exportAccess")}>
                <Button variant="outline" size="md" className="px-3">
                  <Download className="size-4" />
                  <span className="hidden sm:inline">{t("members.exportAccess")}</span>
                </Button>
              </a>
            ) : null}
            <Link href="/members/new">
              <Button>
                <Plus className="size-5" />
                <span className="hidden sm:inline">{t("members.addMember")}</span>
              </Button>
            </Link>
          </div>
          ) : undefined
        }
      />

      <form method="get" className="relative">
        <input type="hidden" name="f" value={filter} />
        <Search className="pointer-events-none absolute start-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="q"
          defaultValue={q}
          placeholder={t("members.searchPlaceholder")}
          className="ps-10"
        />
      </form>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((item) => (
          <Link
            key={item}
            href={buildHref(item)}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
              filter === item
                ? "bg-primary text-primary-foreground shadow-sm"
                : "border border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {t(filterLabelKey[item])}
          </Link>
        ))}
      </div>

      {(filter === "expired" || filter === "expiring") && remindQueue.length > 0 ? (
        <BulkWhatsappReminder variant="bar" queue={remindQueue} />
      ) : null}

      {members.length === 0 ? (
        <Card className="border-dashed py-16 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <UserPlus className="size-7" strokeWidth={1.5} />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">{t("members.noMembers")}</p>
          {isAdmin ? (
          <Link href="/members/new" className="mt-4 inline-block">
            <Button>
              <Plus className="size-5" />
              {t("members.addMember")}
            </Button>
          </Link>
          ) : null}
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {members.map((member) => {
            const expired = member.status === MemberStatus.EXPIRED;
            const frozen = member.status === MemberStatus.FROZEN;
            const days = daysUntil(member.subscriptionEnd);
            const expiringSoon = !expired && !frozen && days <= 7;
            return (
              <Link key={member.id} href={`/members/${member.id}`} className="block">
                <Card
                  className={cn(
                    "group flex-row items-center gap-3 p-3.5 transition-shadow hover:shadow-md",
                    expired || frozen ? "border-border opacity-60" : "",
                  )}
                >
                  <Avatar className="size-12 rounded-xl">
                    <AvatarFallback
                      className={cn(
                        "rounded-xl text-lg",
                        expired || frozen
                          ? "bg-muted text-muted-foreground"
                          : "bg-brand/15 text-brand",
                      )}
                    >
                      {member.fullName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-foreground">{member.fullName}</p>
                    <p className="tnum text-sm text-muted-foreground">{member.phone}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDate(member.subscriptionEnd, locale)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    {frozen ? (
                      <Badge tone="danger" dot>
                        {t("common.frozen")}
                      </Badge>
                    ) : expired ? (
                      <Badge tone="danger" dot>
                        {t("common.expired")}
                      </Badge>
                    ) : expiringSoon ? (
                      <Badge tone="warning" dot>
                        {days} {days === 1 ? t("common.day") : t("common.days")}
                      </Badge>
                    ) : (
                      <Badge tone="success" dot>
                        {t("common.active")}
                      </Badge>
                    )}
                    <span className="tnum text-sm font-semibold text-foreground">
                      {formatCurrency(Number(member.monthlyFee))}
                    </span>
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 flip-rtl" />
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </StaggerGroup>
  );
}
