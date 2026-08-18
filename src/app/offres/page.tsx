"use client";

import Link from "next/link";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { useT } from "@/components/i18n/locale-provider";
import { LegalFooter } from "@/components/legal/legal-footer";
import { PublicPlansForm } from "@/components/plans/public-plans-form";
import { Logo } from "@/components/ui/logo";
import { StaggerGroup } from "@/components/ui/stagger-group";

export default function OffresPage() {
  const t = useT();

  return (
    <div className="safe-top safe-bottom flex min-h-dvh flex-col bg-background">
      <header className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2.5">
          <Logo className="size-10" />
          <span className="text-base font-semibold">{t("app.name")}</span>
        </div>
        <LanguageSwitcher />
      </header>

      <StaggerGroup className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-5 pb-8">
        <div>
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center text-sm text-foreground"
          >
            ← {t("common.back")}
          </Link>
          <h1 className="mt-4 text-balance text-3xl font-bold tracking-tight text-foreground">
            {t("plans.title")}
          </h1>
          <p className="mt-2 text-pretty text-sm text-muted-foreground">{t("plans.subtitle")}</p>
        </div>

        <PublicPlansForm />

        <LegalFooter />
      </StaggerGroup>
    </div>
  );
}
