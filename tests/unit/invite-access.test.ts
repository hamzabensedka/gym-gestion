import { describe, expect, it } from "vitest";
import { inviteAccessLabel } from "@gym/shared/invite-access";

describe("inviteAccessLabel", () => {
  const now = new Date("2026-08-16T12:00:00.000Z");

  it("returns active for ACTIVE", () => {
    expect(
      inviteAccessLabel({ inviteStatus: "ACTIVE", inviteExpiresAt: null, now }),
    ).toBe("members.inviteStatus.active");
  });

  it("returns disabled for DISABLED", () => {
    expect(
      inviteAccessLabel({ inviteStatus: "DISABLED", inviteExpiresAt: null, now }),
    ).toBe("members.inviteStatus.disabled");
  });

  it("returns expired for PENDING past inviteExpiresAt", () => {
    expect(
      inviteAccessLabel({
        inviteStatus: "PENDING",
        inviteExpiresAt: "2026-08-01T00:00:00.000Z",
        now,
      }),
    ).toBe("members.inviteStatus.expired");
  });

  it("returns pending for PENDING still valid", () => {
    expect(
      inviteAccessLabel({
        inviteStatus: "PENDING",
        inviteExpiresAt: "2026-08-20T00:00:00.000Z",
        now,
      }),
    ).toBe("members.inviteStatus.pending");
  });

  it("returns none when inviteStatus is null", () => {
    expect(
      inviteAccessLabel({ inviteStatus: null, inviteExpiresAt: null, now }),
    ).toBe("members.inviteStatus.none");
  });
});
