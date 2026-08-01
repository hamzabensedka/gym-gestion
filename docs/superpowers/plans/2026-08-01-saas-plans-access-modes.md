# SaaS Plans & Access Modes (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add flat per-gym subscription plans (Starter / Growth / Pro), access modes, onboarding wizard, member badge numbers, and Pro door-software CSV export — without live door control or online billing yet.

**Architecture:** Extend Prisma `Gym` / `Member` with plan and access fields. Centralize plan limits and feature flags in `src/lib/plans.ts`. Gate UI routes and server actions with `requireFeature(session, feature)`. Onboarding writes `plan` + `accessMode` once; Settings can change mode within plan. Pro export builds CSV from members with badge rules and updates `lastAccessExportAt`.

**Tech Stack:** Next.js App Router, Prisma 6, PostgreSQL, Zod, Vitest, existing i18n (`src/lib/i18n.ts`).

**Spec:** `docs/superpowers/specs/2026-08-01-saas-plans-access-modes-design.md`

## Global Constraints

- Flat pricing per gym; no per-member billing in this phase.
- Do not implement vendor connectors, open-door APIs, or kiosk UI (Phase 2+).
- Do not ask gyms to replace existing door software; Pro is an extension via CSV export.
- Follow existing patterns in `src/app/actions/*`, `src/lib/session.ts`, `prisma/schema.prisma`.
- FR + AR strings required for new UI copy in `src/lib/i18n.ts`.
- Prefer `db:push` locally if migrations baseline is incomplete; add a Prisma migration SQL file when changing schema.
- Every task ends with tests green for the files it touches.

## File map

| File | Responsibility |
|------|----------------|
| `prisma/schema.prisma` | Enums + Gym/Member fields |
| `src/lib/plans.ts` | Plan limits, feature matrix, helpers |
| `src/lib/access-export.ts` | Allowed-member rules + CSV builder |
| `src/lib/gym-features.ts` | Load gym plan/mode + `assertFeature` |
| `src/app/actions/onboarding.ts` | Wizard submit / skip |
| `src/app/actions/settings.ts` | Update access mode (and plan only if you keep admin override for demos) |
| `src/app/actions/members.ts` | Persist `badgeNumber` |
| `src/app/(app)/onboarding/page.tsx` | Wizard UI |
| `src/components/onboarding/onboarding-wizard.tsx` | Client form |
| `src/app/api/access/export/route.ts` | Pro CSV download |
| `src/components/settings/settings-forms.tsx` | Show plan + mode |
| `src/components/members/*` | Badge field on create/edit |
| `src/proxy.ts` or layout redirect | Force onboarding when incomplete |
| `prisma/seed.ts` | Seed FitBox as PRO + sample badges |
| `tests/unit/plans.test.ts` | Feature matrix |
| `tests/unit/access-export.test.ts` | Allowed rules + CSV |

---

### Task 1: Prisma schema — plans, access modes, badge

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260801120000_saas_plans_access/migration.sql` (SQL matching schema)
- Test: `tests/unit/plans.test.ts` (created in Task 2; this task only migrates schema)

**Interfaces:**
- Produces: enums `Plan`, `AccessMode`, `PlanStatus`; `Gym.plan`, `Gym.accessMode`, `Gym.planStatus`, `Gym.maxStaff`, `Gym.onboardingCompletedAt`, `Gym.lastAccessExportAt`; `Member.badgeNumber` with `@@unique([gymId, badgeNumber])`

- [ ] **Step 1: Add enums and fields to schema**

Add to `prisma/schema.prisma` (after existing enums):

```prisma
enum Plan {
  STARTER
  GROWTH
  PRO
}

enum AccessMode {
  DESK_ONLY
  KIOSK
  BADGE_PC_EXTENSION
  VENDOR_CONNECTOR
  NEW_ACCESS_KIT
}

enum PlanStatus {
  TRIAL
  ACTIVE
  PAST_DUE
  CANCELLED
}
```

Update `model Gym`:

```prisma
model Gym {
  id                     String       @id @default(cuid())
  name                   String
  location               String?
  cardTheme              String?
  plan                   Plan         @default(STARTER)
  accessMode             AccessMode   @default(DESK_ONLY)
  planStatus             PlanStatus   @default(ACTIVE)
  maxStaff               Int          @default(2)
  onboardingCompletedAt  DateTime?
  lastAccessExportAt     DateTime?
  createdAt              DateTime     @default(now())
  users                  User[]
  members                Member[]
  checkins               Checkin[]
  payments               Payment[]
}
```

Add on `Member` (with other optional fields):

```prisma
  badgeNumber       String?
```

And unique constraint:

```prisma
  @@unique([gymId, badgeNumber])
```

- [ ] **Step 2: Apply schema locally**

Run:

```bash
npx prisma db push
npx prisma generate
```

Expected: success, client regenerated.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(db): add gym plans, access modes, and member badge numbers"
```

---

### Task 2: Plan config + feature matrix

**Files:**
- Create: `src/lib/plans.ts`
- Create: `tests/unit/plans.test.ts`

**Interfaces:**
- Produces:
  - `export type PlanFeature = "kiosk" | "csv_export" | "badge_numbers" | "access_export"`
  - `export function getPlanLimits(plan: Plan): { maxStaff: number; features: PlanFeature[] }`
  - `export function planHasFeature(plan: Plan, feature: PlanFeature): boolean`
  - `export function modesAllowedForPlan(plan: Plan): AccessMode[]`
  - `export function suggestFromEntryAnswer(answer: EntryAnswer): { plan: Plan; accessMode: AccessMode }`
  - `export type EntryAnswer = "desk" | "open_kiosk" | "badge_pc" | "vendor" | "new_kit"`

- [ ] **Step 1: Write failing tests**

Create `tests/unit/plans.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { Plan, AccessMode } from "@prisma/client";
import {
  planHasFeature,
  getPlanLimits,
  modesAllowedForPlan,
  suggestFromEntryAnswer,
} from "@/lib/plans";

describe("plans", () => {
  it("starter has no kiosk or access export", () => {
    expect(planHasFeature(Plan.STARTER, "kiosk")).toBe(false);
    expect(planHasFeature(Plan.STARTER, "access_export")).toBe(false);
    expect(getPlanLimits(Plan.STARTER).maxStaff).toBe(2);
  });

  it("growth has kiosk and csv export", () => {
    expect(planHasFeature(Plan.GROWTH, "kiosk")).toBe(true);
    expect(planHasFeature(Plan.GROWTH, "csv_export")).toBe(true);
    expect(planHasFeature(Plan.GROWTH, "access_export")).toBe(false);
    expect(getPlanLimits(Plan.GROWTH).maxStaff).toBe(5);
  });

  it("pro has badge + access export", () => {
    expect(planHasFeature(Plan.PRO, "badge_numbers")).toBe(true);
    expect(planHasFeature(Plan.PRO, "access_export")).toBe(true);
    expect(getPlanLimits(Plan.PRO).maxStaff).toBe(10);
  });

  it("suggests pro + badge extension for badge_pc", () => {
    expect(suggestFromEntryAnswer("badge_pc")).toEqual({
      plan: Plan.PRO,
      accessMode: AccessMode.BADGE_PC_EXTENSION,
    });
  });

  it("limits modes by plan", () => {
    expect(modesAllowedForPlan(Plan.STARTER)).toEqual([AccessMode.DESK_ONLY]);
    expect(modesAllowedForPlan(Plan.PRO)).toContain(AccessMode.BADGE_PC_EXTENSION);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `npx vitest run tests/unit/plans.test.ts`  
Expected: FAIL (module not found)

- [ ] **Step 3: Implement `src/lib/plans.ts`**

```ts
import { AccessMode, Plan } from "@prisma/client";

export type PlanFeature =
  | "kiosk"
  | "csv_export"
  | "badge_numbers"
  | "access_export";

export type EntryAnswer =
  | "desk"
  | "open_kiosk"
  | "badge_pc"
  | "vendor"
  | "new_kit";

const PLAN_CONFIG: Record<
  Plan,
  { maxStaff: number; features: PlanFeature[]; modes: AccessMode[] }
> = {
  STARTER: {
    maxStaff: 2,
    features: [],
    modes: [AccessMode.DESK_ONLY],
  },
  GROWTH: {
    maxStaff: 5,
    features: ["kiosk", "csv_export"],
    modes: [AccessMode.DESK_ONLY, AccessMode.KIOSK],
  },
  PRO: {
    maxStaff: 10,
    features: ["kiosk", "csv_export", "badge_numbers", "access_export"],
    modes: [
      AccessMode.DESK_ONLY,
      AccessMode.KIOSK,
      AccessMode.BADGE_PC_EXTENSION,
      AccessMode.VENDOR_CONNECTOR,
      AccessMode.NEW_ACCESS_KIT,
    ],
  },
};

export function getPlanLimits(plan: Plan) {
  return {
    maxStaff: PLAN_CONFIG[plan].maxStaff,
    features: PLAN_CONFIG[plan].features,
  };
}

export function planHasFeature(plan: Plan, feature: PlanFeature): boolean {
  return PLAN_CONFIG[plan].features.includes(feature);
}

export function modesAllowedForPlan(plan: Plan): AccessMode[] {
  return PLAN_CONFIG[plan].modes;
}

export function suggestFromEntryAnswer(answer: EntryAnswer): {
  plan: Plan;
  accessMode: AccessMode;
} {
  switch (answer) {
    case "desk":
      return { plan: Plan.STARTER, accessMode: AccessMode.DESK_ONLY };
    case "open_kiosk":
      return { plan: Plan.GROWTH, accessMode: AccessMode.KIOSK };
    case "badge_pc":
      return { plan: Plan.PRO, accessMode: AccessMode.BADGE_PC_EXTENSION };
    case "vendor":
      return { plan: Plan.PRO, accessMode: AccessMode.VENDOR_CONNECTOR };
    case "new_kit":
      return { plan: Plan.GROWTH, accessMode: AccessMode.NEW_ACCESS_KIT };
  }
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `npx vitest run tests/unit/plans.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/plans.ts tests/unit/plans.test.ts
git commit -m "feat: add plan limits and feature matrix"
```

---

### Task 3: Access export pure logic

**Files:**
- Create: `src/lib/access-export.ts`
- Create: `tests/unit/access-export.test.ts`

**Interfaces:**
- Consumes: member fields `badgeNumber`, `status`, `subscriptionEnd`, `frozenAt`, `fullName`, `phone`
- Produces:
  - `export function isMemberAllowedForDoor(member, now?: Date): boolean`
  - `export function buildAccessExportCsv(members): string` (UTF-8 BOM optional for Excel)

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from "vitest";
import { MemberStatus } from "@prisma/client";
import {
  isMemberAllowedForDoor,
  buildAccessExportCsv,
} from "@/lib/access-export";

const base = {
  fullName: "Ahmed",
  phone: "+21620000000",
  badgeNumber: "1001",
  status: MemberStatus.ACTIVE,
  subscriptionEnd: new Date("2030-01-01"),
  frozenAt: null as Date | null,
};

describe("access-export", () => {
  it("allows active member with badge and future end", () => {
    expect(isMemberAllowedForDoor(base)).toBe(true);
  });

  it("blocks expired, frozen, or missing badge", () => {
    expect(
      isMemberAllowedForDoor({ ...base, status: MemberStatus.EXPIRED }),
    ).toBe(false);
    expect(
      isMemberAllowedForDoor({ ...base, status: MemberStatus.FROZEN }),
    ).toBe(false);
    expect(isMemberAllowedForDoor({ ...base, badgeNumber: null })).toBe(false);
    expect(
      isMemberAllowedForDoor({
        ...base,
        subscriptionEnd: new Date("2020-01-01"),
      }),
    ).toBe(false);
  });

  it("builds csv with allowed flag", () => {
    const csv = buildAccessExportCsv([
      base,
      { ...base, fullName: "Sara", badgeNumber: "1002", status: MemberStatus.EXPIRED },
    ]);
    expect(csv).toContain("badgeNumber,fullName,phone,allowed,subscriptionEnd");
    expect(csv).toContain("1001");
    expect(csv).toMatch(/1001.*,1,/);
    expect(csv).toMatch(/1002.*,0,/);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run tests/unit/access-export.test.ts`

- [ ] **Step 3: Implement `src/lib/access-export.ts`**

```ts
import { MemberStatus } from "@prisma/client";

export type AccessExportMember = {
  fullName: string;
  phone: string;
  badgeNumber: string | null;
  status: MemberStatus;
  subscriptionEnd: Date;
  frozenAt: Date | null;
};

export function isMemberAllowedForDoor(
  member: AccessExportMember,
  now: Date = new Date(),
): boolean {
  if (!member.badgeNumber?.trim()) return false;
  if (member.status !== MemberStatus.ACTIVE) return false;
  if (member.frozenAt) return false;
  if (member.subscriptionEnd < now) return false;
  return true;
}

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function buildAccessExportCsv(
  members: AccessExportMember[],
  now: Date = new Date(),
): string {
  const header = "badgeNumber,fullName,phone,allowed,subscriptionEnd";
  const rows = members
    .filter((m) => m.badgeNumber?.trim())
    .map((m) => {
      const allowed = isMemberAllowedForDoor(m, now) ? "1" : "0";
      return [
        escapeCsv(m.badgeNumber!.trim()),
        escapeCsv(m.fullName),
        escapeCsv(m.phone),
        allowed,
        m.subscriptionEnd.toISOString().slice(0, 10),
      ].join(",");
    });
  return `\uFEFF${[header, ...rows].join("\n")}\n`;
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `npx vitest run tests/unit/access-export.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/lib/access-export.ts tests/unit/access-export.test.ts
git commit -m "feat: add door access export rules and CSV builder"
```

---

### Task 4: Feature gate helper + staff limit

**Files:**
- Create: `src/lib/gym-features.ts`
- Modify: `src/app/actions/staff.ts` (enforce `maxStaff` on create)
- Test: extend `tests/unit/plans.test.ts` or add `tests/unit/gym-features.test.ts` if pure; staff limit may be integration — at minimum unit-test a pure `canAddStaff(currentCount, maxStaff)`

**Interfaces:**
- Produces:
  - `export async function getGymBilling(gymId: string): Promise<{ plan: Plan; accessMode: AccessMode; maxStaff: number; onboardingCompletedAt: Date | null }>`
  - `export async function assertFeature(gymId: string, feature: PlanFeature): Promise<void>` throws `"FEATURE_LOCKED"`
  - `export function canAddStaff(currentCount: number, maxStaff: number): boolean`

- [ ] **Step 1: Implement `src/lib/gym-features.ts`**

```ts
import { prisma } from "@/lib/db";
import { planHasFeature, type PlanFeature } from "@/lib/plans";

export function canAddStaff(currentCount: number, maxStaff: number): boolean {
  return currentCount < maxStaff;
}

export async function getGymBilling(gymId: string) {
  const gym = await prisma.gym.findUniqueOrThrow({
    where: { id: gymId },
    select: {
      plan: true,
      accessMode: true,
      maxStaff: true,
      onboardingCompletedAt: true,
      planStatus: true,
    },
  });
  return gym;
}

export async function assertFeature(gymId: string, feature: PlanFeature) {
  const gym = await getGymBilling(gymId);
  if (!planHasFeature(gym.plan, feature)) {
    throw new Error("FEATURE_LOCKED");
  }
}
```

- [ ] **Step 2: Enforce in staff create**

In `src/app/actions/staff.ts`, before creating a user:

```ts
const gym = await getGymBilling(session.gymId);
const count = await prisma.user.count({ where: { gymId: session.gymId } });
if (!canAddStaff(count, gym.maxStaff)) {
  return { error: "STAFF_LIMIT" }; // map to i18n in UI
}
```

- [ ] **Step 3: Unit test `canAddStaff`**

```ts
expect(canAddStaff(2, 2)).toBe(false);
expect(canAddStaff(1, 2)).toBe(true);
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/gym-features.ts src/app/actions/staff.ts tests
git commit -m "feat: gate staff seats by gym plan maxStaff"
```

---

### Task 5: Onboarding wizard

**Files:**
- Create: `src/app/actions/onboarding.ts`
- Create: `src/app/(app)/onboarding/page.tsx`
- Create: `src/components/onboarding/onboarding-wizard.tsx`
- Modify: `src/app/(app)/layout.tsx` (or `src/proxy.ts`) to redirect admins with `onboardingCompletedAt == null` to `/onboarding` (except `/onboarding`, `/settings` logout)
- Modify: `src/lib/i18n.ts` — FR/AR keys under `onboarding.*`
- Modify: `prisma/seed.ts` — set `onboardingCompletedAt: new Date()` on demo gym so e2e does not break

**Interfaces:**
- Consumes: `suggestFromEntryAnswer`, `getPlanLimits`
- Produces: `completeOnboardingAction(formData)`, `skipOnboardingAction()`

- [ ] **Step 1: Server actions**

`completeOnboardingAction`:
1. `requireSession()`, role ADMIN
2. Parse `entryAnswer`, optional `plan` override, `name`, `location`
3. Compute `{ plan, accessMode }` from answer (or override)
4. `maxStaff = getPlanLimits(plan).maxStaff`
5. Update gym; set `onboardingCompletedAt = new Date()`
6. `revalidatePath` + `redirect("/dashboard")`

`skipOnboardingAction`: set `onboardingCompletedAt` only (keep defaults).

- [ ] **Step 2: Wizard UI**

Radio options matching `EntryAnswer`. Show suggested plan label. Confirm name/location. Submit + Skip.

- [ ] **Step 3: Redirect guard**

In `(app)/layout.tsx` after session load: if ADMIN and gym.onboardingCompletedAt is null and path is not `/onboarding`, `redirect("/onboarding")`.

- [ ] **Step 4: Seed + i18n**

Seed FitBox with `plan: PRO`, `accessMode: BADGE_PC_EXTENSION`, `maxStaff: 10`, `onboardingCompletedAt: new Date()`.

- [ ] **Step 5: Manual smoke**

Run `npm run dev`, use a gym with null onboarding, complete wizard, confirm DB fields.

- [ ] **Step 6: Commit**

```bash
git add src/app/actions/onboarding.ts src/app/\(app\)/onboarding src/components/onboarding src/lib/i18n.ts prisma/seed.ts src/app/\(app\)/layout.tsx
git commit -m "feat: add gym onboarding wizard for plan and access mode"
```

---

### Task 6: Settings — show plan & change access mode

**Files:**
- Modify: `src/app/(app)/settings/page.tsx`
- Modify: `src/components/settings/settings-forms.tsx`
- Modify: `src/app/actions/settings.ts`
- Modify: `src/lib/i18n.ts`

**Interfaces:**
- Produces: `updateAccessModeAction(formData)` — only modes in `modesAllowedForPlan(gym.plan)`
- Demo/admin: optional `updatePlanAction` for local testing only if `process.env.NODE_ENV !== "production"` OR always allow ADMIN to change plan until billing exists (recommended for Phase 1: ADMIN can change plan in Settings so you can demo tiers)

- [ ] **Step 1: Load plan/mode into SettingsForms props**

- [ ] **Step 2: UI block “Abonnement & accès”**

Show current plan (read-only label + select to change for Phase 1). Select access mode filtered by plan. On plan change, reset `maxStaff` via `getPlanLimits` and clamp `accessMode` if invalid.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: manage gym plan and access mode in settings"
```

---

### Task 7: Member badge number (Pro)

**Files:**
- Modify: `packages/shared/src/validations.ts` (if member schemas live there) and/or `src/app/actions/members.ts`
- Modify: member create/edit forms under `src/components/members/`
- Modify: `src/app/(app)/members/[id]/page.tsx` to show badge
- Modify: `src/lib/i18n.ts`

**Interfaces:**
- `badgeNumber` optional string; trim; empty → null; unique per gym — catch Prisma `P2002` → friendly error

- [ ] **Step 1: Only show badge field if `planHasFeature(plan, "badge_numbers")`**

Pass `showBadgeField` from server pages.

- [ ] **Step 2: Persist in create/update actions**

- [ ] **Step 3: Seed 3–5 members with `badgeNumber` `"1001"`…**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: add member badge numbers for Pro access extension"
```

---

### Task 8: Pro access CSV export API + UI

**Files:**
- Create: `src/app/api/access/export/route.ts`
- Modify: `src/app/(app)/members/page.tsx` or settings — button “Exporter pour logiciel d’accès”
- Modify: existing members CSV export routes to call `assertFeature` for `csv_export` (Growth+)
- Modify: `src/lib/i18n.ts`

**Interfaces:**
- `GET /api/access/export` → `assertFeature(gymId, "access_export")` → load members with badge → `buildAccessExportCsv` → set `lastAccessExportAt` → return `text/csv` attachment `access-allowed.csv`

- [ ] **Step 1: Implement route** (mirror auth pattern from `src/app/api/members/export/route.ts`)

- [ ] **Step 2: Button visible only for Pro + `access_export`**

If Starter clicks a locked deep link, return 403 JSON `{ error: "FEATURE_LOCKED" }` or redirect settings with message.

- [ ] **Step 3: Manual test**

Download CSV; confirm BOM + allowed 1/0; confirm `lastAccessExportAt` updated.

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: export allowed badge list CSV for Pro gyms"
```

---

### Task 9: Gate existing CSV exports + placeholder kiosk nav

**Files:**
- Modify: `src/app/api/members/export/route.ts`
- Modify: `src/app/api/payments/export/route.ts`
- Modify: `src/components/layout/app-shell.tsx` (optional nav item “Kiosk” → `/kiosk` for Growth/Pro)
- Create: `src/app/(app)/kiosk/page.tsx` — Phase 1 stub: message “Bientôt” + upgrade CTA if locked; if unlocked, short “Phase 2” placeholder so nav is not a 404

- [ ] **Step 1: `assertFeature` on CSV routes**

- [ ] **Step 2: Kiosk stub page (no scanner yet)**

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: gate CSV exports and add kiosk placeholder by plan"
```

---

### Task 10: Verification + docs touch-up

**Files:**
- Modify: `README.md` — short “Plans” section pointing to the spec
- Run full unit tests

- [ ] **Step 1: Run**

```bash
npx vitest run tests/unit/plans.test.ts tests/unit/access-export.test.ts
npm run test:unit
```

Expected: pass (fix only failures you introduced).

- [ ] **Step 2: README note**

Add 5–10 lines: Starter / Growth / Pro, access modes, Pro CSV path.

- [ ] **Step 3: Commit**

```bash
git commit -m "docs: document SaaS plans and access modes"
```

---

## Follow-up plans (do not implement in this plan)

1. **Phase 2 — Kiosk:** real self check-in tablet flow (`KIOSK` mode).
2. **Phase 3 — Billing:** collect subscription money; wire `planStatus`.
3. **Phase 4 — Vendor connector / access kit:** live open-door.

## Spec coverage check

| Spec item | Task |
|-----------|------|
| Plan enums + pricing model (code limits) | 1, 2 |
| Access modes | 1, 2, 5, 6 |
| Onboarding wizard | 5 |
| Gym fields | 1 |
| Member badgeNumber | 1, 7 |
| Allowed export rules + CSV | 3, 8 |
| Feature gates / maxStaff | 2, 4, 9 |
| No vendor/open-door/kiosk scanner | deferred |
| Seed / demo gym | 5, 7 |

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-01-saas-plans-access-modes.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — run tasks in this session with checkpoints  

Which approach?
