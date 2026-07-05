import { MembersListScreen } from "@/screens/members-list-screen";

export default function AdminMembersListRoute() {
  return <MembersListScreen isAdmin memberBasePath="/(admin)/members" />;
}
