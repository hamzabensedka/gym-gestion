"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useT } from "@/components/i18n/locale-provider";
import { PLAN_MONTHS } from "@/lib/subscription";
import { renewMemberAction, deleteMemberAction } from "@/app/actions/members";
import type { TranslationKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const planLabelKey: Record<number, TranslationKey> = {
  1: "form.plan1",
  3: "form.plan3",
  6: "form.plan6",
  12: "form.plan12",
};

export function RenewControls({ memberId, memberName }: { memberId: string; memberName: string }) {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [pendingMonths, setPendingMonths] = useState<number | null>(null);

  function renew(months: number) {
    startTransition(async () => {
      await renewMemberAction(memberId, months);
      setDone(true);
      setPendingMonths(null);
      router.refresh();
      setTimeout(() => setDone(false), 2500);
    });
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <RefreshCw className="size-5 text-foreground" strokeWidth={1.75} />
        <h3 className="text-sm font-semibold text-foreground">{t("detail.renew")}</h3>
        {done ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-brand/15 px-2 py-0.5 text-xs font-bold text-brand">
            <Check className="size-3.5" />
            {t("detail.renewDone")}
          </span>
        ) : null}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {PLAN_MONTHS.map((months) => (
          <button
            key={months}
            type="button"
            disabled={pending}
            onClick={() => setPendingMonths(months)}
            className={cn(
              "rounded-lg border border-border bg-card px-2 py-3 text-sm font-bold text-foreground transition-colors hover:border-brand hover:bg-brand/10 hover:text-brand disabled:opacity-50",
            )}
          >
            +{months}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {PLAN_MONTHS.map((m) => `+${m} ${t(planLabelKey[m])}`).join(" · ")}
      </p>
      <ConfirmDialog
        open={pendingMonths !== null}
        onOpenChange={(open) => {
          if (!open) setPendingMonths(null);
        }}
        title={t("renew.confirmTitle")}
        description={
          pendingMonths !== null
            ? t("renew.confirmBody", {
                name: memberName,
                months: String(pendingMonths),
              })
            : ""
        }
        confirmLabel={t("renew.confirm")}
        cancelLabel={t("common.cancel")}
        tone="brand"
        onConfirm={() => {
          if (pendingMonths !== null) renew(pendingMonths);
        }}
      />
    </div>
  );
}

export function DeleteMemberButton({
  memberId,
  memberName,
  className,
  iconOnly = false,
}: {
  memberId: string;
  memberName: string;
  className?: string;
  iconOnly?: boolean;
}) {
  const t = useT();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const label = t("detail.deleteMember");

  function handleDelete() {
    startTransition(async () => {
      await deleteMemberAction(memberId);
      setOpen(false);
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="danger"
        className={cn("h-11 w-full", iconOnly && "flex-1", className)}
        disabled={pending}
        aria-label={label}
        title={label}
        onClick={() => setOpen(true)}
      >
        <Trash2 className="size-4 shrink-0" />
        {iconOnly ? null : label}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t("common.confirmDelete")}
        description={t("detail.confirmDeleteBody", { name: memberName })}
        confirmLabel={t("detail.deleteMember")}
        cancelLabel={t("common.cancel")}
        tone="critical"
        onConfirm={handleDelete}
      />
    </>
  );
}
