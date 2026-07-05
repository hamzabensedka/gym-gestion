import { redirect } from "next/navigation";
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
  if (!gymName) {
    const gym = await prisma.gym.findUnique({
      where: { id: session.gymId },
      select: { name: true },
    });
    gymName = gym?.name ?? "Gym Gestion";
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
