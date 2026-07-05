import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { StaggerGroup } from "@/components/ui/stagger-group";
import { SettingsForms } from "@/components/settings/settings-forms";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getLocale } from "@/lib/locale";
import { createTranslator } from "@/lib/i18n";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session || session.role !== Role.ADMIN) {
    redirect("/scan");
  }

  const locale = await getLocale();
  const t = createTranslator(locale);

  const gym = await prisma.gym.findUnique({
    where: { id: session.gymId },
    select: { name: true, location: true, cardTheme: true },
  });

  return (
    <StaggerGroup className="mx-auto max-w-2xl space-y-5">
      <PageHeader title={t("settings.title")} subtitle={t("settings.subtitle")} />
      <SettingsForms
        gymName={gym?.name ?? ""}
        gymLocation={gym?.location ?? ""}
        cardTheme={gym?.cardTheme ?? "default"}
      />
    </StaggerGroup>
  );
}
