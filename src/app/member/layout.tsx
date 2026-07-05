import { redirect } from "next/navigation";
import { getMemberSession } from "@/lib/member-session";

export default async function MemberRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

export async function ensureMemberSession() {
  const session = await getMemberSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}
