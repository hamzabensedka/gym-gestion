import { MemberStatus } from "@prisma/client";

export type AccessExportMember = {
  fullName: string;
  phone: string;
  badgeNumber: string | null;
  status: MemberStatus;
  subscriptionEnd: Date;
  frozenAt: Date | null;
};

export function isMemberAllowedForDoor(
  member: AccessExportMember,
  now: Date = new Date(),
): boolean {
  if (!member.badgeNumber?.trim()) return false;
  if (member.status !== MemberStatus.ACTIVE) return false;
  if (member.frozenAt) return false;
  if (member.subscriptionEnd < now) return false;
  return true;
}

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function buildAccessExportCsv(
  members: AccessExportMember[],
  now: Date = new Date(),
): string {
  const header = "badgeNumber,fullName,phone,allowed,subscriptionEnd";
  const rows = members
    .filter((m) => m.badgeNumber?.trim())
    .map((m) => {
      const allowed = isMemberAllowedForDoor(m, now) ? "1" : "0";
      return [
        escapeCsv(m.badgeNumber!.trim()),
        escapeCsv(m.fullName),
        escapeCsv(m.phone),
        allowed,
        m.subscriptionEnd.toISOString().slice(0, 10),
      ].join(",");
    });
  return `\uFEFF${[header, ...rows].join("\n")}\n`;
}
