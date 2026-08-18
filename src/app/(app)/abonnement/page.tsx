import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { GymPlansPanel } from "@/components/plans/gym-plans-panel";
import { PageHeader } from "@/components/ui/page-header";
import { StaggerGroup } from "@/components/ui/stagger-group";
import { prisma } from "@/lib/db";
import { createTranslator } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { getSession } from "@/lib/session";

export default async function AbonnementPage() {
  const session = await getSession();
  if (!session || session.role !== Role.ADMIN) {
    redirect("/scan");
  }

  const locale = await getLocale();
  const t = createTranslator(locale);

  const gym = await prisma.gym.findUnique({
    where: { id: session.gymId },
    select: { plan: true, planTrialEndsAt: true },
  });

  return (
    <StaggerGroup className="mx-auto max-w-4xl space-y-5">
      <PageHeader title={t("nav.subscription")} subtitle={t("plans.subtitle")} />
      <GymPlansPanel
        currentPlan={gym?.plan ?? "STARTER"}
        trialEndsAt={gym?.planTrialEndsAt?.toISOString() ?? null}
      />
    </StaggerGroup>
  );
}
