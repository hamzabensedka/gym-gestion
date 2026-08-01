import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { PageHeader } from "@/components/ui/page-header";
import { StaggerGroup } from "@/components/ui/stagger-group";
import { prisma } from "@/lib/db";
import { createTranslator } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { getSession } from "@/lib/session";

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session || session.role !== Role.ADMIN) {
    redirect("/scan");
  }

  const gym = await prisma.gym.findUnique({
    where: { id: session.gymId },
    select: {
      name: true,
      location: true,
      onboardingCompletedAt: true,
    },
  });

  if (gym?.onboardingCompletedAt) {
    redirect("/dashboard");
  }

  const locale = await getLocale();
  const t = createTranslator(locale);

  return (
    <StaggerGroup className="mx-auto max-w-2xl space-y-5">
      <PageHeader
        title={t("onboarding.title")}
        subtitle={t("onboarding.subtitle")}
      />
      <OnboardingWizard
        gymName={gym?.name ?? ""}
        gymLocation={gym?.location ?? ""}
      />
    </StaggerGroup>
  );
}
