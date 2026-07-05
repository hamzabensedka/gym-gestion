import { describe, it, expect } from "vitest";
import {
  loginSchema,
  memberSchema,
  memberSetPasswordSchema,
  staffSchema,
  gymSchema,
  paymentSchema,
} from "@/lib/validations";

describe("validations", () => {
  it("accepts valid staff login", () => {
    const result = loginSchema.safeParse({
      email: "admin@gym.local",
      password: "admin123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid login email", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "admin123",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid member form data", () => {
    const result = memberSchema.safeParse({
      fullName: "Test Member",
      phone: "+21620123456",
      subscriptionStart: "2026-01-01",
      subscriptionEnd: "2026-02-01",
      monthlyFee: 80,
    });
    expect(result.success).toBe(true);
  });

  it("rejects member form with short phone", () => {
    const result = memberSchema.safeParse({
      fullName: "Test",
      phone: "123",
      subscriptionStart: "2026-01-01",
      subscriptionEnd: "2026-02-01",
      monthlyFee: 80,
    });
    expect(result.success).toBe(false);
  });

  it("requires matching passwords on invite setup", () => {
    const result = memberSetPasswordSchema.safeParse({
      token: "abc",
      password: "secret12",
      confirmPassword: "different",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid staff creation payload", () => {
    const result = staffSchema.safeParse({
      name: "New Staff",
      email: "new@gym.local",
      password: "staff123",
      role: "STAFF",
    });
    expect(result.success).toBe(true);
  });

  it("accepts gym settings payload", () => {
    const result = gymSchema.safeParse({
      name: "FitClub",
      location: "Tunis",
      cardTheme: "default",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid payment data", () => {
    const result = paymentSchema.safeParse({
      amount: 80,
      method: "CASH",
      paidAt: "2026-07-05",
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-positive payment amount", () => {
    const result = paymentSchema.safeParse({
      amount: 0,
      method: "CASH",
      paidAt: "2026-07-05",
    });
    expect(result.success).toBe(false);
  });
});
