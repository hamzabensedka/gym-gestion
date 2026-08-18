import { describe, expect, it, vi } from "vitest";
import { Plan } from "@prisma/client";
import { createPlanRequest } from "@gym/shared/plan-requests";

describe("createPlanRequest", () => {
  it("inserts a PUBLIC row and does not update gym", async () => {
    const create = vi.fn().mockResolvedValue({ id: "req1" });
    const update = vi.fn();
    const mailer = vi.fn().mockResolvedValue({ ok: true });
    const result = await createPlanRequest(
      { planRequest: { create }, gym: { update } },
      mailer,
      {
        source: "PUBLIC",
        rateLimitKey: `unit-${Date.now()}`,
        body: {
          gymName: "Nova Gym",
          city: "Sfax",
          phone: "+21620000000",
          email: "nova@test.tn",
          plan: "PRO",
        },
      },
    );
    expect(result).toEqual({ ok: true });
    expect(create).toHaveBeenCalledOnce();
    expect(update).not.toHaveBeenCalled();
    expect(mailer).toHaveBeenCalledOnce();
    const mail = mailer.mock.calls[0][0];
    expect(mail.subject).toContain("PRO");
    expect(mail.subject).toContain("Nova Gym");
  });

  it("rejects requesting the gym's current plan", async () => {
    const create = vi.fn();
    const result = await createPlanRequest(
      { planRequest: { create } },
      vi.fn(),
      {
        source: "GYM",
        body: { plan: "STARTER" },
        gym: { id: "g1", name: "Fit", location: "Mahdia", plan: Plan.STARTER },
        adminEmail: "admin@gym.local",
      },
    );
    expect(result.ok).toBe(false);
    expect(create).not.toHaveBeenCalled();
  });
});
