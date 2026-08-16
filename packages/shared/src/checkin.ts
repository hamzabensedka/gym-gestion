import { isMemberActive } from "./auth";
import { isMemberFrozen } from "./freeze";

export type CheckinOutcome =
  | "GRANTED"
  | "EXPIRED"
  | "FROZEN"
  | "NOT_FOUND"
  | "INVALID";

export type CheckinInput = {
  memberId?: string;
  qrData?: string;
  code?: string;
};

export type CheckinMemberSnapshot = {
  status: string;
  subscriptionEnd: Date;
};

export const KIOSK_RESULT_MS = 4000;
export const KIOSK_IDLE_MS = 45000;

export function parseMemberIdFromQr(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const record = parsed as { memberId?: unknown; id?: unknown };
      if (typeof record.memberId === "string" && record.memberId) {
        return record.memberId;
      }
      if (typeof record.id === "string" && record.id) {
        return record.id;
      }
    }
  } catch {
    // Non-JSON member ids, phones, and badge numbers fall through.
  }

  return trimmed;
}

export function resolveCheckinToken(input: CheckinInput): string | null {
  const memberId = input.memberId?.trim();
  if (memberId) return memberId;

  const fromQr = parseMemberIdFromQr(input.qrData ?? "");
  if (fromQr) return fromQr;

  return parseMemberIdFromQr(input.code ?? "");
}

export function decideCheckinOutcome(
  member: CheckinMemberSnapshot | null,
): Exclude<CheckinOutcome, "INVALID"> {
  if (!member) return "NOT_FOUND";
  if (isMemberFrozen(member.status)) return "FROZEN";
  if (!isMemberActive(member.subscriptionEnd)) return "EXPIRED";
  return "GRANTED";
}
