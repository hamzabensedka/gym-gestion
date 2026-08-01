import { describe, expect, it } from "vitest";
import { isFeatureLockedError } from "../../apps/api/src/lib/features";

describe("isFeatureLockedError", () => {
  it("returns true for FEATURE_LOCKED errors", () => {
    expect(isFeatureLockedError(new Error("FEATURE_LOCKED"))).toBe(true);
  });

  it("returns false for other errors", () => {
    expect(isFeatureLockedError(new Error("OTHER"))).toBe(false);
    expect(isFeatureLockedError("FEATURE_LOCKED")).toBe(false);
    expect(isFeatureLockedError(null)).toBe(false);
  });
});
