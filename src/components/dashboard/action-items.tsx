"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Banknote,
  ChevronRight,
  ListTodo,
  RefreshCw,
} from "lucide-react";
import type { ActionItem, ActionItemCategory, ActionItemsData } from "@gym/shared/dashboard-actions";
import { renewMemberAction } from "@/app/actions/members";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { WhatsAppLink } from "@/components/ui/whatsapp-link";
import { useT } from "@/components/i18n/locale-provider";
import { formatDate } from "@/lib/format";
import type { Locale, TranslationKey } from "@/lib/i18n";
import { buildWhatsappUrl } from "@/lib/subscription";

const categoryLabelKey: Record<ActionItemCategory, TranslationKey> = {
  PAYMENT_FOLLOWUP: "dash.actionPaymentFollowup",
  EXPIRED: "dash.actionExpired",
  EXPIRING: "dash.actionExpiring",
  INACTIVE: "dash.actionInactive",
};

const categoryTone: Record<ActionItemCategory, "danger" | "warning" | "neutral"> = {
  PAYMENT_FOLLOWUP: "danger",
  EXPIRED: "danger",
  EXPIRING: "warning",
  INACTIVE: "neutral",
};

const viewAllLinks: Partial<Record<ActionItemCategory, string>> = {
  EXPIRING: "/members?f=expiring",
  EXPIRED: "/members?f=expired",
  PAYMENT_FOLLOWUP: "/members?f=expired",
  INACTIVE: "/attendance",
};

type ActionItemsProps = {
  actionItems: ActionItemsData;
  gymName: string;
  locale: Locale;
};

export function ActionItems({ actionItems, gymName, locale }: ActionItemsProps) {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [renewTarget, setRenewTarget] = useState<ActionItem | null>(null);

  function confirmRenew() {
    if (!renewTarget) return;
    startTransition(async () => {
      await renewMemberAction(renewTarget.memberId, 1);
      setRenewTarget(null);
      router.refresh();
    });
  }

  function whatsappMessage(item: ActionItem) {
    const date = formatDate(new Date(item.subscriptionEnd), locale);
    if (item.category === "INACTIVE") {
      return t("dash.waInactive", { name: item.fullName, gym: gymName });
    }
    if (item.category === "EXPIRING") {
      return t("detail.waActive", { name: item.fullName, gym: gymName, date });
    }
    return t("detail.waExpired", { name: item.fullName, gym: gymName, date });
  }

  const categoriesWithCounts = (
    ["PAYMENT_FOLLOWUP", "EXPIRED", "EXPIRING", "INACTIVE"] as ActionItemCategory[]
  ).filter((category) => actionItems.counts[category] > 0);

  return (
    <Card className="border-l-4 border-l-critical">
      <CardHeader>
        <div className="flex items-center gap-2">
          <ListTodo className="size-5 text-critical" strokeWidth={1.75} />
          <div>
            <CardTitle>{t("dash.actionsTitle")}</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">{t("dash.actionsSubtitle")}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {categoriesWithCounts.length > 0 ? (
          <div className="mb-4 flex flex-wrap gap-2">
            {categoriesWithCounts.map((category) => {
              const href = viewAllLinks[category];
              const label = `${t(categoryLabelKey[category])} (${actionItems.counts[category]})`;
              return href ? (
                <Link
                  key={category}
                  href={href}
                  className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                >
                  {label}
                </Link>
              ) : (
                <span
                  key={category}
                  className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
                >
                  {label}
                </span>
              );
            })}
          </div>
        ) : null}

        {actionItems.items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("dash.actionsEmpty")}</p>
        ) : (
          <ul className="space-y-2">
            {actionItems.items.map((item) => (
              <li
                key={`${item.memberId}-${item.category}`}
                className="rounded-lg border border-border bg-muted/60 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold text-foreground">{item.fullName}</p>
                      <Badge tone={categoryTone[item.category]} className="shrink-0">
                        {t(categoryLabelKey[item.category])}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {item.category === "INACTIVE"
                        ? t("dash.actionInactiveHint")
                        : `${t("dash.expiresOn")} ${formatDate(new Date(item.subscriptionEnd), locale)}`}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {(item.category === "EXPIRING" ||
                    item.category === "EXPIRED" ||
                    item.category === "PAYMENT_FOLLOWUP") && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={pending}
                      onClick={() => setRenewTarget(item)}
                      className="h-9 gap-1 px-2.5"
                    >
                      <RefreshCw className="size-3.5" />
                      {t("dash.actionRenew")}
                    </Button>
                  )}
                  <Link
                    href={`/members/${item.memberId}`}
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-border bg-card px-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-accent"
                  >
                    <Banknote className="size-3.5" />
                    {t("dash.actionPayment")}
                  </Link>
                  <WhatsAppLink
                    href={buildWhatsappUrl(item.phone, whatsappMessage(item))}
                    iconOnly
                    title={t("detail.whatsapp")}
                  />
                  <Link
                    href={`/members/${item.memberId}`}
                    className="ml-auto inline-flex size-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-accent"
                    aria-label={t("dash.actionView")}
                  >
                    <ChevronRight className="size-4 flip-rtl" />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <ConfirmDialog
        open={renewTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRenewTarget(null);
        }}
        title={t("renew.confirmTitle")}
        description={
          renewTarget
            ? t("renew.confirmBody", {
                name: renewTarget.fullName,
                months: "1",
              })
            : ""
        }
        confirmLabel={t("renew.confirm")}
        cancelLabel={t("common.cancel")}
        tone="brand"
        onConfirm={confirmRenew}
      />
    </Card>
  );
}
