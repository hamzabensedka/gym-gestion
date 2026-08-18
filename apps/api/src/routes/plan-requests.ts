import { Hono } from "hono";
import { createPlanRequest } from "@gym/shared/plan-requests";
import { prisma } from "../db";
import { sendPlanLeadEmail } from "../services/email";

export const publicPlanRequestRoutes = new Hono();

function publicRateLimitKey(forwardedFor: string | undefined, email: unknown) {
  const forwarded = forwardedFor?.split(",")[0]?.trim() ?? "unknown";
  const mail = typeof email === "string" ? email.trim().toLowerCase() : "";
  return `${forwarded}:${mail}`;
}

publicPlanRequestRoutes.post("/", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const result = await createPlanRequest(prisma, sendPlanLeadEmail, {
    source: "PUBLIC",
    rateLimitKey: publicRateLimitKey(c.req.header("x-forwarded-for"), body.email),
    body,
  });
  if (!result.ok) {
    const status = result.status === 429 ? 429 : 422;
    const code = result.status === 429 ? "RATE_LIMITED" : "VALIDATION";
    return c.json({ error: { code, message: result.error } }, status);
  }
  return c.json({ data: { ok: true } });
});
