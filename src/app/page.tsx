import { redirect } from "next/navigation";
import { getDefaultRoute } from "@/lib/auth";
import { getMemberSession } from "@/lib/member-session";
import { getSession } from "@/lib/session";

export default async function HomePage() {
  const staffSession = await getSession();
  if (staffSession) {
    redirect(getDefaultRoute(staffSession.role));
  }

  const memberSession = await getMemberSession();
  if (memberSession) {
    redirect("/member");
  }

  redirect("/login");
}
