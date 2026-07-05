import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { StaggerGroup } from "@/components/ui/stagger-group";
import { GroupedSection, GroupedRow } from "@/components/ui/card";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { PasswordForm } from "@/components/settings/password-form";
import { LegalFooter } from "@/components/legal/legal-footer";
import { Languages, FileText, Settings } from "lucide-react";
import { getSession } from "@/lib/session";
import { canAccessDesk, canAccessAdmin } from "@/lib/auth";
import { getLocale } from "@/lib/locale";
import { createTranslator } from "@/lib/i18n";

export default async function AccountPage() {
  const session = await getSession();
  if (!session || !canAccessDesk(session.role)) {
    redirect("/login");
  }

  const locale = await getLocale();
  const t = createTranslator(locale);
  const isAdmin = canAccessAdmin(session.role);

  return (
    <StaggerGroup className="mx-auto max-w-2xl space-y-5">
      <PageHeader title={t("account.title")} subtitle={t("account.subtitle")} />

      <GroupedSection title={t("settings.language")}>
        <GroupedRow className="justify-between">
          <div className="flex items-center gap-3">
            <Languages className="size-5 text-foreground" strokeWidth={1.75} />
            <span className="text-[17px]">{t("settings.language")}</span>
          </div>
          <LanguageSwitcher />
        </GroupedRow>
      </GroupedSection>

      <PasswordForm />

      {isAdmin ? (
        <GroupedSection title={t("settings.title")}>
          <Link
            href="/settings"
            className="ios-row ios-row-interactive gap-3 text-sm text-foreground"
          >
            <Settings className="size-5 shrink-0" strokeWidth={1.75} />
            {t("account.gymSettings")}
          </Link>
        </GroupedSection>
      ) : null}

      <GroupedSection title={t("settings.legal")}>
        <Link href="/privacy" className="ios-row ios-row-interactive gap-3 text-sm text-foreground">
          <FileText className="size-5 shrink-0" strokeWidth={1.75} />
          {t("legal.privacy")}
        </Link>
        <Link href="/terms" className="ios-row ios-row-interactive gap-3 text-sm text-foreground">
          <FileText className="size-5 shrink-0" strokeWidth={1.75} />
          {t("legal.terms")}
        </Link>
      </GroupedSection>

      <LegalFooter />
    </StaggerGroup>
  );
}
