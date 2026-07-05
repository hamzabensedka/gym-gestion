import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemberInviteStatus } from "@prisma/client";
import { issueMemberInvite } from "@/lib/member-invite";
import { resetTestDatabase, findGymId, getPrisma } from "../helpers/db";

const sendMemberInviteEmail = vi.fn();

vi.mock("@/lib/email", () => ({
  sendMemberInviteEmail: (...args: unknown[]) => sendMemberInviteEmail(...args),
}));

describe("member invite integration", () => {
  let gymId: string;

  beforeEach(async () => {
    sendMemberInviteEmail.mockReset();
    sendMemberInviteEmail.mockResolvedValue({ ok: true });
    resetTestDatabase();
    gymId = await findGymId();
  });

  it("issues invite token and sends email", async () => {
    const prisma = await getPrisma();
    const member = await prisma.member.create({
      data: {
        gymId,
        fullName: "Invite Test User",
        phone: `+21655${Date.now().toString().slice(-7)}`,
        email: `invite.test.${Date.now()}@gym.local`,
        subscriptionStart: new Date(),
        subscriptionEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        monthlyFee: 50,
        inviteStatus: null,
      },
    });

    const result = await issueMemberInvite(member.id, gymId);
    expect(result).toEqual({ ok: true });
    expect(sendMemberInviteEmail).toHaveBeenCalledOnce();

    const call = sendMemberInviteEmail.mock.calls[0][0] as {
      to: string;
      gymName: string;
      token: string;
    };
    expect(call.to).toBe(member.email);
    expect(call.token).toHaveLength(64);

    const updated = await prisma.member.findUnique({ where: { id: member.id } });
    expect(updated?.inviteStatus).toBe(MemberInviteStatus.PENDING);
    expect(updated?.inviteToken).toBe(call.token);
    expect(updated?.passwordHash).toBeNull();

    await prisma.$disconnect();
  });

  it("returns error when member has no email", async () => {
    const prisma = await getPrisma();
    const member = await prisma.member.create({
      data: {
        gymId,
        fullName: "No Email User",
        phone: `+21656${Date.now().toString().slice(-7)}`,
        subscriptionStart: new Date(),
        subscriptionEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        monthlyFee: 50,
      },
    });

    const result = await issueMemberInvite(member.id, gymId);
    expect(result).toEqual({ error: "members.inviteNoEmail" });
    expect(sendMemberInviteEmail).not.toHaveBeenCalled();

    await prisma.$disconnect();
  });

  it("returns error when email provider fails", async () => {
    sendMemberInviteEmail.mockResolvedValueOnce({ ok: false, error: "rate limited" });

    const prisma = await getPrisma();
    const member = await prisma.member.create({
      data: {
        gymId,
        fullName: "Email Fail User",
        phone: `+21657${Date.now().toString().slice(-7)}`,
        email: `fail.${Date.now()}@gym.local`,
        subscriptionStart: new Date(),
        subscriptionEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        monthlyFee: 50,
      },
    });

    const result = await issueMemberInvite(member.id, gymId);
    expect(result).toEqual({ error: "members.inviteSendFailed" });

    await prisma.$disconnect();
  });
});
