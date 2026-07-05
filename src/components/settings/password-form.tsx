"use client";

import { useState, useTransition } from "react";
import { KeyRound, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Field } from "@/components/ui/input";
import { useT } from "@/components/i18n/locale-provider";
import { changePasswordAction } from "@/app/actions/settings";
import type { TranslationKey } from "@/lib/i18n";

function Saved({ show }: { show: boolean }) {
  const t = useT();
  if (!show) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-brand">
      <Check className="size-3.5" aria-hidden />
      {t("settings.saved")}
    </span>
  );
}

export function PasswordForm() {
  const t = useT();
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function savePassword(formData: FormData) {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await changePasswordAction(formData);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  }

  return (
    <Card>
      <div className="mb-4 flex items-center gap-2">
        <KeyRound className="size-5 text-foreground" strokeWidth={1.75} />
        <h3 className="text-[17px] font-semibold">{t("account.changePassword")}</h3>
        <Saved show={saved} />
      </div>
      <form
        action={savePassword}
        className="space-y-4"
        data-lpignore="true"
        data-1p-ignore=""
        data-lastpass-ignore=""
      >
        <Field label={t("settings.currentPassword")}>
          <Input name="currentPassword" type="password" required autoComplete="current-password" />
        </Field>
        <Field label={t("settings.newPassword")}>
          <Input name="newPassword" type="password" required minLength={6} autoComplete="new-password" />
        </Field>
        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-border bg-muted px-3 py-2 text-sm font-medium text-foreground"
          >
            {t(error as TranslationKey)}
          </p>
        ) : null}
        <Button type="submit" disabled={pending}>
          {t("settings.updatePassword")}
        </Button>
      </form>
    </Card>
  );
}
