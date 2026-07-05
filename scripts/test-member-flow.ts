/**
 * E2E smoke test: member invite → set password → wallet → staff check-in
 * Run: npx tsx scripts/test-member-flow.ts
 */
import { PrismaClient, MemberInviteStatus } from "@prisma/client";
import { generateMemberQrPayload } from "../src/lib/member-qr";
import { parseMemberIdFromQr, performCheckin } from "../src/lib/checkin";

const prisma = new PrismaClient();
const BASE = process.env.APP_URL ?? "http://localhost:3000";
const TEST_EMAIL = `member-e2e-${Date.now()}@test.local`;
const TEST_PASSWORD = "testpass123";

async function main() {
  console.log("=== Member Wallet E2E ===\n");

  const gym = await prisma.gym.findFirst();
  if (!gym) throw new Error("No gym in DB — run npm run db:seed first");

  const admin = await prisma.user.findFirst({
    where: { gymId: gym.id, role: "ADMIN" },
  });
  if (!admin) throw new Error("No admin user — run npm run db:seed first");

  // 1. Create member with invite fields (simulates admin create + invite)
  const inviteToken = Buffer.from(crypto.getRandomValues(new Uint8Array(32)))
    .toString("hex");
  const inviteExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

  const member = await prisma.member.create({
    data: {
      gymId: gym.id,
      fullName: "E2E Test Member",
      phone: `+216${String(Date.now()).slice(-8)}`,
      email: TEST_EMAIL,
      subscriptionStart: new Date(),
      subscriptionEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      inviteToken,
      inviteExpiresAt,
      inviteStatus: MemberInviteStatus.PENDING,
      monthlyFee: 50,
    },
  });
  console.log("✓ Created test member:", member.id);

  // 2. Verify QR payload format
  const qrPayload = generateMemberQrPayload(member.id);
  const parsedId = parseMemberIdFromQr(qrPayload);
  if (parsedId !== member.id) throw new Error(`QR parse failed: ${parsedId}`);
  console.log("✓ QR payload:", qrPayload);

  // 3. Set password via API (invite flow)
  const setPwRes = await fetch(`${BASE}/api/member/auth/set-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token: inviteToken,
      password: TEST_PASSWORD,
      confirmPassword: TEST_PASSWORD,
    }),
  });
  if (!setPwRes.ok) {
    const err = await setPwRes.text();
    throw new Error(`set-password failed: ${setPwRes.status} ${err}`);
  }
  const setPwCookies = setPwRes.headers.getSetCookie?.() ?? [];
  const memberCookie = setPwCookies.find((c) => c.startsWith("member_session="));
  if (!memberCookie) throw new Error("No member_session cookie from set-password");
  console.log("✓ Password set, member session cookie received");

  // 4. GET /api/member/me
  const meRes = await fetch(`${BASE}/api/member/me`, {
    headers: { Cookie: memberCookie.split(";")[0] },
  });
  if (!meRes.ok) throw new Error(`GET /api/member/me failed: ${meRes.status}`);
  const me = await meRes.json();
  if (me.memberId !== member.id) throw new Error("me.memberId mismatch");
  console.log("✓ GET /api/member/me:", me.fullName, me.gymName);

  // 5. GET /api/member/qr
  const qrRes = await fetch(`${BASE}/api/member/qr`, {
    headers: { Cookie: memberCookie.split(";")[0] },
  });
  const qr = await qrRes.json();
  if (qr.payload !== qrPayload) throw new Error("QR API payload mismatch");
  console.log("✓ GET /api/member/qr payload matches");

  // 6. Staff login + check-in
  const staffLoginRes = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: admin.email,
      password: "admin123",
    }),
  });
  if (!staffLoginRes.ok) {
    throw new Error(`Staff login failed: ${staffLoginRes.status} — check seed passwords`);
  }
  const staffCookies = staffLoginRes.headers.getSetCookie?.() ?? [];
  const staffCookie = staffCookies.find((c) => c.startsWith("gym_session="));
  if (!staffCookie) throw new Error("No gym_session cookie");

  const checkinRes = await fetch(`${BASE}/api/checkin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: staffCookie.split(";")[0],
    },
    body: JSON.stringify({ qrData: qrPayload }),
  });
  const checkin = await checkinRes.json();
  if (checkin.outcome !== "GRANTED") {
    throw new Error(`Check-in failed: ${JSON.stringify(checkin)}`);
  }
  console.log("✓ Staff check-in GRANTED for", checkin.memberName);

  // 7. Direct performCheckin (unit sanity)
  const direct = await performCheckin(gym.id, member.id);
  if (direct.outcome !== "GRANTED") throw new Error("Direct checkin failed");
  console.log("✓ performCheckin GRANTED (duplicate visit OK)");

  // Cleanup
  await prisma.member.delete({ where: { id: member.id } });
  console.log("\n✓ Cleanup done");
  console.log("\n=== All E2E checks passed ===");
}

main()
  .catch((e) => {
    console.error("\n✗ E2E failed:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
