import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { StaggerGroup } from "@/components/ui/stagger-group";
import { StaffManager } from "@/components/staff/staff-manager";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getLocale } from "@/lib/locale";
import { createTranslator } from "@/lib/i18n";

export default async function StaffPage() {
  const session = await getSession();
  if (!session || session.role !== Role.ADMIN) {
    redirect("/scan");
  }

  const locale = await getLocale();
  const t = createTranslator(locale);

  const users = await prisma.user.findMany({
    where: { gymId: session.gymId },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: { id: true, name: true, email: true, role: true },
  });

  return (
    <StaggerGroup className="mx-auto max-w-2xl space-y-5">
      <PageHeader title={t("staff.title")} subtitle={t("staff.subtitle")} />
      <StaffManager users={users} currentUserId={session.userId} />
    </StaggerGroup>
  );
}
