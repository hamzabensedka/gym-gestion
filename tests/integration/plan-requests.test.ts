import { describe, expect, it } from "vitest";
import { createPlanRequest } from "@gym/shared/plan-requests";
import { getPrisma } from "../helpers/db";

describe("plan-requests integration", () => {
  it("stores a public lead without changing gym plan", async () => {
    const prisma = await getPrisma();
    const gymBefore = await prisma.gym.findFirst({ select: { id: true, plan: true } });
    const result = await createPlanRequest(prisma, async () => ({ ok: true }), {
      source: "PUBLIC",
      rateLimitKey: `it-${Date.now()}`,
      body: { gymName: "Lead Gym", city: "Tunis", phone: "12", email: `lead${Date.now()}@t.tn`, plan: "GROWTH" },
    });
    expect(result.ok).toBe(true);
    const gymAfter = await prisma.gym.findUnique({ where: { id: gymBefore!.id }, select: { plan: true } });
    expect(gymAfter?.plan).toBe(gymBefore?.plan);
    await prisma.$disconnect();
  });
});
