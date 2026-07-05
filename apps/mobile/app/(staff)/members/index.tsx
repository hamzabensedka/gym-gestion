import { MembersListScreen } from "@/screens/members-list-screen";

export default function StaffMembersListRoute() {
  return <MembersListScreen isAdmin={false} memberBasePath="/(staff)/members" />;
}
