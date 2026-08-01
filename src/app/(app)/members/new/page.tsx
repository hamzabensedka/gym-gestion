import Link from "next/link";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createMemberAction } from "@/app/actions/members";
import { MemberForm } from "@/components/members/member-form";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StaggerGroup } from "@/components/ui/stagger-group";
import { getSession } from "@/lib/session";
import { getLocale } from "@/lib/locale";
import { createTranslator } from "@/lib/i18n";
import { getGymBilling } from "@/lib/gym-features";
import { planHasFeature } from "@/lib/plans";

export default async function NewMemberPage() {
  const session = await getSession();
  if (!session || session.role !== Role.ADMIN) {
    redirect("/scan");
  }

  const locale = await getLocale();
  const t = createTranslator(locale);
  const gym = await getGymBilling(session.gymId);
  const showBadgeField = planHasFeature(gym.plan, "badge_numbers");

  return (
    <StaggerGroup className="mx-auto max-w-xl space-y-5">
      <Link
        href="/members"
        className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-foreground"
      >
        <ArrowLeft className="size-4 flip-rtl" />
        {t("nav.members")}
      </Link>

      <PageHeader title={t("form.newTitle")} subtitle={t("form.newSubtitle")} />

      <Card>
        <MemberForm action={createMemberAction} mode="create" showBadgeField={showBadgeField} />
      </Card>
    </StaggerGroup>
  );
}
