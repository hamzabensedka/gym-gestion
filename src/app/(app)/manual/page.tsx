import { ManualCheckinPanel } from "@/components/checkin/manual-checkin";
import { PageHeader } from "@/components/ui/page-header";
import { StaggerGroup } from "@/components/ui/stagger-group";
import { getLocale } from "@/lib/locale";
import { createTranslator } from "@/lib/i18n";

export default async function ManualCheckinPage() {
  const locale = await getLocale();
  const t = createTranslator(locale);

  return (
    <StaggerGroup className="mx-auto max-w-md space-y-5">
      <PageHeader title={t("manual.title")} subtitle={t("manual.subtitle")} />
      <ManualCheckinPanel />
    </StaggerGroup>
  );
}
