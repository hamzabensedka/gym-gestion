"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { Snowflake, Sun, Check } from "lucide-react";
import { MemberStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { useT } from "@/components/i18n/locale-provider";
import { freezeMemberAction, unfreezeMemberAction } from "@/app/actions/members";
import { formatDate } from "@/lib/format";
import type { Locale } from "@/lib/i18n";
import { useRouter } from "next/navigation";

type FreezeControlsProps = {
  memberId: string;
  status: MemberStatus;
  frozenAt: Date | null;
  frozenUntil: Date | null;
  locale: Locale;
};

export function FreezeControls({
  memberId,
  status,
  frozenAt,
  frozenUntil,
  locale,
}: FreezeControlsProps) {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState<string | null>(null);
  const [until, setUntil] = useState("");
  const frozen = status === MemberStatus.FROZEN;

  const freezeAction = freezeMemberAction.bind(null, memberId);

  function handleFreeze(formData: FormData) {
    startTransition(async () => {
      const result = await freezeAction(formData);
      if (result?.error) return;
      setDone("freeze");
      router.refresh();
      setTimeout(() => setDone(null), 2500);
    });
  }

  function handleUnfreeze() {
    startTransition(async () => {
      const result = await unfreezeMemberAction(memberId);
      if (result?.error) return;
      setDone("unfreeze");
      router.refresh();
      setTimeout(() => setDone(null), 2500);
    });
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Snowflake className="size-5 text-foreground" strokeWidth={1.75} />
        <h3 className="text-sm font-semibold text-foreground">{t("freeze.title")}</h3>
        {done ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-brand/15 px-2 py-0.5 text-xs font-bold text-brand">
            <Check className="size-3.5" />
            {done === "unfreeze" ? t("freeze.unfreezeDone") : t("freeze.freezeDone")}
          </span>
        ) : null}
      </div>

      {frozen ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {t("freeze.frozenSince")} {frozenAt ? formatDate(frozenAt, locale) : "—"}
            {frozenUntil ? ` · ${t("freeze.until")} ${formatDate(frozenUntil, locale)}` : null}
          </p>
          <Button
            type="button"
            variant="danger"
            className="w-full"
            disabled={pending}
            onClick={handleUnfreeze}
          >
            <Sun className="size-4" />
            {t("freeze.unfreeze")}
          </Button>
          <p className="text-xs text-muted-foreground">{t("freeze.unfreezeHint")}</p>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleFreeze(new FormData(e.currentTarget));
          }}
          className="space-y-3"
        >
          <Field label={t("freeze.untilOptional")} hint={t("freeze.untilHint")}>
            <Input name="until" type="date" value={until} onChange={(e) => setUntil(e.target.value)} min={format(new Date(), "yyyy-MM-dd")} />
          </Field>
          <Button type="submit" variant="default" className="w-full" disabled={pending}>
            <Snowflake className="size-4" />
            {t("freeze.freeze")}
          </Button>
        </form>
      )}
    </div>
  );
}
