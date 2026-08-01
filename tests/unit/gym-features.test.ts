import { describe, expect, it } from "vitest";
import { canAddStaff } from "@/lib/gym-features";

describe("gym-features", () => {
  describe("canAddStaff", () => {
    it("returns false when at max staff", () => {
      expect(canAddStaff(2, 2)).toBe(false);
    });

    it("returns true when under max staff", () => {
      expect(canAddStaff(1, 2)).toBe(true);
    });
  });
});
