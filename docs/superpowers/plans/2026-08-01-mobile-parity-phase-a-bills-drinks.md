# Mobile Parity Phase A — Bills + Drinks (API + Expo)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose utility bills and drinks on Hono `/v1` with the same plan gates as web, and ship matching Expo admin screens so mobile money ops match web.

**Architecture:** Move `plans` + `assertFeature` (+ pure bills/drinks helpers) into `@gym/shared`. Add Hono route modules that mirror web Server Actions. Expo calls API via existing `apps/mobile/lib/api.ts`. Web keeps working via re-exports from shared.

**Tech Stack:** Hono, Prisma, Expo Router, `@gym/shared`, Vitest, existing mobile theme/i18n.

**Spec:** `docs/superpowers/specs/2026-08-01-mobile-web-parity-design.md` (Phase A section)

## Global Constraints

- Admin-only for bills + drinks (same as web).
- Gates: `utility_bills` (all plans), `drinks` (Growth+). Return `403` + `FEATURE_LOCKED`.
- Scope every query by `staff.gymId`.
- FR + AR strings in `@gym/shared/i18n` (mobile source of truth for app copy).
- Do **not** implement Phase B/C/D in this plan.
- Prefer small commits; author as repo owner when committing.
- Do not break existing web bills/drinks pages.

## File map

| File | Responsibility |
|------|----------------|
| `packages/shared/src/plans.ts` | Plan matrix + `planHasFeature` (moved from web) |
| `packages/shared/src/gym-features.ts` | Add async-capable `assertFeature` helper that takes `{ plan }` or sync check |
| `packages/shared/src/bills.ts` | `periodMonthStart`, `sumBillsForMonth` |
| `packages/shared/src/drinks.ts` | Pure stock/revenue helpers from web |
| `packages/shared/src/i18n.ts` | `nav.bills`, `nav.drinks`, bills/drinks UI keys |
| `packages/shared/package.json` | Export new subpaths |
| `src/lib/plans.ts` | Re-export from `@gym/shared/plans` |
| `src/lib/bills.ts` / `drinks.ts` | Re-export from shared (or delete + update imports) |
| `src/lib/gym-features.ts` | Use shared plan helpers |
| `apps/api/src/lib/features.ts` | `assertGymFeature(gymId, feature)` using prisma + shared |
| `apps/api/src/routes/bills.ts` | Bills CRUD HTTP |
| `apps/api/src/routes/drinks.ts` | Products + sales HTTP |
| `apps/api/src/services/dashboard.ts` | Optional bills/drinks month totals |
| `apps/api/src/index.ts` | Mount `/v1/bills`, `/v1/drinks` |
| `apps/mobile/lib/navigation.ts` | Admin nav items (gated in UI) |
| `apps/mobile/app/(admin)/bills.tsx` | Charges screen |
| `apps/mobile/app/(admin)/drinks.tsx` | Boissons screen |
| `apps/mobile/app/(admin)/_layout.tsx` | Register screens (`href: null` → More) |
| `apps/mobile/components/app-tab-bar.tsx` | Include new More links when unlocked |
| `tests/unit/plans.test.ts` | Still pass after move |
| `tests/unit/bills.test.ts` / `drinks.test.ts` | Import from shared |
| `tests/unit/api-feature-gate.test.ts` | Pure gate helper tests if extracted |

---

### Task 1: Move plans + bills/drinks helpers into `@gym/shared`

**Files:**
- Create: `packages/shared/src/plans.ts`
- Modify: `packages/shared/src/gym-features.ts`, `package.json`, `src/index.ts` if needed
- Create: `packages/shared/src/bills.ts`, `packages/shared/src/drinks.ts`
- Modify: `src/lib/plans.ts`, `src/lib/bills.ts`, `src/lib/drinks.ts`, `src/lib/gym-features.ts`
- Modify: `tests/unit/plans.test.ts`, `tests/unit/bills.test.ts`, `tests/unit/drinks.test.ts` imports if paths change

- [ ] **Step 1: Copy web `src/lib/plans.ts` → `packages/shared/src/plans.ts`**

Use `@prisma/client` `Plan` / `AccessMode` enums (shared already depends on Prisma types as devDependency — match other shared files). Export `PlanFeature`, `planHasFeature`, `getPlanLimits`, `modesAllowedForPlan`, `suggestFromEntryAnswer`.

- [ ] **Step 2: Add sync helper to gym-features**

```ts
import { planHasFeature, type PlanFeature } from "./plans";
import type { Plan } from "@prisma/client";

export function assertPlanFeature(plan: Plan, feature: PlanFeature): void {
  if (!planHasFeature(plan, feature)) {
    throw new Error("FEATURE_LOCKED");
  }
}
```

Keep `canAddStaff`.

- [ ] **Step 3: Move pure bills/drinks helpers**

Copy `periodMonthStart` + `sumBillsForMonth` and drinks pure functions from `src/lib/drinks.ts` into shared. Avoid Prisma client in shared pure files where possible (use number + enums only).

- [ ] **Step 4: Wire package exports**

```json
"./plans": "./src/plans.ts",
"./bills": "./src/bills.ts",
"./drinks": "./src/drinks.ts"
```

- [ ] **Step 5: Web re-exports**

`src/lib/plans.ts`:

```ts
export * from "@gym/shared/plans";
```

Same pattern for bills/drinks if clean; otherwise update imports to `@gym/shared/bills`.

- [ ] **Step 6: Run unit tests**

```bash
npm run test:unit
```

Expected: all previous tests still green (80+).

- [ ] **Step 7: Commit**

```bash
git add packages/shared src/lib tests/unit
git commit -m "$(cat <<'EOF'
refactor: move plans and bills/drinks helpers to @gym/shared

EOF
)"
```

---

### Task 2: API feature gate helper + bills routes

**Files:**
- Create: `apps/api/src/lib/features.ts`
- Create: `apps/api/src/routes/bills.ts`
- Modify: `apps/api/src/index.ts`

- [ ] **Step 1: Feature helper**

```ts
// apps/api/src/lib/features.ts
import { prisma } from "../db";
import { assertPlanFeature, type PlanFeature } from "@gym/shared/plans";
// or assertPlanFeature from gym-features

export async function assertGymFeature(gymId: string, feature: PlanFeature) {
  const gym = await prisma.gym.findUniqueOrThrow({
    where: { id: gymId },
    select: { plan: true },
  });
  assertPlanFeature(gym.plan, feature);
}
```

Map thrown `FEATURE_LOCKED` to JSON 403 in routes.

- [ ] **Step 2: Implement bills routes** (mirror `src/app/actions/bills.ts`)

| Method | Path | Body / query |
|--------|------|--------------|
| GET | `/` | `?month=yyyy-MM` → list + `total` + `byType` |
| POST | `/` | `{ type, amount, periodMonth, dueDate?, note? }` |
| POST | `/:id/pay` | mark paid (`paidAt = now`) |
| DELETE | `/:id` | delete if `gymId` matches |

All: `requireAdmin` + `assertGymFeature(..., "utility_bills")`.

- [ ] **Step 3: Mount**

```ts
app.route("/v1/bills", billsRoutes);
```

- [ ] **Step 4: Manual smoke with curl** (admin token)

```bash
# list current month
curl -H "Authorization: Bearer $TOKEN" "http://localhost:4000/v1/bills?month=2026-08"
```

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(api): add utility bills routes with plan gate"
```

---

### Task 3: API drinks routes + dashboard fields

**Files:**
- Create: `apps/api/src/routes/drinks.ts`
- Modify: `apps/api/src/services/dashboard.ts`
- Modify: `apps/api/src/index.ts`

- [ ] **Step 1: Drinks routes** (mirror `src/app/actions/drinks.ts`)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/products` | all products for gym |
| POST | `/products` | create |
| PATCH | `/products/:id` | update name/prices/active |
| POST | `/products/:id/restock` | `{ quantity }` |
| GET | `/sales?month=yyyy-MM` | list + `revenue` |
| POST | `/sales` | sell: `{ productId, quantity, method, soldAt, note? }` — decrement stock transactionally |

Gate: `drinks`. Role: ADMIN.

- [ ] **Step 2: Dashboard**

When gym has features, include `billsTotalThisMonth` and/or `drinksRevenueThisMonth` (null if locked), matching web `src/lib/dashboard.ts` behavior.

- [ ] **Step 3: Mount `/v1/drinks`**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(api): add drinks routes and dashboard money fields"
```

---

### Task 4: Shared i18n + mobile navigation

**Files:**
- Modify: `packages/shared/src/i18n.ts`
- Modify: `apps/mobile/lib/navigation.ts`
- Modify: `apps/mobile/components/app-tab-bar.tsx` (or wherever More menu is built)
- Modify: `apps/mobile/components/icons.tsx` if new icons needed

- [ ] **Step 1: Add FR/AR keys**

At minimum: `nav.bills`, `nav.drinks`, and the bills/drinks strings already on web (`bills.*`, `drinks.*`, payment method keys if missing). Copy from `src/lib/i18n.ts` to keep wording identical.

- [ ] **Step 2: Extend `adminNav`**

Insert bills + drinks before `staff` (same order as web). Screens still registered with `href: null` so they appear under More.

- [ ] **Step 3: Gate More items**

Fetch gym plan/features once (settings GET or dashboard payload). For Phase A, either:
- temporarily show both and let API 403 + toast, **or**
- extend `GET /v1/settings` minimally with `{ plan, features }` (small preview of Phase B — preferred).

Prefer minimal settings GET enrichment:

```json
{ "plan": "STARTER", "features": ["utility_bills"] }
```

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(mobile): add bills/drinks nav and i18n keys"
```

---

### Task 5: Expo Charges screen

**Files:**
- Create: `apps/mobile/app/(admin)/bills.tsx`
- Possibly: `apps/mobile/screens/bills-screen.tsx`
- Modify: `apps/mobile/app/(admin)/_layout.tsx`

- [ ] **Step 1: Register tab screen** with `href: null`

- [ ] **Step 2: Build UI**

- Month control (simple prev/next month buttons or text input `yyyy-MM` — reuse patterns from attendance if any)
- Total + list of bills
- Add form: type, amount, period, due date, note
- Actions: mark paid, delete (confirm)

Use `api()` / `apiJson` from `lib/api.ts` like staff/settings screens.

- [ ] **Step 3: Handle `FEATURE_LOCKED` and `FORBIDDEN`**

- [ ] **Step 4: Manual test on Expo** (admin Starter gym — bills works)

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(mobile): admin charges (bills) screen"
```

---

### Task 6: Expo Boissons screen

**Files:**
- Create: `apps/mobile/app/(admin)/drinks.tsx`
- Possibly: `apps/mobile/screens/drinks-screen.tsx`
- Modify: `_layout.tsx`

- [ ] **Step 1: Tabs** — Products / Sell / History (same as web)

- [ ] **Step 2: Wire API**

Products CRUD + restock; sell form; sales list + revenue for month.

- [ ] **Step 3: Locked state for Starter**

If feature missing: show upgrade message (copy from web `drinks.lockedSubtitle` / `upgradeBody`).

- [ ] **Step 4: Manual test** Growth/Pro vs Starter

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(mobile): admin drinks screen"
```

---

### Task 7: Dashboard mobile cards + docs

**Files:**
- Modify: `apps/mobile/app/(admin)/dashboard.tsx`
- Modify: `docs/MOBILE_README.md` or `docs/ARCHITECTURE_EVOLUTION.md` (short note: Phase A parity shipped)
- Modify: `docs/superpowers/specs/2026-08-01-drinks-and-utility-bills-design.md` — strike “no mobile API parity”

- [ ] **Step 1: Show bills/drinks totals when API returns non-null**

- [ ] **Step 2: Update docs**

- [ ] **Step 3: Full unit test run**

```bash
npm run test:unit
```

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(mobile): dashboard bills/drinks totals; note Phase A parity"
```

---

## Done when

- [ ] Admin on mobile can manage Charges like web  
- [ ] Admin on Growth+ can manage Boissons like web; Starter locked  
- [ ] API rejects locked features with 403  
- [ ] Web still works (re-exports)  
- [ ] Unit tests green  

## Next plans (not this PR)

- Phase B — settings plan/access, badge, CSV gates/export  
- Phase C — member edit, invite disable, QR  
- Phase D — kiosk  
