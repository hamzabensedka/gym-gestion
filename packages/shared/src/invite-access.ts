import { MemberInviteStatus } from "./member-auth";
import type { TranslationKey } from "./i18n";

export function inviteAccessLabel(input: {
  inviteStatus: string | null;
  inviteExpiresAt: Date | string | null;
  now?: Date;
}): TranslationKey {
  const now = input.now ?? new Date();
  const expiresAt = input.inviteExpiresAt
    ? input.inviteExpiresAt instanceof Date
      ? input.inviteExpiresAt
      : new Date(input.inviteExpiresAt)
    : null;
  const expired =
    input.inviteStatus === MemberInviteStatus.PENDING &&
    expiresAt !== null &&
    expiresAt < now;
  if (input.inviteStatus === MemberInviteStatus.ACTIVE) {
    return "members.inviteStatus.active";
  }
  if (input.inviteStatus === MemberInviteStatus.DISABLED) {
    return "members.inviteStatus.disabled";
  }
  if (expired) return "members.inviteStatus.expired";
  if (input.inviteStatus === MemberInviteStatus.PENDING) {
    return "members.inviteStatus.pending";
  }
  return "members.inviteStatus.none";
}
