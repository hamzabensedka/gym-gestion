import Link from "next/link";
import { getLocale } from "@/lib/locale";
import { createTranslator } from "@/lib/i18n";
import { LegalFooter } from "@/components/legal/legal-footer";

export const metadata = {
  title: "Privacy Policy",
};

export default async function PrivacyPage() {
  const locale = await getLocale();
  const t = createTranslator(locale);

  const sections = [
    { title: t("legal.privacyDataTitle"), body: t("legal.privacyDataBody") },
    { title: t("legal.privacyCameraTitle"), body: t("legal.privacyCameraBody") },
    { title: t("legal.privacyStorageTitle"), body: t("legal.privacyStorageBody") },
    { title: t("legal.privacyRightsTitle"), body: t("legal.privacyRightsBody") },
    { title: t("legal.privacyContactTitle"), body: t("legal.privacyContactBody") },
  ];

  return (
    <div className="safe-top safe-bottom mx-auto min-h-[100dvh] max-w-2xl px-5 py-8">
      <Link
        href="/login"
        className="mb-6 inline-flex min-h-11 items-center text-sm text-foreground"
      >
        ← {t("common.back")}
      </Link>

      <h1 className="ios-large-title">{t("legal.privacy")}</h1>
      <p className="mt-2 text-[15px] text-[var(--secondary-label)]">
        {t("legal.lastUpdated")}: 28/06/2026
      </p>

      <div className="mt-8 space-y-6">
        <p className="text-[17px] leading-relaxed text-[var(--label)]">
          {t("legal.privacyIntro")}
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
