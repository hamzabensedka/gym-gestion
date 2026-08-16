import Link from "next/link";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { PageHeader } from "@/components/ui/page-header";
import { StaggerGroup } from "@/components/ui/stagger-group";
import { buttonVariants } from "@/components/ui/button";
import { KioskPanel } from "@/components/kiosk/kiosk-panel";
import { getGymBilling } from "@/lib/gym-features";
import { createTranslator } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { planHasFeature } from "@/lib/plans";
import { getSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export default async function KioskPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const locale = await getLocale();
  const t = createTranslator(locale);
  const gym = await getGymBilling(session.gymId);
  const unlocked = planHasFeature(gym.plan, "kiosk");
  const canUpgrade = session.role === Role.ADMIN;

  if (unlocked) {
    return <KioskPanel gymName={session.gymName ?? "Gym Gestion"} />;
  }

  return (
    <StaggerGroup className="mx-auto max-w-2xl space-y-5">
      <PageHeader title={t("kiosk.title")} subtitle={t("kiosk.lockedSubtitle")} />
      <div className="space-y-4">
        <p className="text-pretty text-sm text-muted-foreground">{t("kiosk.comingSoon")}</p>
        {canUpgrade ? (
          <Link
            href="/settings"
            className={cn(buttonVariants({ variant: "default" }), "inline-flex")}
          >
            {t("kiosk.upgradeCta")}
          </Link>
        ) : null}
      </div>
    </StaggerGroup>
  );
}
