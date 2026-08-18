# Plan cards, leads, and locked gym subscription — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gyms see animated Starter/Growth/Pro cards (web + Expo) before and after login, can request a plan by email + DB row, and can never change `Gym.plan` themselves.

**Architecture:** Shared catalog + payload parsers in `@gym/shared`. One `createPlanRequest` helper (injected Prisma + mailer) used by Next server actions and the Hono API. Public `POST /v1/plan-requests` and admin `POST /v1/settings/plan-requests` never write `Gym.plan`. Settings/onboarding stop accepting a client-supplied plan. UI is a pricing-card screen, not a select.

**Tech Stack:** Next.js App Router, Expo Router, Prisma 6, PostgreSQL, Hono, Vitest, Playwright, existing i18n (`packages/shared/src/i18n.ts` + `src/lib/i18n.ts`), Resend (optional).

**Spec:** `docs/superpowers/specs/2026-08-18-plan-leads-subscription-design.md`

## Global Constraints

- FR + AR strings in **both** `packages/shared/src/i18n.ts` and `src/lib/i18n.ts` (keep keys identical).
- Gym admins must not write `Gym.plan` (Settings, onboarding, `PATCH /settings/plan-access`, public lead).
- `LEADS_INBOX_EMAIL` is server-only. Fallback `bensedkahamza@gmail.com`. Never `NEXT_PUBLIC_` for the inbox.
- WhatsApp: `NEXT_PUBLIC_LEADS_WHATSAPP` and `EXPO_PUBLIC_LEADS_WHATSAPP` = `330765683583`. Hide the button if empty.
- Motion: stagger ~80–100ms, `active:scale-[0.96]`, no `transition-all`. Native press scale `0.96`.
- No Stripe, no self-signup, no operator approval UI.
- Windows: do not chain shell commands with `&&`. Local Prisma: add a numbered SQL folder under `prisma/migrations/`.
- Do not commit `.env`, `.superpowers/`, or `scripts/prod-migrate.mjs`.
- Every task: tests for files it touches, then commit.

## File map

| File | Responsibility |
|------|----------------|
| `prisma/schema.prisma` | `PlanRequest`, enums, `Gym.planTrialEndsAt` |
| `prisma/migrations/20260818180000_plan_requests/migration.sql` | SQL for Neon later |
| `packages/shared/src/plan-catalog.ts` | Card copy keys + includes per plan |
| `packages/shared/src/plan-requests.ts` | Parse payloads, rate limit, `createPlanRequest` |
| `packages/shared/src/i18n.ts` | New FR/AR keys |
| `src/lib/i18n.ts` | Same keys |
| `src/lib/email.ts` + `apps/api/src/services/email.ts` | `sendPlanLeadEmail` |
| `apps/api/src/routes/plan-requests.ts` | Public POST |
| `apps/api/src/routes/app.ts` | Admin POST + lock PATCH plan-access + `planTrialEndsAt` on GET |
| `apps/api/src/index.ts` | Mount public route |
| `src/app/actions/plan-requests.ts` | Web public + gym request actions |
| `src/app/actions/settings.ts` | Access mode only |
| `src/app/actions/onboarding.ts` | Do not write `plan` |
| `src/components/plans/plan-cards.tsx` | Animated web cards |
| `src/app/offres/page.tsx` | Public page |
| `src/app/(app)/abonnement/page.tsx` | Logged-in admin page |
| `src/components/layout/app-shell.tsx` | Plus → Gérer l’abonnement |
| `src/components/settings/settings-forms.tsx` | Read-only plan |
| `src/app/login/page.tsx` | Voir les offres |
| `apps/mobile/app/(auth)/offres.tsx` | Public mobile |
| `apps/mobile/app/(admin)/abonnement.tsx` | Logged-in mobile |
| `apps/mobile/lib/navigation.ts` + tab bar / more sheet | Plus item |
| `apps/mobile/app/(admin)/settings.tsx` | Remove plan chips |
| `.env.example` | New env keys |

---

### Task 1: Prisma — PlanRequest + trial date

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260818180000_plan_requests/migration.sql`
- Test: none yet (schema only). Verify with `npx prisma validate`

**Interfaces:**
- Produces: enums `PlanRequestSource` (`PUBLIC` \| `GYM`), `PlanRequestStatus` (`NEW` \| `CONTACTED` \| `DONE`); model `PlanRequest`; `Gym.planTrialEndsAt DateTime?`; `Gym.planRequests PlanRequest[]`

- [ ] **Step 1: Add enums and models to `prisma/schema.prisma`**

After `enum PlanStatus`, add:

```prisma
enum PlanRequestSource {
  PUBLIC
  GYM
}

enum PlanRequestStatus {
  NEW
  CONTACTED
  DONE
}
```

On `model Gym`, add:

```prisma
  planTrialEndsAt DateTime?
  planRequests    PlanRequest[]
```

After `model Gym`, add:

```prisma
model PlanRequest {
  id        String             @id @default(cuid())
  source    PlanRequestSource
  status    PlanRequestStatus  @default(NEW)
  plan      Plan
  gymName   String
  city      String
  phone     String
  email     String
  gymId     String?
  gym       Gym?               @relation(fields: [gymId], references: [id], onDelete: SetNull)
  createdAt DateTime           @default(now())

  @@index([email, createdAt])
  @@index([gymId])
}
```

- [ ] **Step 2: Write migration SQL**

Create `prisma/migrations/20260818180000_plan_requests/migration.sql`:

```sql
CREATE TYPE "PlanRequestSource" AS ENUM ('PUBLIC', 'GYM');
CREATE TYPE "PlanRequestStatus" AS ENUM ('NEW', 'CONTACTED', 'DONE');

ALTER TABLE "Gym" ADD COLUMN "planTrialEndsAt" TIMESTAMP(3);

CREATE TABLE "PlanRequest" (
    "id" TEXT NOT NULL,
    "source" "PlanRequestSource" NOT NULL,
    "status" "PlanRequestStatus" NOT NULL DEFAULT 'NEW',
    "plan" "Plan" NOT NULL,
    "gymName" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "gymId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlanRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PlanRequest_email_createdAt_idx" ON "PlanRequest"("email", "createdAt");
CREATE INDEX "PlanRequest_gymId_idx" ON "PlanRequest"("gymId");

ALTER TABLE "PlanRequest" ADD CONSTRAINT "PlanRequest_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

- [ ] **Step 3: Validate schema**

Run: `npx prisma validate`  
Expected: exit 0

Locally also run `npx prisma db push` against the dev DB if needed so generate matches.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260818180000_plan_requests/migration.sql
git commit -m "feat(db): add plan requests and gym trial end date"
```

---

### Task 2: Shared catalog, parsers, i18n

**Files:**
- Create: `packages/shared/src/plan-catalog.ts`
- Create: `packages/shared/src/plan-requests.ts` (parsers + rate limit only in this task)
- Modify: `packages/shared/src/index.ts` — `export * from "./plan-catalog"` and `export * from "./plan-requests"`
- Modify: `packages/shared/package.json` exports for `./plan-catalog` and `./plan-requests` (same pattern as `./plans`)
- Modify: `packages/shared/src/i18n.ts` and `src/lib/i18n.ts` (identical new keys)
- Test: `tests/unit/plan-requests.test.ts`

**Interfaces:**
- Produces: `PLAN_CATALOG`, `parsePublicLeadInput`, `parseGymPlanInput`, `allowLeadAttempt`, `PlanLeadError`

- [ ] **Step 1: Write failing tests** in `tests/unit/plan-requests.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { Plan } from "@prisma/client";
import { PLAN_CATALOG } from "@gym/shared/plan-catalog";
import {
  allowLeadAttempt,
  parseGymPlanInput,
  parsePublicLeadInput,
} from "@gym/shared/plan-requests";

describe("PLAN_CATALOG", () => {
  it("has starter, growth, and pro in that order", () => {
    expect(PLAN_CATALOG.map((row) => row.plan)).toEqual([
      Plan.STARTER,
      Plan.GROWTH,
      Plan.PRO,
    ]);
  });

  it("lists class_booking on growth and pro only", () => {
    const byPlan = Object.fromEntries(
      PLAN_CATALOG.map((row) => [row.plan, row.includeKeys]),
    );
    expect(byPlan.STARTER).not.toContain("plans.feature.classes");
    expect(byPlan.GROWTH).toContain("plans.feature.classes");
    expect(byPlan.PRO).toContain("plans.feature.badges");
  });
});

describe("parsePublicLeadInput", () => {
  const valid = {
    gymName: " FitBox Tunis ",
    city: "Tunis",
    phone: "+21620123456",
    email: "owner@test.tn",
    plan: "GROWTH",
  };

  it("trims fields and accepts a valid lead", () => {
    expect(parsePublicLeadInput(valid)).toEqual({
      gymName: "FitBox Tunis",
      city: "Tunis",
      phone: "+21620123456",
      email: "owner@test.tn",
      plan: Plan.GROWTH,
    });
  });

  it("rejects missing fields and bad plan", () => {
    expect(parsePublicLeadInput({ ...valid, gymName: "" }).ok).toBe(false);
    expect(parsePublicLeadInput({ ...valid, email: "nope" }).ok).toBe(false);
    expect(parsePublicLeadInput({ ...valid, plan: "ENTERPRISE" }).ok).toBe(false);
  });
});

describe("parseGymPlanInput", () => {
  it("accepts a plan enum string", () => {
    expect(parseGymPlanInput({ plan: "PRO" })).toEqual({ plan: Plan.PRO });
  });

  it("rejects the gym's current plan", () => {
    const result = parseGymPlanInput({ plan: "GROWTH" }, Plan.GROWTH);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("plans.alreadyCurrent");
  });
});

describe("allowLeadAttempt", () => {
  it("allows five hits then blocks the sixth in the same window", () => {
    const key = `test-${Date.now()}`;
    for (let i = 0; i < 5; i += 1) {
      expect(allowLeadAttempt(key)).toBe(true);
    }
    expect(allowLeadAttempt(key)).toBe(false);
  });
});
```

Note: `parsePublicLeadInput` should return `{ ok: true, ...data } | { ok: false, error: string }` so the “rejects” tests work. Adjust the success case to unwrap `.ok` if you use that shape consistently:

Preferred shape for all parsers:

```ts
export type ParseOk<T> = { ok: true } & T;
export type ParseFail = { ok: false; error: string };
```

Success test becomes `expect(parsePublicLeadInput(valid)).toMatchObject({ ok: true, gymName: "FitBox Tunis", plan: Plan.GROWTH })`.

- [ ] **Step 2: Run tests — expect FAIL**

Run: `npx vitest run tests/unit/plan-requests.test.ts`  
Expected: FAIL (module not found)

- [ ] **Step 3: Implement catalog + parsers**

`packages/shared/src/plan-catalog.ts`:

```ts
import { Plan } from "@prisma/client";
import type { TranslationKey } from "./i18n";

export type PlanCardDef = {
  plan: Plan;
  pitchKey: TranslationKey;
  includeKeys: TranslationKey[];
  staffSeats: number;
};

export const PLAN_CATALOG: PlanCardDef[] = [
  {
    plan: Plan.STARTER,
    pitchKey: "plans.pitch.STARTER",
    staffSeats: 2,
    includeKeys: [
      "plans.feature.members",
      "plans.feature.deskCheckin",
      "plans.feature.bills",
    ],
  },
  {
    plan: Plan.GROWTH,
    pitchKey: "plans.pitch.GROWTH",
    staffSeats: 5,
    includeKeys: [
      "plans.feature.members",
      "plans.feature.deskCheckin",
      "plans.feature.bills",
      "plans.feature.kiosk",
      "plans.feature.classes",
      "plans.feature.drinks",
      "plans.feature.csv",
    ],
  },
  {
    plan: Plan.PRO,
    pitchKey: "plans.pitch.PRO",
    staffSeats: 10,
    includeKeys: [
      "plans.feature.members",
      "plans.feature.deskCheckin",
      "plans.feature.bills",
      "plans.feature.kiosk",
      "plans.feature.classes",
      "plans.feature.drinks",
      "plans.feature.csv",
      "plans.feature.badges",
      "plans.feature.accessExport",
    ],
  },
];
```

`packages/shared/src/plan-requests.ts` (this task: parse + rate limit only):

```ts
import { Plan } from "@prisma/client";
import { isPlan } from "./plans";

export type PublicLeadInput = {
  gymName: string;
  city: string;
  phone: string;
  email: string;
  plan: Plan;
};

export type ParseFail = { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const buckets = new Map<string, { count: number; resetAt: number }>();

function trimStr(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function parsePublicLeadInput(
  body: Record<string, unknown>,
): ({ ok: true } & PublicLeadInput) | ParseFail {
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
): ({ ok: true; plan: Plan } ) | ParseFail {
  if (!isPlan(body.plan)) return { ok: false, error: "plans.invalidLead" };
  if (currentPlan && body.plan === currentPlan) {
    return { ok: false, error: "plans.alreadyCurrent" };
  }
  return { ok: true, plan: body.plan };
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
```

Add i18n keys to **both** dictionaries (FR and AR blocks). FR:

```
"nav.subscription": "Gérer l'abonnement",
"plans.title": "Offres",
"plans.subtitle": "Choisissez l'offre. Nous vous contactons — pas de paiement dans l'app.",
"plans.seeOffers": "Voir les offres",
"plans.manualPay": "Paiement manuel : poste, TapTap Send, EasyTransfer",
"plans.current": "Plan actuel",
"plans.requestThis": "Demander ce plan",
"plans.choose": "Choisir",
"plans.leadName": "Nom de la salle",
"plans.leadCity": "Ville",
"plans.leadPhone": "Téléphone",
"plans.leadEmail": "E-mail",
"plans.submit": "Envoyer la demande",
"plans.success": "Demande envoyée. Nous vous contactons pour un échange.",
"plans.whatsapp": "Écrire sur WhatsApp",
"plans.trialUntil": "Essai jusqu'au {date}",
"plans.alreadyCurrent": "C'est déjà votre plan.",
"plans.invalidLead": "Vérifiez les champs du formulaire.",
"plans.rateLimited": "Trop de demandes. Réessayez plus tard.",
"plans.pitch.STARTER": "Accueil / bureau",
"plans.pitch.GROWTH": "Kiosque, cours et boissons",
"plans.pitch.PRO": "Badges et logiciel d'accès existant",
"plans.feature.members": "Membres, paiements et freeze",
"plans.feature.deskCheckin": "Check-in à l'accueil",
"plans.feature.bills": "Charges (eau, électricité…)",
"plans.feature.kiosk": "Kiosque self check-in",
"plans.feature.classes": "Cours et réservations",
"plans.feature.drinks": "Boissons",
"plans.feature.csv": "Export CSV",
"plans.feature.badges": "Numéros de badge",
"plans.feature.accessExport": "Export liste autorisée",
"plans.staffSeats": "{n} sièges staff",
```

AR: matching Arabic for each key (same key names). `"nav.subscription"`: `"إدارة الاشتراك"`.

Export new modules from `packages/shared/src/index.ts` and `package.json` `exports`.

- [ ] **Step 4: Run tests — expect PASS**

Run: `npx vitest run tests/unit/plan-requests.test.ts`  
Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/shared src/lib/i18n.ts tests/unit/plan-requests.test.ts
git commit -m "feat(plans): add catalog, lead parsers, and i18n"
```

---

### Task 3: Persist + email helper

**Files:**
- Modify: `packages/shared/src/plan-requests.ts` — add `createPlanRequest`
- Modify: `src/lib/email.ts` — `sendPlanLeadEmail` + `getLastDevPlanLeadEmail` for tests
- Modify: `apps/api/src/services/email.ts` — same send function (copy pattern from invites)
- Test: `tests/unit/plan-request-create.test.ts` (mock prisma + mailer)

**Interfaces:**
- Consumes: `parsePublicLeadInput`, `parseGymPlanInput`
- Produces: `createPlanRequest(prisma, mailer, input)` — **must not** call `prisma.gym.update`

```ts
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

export async function createPlanRequest(
  prisma: {
    planRequest: { create: (args: unknown) => Promise<unknown> };
  },
  mailer: PlanRequestMailer,
  input: CreatePublicLead | CreateGymLead,
): Promise<{ ok: true } | { ok: false; error: string; status?: number }>
```

- [ ] **Step 1: Failing test** `tests/unit/plan-request-create.test.ts`

```ts
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
```

- [ ] **Step 2: Run — FAIL** (createPlanRequest missing)

Run: `npx vitest run tests/unit/plan-request-create.test.ts`

- [ ] **Step 3: Implement `createPlanRequest`**

On PUBLIC: `allowLeadAttempt(rateLimitKey)` else `{ ok: false, error: "plans.rateLimited", status: 429 }`. Parse body. `prisma.planRequest.create({ data: { source: "PUBLIC", plan, gymName, city, phone, email } })`. Mail subject `Nouveau lead ${plan} — ${gymName}`. HTML: escaped fields + source + ISO timestamp.

On GYM: `parseGymPlanInput(body, gym.plan)`. Create with `source: "GYM"`, `gymId: gym.id`, `gymName: gym.name`, `city: gym.location ?? "—"`, `phone: adminPhone ?? "—"`, `email: adminEmail`. Subject `Demande ${plan} — ${gymName} (${gymId})`.

If mailer returns `{ ok: false }`, still return `{ ok: true }` (row exists). Log the mail error.

Add `sendPlanLeadEmail` in `src/lib/email.ts`:

```ts
export async function sendPlanLeadEmail(input: { subject: string; html: string }) {
  const to = process.env.LEADS_INBOX_EMAIL ?? "bensedkahamza@gmail.com";
  if (!resend) {
    console.info("[email:dev] Plan lead", { to, subject: input.subject });
    return { ok: true as const, dev: true };
  }
  const { error } = await resend.emails.send({
    from: getFromAddress(),
    to,
    subject: input.subject,
    html: input.html,
  });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}
```

Mirror in `apps/api/src/services/email.ts`.

- [ ] **Step 4: Tests PASS**

Run: `npx vitest run tests/unit/plan-request-create.test.ts tests/unit/plan-requests.test.ts`

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(plans): persist plan requests and email the operator"
```

---

### Task 4: Lock gym self-serve plan changes

**Files:**
- Modify: `apps/api/src/routes/app.ts` — `PATCH /plan-access` and `GET /`
- Modify: `src/app/actions/settings.ts` — `updatePlanAndAccessAction` / `updatePlanAction`
- Modify: `src/app/actions/onboarding.ts` — do not write `plan` or `maxStaff` from client plan
- Modify: `src/components/settings/settings-forms.tsx`
- Modify: `apps/mobile/app/(admin)/settings.tsx`
- Test: `tests/unit/plan-access-lock.test.ts` + extend onboarding integration if one exists

**Interfaces:**
- PATCH body must be `{ accessMode }` only. If `plan` is present → **400** `{ code: "VALIDATION", message: "settings.planLocked" }`
- GET `/v1/settings` adds `planTrialEndsAt: string | null`
- `completeOnboardingAction` updates `accessMode` from `suggestFromEntryAnswer(entry).accessMode` clamped to **current** `gym.plan` via `modesAllowedForPlan(gym.plan)`. Does not set `plan` or `maxStaff`.

- [ ] **Step 1: Failing unit test** for PATCH parser

Add `parsePlanAccessPatch(body)` in `packages/shared/src/plan-requests.ts` (or `plans.ts`):

```ts
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
```

Test in `tests/unit/plan-access-lock.test.ts`:

```ts
it("rejects a body that includes plan", () => {
  const result = parsePlanAccessPatch({ plan: "PRO", accessMode: "DESK_ONLY" });
  expect(result.ok).toBe(false);
});

it("accepts accessMode only", () => {
  const result = parsePlanAccessPatch({ accessMode: "KIOSK" });
  expect(result).toEqual({ ok: true, accessMode: AccessMode.KIOSK });
});
```

- [ ] **Step 2: FAIL then implement parser + wire PATCH**

`settingsRoutes.patch("/plan-access"`: parse with `parsePlanAccessPatch`. Load gym. Clamp mode with `modesAllowedForPlan(gym.plan)`. Update `{ accessMode }` only.

Web `updatePlanAndAccessAction`: stop reading `plan`. Only `accessMode`. Add i18n `settings.planLocked`: `"Le plan se change depuis Gérer l'abonnement."` / AR equivalent.

`updatePlanAction`: return `{ error: "settings.planLocked" }` without writing.

Onboarding: `const gym = await prisma.gym.findUnique(...)`. `accessMode` from entry, clamped to `gym.plan`. Update `{ accessMode, name, location, onboardingCompletedAt }` — **not** `plan`, **not** `maxStaff`.

Settings UI web: replace plan `<Select>` with read-only text `t(PLAN_LABEL[plan])` + `Link` to `/abonnement` (`t("nav.subscription")`). Keep access mode form.

Mobile settings: remove plan `Button` chips. Show `Text` with current plan. Keep access mode chips. `planAccessMutation` body `{ accessMode }` only.

GET settings: include `planTrialEndsAt: gym.planTrialEndsAt?.toISOString() ?? null`.

- [ ] **Step 3: Run** `npx vitest run tests/unit/plan-access-lock.test.ts tests/unit/plans.test.ts`  
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git commit -m "fix(settings): stop gyms from changing their own plan"
```

---

### Task 5: HTTP + server actions

**Files:**
- Create: `apps/api/src/routes/plan-requests.ts`
- Modify: `apps/api/src/index.ts` — `app.route("/v1/plan-requests", publicPlanRequestRoutes)`
- Modify: `apps/api/src/routes/app.ts` — `settingsRoutes.post("/plan-requests", requireAdmin, ...)`
- Create: `src/app/actions/plan-requests.ts`
- Test: `tests/unit` for rate-limit already done; optional integration in `tests/integration/plan-requests.test.ts` using `getPrisma()`

**Interfaces:**
- `POST /v1/plan-requests` public JSON `{ gymName, city, phone, email, plan }` → `{ data: { ok: true } }` or 422/429
- `POST /v1/settings/plan-requests` admin JSON `{ plan }` → `{ data: { ok: true } }`
- Web: `submitPublicLeadAction(formData)`, `requestGymPlanAction(formData)` returning `{ ok: true } | { error: string }`

Public rate-limit key: `x-forwarded-for` + email.

Admin handler loads gym + staff email from session (`c.get("staff")`). Phone `"—"`.

Web public action uses `headers()` forwarded-for + email. Mailer = `sendPlanLeadEmail`. Prisma = `src/lib/db`.

- [ ] **Step 1: Integration test** (if test DB available) `tests/integration/plan-requests.test.ts`

```ts
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
```

- [ ] **Step 2: Implement routes and actions** (full handlers calling `createPlanRequest`)

- [ ] **Step 3: Run** `npx vitest run tests/integration/plan-requests.test.ts tests/unit/plan-request-create.test.ts`  
Expected: PASS (skip integration if no test DB, but unit must pass)

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(api): accept public and gym plan requests"
```

---

### Task 6: Web public `/offres`

**Files:**
- Create: `src/components/plans/plan-cards.tsx`
- Create: `src/components/plans/public-plans-form.tsx`
- Create: `src/app/offres/page.tsx`
- Modify: `src/app/login/page.tsx` — link to `/offres`
- Modify: `.env.example` — `LEADS_INBOX_EMAIL`, `NEXT_PUBLIC_LEADS_WHATSAPP`

**Interfaces:**
- `PlanCards` props: `{ selected: Plan; onSelect: (plan: Plan) => void; currentPlan?: Plan; trialEndsAt?: string | null; mode: "public" | "gym" }`
- WhatsApp URL: `https://wa.me/${process.env.NEXT_PUBLIC_LEADS_WHATSAPP}?text=` + encodeURIComponent(`Bonjour, salle ${name}, offre ${plan}`)

- [ ] **Step 1: Build `PlanCards`**

Web cards: `StaggerGroup` wrapping buttons. Each card: `min-h-11` hit area, `rounded-2xl border p-4`, selected: `ring-2 ring-brand`. `transition-[transform,box-shadow,border-color] duration-150`. `active:scale-[0.96]`. Staff seats `tabular-nums`. Heading `text-balance`. Subtitle `text-pretty`. Muted `t("plans.manualPay")` once above the grid. Grid: `grid gap-3 lg:grid-cols-3`.

Current plan (gym mode): badge `t("plans.current")`, no request button on that card.

- [ ] **Step 2: Public form page**

Client form: local state `plan` default `GROWTH`. Fields required. Submit `submitPublicLeadAction`. On ok, hide form, show `t("plans.success")`. WhatsApp secondary button only if `NEXT_PUBLIC_LEADS_WHATSAPP` is non-empty.

`/offres` is **outside** `(app)` so it does not require staff session. Language switcher + back to `/login`.

Login: text link `t("plans.seeOffers")` → `/offres`.

- [ ] **Step 3: Manual check** — `npx next dev --webpack`, open `/offres` logged out, select Growth, submit (dev log is OK without Resend).

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(web): add public plan cards and lead form"
```

---

### Task 7: Web `/abonnement` + Plus menu

**Files:**
- Create: `src/app/(app)/abonnement/page.tsx` — `requireSession` admin only, else redirect
- Create: `src/components/plans/gym-plans-panel.tsx`
- Modify: `src/components/layout/app-shell.tsx` — `subscriptionNavItem` `{ href: "/abonnement", labelKey: "nav.subscription", icon: CreditCard }` inserted for **ADMIN only** next to settings (so it lands in Plus, not the four primary tabs)

**Interfaces:**
- Page loads gym `plan` + `planTrialEndsAt`
- `requestGymPlanAction` with `plan` field
- Trial: if `planTrialEndsAt`, `t("plans.trialUntil", { date: formatDate(...) })`

- [ ] **Step 1: Implement page + panel** (reuse `PlanCards` `mode="gym"`)

- [ ] **Step 2: Plus item** — import `CreditCard` from lucide. Add to `adminNavBase` immediately before settings.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(web): add Gérer l'abonnement in Plus"
```

---

### Task 8: Expo public + gym screens

**Files:**
- Modify: `apps/mobile/app/(auth)/_layout.tsx` — Screen `offres`
- Create: `apps/mobile/app/(auth)/offres.tsx`
- Modify: `apps/mobile/app/(auth)/login.tsx` — link to `/(auth)/offres`
- Create: `apps/mobile/app/(admin)/abonnement.tsx`
- Modify: `apps/mobile/app/(admin)/_layout.tsx` — `Tabs.Screen name="abonnement" href: null` (opened from More, like settings)
- Modify: `apps/mobile/lib/navigation.ts` — admin item `{ route: "abonnement", labelKey: "nav.subscription", icon: "wallet" }` before settings
- Modify: `apps/mobile/components/app-tab-bar.tsx` — `onSelect("abonnement")` → `router.push("/(admin)/abonnement")`
- Create: `apps/mobile/components/plan-cards.tsx` — stacked Pressables, `Animated` opacity/translateY delay `index * 90`, press `style={({ pressed }) => pressed && { transform: [{ scale: 0.96 }] }}`
- `.env.example` + `apps/mobile/.env` docs: `EXPO_PUBLIC_LEADS_WHATSAPP=330765683583`

Public submit: `apiFetch("/plan-requests", { method: "POST", body: JSON.stringify({...}) })` **without** requiring login (`apiFetch` already omits Authorization when no token).

Gym submit: `apiFetch("/settings/plan-requests", { method: "POST", body: JSON.stringify({ plan }) })`.

WhatsApp: `Linking.openURL` with `process.env.EXPO_PUBLIC_LEADS_WHATSAPP`.

- [ ] **Step 1: Shared visual language** — same catalog, same strings via `useI18n`.

- [ ] **Step 2: Wire More** — confirm `getMobileMore` includes `abonnement` (it will if the item is after the first four routes).

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(mobile): add offres and Gérer l'abonnement"
```

---

### Task 9: Web e2e + env example

**Files:**
- Modify: `.env.example` with:

```
LEADS_INBOX_EMAIL="bensedkahamza@gmail.com"
NEXT_PUBLIC_LEADS_WHATSAPP="330765683583"
EXPO_PUBLIC_LEADS_WHATSAPP="330765683583"
```

Do **not** put the inbox in any `NEXT_PUBLIC_` / `EXPO_PUBLIC_` variable.

- Modify: `e2e/auth.spec.ts` or new `e2e/plans.spec.ts` on the **guest** project (no storage state)

```ts
test("public offers page is reachable from login", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: /offres/i }).click();
  await expect(page).toHaveURL(/\/offres/);
  await expect(page.getByText("Growth")).toBeVisible();
});
```

Admin project extra test: Settings has no `select` named plan; Plus sheet contains Gérer l'abonnement.

CI Playwright on Linux uses `npm run test:e2e`. On Windows skip full e2e build if Turbopack junctions fail; still add the spec.

- [ ] **Step 1: Add e2e spec to guest `testMatch` in `playwright.config.ts` if needed** (`/plans\.spec/`)

- [ ] **Step 2: Run unit suite** `npx vitest run tests/unit`  
Expected: 0 failed

- [ ] **Step 3: Commit**

```bash
git commit -m "test(e2e): cover public offers and lock plan settings"
```

---

## Spec coverage

| Spec item | Task |
|-----------|------|
| Public cards web + mobile | 6, 8 |
| Plus → Gérer l’abonnement web + mobile | 7, 8 |
| Form fields A | 2, 5, 6 |
| Persist + email | 3, 5 |
| WhatsApp env | 6, 8, 9 |
| Trial date display | 4 GET, 7, 8 |
| Lock Settings / PATCH / onboarding | 4 |
| Rate limit | 2, 5 |
| Motion | 6, 8 |
| No Stripe / no self-signup | all |
| FR+AR | 2 |

## Placeholder scan

No TBD. Inbox fallback is explicit. PATCH with `plan` is 400.
