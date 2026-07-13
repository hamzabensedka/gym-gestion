import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  clearLastDevInviteEmail,
  getLastDevInviteEmail,
  sendMemberInviteEmail,
} from "@/lib/email";

describe("sendMemberInviteEmail", () => {
  const originalResendKey = process.env.RESEND_API_KEY;
  const originalAppUrl = process.env.APP_URL;

  beforeEach(() => {
    clearLastDevInviteEmail();
    delete process.env.RESEND_API_KEY;
    process.env.APP_URL = "http://localhost:3001";
  });

  afterEach(() => {
    if (originalResendKey === undefined) {
      delete process.env.RESEND_API_KEY;
    } else {
      process.env.RESEND_API_KEY = originalResendKey;
    }
    process.env.APP_URL = originalAppUrl;
    clearLastDevInviteEmail();
  });

  it("captures invite details in dev mode when Resend is not configured", async () => {
    const result = await sendMemberInviteEmail({
      to: "member@test.local",
      gymName: "FitBox Mahdia",
      token: "abc123token",
    });

    expect(result).toEqual({ ok: true, dev: true });
    expect(getLastDevInviteEmail()).toEqual({
      to: "member@test.local",
      gymName: "FitBox Mahdia",
      token: "abc123token",
      inviteUrl: "http://localhost:3001/member/invite/abc123token",
    });
  });
});
