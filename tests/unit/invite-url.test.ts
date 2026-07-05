import { describe, expect, it } from "vitest";
import {
  buildMobileInviteUrl,
  buildWebInviteUrl,
  normalizeAppScheme,
} from "@gym/shared/member-auth";

describe("invite URL helpers", () => {
  it("normalizes scheme env values with accidental :// suffix", () => {
    expect(normalizeAppScheme("gymgestion://")).toBe("gymgestion");
    expect(normalizeAppScheme("  gymgestion  ")).toBe("gymgestion");
  });

  it("builds mobile invite deep links", () => {
    expect(buildMobileInviteUrl("abc123", "gymgestion://")).toBe(
      "gymgestion://invite/abc123",
    );
  });

  it("builds web invite links", () => {
    expect(buildWebInviteUrl("http://localhost:3000/", "abc123")).toBe(
      "http://localhost:3000/member/invite/abc123",
    );
  });
});
