import { MemberDetailScreen } from "@/screens/member-detail-screen";

export default function StaffMemberDetailRoute() {
  return (
    <MemberDetailScreen canAdmin={false} membersListRoute="/(staff)/members" />
  );
}
