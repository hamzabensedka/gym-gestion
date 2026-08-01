# Drinks + Utility Bills Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add admin utility bills (eau / électricité / gaz) for all plans, and drinks stock + sales (Growth/Pro), with monthly totals and FR/AR UI on the Next.js web app.

**Architecture:** New Prisma models scoped by `gymId`. Domain helpers in `src/lib/bills.ts` and `src/lib/drinks.ts`. Server Actions + App Router pages under `(app)/bills` and `(app)/drinks`. Feature flags `utility_bills` (all plans) and `drinks` (Growth+) in `src/lib/plans.ts`. Admin-only nav. Web-first; no Hono/mobile in this plan.

**Tech Stack:** Next.js App Router, Prisma 6, PostgreSQL, Zod, Vitest, existing i18n / UI components.

**Spec:** `docs/superpowers/specs/2026-08-01-drinks-and-utility-bills-design.md`

## Global Constraints

- Simple v1 only: no OCR, no member credit tabs, no suppliers/recipes.
- Admin-only; staff nav unchanged.
- TND, FR + AR strings required for new UI.
- Multi-tenant: every query filtered by `session.gymId`.
- Prefer `db:push --accept-data-loss` locally when adding constraints; include migration SQL.
- Follow existing patterns in `src/app/actions/payments.ts`, members pages, `src/lib/plans.ts`.
- Do not implement mobile API parity in this plan.

## File map

| File | Responsibility |
|------|----------------|
| `prisma/schema.prisma` | Enums + UtilityBill, DrinkProduct, DrinkSale |
| `src/lib/plans.ts` | Features `utility_bills`, `drinks` |
| `src/lib/bills.ts` | Bill CRUD helpers + month totals |
| `src/lib/drinks.ts` | Stock sell/restock + revenue sums |
| `src/app/actions/bills.ts` | Server actions |
| `src/app/actions/drinks.ts` | Server actions |
| `src/app/(app)/bills/page.tsx` | Bills UI |
| `src/app/(app)/drinks/page.tsx` | Drinks UI |
| `src/components/bills/*` | Forms / list |
| `src/components/drinks/*` | Products / sell / history |
| `src/components/layout/app-shell.tsx` | Nav links |
| `src/lib/i18n.ts` | FR/AR |
| `tests/unit/bills.test.ts` | Month aggregation |
| `tests/unit/drinks.test.ts` | Stock rules |

---

## Phase 1 — Utility bills

### Task 1: Schema — utility bills

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260801160000_utility_bills/migration.sql`

**Interfaces:**
- Produces: enum `UtilityType { WATER ELECTRICITY GAS }`; model `UtilityBill` as in spec

- [ ] **Step 1: Add to schema**

```prisma
enum UtilityType {
  WATER
  ELECTRICITY
  GAS
}

model UtilityBill {
  id           String      @id @default(cuid())
  gymId        String
  gym          Gym         @relation(fields: [gymId], references: [id], onDelete: Cascade)
  type         UtilityType
  periodMonth  DateTime
  amount       Decimal     @db.Decimal(10, 2)
  dueDate      DateTime?
  paidAt       DateTime?
  note         String?
  recordedById String
  recordedBy   User        @relation(fields: [recordedById], references: [id], onDelete: Restrict)
  createdAt    DateTime    @default(now())

  @@index([gymId, periodMonth])
  @@index([gymId, type])
}
```

Wire `utilityBills UtilityBill[]` on `Gym` and `User`.

- [ ] **Step 2: Apply**

```bash
npx prisma db push --accept-data-loss
npx prisma generate
```

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(db): add utility bills model"
```

---

### Task 2: Plan feature + bills domain helpers

**Files:**
- Modify: `src/lib/plans.ts`
- Create: `src/lib/bills.ts`
- Create: `tests/unit/bills.test.ts`
- Modify: `tests/unit/plans.test.ts`

**Interfaces:**
- `PlanFeature` adds `"utility_bills" | "drinks"`
- All plans get `utility_bills`; Growth+ get `drinks`
- `sumBillsForMonth(bills, monthStart): { total, byType }`
- `periodMonthStart(date: Date): Date` → UTC first day of month at noon local-safe (use `startOfMonth` from date-fns)

- [ ] **Step 1: Failing tests for month sum**

```ts
import { describe, expect, it } from "vitest";
import { UtilityType } from "@prisma/client";
import { sumBillsForMonth } from "@/lib/bills";

describe("sumBillsForMonth", () => {
  it("totals and groups by type", () => {
    const month = new Date("2026-08-01T12:00:00");
    const result = sumBillsForMonth(
      [
        { type: UtilityType.WATER, amount: 40, periodMonth: month },
        { type: UtilityType.ELECTRICITY, amount: 120, periodMonth: month },
        { type: UtilityType.GAS, amount: 30, periodMonth: month },
      ],
      month,
    );
    expect(result.total).toBe(190);
    expect(result.byType.WATER).toBe(40);
    expect(result.byType.ELECTRICITY).toBe(120);
    expect(result.byType.GAS).toBe(30);
  });
});
```

- [ ] **Step 2: Implement + update plan matrix**

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: add utility bill helpers and plan feature flags"
```

---

### Task 3: Bills server actions + page UI

**Files:**
- Create: `src/app/actions/bills.ts`
- Create: `src/app/(app)/bills/page.tsx`
- Create: `src/components/bills/bills-panel.tsx` (list + create form + mark paid)
- Modify: `src/components/layout/app-shell.tsx` + `(app)/layout.tsx` for admin nav
- Modify: `src/lib/i18n.ts`
- Modify: `src/proxy.ts` matcher for `/bills`

**Interfaces:**
- `createBillAction`, `markBillPaidAction`, `deleteBillAction`
- `assertFeature(gymId, "utility_bills")` + ADMIN only
- Page query `?month=yyyy-MM`

- [ ] **Step 1: Actions** (mirror payments patterns: `requireSession`, gym scope)

- [ ] **Step 2: UI** — month selector, totals, table, create form (type, amount, period, due, note)

- [ ] **Step 3: Nav** — admin link “Charges” / Arabic equivalent

- [ ] **Step 4: Manual smoke** — create water bill, see total

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: admin utility bills page for water electricity gas"
```

---

## Phase 2 — Drinks

### Task 4: Schema — drinks

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260801170000_drinks/migration.sql`

**Interfaces:**
- Models `DrinkProduct`, `DrinkSale` as in spec; relations on `Gym` / `User`

- [ ] **Step 1–3:** schema, push, commit `feat(db): add drink products and sales`

---

### Task 5: Drinks domain (stock rules)

**Files:**
- Create: `src/lib/drinks.ts`
- Create: `tests/unit/drinks.test.ts`

**Interfaces:**
- `canSell(stockQty, quantity): boolean`
- `nextStockAfterSale(stockQty, quantity): number` throws if insufficient
- `nextStockAfterRestock(stockQty, quantity): number`
- `sumDrinkRevenue(sales): number`

- [ ] **Step 1: TDD** — sell blocked when `quantity > stockQty`; restock increases

- [ ] **Step 2: Implement**

- [ ] **Step 3: Commit** `feat: add drink stock and revenue helpers`

---

### Task 6: Drinks actions + UI

**Files:**
- Create: `src/app/actions/drinks.ts`
- Create: `src/app/(app)/drinks/page.tsx`
- Create: `src/components/drinks/*` (products list, sell form, sales list, restock)
- Modify: nav, i18n, proxy matcher `/drinks`
- Gate with `planHasFeature(plan, "drinks")` — Starter sees upgrade CTA

**Interfaces:**
- `createProductAction`, `restockProductAction`, `sellDrinkAction`, `toggleProductActiveAction`
- `sellDrinkAction`: transaction — check stock, create `DrinkSale`, decrement `stockQty`

- [ ] **Step 1: Actions with prisma `$transaction`**

- [ ] **Step 2: UI sections Products / Sell / History**

- [ ] **Step 3: Nav for Growth/Pro admin only**

- [ ] **Step 4: Commit** `feat: drinks stock sales and revenue UI`

---

### Task 7: Dashboard cards + docs

**Files:**
- Modify: `src/lib/dashboard.ts` + `src/app/(app)/dashboard/page.tsx` (optional cards if low risk)
- Modify: `README.md` — short “Charges & Boissons” blurb
- Run: `npm run test:unit`

- [ ] **Step 1: Add `utilityBillsThisMonth` and `drinksRevenueThisMonth` to dashboard data when features enabled**

- [ ] **Step 2: Unit suite green**

- [ ] **Step 3: Commit** `feat: show bills and drinks totals on dashboard`

---

## Out of scope / follow-ups

- Hono API + mobile screens  
- Staff can sell drinks  
- Bill attachments  
- Member drink credit  

## Spec coverage

| Spec item | Tasks |
|-----------|-------|
| Utility bills CRUD + month total | 1–3 |
| Plan gating bills all / drinks Growth+ | 2, 6 |
| Drink products, restock, sell, revenue | 4–6 |
| Dashboard light hooks | 7 |
| FR/AR, admin-only | 3, 6 |
| No OCR / credit / API | deferred |

## Execution handoff

Plan saved to `docs/superpowers/plans/2026-08-01-drinks-and-utility-bills.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — one task per subagent  
2. **Inline Execution** — run tasks in this chat with checkpoints  

Which approach? (You can also say “Phase 1 only” to ship bills first.)
