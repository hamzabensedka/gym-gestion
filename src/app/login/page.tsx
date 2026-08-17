"use client";

import { useActionState, useState } from "react";
import { loginAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Logo } from "@/components/ui/logo";
import { StaggerGroup } from "@/components/ui/stagger-group";
import { Card, CardContent } from "@/components/ui/card";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { LegalFooter } from "@/components/legal/legal-footer";
import { useT } from "@/components/i18n/locale-provider";

export default function LoginPage() {
  const t = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      const result = await loginAction(formData);
      return result ?? null;
    },
    null,
  );

  function fill(demoEmail: string, demoPassword: string) {
    setEmail(demoEmail);
    setPassword(demoPassword);
  }

  return (
    <div className="safe-top safe-bottom flex min-h-dvh flex-col bg-background">
      <header className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2.5">
          <Logo className="size-10" />
          <span className="text-base font-semibold">{t("app.name")}</span>
        </div>
        <LanguageSwitcher />
      </header>

      <StaggerGroup className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 px-5 pb-8">
        <div className="text-center lg:text-start">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {t("login.title")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("login.subtitle")}</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form
              action={formAction}
              className="space-y-4"
              aria-label={t("login.title")}
              data-lpignore="true"
              data-1p-ignore=""
            >
              <div className="space-y-2" data-lpignore="true" data-1p-ignore="">
                <Label htmlFor="email">{t("login.email")}</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  aria-required="true"
                />
              </div>
              <div className="space-y-2" data-lpignore="true" data-1p-ignore="">
                <Label htmlFor="password">{t("login.password")}</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  aria-required="true"
                />
              </div>
              {state?.error ? (
                <p
                  role="alert"
                  className="rounded-lg border border-border bg-muted px-3 py-2.5 text-sm font-medium text-foreground"
                >
                  {t("login.error")}
                </p>
              ) : null}
              <Button type="submit" size="lg" className="w-full" disabled={pending} static={pending}>
                {pending ? t("login.signingIn") : t("login.signIn")}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div>
          <p className="mb-2 px-1 text-xs text-muted-foreground">{t("login.demo")}</p>
          <Card className="gap-0 overflow-hidden p-0">
            <button
              type="button"
              onClick={() => fill("admin@gym.local", "admin123")}
              className="flex w-full flex-col items-start gap-0.5 border-b border-border px-4 py-3 text-start transition-colors hover:bg-accent"
            >
              <span className="text-sm font-medium">{t("staff.roleAdmin")}</span>
              <span className="text-xs text-muted-foreground">admin@gym.local</span>
            </button>
            <button
              type="button"
              onClick={() => fill("staff@gym.local", "staff123")}
              className="flex w-full flex-col items-start gap-0.5 border-b border-border px-4 py-3 text-start transition-colors hover:bg-accent"
            >
              <span className="text-sm font-medium">{t("staff.roleStaff")}</span>
              <span className="text-xs text-muted-foreground">staff@gym.local</span>
            </button>
            <button
              type="button"
              onClick={() => fill("ahmed.ben.ali.1@member.gym.local", "member123")}
              className="flex w-full flex-col items-start gap-0.5 px-4 py-3 text-start transition-colors hover:bg-accent"
            >
              <span className="text-sm font-medium">{t("login.demo.member")}</span>
              <span className="text-xs text-muted-foreground">
                ahmed.ben.ali.1@member.gym.local
              </span>
            </button>
          </Card>
        </div>

        <LegalFooter />
      </StaggerGroup>
    </div>
  );
}
