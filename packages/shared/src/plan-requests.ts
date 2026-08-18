import { AccessMode, Plan } from "@prisma/client";
import { isAccessMode, isPlan } from "./plans";

export type PublicLeadInput = {
  gymName: string;
  city: string;
  phone: string;
  email: string;
  plan: Plan;
};

export type ParseOk<T> = { ok: true } & T;
export type ParseFail = { ok: false; error: string };
export type PlanLeadError =
  | "plans.invalidLead"
  | "plans.alreadyCurrent"
  | "plans.rateLimited";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const buckets = new Map<string, { count: number; resetAt: number }>();

function trimStr(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function parsePublicLeadInput(
  body: Record<string, unknown>,
): ParseOk<PublicLeadInput> | ParseFail {
  const gymName = trimStr(body.gymName);
  const city = trimStr(body.city);
  const phone = trimStr(body.phone);
  const email = trimStr(body.email).toLowerCase();
  const planRaw = body.plan;
  if (!gymName || gymName.length > 80) return { ok: false, error: "plans.invalidLead" };
  if (!city || city.length > 80) return { ok: false, error: "plans.invalidLead" };
  if (!phone || phone.length > 30) return { ok: false, error: "plans.invalidLead" };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "plans.invalidLead" };
  if (!isPlan(planRaw)) return { ok: false, error: "plans.invalidLead" };
  return { ok: true, gymName, city, phone, email, plan: planRaw };
}

export function parseGymPlanInput(
  body: Record<string, unknown>,
  currentPlan?: Plan,
): ParseOk<{ plan: Plan }> | ParseFail {
  if (!isPlan(body.plan)) return { ok: false, error: "plans.invalidLead" };
  if (currentPlan && body.plan === currentPlan) {
    return { ok: false, error: "plans.alreadyCurrent" };
  }
  return { ok: true, plan: body.plan };
}

export function parsePlanAccessPatch(
  body: Record<string, unknown>,
): ({ ok: true; accessMode: AccessMode }) | ParseFail {
  if ("plan" in body && body.plan !== undefined) {
    return { ok: false, error: "settings.planLocked" };
  }
  if (!isAccessMode(body.accessMode)) {
    return { ok: false, error: "settings.invalidAccessMode" };
  }
  return { ok: true, accessMode: body.accessMode };
}

export function allowLeadAttempt(
  key: string,
  max = 5,
  windowMs = 60 * 60 * 1000,
): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= max) return false;
  bucket.count += 1;
  return true;
}

export type PlanRequestMailer = (payload: {
  subject: string;
  html: string;
}) => Promise<{ ok: true } | { ok: false; error: string }>;

export type CreatePublicLead = {
  source: "PUBLIC";
  body: Record<string, unknown>;
  rateLimitKey: string;
};

export type CreateGymLead = {
  source: "GYM";
  body: Record<string, unknown>;
  gym: {
    id: string;
    name: string;
    location: string | null;
    plan: Plan;
  };
  adminEmail: string;
  adminPhone?: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildLeadHtml(fields: {
  source: string;
  plan: string;
  gymName: string;
  city: string;
  phone: string;
  email: string;
  gymId?: string;
}): string {
  const rows: Array<[string, string]> = [
    ["Source", fields.source],
    ["Plan", fields.plan],
    ["Gym", fields.gymName],
    ["City", fields.city],
    ["Phone", fields.phone],
    ["Email", fields.email],
  ];
  if (fields.gymId) rows.push(["Gym ID", fields.gymId]);
  rows.push(["Timestamp", new Date().toISOString()]);
  return rows
    .map(
      ([label, value]) =>
        `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`,
    )
    .join("\n");
}

export async function createPlanRequest(
  prisma: {
    planRequest: { create: (args: unknown) => Promise<unknown> };
  },
  mailer: PlanRequestMailer,
  input: CreatePublicLead | CreateGymLead,
): Promise<{ ok: true } | { ok: false; error: string; status?: number }> {
  if (input.source === "PUBLIC") {
    if (!allowLeadAttempt(input.rateLimitKey)) {
      return { ok: false, error: "plans.rateLimited", status: 429 };
    }
    const parsed = parsePublicLeadInput(input.body);
    if (!parsed.ok) return parsed;
    const { plan, gymName, city, phone, email } = parsed;
    await prisma.planRequest.create({
      data: { source: "PUBLIC", plan, gymName, city, phone, email },
    });
    const mailed = await mailer({
      subject: `Nouveau lead ${plan} — ${gymName}`,
      html: buildLeadHtml({ source: "PUBLIC", plan, gymName, city, phone, email }),
    });
    if (!mailed.ok) {
      console.error("[plan-request] Failed to send lead email:", mailed.error);
    }
    return { ok: true };
  }

  const parsed = parseGymPlanInput(input.body, input.gym.plan);
  if (!parsed.ok) return parsed;
  const { plan } = parsed;
  const gymName = input.gym.name;
  const city = input.gym.location ?? "—";
  const phone = input.adminPhone ?? "—";
  const email = input.adminEmail;
  await prisma.planRequest.create({
    data: {
      source: "GYM",
      plan,
      gymId: input.gym.id,
      gymName,
      city,
      phone,
      email,
    },
  });
  const mailed = await mailer({
    subject: `Demande ${plan} — ${gymName} (${input.gym.id})`,
    html: buildLeadHtml({
      source: "GYM",
      plan,
      gymName,
      city,
      phone,
      email,
      gymId: input.gym.id,
    }),
  });
  if (!mailed.ok) {
    console.error("[plan-request] Failed to send lead email:", mailed.error);
  }
  return { ok: true };
}
