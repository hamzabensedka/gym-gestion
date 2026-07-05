import Link from "next/link";
import { Search } from "lucide-react";
import { QrScanner } from "@/components/checkin/qr-scanner";
import { PageHeader } from "@/components/ui/page-header";
import { StaggerGroup } from "@/components/ui/stagger-group";
import { getLocale } from "@/lib/locale";
import { createTranslator } from "@/lib/i18n";

export default async function ScanPage() {
  const locale = await getLocale();
  const t = createTranslator(locale);

  return (
    <StaggerGroup className="mx-auto max-w-md space-y-5">
      <PageHeader title={t("scan.title")} subtitle={t("scan.subtitle")} />
      <QrScanner />
      <Link
        href="/manual"
        className="surface-elevated flex min-h-[44px] items-center justify-center gap-2 rounded-ios-sm bg-[var(--surface)] py-3 text-[15px] font-semibold text-[var(--foreground)] transition-[box-shadow,background-color] duration-150 ease-out hover:bg-[var(--color-fill)]"
      >
        <Search className="size-4" strokeWidth={1.75} />
        {t("scan.switchManual")}
      </Link>
    </StaggerGroup>
  );
}
