import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Plan, Role } from "@prisma/client";
import { AppShell } from "@/components/layout/app-shell";
import { planHasFeature } from "@/lib/plans";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  let gymName = session.gymName;
  let onboardingCompletedAt: Date | null | undefined;
  let plan: Plan = Plan.STARTER;

  const gym = await prisma.gym.findUnique({
    where: { id: session.gymId },
    select: { name: true, onboardingCompletedAt: true, plan: true },
  });
  if (!gymName) {
    gymName = gym?.name ?? "Gym Gestion";
  }
  onboardingCompletedAt = gym?.onboardingCompletedAt ?? null;
  plan = gym?.plan ?? Plan.STARTER;

  if (session.role === Role.ADMIN && onboardingCompletedAt == null) {
    const headerList = await headers();
    const pathname = headerList.get("x-pathname") ?? "";
    if (pathname !== "/onboarding" && !pathname.startsWith("/onboarding/")) {
      redirect("/onboarding");
    }
  }

  return (
    <AppShell
      userName={session.name}
      role={session.role}
      gymName={gymName}
      showKioskNav={planHasFeature(plan, "kiosk")}
      showBillsNav={planHasFeature(plan, "utility_bills")}
      showDrinksNav={planHasFeature(plan, "drinks")}
    >
      {children}
    </AppShell>
  );
}
