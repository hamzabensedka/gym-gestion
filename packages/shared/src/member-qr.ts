export function generateMemberQrPayload(memberId: string): string {
  return JSON.stringify({ memberId });
}
