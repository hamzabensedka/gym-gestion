# Mobile Parity Phase B — SaaS / Settings (API + Expo)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let mobile admins edit plan + access mode (full edit), manage card theme, set Pro badge numbers, and share CSV exports (members / payments / access) with the same plan gates as web.

**Architecture:** Enrich Hono `/v1/settings` and add `PATCH /v1/settings/plan-access` mirroring web `updatePlanAndAccessAction`. Gate existing CSV export routes with `assertGymFeature`. Move `buildAccessExportCsv` into `@gym/shared` and expose `GET /v1/access/export`. Expo Settings + member create (+ share helpers) consume these APIs.

**Tech Stack:** Hono, Prisma, Expo Router, `expo-sharing` + `expo-file-system` (or cache write), `@gym/shared`, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-01-mobile-web-parity-design.md` (Phase B section)

**Prerequisite (start of session):**
```bash
cd c:\Users\LENOVO\workspace\GYM_GESTION
git fetch origin
git checkout main
git pull origin main
# Phase A must already be on main (PR #3 / merge 58e97ae family)
git checkout -b feat/mobile-parity-phase-b
```

## Global Constraints

- Admin-only for plan/access, gym settings, CSV exports, badge writes (same as web).
- Plan matrix + modes: `@gym/shared/plans` (`modesAllowedForPlan`, `planHasFeature`, `getPlanLimits`).
- Gates: `csv_export` (Growth+), `access_export` + `badge_numbers` (Pro). Return `403` + `FEATURE_LOCKED` (reuse `assertGymFeature` from Phase A).
- Scope every query by `staff.gymId`.
- Product decision **A**: mobile may **fully edit** plan + accessMode (not read-only).
- FR + AR strings in `@gym/shared/i18n`.
- Do **not** implement Phase C/D in this plan (member edit screen, invite disable UI, staff QR, kiosk).
- Prefer small commits; author as repo owner (`hamzabensedka`); avoid `Co-authored-by: Cursor` (use `commit-tree` if hooks inject trailers).
- Do not break Phase A bills/drinks or web settings/export routes.

## File map

| File | Responsibility |
|------|----------------|
| `packages/shared/src/access-export.ts` | Move from `src/lib/access-export.ts` |
| `packages/shared/src/badge.ts` | `normalizeBadgeNumber` (+ optional unique-conflict helper) |
| `packages/shared/package.json` | Export `./access-export`, `./badge` |
| `src/lib/access-export.ts` | Re-export from `@gym/shared/access-export` |
| `apps/api/src/lib/features.ts` | Existing `assertGymFeature` (reuse) |
| `apps/api/src/routes/app.ts` | Settings enrichment, plan-access PATCH, member badge, export gates |
| `apps/api/src/routes/access.ts` (or in `app.ts`) | `GET /v1/access/export` |
| `apps/api/src/index.ts` | Mount access export if separate router |
| `apps/mobile/app/(admin)/settings.tsx` | Plan, access, card theme UI |
| `apps/mobile/app/(admin)/members/new.tsx` | Badge field when Pro |
| `apps/mobile/lib/share-csv.ts` | Write temp file + `Sharing.shareAsync` |
| `apps/mobile/app/(admin)/members/index.tsx` (or list) | Export buttons when features unlocked |
| `apps/mobile/app/(admin)/payments.tsx` (or equivalent) | Payments CSV share when unlocked |
| `packages/shared/src/i18n.ts` | Settings plan/access/theme + export keys if missing |
| `tests/unit/access-export.test.ts` | Move/import from shared |
| `tests/unit/plan-access.test.ts` | Mode fallback when mode not allowed for plan |
| `tests/unit/api-feature-gate.test.ts` | Extend if needed |

---

### Task 1: Shared access-export + badge helpers

**Files:**
- Create: `packages/shared/src/access-export.ts`
- Create: `packages/shared/src/badge.ts`
- Modify: `packages/shared/package.json`, `packages/shared/src/index.ts` (if barrel used)
- Modify: `src/lib/access-export.ts` → re-export
- Modify: `tests/unit/access-export.test.ts` (imports)
- Test: `tests/unit/access-export.test.ts`

**Interfaces:**
- Produces: `buildAccessExportCsv`, `isMemberAllowedForDoor`, `AccessExportMember`, `normalizeBadgeNumber(value?: string): string | null`

- [ ] **Step 1: Move `src/lib/access-export.ts` → `packages/shared/src/access-export.ts`**

Keep BOM + header `badgeNumber,fullName,phone,allowed,subscriptionEnd`. Use `MemberStatus` from `@prisma/client` (same as today).

- [ ] **Step 2: Add badge helper**

```ts
// packages/shared/src/badge.ts
export function normalizeBadgeNumber(value?: string): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
```

- [ ] **Step 3: Re-export from web**

```ts
// src/lib/access-export.ts
export * from "@gym/shared/access-export";
```

Update `package.json` exports. Point unit tests at `@gym/shared/access-export`.

- [ ] **Step 4: Run tests**

```bash
npx vitest run tests/unit/access-export.test.ts
```

Expected: PASS (or create the test file if missing by copying web behavior assertions).

- [ ] **Step 5: Commit**

```bash
git add packages/shared src/lib/access-export.ts tests/unit/access-export.test.ts
git commit -m "refactor: move access-export and badge helpers to @gym/shared"
```

---

### Task 2: Enrich settings GET + PATCH plan-access

**Files:**
- Modify: `apps/api/src/routes/app.ts` (`settingsRoutes`)
- Create: `tests/unit/plan-access.test.ts` (pure validation helper optional)
- Optional extract: `apps/api/src/services/plan-access.ts` with `resolvePlanAccessUpdate(plan, accessMode)`

**Interfaces:**
- Consumes: `getPlanLimits`, `modesAllowedForPlan`, `isPlan` / `isAccessMode` (add thin guards if missing in shared)
- Produces:
  - `GET /v1/settings` → `{ plan, accessMode, planStatus, maxStaff, features, cardTheme, onboardingCompletedAt, name?, location? }`
  - `PATCH /v1/settings/plan-access` body `{ plan, accessMode }` → `{ plan, accessMode, maxStaff }`

- [ ] **Step 1: Expand GET `/`**

Replace current select `{ plan: true }` with:

```ts
select: {
  plan: true,
  accessMode: true,
  planStatus: true,
  maxStaff: true,
  cardTheme: true,
  onboardingCompletedAt: true,
  name: true,
  location: true,
},
```

Response:

```ts
const limits = getPlanLimits(gym.plan);
return c.json({
  data: {
    plan: gym.plan,
    accessMode: gym.accessMode,
    planStatus: gym.planStatus,
    maxStaff: gym.maxStaff,
    features: limits.features,
    cardTheme: gym.cardTheme ?? "default",
    onboardingCompletedAt: gym.onboardingCompletedAt,
    name: gym.name,
    location: gym.location,
  },
});
```

Keep `GET /gym` as the full gym row for the existing settings form (or merge later — do not break mobile `gym-settings` query).

- [ ] **Step 2: Add plan-access PATCH (mirror web)**

Logic from `src/app/actions/settings.ts` `updatePlanAndAccessAction`:

```ts
settingsRoutes.patch("/plan-access", requireAdmin, async (c) => {
  const staff = c.get("staff");
  const body = await c.req.json<{ plan?: unknown; accessMode?: unknown }>();
  // validate with z.enum(Plan) / z.enum(AccessMode) or isPlan/isAccessMode
  const plan = body.plan;
  const modeRaw = body.accessMode;
  if (!isPlan(plan) || !isAccessMode(modeRaw)) {
    return c.json({ error: { code: "VALIDATION", message: "settings.invalidPlan" } }, 422);
  }
  const maxStaff = getPlanLimits(plan).maxStaff;
  const allowed = modesAllowedForPlan(plan);
  const accessMode = allowed.includes(modeRaw) ? modeRaw : AccessMode.DESK_ONLY;

  const gym = await prisma.gym.update({
    where: { id: staff.gymId },
    data: { plan, maxStaff, accessMode },
  });
  return c.json({
    data: { plan: gym.plan, accessMode: gym.accessMode, maxStaff: gym.maxStaff },
  });
});
```

If `isPlan` / `isAccessMode` live only in web, move them to `@gym/shared/plans` or inline zod in the route.

- [ ] **Step 3: Confirm PATCH `/gym` already accepts `cardTheme`**

`gymSchema` already has `cardTheme: z.enum(["default", "fitbox-mahdia"]).optional()`. No change unless mobile was omitting it — document that mobile must send it.

- [ ] **Step 4: Unit test mode fallback**

```ts
// tests/unit/plan-access.test.ts
import { AccessMode, Plan } from "@prisma/client";
import { modesAllowedForPlan, getPlanLimits } from "@gym/shared/plans";

function resolveAccessMode(plan: Plan, mode: AccessMode): AccessMode {
  const allowed = modesAllowedForPlan(plan);
  return allowed.includes(mode) ? mode : AccessMode.DESK_ONLY;
}

test("STARTER rejects KIOSK → DESK_ONLY", () => {
  expect(resolveAccessMode(Plan.STARTER, AccessMode.KIOSK)).toBe(AccessMode.DESK_ONLY);
});

test("PRO keeps BADGE_PC_EXTENSION", () => {
  expect(resolveAccessMode(Plan.PRO, AccessMode.BADGE_PC_EXTENSION)).toBe(
    AccessMode.BADGE_PC_EXTENSION,
  );
});

test("maxStaff follows plan", () => {
  expect(getPlanLimits(Plan.GROWTH).maxStaff).toBe(5);
});
```

```bash
npx vitest run tests/unit/plan-access.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/app.ts packages/shared tests/unit/plan-access.test.ts
git commit -m "feat(api): enrich settings and add plan-access PATCH"
```

---

### Task 3: Gate CSV exports + add access export + member badge

**Files:**
- Modify: `apps/api/src/routes/app.ts` — `membersRoutes.get("/export")`, `paymentsRoutes.get("/export")`, member POST/PATCH
- Create or modify: access export route mounted at `/v1/access/export`
- Modify: `apps/api/src/index.ts` if needed

**Interfaces:**
- Consumes: `assertGymFeature`, `buildAccessExportCsv`, `normalizeBadgeNumber`, `planHasFeature` / `badge_numbers`
- Produces: gated CSV routes; badge persistence on create/update

- [ ] **Step 1: Gate members + payments export**

At the start of each handler (after auth):

```ts
try {
  await assertGymFeature(staff.gymId, "csv_export");
} catch (e) {
  if (e instanceof Error && e.message === "FEATURE_LOCKED") {
    return c.json({ error: { code: "FEATURE_LOCKED", message: "FEATURE_LOCKED" } }, 403);
  }
  throw e;
}
```

`membersRoutes.get("/export", requireAdmin, …)`  
`paymentsRoutes.get("/export", …)` — ensure admin or desk policy matches web (`requireAdmin` preferred for parity with web members/access; check web payments export role and match).

- [ ] **Step 2: Add `GET /v1/access/export`**

Mirror `src/app/api/access/export/route.ts`:

```ts
// requireAdmin
await assertGymFeature(staff.gymId, "access_export");
const members = await prisma.member.findMany({
  where: { gymId: staff.gymId, badgeNumber: { not: null } },
  select: {
    fullName: true,
    phone: true,
    badgeNumber: true,
    status: true,
    subscriptionEnd: true,
    frozenAt: true,
  },
  orderBy: { fullName: "asc" },
});
const csv = buildAccessExportCsv(members);
await prisma.gym.update({
  where: { id: staff.gymId },
  data: { lastAccessExportAt: new Date() },
});
return c.text(csv, 200, {
  "Content-Type": "text/csv; charset=utf-8",
  "Content-Disposition": 'attachment; filename="access-allowed.csv"',
});
```

Mount as `app.route("/v1/access", accessRoutes)` with `accessRoutes.get("/export", …)` **or** `membersRoutes.get("/access-export")` — prefer `/v1/access/export` to match web path shape.

- [ ] **Step 3: Badge on member create + update**

In POST `/` and PATCH `/:id` after `memberSchema.safeParse`:

```ts
const gym = await prisma.gym.findUnique({
  where: { id: staff.gymId },
  select: { plan: true },
});
const canBadge = planHasFeature(gym!.plan, "badge_numbers");
const badgeNumber = canBadge
  ? normalizeBadgeNumber(parsed.data.badgeNumber)
  : null;

// create data:
badgeNumber: canBadge ? badgeNumber : null,

// update data (only when canBadge):
...(canBadge
  ? { badgeNumber: normalizeBadgeNumber(parsed.data.badgeNumber) }
  : {}),
```

On Prisma `P2002` for badge: return `409` with `form.badgeExists` (mirror web `uniqueConflictError`).

If Starter/Growth client sends `badgeNumber`, **ignore** (do not 403) — same as web create path when `canBadge` is false.

- [ ] **Step 4: Manual / API smoke (or unit on CSV header)**

```bash
npx vitest run tests/unit/access-export.test.ts tests/unit/plan-access.test.ts
```

Optional: add a small test that `buildAccessExportCsv([])` starts with `\uFEFF` + header.

- [ ] **Step 5: Commit**

```bash
git add apps/api
git commit -m "feat(api): gate CSV exports, add access export, persist badge numbers"
```

---

### Task 4: Mobile settings — plan, access, card theme

**Files:**
- Modify: `apps/mobile/app/(admin)/settings.tsx`
- Modify: `packages/shared/src/i18n.ts` — keys for plan labels, access modes, card theme, save plan
- Optional: small picker component using existing `Button` row pattern (no new design system)

**Interfaces:**
- Consumes: `GET /v1/settings` (enriched), `PATCH /v1/settings/plan-access`, `PATCH /v1/settings/gym` with `cardTheme`
- Produces: working Settings UI; invalidate `["settings"]` / `["gym-settings"]` after save

- [ ] **Step 1: Load enriched settings**

```ts
type SettingsSnapshot = {
  plan: "STARTER" | "GROWTH" | "PRO";
  accessMode: string;
  features: string[];
  cardTheme: string;
  // …
};

const settingsQuery = useQuery({
  queryKey: ["settings"],
  queryFn: () => apiFetch<SettingsSnapshot>("/settings"),
});
```

Keep existing `gym-settings` for name/location **or** switch name/location to fields from enriched GET — pick one source to avoid drift. Recommended: keep `/settings/gym` for name/location/theme save; use `/settings` for plan/access display + features.

- [ ] **Step 2: Plan + access editors (ADMIN only — this screen is already admin)**

UI pattern: section title + row of variant buttons, same as language toggle.

Plans: `STARTER` | `GROWTH` | `PRO`  
Access modes: filter buttons with `modesAllowedForPlan(selectedPlan)` from shared (import in mobile if package allows; else hardcode lists matching `plans.ts`).

Save:

```ts
await apiFetch("/settings/plan-access", {
  method: "PATCH",
  body: JSON.stringify({ plan, accessMode }),
});
queryClient.invalidateQueries({ queryKey: ["settings"] });
```

When plan changes, if current accessMode not in allowed list, auto-select `DESK_ONLY` before save (match API fallback).

- [ ] **Step 3: Card theme**

Themes: `default` | `fitbox-mahdia`. Include `cardTheme` in gym PATCH:

```ts
body: JSON.stringify({ name, location: location || undefined, cardTheme }),
```

- [ ] **Step 4: i18n**

Add missing keys under `settings.*` / `plans.*` / `accessMode.*` in FR + AR (copy labels from web `src/lib/i18n.ts` / settings forms where they exist).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/(admin)/settings.tsx packages/shared/src/i18n.ts
git commit -m "feat(mobile): plan, access mode, and card theme in settings"
```

---

### Task 5: Mobile badge field + ShareSheet CSV exports

**Files:**
- Modify: `apps/mobile/app/(admin)/members/new.tsx`
- Create: `apps/mobile/lib/share-csv.ts`
- Modify: members list screen + payments screen (locate exact paths under `apps/mobile/app/(admin)/`)
- Modify: i18n keys for export actions

**Interfaces:**
- Consumes: `settings.features` includes `badge_numbers` | `csv_export` | `access_export`; `apiText("/members/export")` etc.
- Produces: share sheet with CSV file

- [ ] **Step 1: share helper**

```ts
// apps/mobile/lib/share-csv.ts
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

export async function shareCsv(filename: string, contents: string) {
  const path = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(path, contents, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Sharing unavailable");
  }
  await Sharing.shareAsync(path, {
    mimeType: "text/csv",
    dialogTitle: filename,
    UTI: "public.comma-separated-values-text",
  });
}
```

(`expo-sharing` is already in `apps/mobile/package.json`. Add `expo-file-system` if missing.)

- [ ] **Step 2: Export buttons (feature-gated)**

```ts
const settings = useQuery({ queryKey: ["settings"], queryFn: () => apiFetch<…>("/settings") });
const features = settings.data?.features ?? [];
const canCsv = features.includes("csv_export");
const canAccess = features.includes("access_export");

async function exportMembers() {
  const csv = await apiText("/members/export");
  await shareCsv("members.csv", csv);
}
// payments: apiText("/payments/export?…")
// access: apiText("/access/export")
```

Place buttons where web has them (members page + payments page). Hide when feature missing.

- [ ] **Step 3: Badge on create**

In `members/new.tsx`, if `features.includes("badge_numbers")`, show Input for badge; include `badgeNumber` in POST body.

- [ ] **Step 4: Manual smoke checklist**

1. Starter: no CSV buttons; export API returns 403.
2. Switch to Growth on mobile → CSV buttons appear; members/payments share works.
3. Switch to Pro → badge field on create; access export shares; CSV still works.
4. Invalid mode for plan coerced to DESK_ONLY.
5. Card theme save reflects on member card (web or member app) if easy to check.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile packages/shared/src/i18n.ts
git commit -m "feat(mobile): badge numbers and CSV ShareSheet exports"
```

---

### Task 6: Docs + verify + PR

**Files:**
- Modify: `docs/ARCHITECTURE_EVOLUTION.md` (short note that Phase B mobile settings/export parity landed)
- Optional: tick Phase B in the parity spec as done

- [ ] **Step 1: Run full unit suite**

```bash
npx vitest run
```

Expected: all green (Phase A baseline ~89+; add new tests).

- [ ] **Step 2: Update architecture note**

One short bullet under mobile/API evolution: settings plan-access, gated exports, access CSV, badge on API/mobile.

- [ ] **Step 3: Open PR**

```bash
git push -u origin HEAD
gh pr create --title "feat: mobile parity Phase B — SaaS settings + CSV exports" --body "$(cat <<'EOF'
## Summary
- Enrich GET /v1/settings; add PATCH /v1/settings/plan-access
- Gate members/payments CSV; add GET /v1/access/export
- Persist Pro badgeNumber on member create/update
- Expo: plan/access/theme settings, badge field, ShareSheet CSV

## Test plan
- [ ] vitest green
- [ ] Starter: CSV/access 403; no export buttons
- [ ] Growth: members/payments share
- [ ] Pro: badge create + access export
- [ ] Plan/access edit on mobile updates gym

EOF
)"
```

---

## Self-review (spec coverage)

| Spec item | Task |
|-----------|------|
| GET settings enriched | Task 2 |
| PATCH plan-access | Task 2 |
| cardTheme on gym PATCH | Task 2/4 (already API; wire mobile) |
| badgeNumber create/update | Task 3 + 5 |
| members/payments export gated | Task 3 |
| access export new | Task 3 |
| Settings UI plan/access/theme | Task 4 |
| ShareSheet CSV | Task 5 |
| Unit plan validation | Task 2 |
| API 403 Starter | Task 3 (+ manual) |

**Out of scope (do not sneak in):** Phase C member edit screen, invite disable UI, staff QR; Phase D kiosk/onboarding.

---

## What’s left after Phase B

### Phase C — Core leftovers (next recommended)
| Item | Work |
|------|------|
| Member **edit** on mobile | Form → existing `PATCH /v1/members/:id` (badge field already from B) |
| Invite **disable** | Wire UI to existing `POST /v1/members/:id/invite/disable` |
| Member QR (staff) | Screen/sheet → `GET /v1/members/:id/qr` |
| Exports polish | Align dashboard/members entry points with web affordances |

No new domain tables. Small PRs preferred.

### Phase D — Kiosk (+ optional onboarding)
| Item | Work |
|------|------|
| Growth+ self check-in | Shared check-in use-case; real kiosk flow |
| Web `/kiosk` | Finish placeholder |
| Mobile/tablet kiosk | Expo kiosk mode |
| Optional onboarding | If `onboardingCompletedAt` null, mobile wizard |

### Local / ops leftovers (not blocked on B, but still open)
- Commit themed web **Select / DatePicker / MonthPicker** (+ `tests/unit/month-picker.test.ts`) if still uncommitted
- Commit `scripts/prod-migrate.mjs` if still uncommitted
- Phase A nits: Expo device smoke for bills/drinks; invalidate dashboard after bill/drink mutations; avoid nav flash while settings load
- Longer-term non-goals: gym SaaS billing, vendor door hardware

### Suggested next-session order after B merges
1. Phase C (member edit + invite disable + staff QR)  
2. Phase D (kiosk)  
3. Cleanup commits (datepicker / prod-migrate) if still hanging locally
`)