"use client";

import { useActionState, useState } from "react";
import { setPasswordFromInviteAction } from "@/app/actions/member-auth";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Logo } from "@/components/ui/logo";
import { Card, CardContent } from "@/components/ui/card";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { useT } from "@/components/i18n/locale-provider";
import type { TranslationKey } from "@/lib/i18n";

export function InviteSetPasswordForm({
  token,
  gymName,
  memberName,
  expired,
}: {
  token: string;
  gymName: string;
  memberName: string;
  expired: boolean;
}) {
  const t = useT();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      const result = await setPasswordFromInviteAction(formData);
      return result ?? null;
    },
    null,
  );

  return (
    <div className="safe-top safe-bottom flex min-h-dvh flex-col bg-black">
      <header className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2.5">
          <Logo className="size-10" />
          <span className="text-base font-semibold">{gymName}</span>
        </div>
        <LanguageSwitcher variant="compact" />
      </header>

      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-5 pb-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">
            {t("member.invite.title")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {memberName}
          </p>
        </div>

        {expired ? (
          <Card className="border-critical-border bg-critical-muted">
            <CardContent className="pt-6 text-center text-sm text-critical">
              {t("member.invite.invalidToken")}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-white/12 bg-[#0a0a0a]">
            <CardContent className="pt-6">
              <form action={formAction} className="space-y-4">
                <input type="hidden" name="token" value={token} />
                <div className="space-y-2">
                  <Label htmlFor="password">{t("member.invite.setPassword")}</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t("member.invite.confirmPassword")}</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                {state?.error ? (
                  <p
                    role="alert"
                    className="rounded-lg border border-border bg-muted px-3 py-2.5 text-sm font-medium text-foreground"
                  >
                    {state.error.startsWith("member.") || state.error.startsWith("members.")
                      ? t(state.error as TranslationKey)
                      : state.error}
                  </p>
                ) : null}
                <Button type="submit" size="lg" className="w-full" disabled={pending} static={pending}>
                  {pending ? t("common.saving") : t("member.invite.activate")}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
