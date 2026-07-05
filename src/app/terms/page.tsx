import Link from "next/link";
import { getLocale } from "@/lib/locale";
import { createTranslator } from "@/lib/i18n";
import { LegalFooter } from "@/components/legal/legal-footer";

export const metadata = {
  title: "Terms of Service",
};

export default async function TermsPage() {
  const locale = await getLocale();
  const t = createTranslator(locale);

  const sections = [
    { title: t("legal.termsUseTitle"), body: t("legal.termsUseBody") },
    { title: t("legal.termsAccountTitle"), body: t("legal.termsAccountBody") },
    { title: t("legal.termsDataTitle"), body: t("legal.termsDataBody") },
    { title: t("legal.termsLiabilityTitle"), body: t("legal.termsLiabilityBody") },
    { title: t("legal.termsChangesTitle"), body: t("legal.termsChangesBody") },
  ];

  return (
    <div className="safe-top safe-bottom mx-auto min-h-[100dvh] max-w-2xl px-5 py-8">
      <Link
        href="/login"
        className="mb-6 inline-flex min-h-11 items-center text-sm text-foreground"
      >
        ← {t("common.back")}
      </Link>

      <h1 className="ios-large-title">{t("legal.terms")}</h1>
      <p className="mt-2 text-[15px] text-[var(--secondary-label)]">
        {t("legal.lastUpdated")}: 28/06/2026
      </p>

      <div className="mt-8 space-y-6">
        <p className="text-[17px] leading-relaxed text-[var(--label)]">
          {t("legal.termsIntro")}
        </p>

        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-[20px] font-semibold text-[var(--foreground)]">
              {section.title}
            </h2>
            <p className="mt-2 text-[17px] leading-relaxed text-[var(--label)]">
              {section.body}
            </p>
          </section>
        ))}
      </div>

      <LegalFooter className="mt-12" />
    </div>
  );
}
