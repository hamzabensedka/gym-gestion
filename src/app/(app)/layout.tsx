import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { AppShell } from "@/components/layout/app-shell";
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

  if (session.role === Role.ADMIN || !gymName) {
    const gym = await prisma.gym.findUnique({
      where: { id: session.gymId },
      select: { name: true, onboardingCompletedAt: true },
    });
    if (!gymName) {
      gymName = gym?.name ?? "Gym Gestion";
    }
    onboardingCompletedAt = gym?.onboardingCompletedAt ?? null;
  }

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
    >
      {children}
    </AppShell>
  );
}
