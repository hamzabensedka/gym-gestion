import { MemberDetailScreen } from "@/screens/member-detail-screen";

export default function AdminMemberDetailRoute() {
  return <MemberDetailScreen canAdmin membersListRoute="/(admin)/members" />;
}
