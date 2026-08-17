# Class Booking v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Growth+ gyms publish capped class sessions; members of that gym book remaining spots on web and Expo; a full session rejects (including races); Starter stays locked.

**Architecture:** One `@gym/shared/class-booking` module owns remaining math, eligibility, and Prisma transaction helpers (`SELECT … FOR UPDATE` then count then insert/update). Web Server Actions and Hono `/v1` both call those helpers. Never copy cap logic into `src/app/actions` or `apps/api`. Admin web `/classes` first; member calendar on web `/member/classes` and Expo `(member)/classes`. Two tenants = two `Gym` rows; no Organization/Location; no gym-name checks.

**Tech Stack:** Prisma 6 / PostgreSQL, Next.js App Router Server Actions, Hono `/v1`, Expo Router, Vitest, `@gym/shared` (FR+AR i18n).

**Spec:** `docs/superpowers/specs/2026-08-17-class-booking-design.md`

## Global Constraints

- Stay on `feat/class-booking-v1`. Do not work on parity/kiosk branches or reopen those specs.
- Do **not** commit leftovers: `.superpowers/`, `scripts/prod-migrate.mjs`, `src/components/ui/date-picker.tsx`, `src/components/ui/month-picker.tsx`, `src/components/ui/popover.tsx`, `src/components/ui/select.tsx`, `src/lib/month-picker.ts`, `tests/unit/month-picker.test.ts`.
- TDD: write the failing test, run it (fail), implement, run it (pass), then commit.
- Every query includes `gymId`. Never look up Class / ClassSession / Booking / Member by id alone.
- Feature id is `class_booking` on Growth + Pro only. Same `assertPlanFeature` / `assertFeature` / `requireGymFeature` pattern as drinks/kiosk.
- Desk (admin **and** staff) manage catalog/sessions/roster. Members book their own gym only. Desk does **not** book on behalf of a member.
- One `Booking` row per `(sessionId, memberId)`. Cancel sets `CANCELLED`; re-book sets `BOOKED` if a spot remains.
- Remaining is never stored: `capacity − count(BOOKED)`.
- FR + AR keys in **both** `packages/shared/src/i18n.ts` and `src/lib/i18n.ts`. Interpolate with `{count}` (single braces).
- Do not add `packages/application`. Do not add Expo admin CRUD. Do not seed a second gym or any FitBox Ladies names.
- Prisma model name is `Class`; client accessor is `prisma.class` (property access is valid). Table `"ClassSession"` (not `Session`).
- Add `@prisma/client` as a **runtime** dependency of `@gym/shared` (helpers use `Prisma.sql` / `Prisma.PrismaClientKnownRequestError`).

## File map

| File | Responsibility |
|------|----------------|
| `packages/shared/src/plans.ts` | Add `class_booking` to Growth + Pro `features` |
| `packages/shared/src/class-booking.ts` | Pure math, eligibility, `BookingError`, range/week/capacity validators; re-exports db helpers |
| `packages/shared/src/class-booking-db.ts` | Prisma tx helpers: book/cancel/list/CRUD/generate-week |
| `packages/shared/package.json` | Export `./class-booking`; `@prisma/client` dependency |
| `src/lib/class-booking.ts` | `export * from "@gym/shared/class-booking"` |
| `prisma/schema.prisma` | Enums + Class + ClassSession + Booking + Gym/Member relations |
| `prisma/migrations/20260817120000_class_booking/migration.sql` | Tables, indexes, FKs |
| `prisma/seed.ts` | Delete booking/session/class first; seed Yoga + 2 upcoming sessions on the existing demo gym |
| `tests/unit/plans.test.ts` | `class_booking` gate |
| `tests/unit/class-booking.test.ts` | Pure helpers |
| `tests/integration/class-booking.test.ts` | Concurrency, unique, re-book, gymId isolation, desk vs member cancel |
| `apps/api/src/lib/features.ts` | `requireMemberGymFeature` |
| `apps/api/src/routes/classes.ts` | Desk `/v1/classes` + `/v1/sessions` |
| `apps/api/src/routes/app.ts` | Member sessions/book/cancel + wallet `features` |
| `apps/api/src/index.ts` | Mount class/session routes |
| `src/app/actions/classes.ts` | Desk Server Actions → shared helpers |
| `src/app/actions/member-classes.ts` | Member book/cancel → same helpers |
| `src/app/(app)/classes/page.tsx` | Admin/staff week grid or locked page |
| `src/components/classes/*` | Catalog, week generator, roster |
| `src/app/member/classes/page.tsx` | Member calendar |
| `src/components/layout/app-shell.tsx` | `nav.classes` when feature on (admin + staff) |
| `src/app/(app)/layout.tsx` | Pass `showClassesNav` |
| `src/lib/i18n.ts` + `packages/shared/src/i18n.ts` | FR/AR copy |
| `apps/mobile/app/(member)/classes.tsx` | Expo route |
| `apps/mobile/screens/member-classes-screen.tsx` | Expo calendar |
| `apps/mobile/app/(member)/index.tsx` | Entry when `features` includes `class_booking` |
| `docs/ARCHITECTURE_EVOLUTION.md` | Note class booking v1 |

---

### Task 1: Plan feature `class_booking`

**Files:**
- Modify: `packages/shared/src/plans.ts`
- Modify: `tests/unit/plans.test.ts`

**Interfaces:**
- Consumes: existing `PlanFeature`, `planHasFeature`, `PLAN_CONFIG`
- Produces: `PlanFeature` includes `"class_booking"`; Growth and Pro lists include it; Starter does not

- [ ] **Step 1: Write the failing tests**

Add to `tests/unit/plans.test.ts`:

```ts
it("starter has no class_booking", () => {
  expect(planHasFeature(Plan.STARTER, "class_booking")).toBe(false);
});

it("growth and pro have class_booking", () => {
  expect(planHasFeature(Plan.GROWTH, "class_booking")).toBe(true);
  expect(planHasFeature(Plan.PRO, "class_booking")).toBe(true);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/plans.test.ts`

Expected: FAIL — `"class_booking"` is not assignable to `PlanFeature` and/or `planHasFeature` returns false for Growth.

- [ ] **Step 3: Add the feature**

In `packages/shared/src/plans.ts`:

```ts
export type PlanFeature =
  | "kiosk"
  | "csv_export"
  | "badge_numbers"
  | "access_export"
  | "utility_bills"
  | "drinks"
  | "class_booking";
```

Add `"class_booking"` to `GROWTH.features` and `PRO.features` (next to `"drinks"`). Do **not** add it to `STARTER`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/plans.test.ts`

Expected: PASS (existing drinks/kiosk assertions still pass).

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/plans.ts tests/unit/plans.test.ts
git commit -m "feat(plans): gate class_booking on Growth and Pro"
```

---

### Task 2: Prisma schema, migration, seed

**Files:**
- Modify: `prisma/schema.prisma` (Gym + Member relations; new enums/models at end of file)
- Create: `prisma/migrations/20260817120000_class_booking/migration.sql`
- Modify: `prisma/seed.ts`

**Interfaces:**
- Consumes: none from Task 1 besides gym `plan` already existing
- Produces: models `Class`, `ClassSession`, `Booking`; enums `ClassSessionStatus`, `BookingStatus`; seed class name `"Yoga"` capacity `12` and two `SCHEDULED` sessions with `startsAt` in the future

- [ ] **Step 1: Add enums and models to `prisma/schema.prisma`**

On `Gym`, add:

```prisma
  classes        Class[]
  classSessions  ClassSession[]
  bookings       Booking[]
```

On `Member`, add:

```prisma
  bookings          Booking[]
```

After the existing enums (near `UtilityType`), add:

```prisma
enum ClassSessionStatus {
  SCHEDULED
  CANCELLED
}

enum BookingStatus {
  BOOKED
  CANCELLED
}
```

After `DrinkSale`, add:

```prisma
model Class {
  id              String         @id @default(cuid())
  gymId           String
  gym             Gym            @relation(fields: [gymId], references: [id], onDelete: Cascade)
  name            String
  defaultCapacity Int
  active          Boolean        @default(true)
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
  sessions        ClassSession[]

  @@unique([gymId, name])
  @@index([gymId, active])
}

model ClassSession {
  id        String             @id @default(cuid())
  gymId     String
  gym       Gym                @relation(fields: [gymId], references: [id], onDelete: Cascade)
  classId   String
  class     Class              @relation(fields: [classId], references: [id], onDelete: Restrict)
  startsAt  DateTime
  endsAt    DateTime
  capacity  Int
  coachName String?
  status    ClassSessionStatus @default(SCHEDULED)
  createdAt DateTime           @default(now())
  updatedAt DateTime           @updatedAt
  bookings  Booking[]

  @@unique([gymId, classId, startsAt])
  @@index([gymId, startsAt])
  @@index([gymId, classId, startsAt])
}

model Booking {
  id          String        @id @default(cuid())
  gymId       String
  gym         Gym           @relation(fields: [gymId], references: [id], onDelete: Cascade)
  sessionId   String
  session     ClassSession  @relation(fields: [sessionId], references: [id], onDelete: Restrict)
  memberId    String
  member      Member        @relation(fields: [memberId], references: [id], onDelete: Cascade)
  status      BookingStatus @default(BOOKED)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  cancelledAt DateTime?

  @@unique([sessionId, memberId])
  @@index([gymId, memberId, status])
  @@index([sessionId, status])
}
```

- [ ] **Step 2: Write `prisma/migrations/20260817120000_class_booking/migration.sql`**

Follow the drinks migration style (quoted identifiers, explicit FKs). Include:

- enums `"ClassSessionStatus"` (`SCHEDULED`, `CANCELLED`) and `"BookingStatus"` (`BOOKED`, `CANCELLED`)
- tables `"Class"`, `"ClassSession"`, `"Booking"` with the columns above
- unique indexes: `"Class_gymId_name_key"`, `"ClassSession_gymId_classId_startsAt_key"`, `"Booking_sessionId_memberId_key"`
- indexes from the schema
- FKs: all `gymId` → `"Gym"("id")` ON DELETE CASCADE; `ClassSession.classId` → `"Class"("id")` ON DELETE RESTRICT; `Booking.sessionId` → `"ClassSession"("id")` ON DELETE RESTRICT; `Booking.memberId` → `"Member"("id")` ON DELETE CASCADE

- [ ] **Step 3: Update seed cleanup + Yoga fixtures**

At the top of `main()`, before `prisma.checkin.deleteMany()`:

```ts
await prisma.booking.deleteMany();
await prisma.classSession.deleteMany();
await prisma.class.deleteMany();
```

After members/check-ins/payments are created, on the **existing** `gym` only:

```ts
const yoga = await prisma.class.create({
  data: {
    gymId: gym.id,
    name: "Yoga",
    defaultCapacity: 12,
    active: true,
  },
});

const sessionOneStart = setMinutes(setHours(addDays(now, 2), 10), 0);
const sessionTwoStart = setMinutes(setHours(addDays(now, 4), 18), 0);

await prisma.classSession.createMany({
  data: [
    {
      gymId: gym.id,
      classId: yoga.id,
      startsAt: sessionOneStart,
      endsAt: setMinutes(setHours(addDays(now, 2), 11), 0),
      capacity: 12,
      status: "SCHEDULED",
    },
    {
      gymId: gym.id,
      classId: yoga.id,
      startsAt: sessionTwoStart,
      endsAt: setMinutes(setHours(addDays(now, 4), 19), 0),
      capacity: 12,
      status: "SCHEDULED",
    },
  ],
});
```

`setHours` / `setMinutes` / `addDays` are already imported from `date-fns`. Do not create a second gym. Do not use the strings `FitBox Ladies` or ladies-only names. Class name is `"Yoga"` only.

- [ ] **Step 4: Generate client and apply schema**

Run: `npx prisma generate`

Then, against the **test** database (same guard as `tests/helpers/db.ts`): `npx prisma db push` using `.env.test` if present, or `npx prisma migrate deploy` for a dedicated DB.

Do not run migrate against production.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260817120000_class_booking/migration.sql prisma/seed.ts
git commit -m "feat(db): add Class, ClassSession, and Booking"
```

---

### Task 3: Pure `@gym/shared/class-booking` helpers

**Files:**
- Create: `packages/shared/src/class-booking.ts`
- Create: `packages/shared/src/class-booking-db.ts` (export stubs that throw `Error("not implemented")` only if needed to compile the barrel; prefer keeping db helpers in Task 4 and having this file export pure symbols plus `export type { … }` placeholders)
- Modify: `packages/shared/package.json` (add `"./class-booking": "./src/class-booking.ts"` and `"@prisma/client": "^6.19.3"` under `dependencies`)
- Modify: `packages/shared/src/index.ts` (do **not** star-export class-booking from the root unless needed; the subpath export is enough)
- Create: `src/lib/class-booking.ts` with `export * from "@gym/shared/class-booking";`
- Test: `tests/unit/class-booking.test.ts`

**Interfaces:**
- Consumes: none
- Produces (exact names — later tasks must use these):

```ts
export type BookingErrorCode =
  | "FEATURE_LOCKED"
  | "NOT_FOUND"
  | "SESSION_FULL"
  | "ALREADY_BOOKED"
  | "SESSION_STARTED"
  | "SESSION_CANCELLED"
  | "MEMBER_NOT_ELIGIBLE"
  | "CAPACITY_BELOW_BOOKINGS"
  | "CLASS_HAS_SESSIONS"
  | "SESSION_HAS_BOOKINGS"
  | "VALIDATION";

export class BookingError extends Error {
  readonly code: BookingErrorCode;
  constructor(code: BookingErrorCode) {
    super(code);
    this.name = "BookingError";
    this.code = code;
  }
}

export function isBookingError(error: unknown): error is BookingError;

export function remainingSpots(capacity: number, bookedCount: number): number;
export function isSessionFull(capacity: number, bookedCount: number): boolean;

export function decideMemberBookEligibility(input: {
  now: Date;
  memberStatus: "ACTIVE" | "EXPIRED" | "FROZEN";
  subscriptionEnd: Date;
  sessionStatus: "SCHEDULED" | "CANCELLED";
  startsAt: Date;
}): { ok: true } | { ok: false; code: BookingErrorCode };

export function assertCapacity(value: number): number; // integer 1–200 or throw BookingError("VALIDATION")
export function assertClassName(value: string): string; // trim, non-empty, max 80, else VALIDATION
export function assertCoachName(value: string | null | undefined): string | null; // trim; empty → null; max 80

export function parseSessionRange(fromIso: string, toIso: string): { from: Date; to: Date };
// inclusive from, exclusive to; invalid/NaN/to<=from/duration > 31 days → VALIDATION

export function startsAtFromWeekSlot(weekStart: Date, weekday: number, startMinutes: number): Date;
export function endsAtFromWeekSlot(weekStart: Date, weekday: number, endMinutes: number): Date;
// weekday 1–7 Monday–Sunday; minutes 0–1439; weekday/minutes invalid → VALIDATION
// result = weekStart + (weekday-1) days + minutes (copy the Date, do not mutate the input)

export function bookingErrorHttpStatus(code: BookingErrorCode): 403 | 404 | 409 | 422;
```

HTTP map (copy into `bookingErrorHttpStatus`):

| Code | Status |
|------|--------|
| `FEATURE_LOCKED`, `MEMBER_NOT_ELIGIBLE` | 403 |
| `NOT_FOUND` | 404 |
| `VALIDATION` | 422 |
| all other codes above | 409 |

- [ ] **Step 1: Write `tests/unit/class-booking.test.ts`** (failing)

```ts
import { describe, expect, it } from "vitest";
import {
  remainingSpots,
  isSessionFull,
  decideMemberBookEligibility,
  assertCapacity,
  parseSessionRange,
  startsAtFromWeekSlot,
  bookingErrorHttpStatus,
  BookingError,
} from "@gym/shared/class-booking";

describe("remainingSpots / isSessionFull", () => {
  it("returns capacity minus booked", () => {
    expect(remainingSpots(12, 3)).toBe(9);
  });
  it("is full at remaining 0, not at remaining 1", () => {
    expect(isSessionFull(1, 1)).toBe(true);
    expect(isSessionFull(1, 0)).toBe(false);
    expect(remainingSpots(1, 0)).toBe(1);
  });
});

describe("decideMemberBookEligibility", () => {
  const startsAt = new Date("2026-08-20T10:00:00.000Z");
  const base = {
    now: new Date("2026-08-20T09:00:00.000Z"),
    memberStatus: "ACTIVE" as const,
    subscriptionEnd: new Date("2026-08-31T00:00:00.000Z"),
    sessionStatus: "SCHEDULED" as const,
    startsAt,
  };

  it("allows active member before start", () => {
    expect(decideMemberBookEligibility(base)).toEqual({ ok: true });
  });
  it("rejects frozen", () => {
    expect(decideMemberBookEligibility({ ...base, memberStatus: "FROZEN" })).toEqual({
      ok: false,
      code: "MEMBER_NOT_ELIGIBLE",
    });
  });
  it("rejects expired status", () => {
    expect(decideMemberBookEligibility({ ...base, memberStatus: "EXPIRED" })).toEqual({
      ok: false,
      code: "MEMBER_NOT_ELIGIBLE",
    });
  });
  it("rejects subscriptionEnd before now", () => {
    expect(
      decideMemberBookEligibility({
        ...base,
        subscriptionEnd: new Date("2026-08-19T00:00:00.000Z"),
      }),
    ).toEqual({ ok: false, code: "MEMBER_NOT_ELIGIBLE" });
  });
  it("allows subscriptionEnd equal to now", () => {
    expect(
      decideMemberBookEligibility({
        ...base,
        now: new Date("2026-08-31T00:00:00.000Z"),
        startsAt: new Date("2026-08-31T10:00:00.000Z"),
        subscriptionEnd: new Date("2026-08-31T00:00:00.000Z"),
      }),
    ).toEqual({ ok: true });
  });
  it("rejects cancelled session", () => {
    expect(
      decideMemberBookEligibility({ ...base, sessionStatus: "CANCELLED" }),
    ).toEqual({ ok: false, code: "SESSION_CANCELLED" });
  });
  it("rejects when now >= startsAt", () => {
    expect(decideMemberBookEligibility({ ...base, now: startsAt })).toEqual({
      ok: false,
      code: "SESSION_STARTED",
    });
  });
});

describe("validators", () => {
  it("assertCapacity accepts 1 and 200", () => {
    expect(assertCapacity(1)).toBe(1);
    expect(assertCapacity(200)).toBe(200);
  });
  it("assertCapacity rejects 0 and 201", () => {
    expect(() => assertCapacity(0)).toThrow(BookingError);
    expect(() => assertCapacity(201)).toThrow(BookingError);
  });
  it("parseSessionRange rejects spans over 31 days", () => {
    expect(() =>
      parseSessionRange("2026-08-01T00:00:00.000Z", "2026-09-02T00:00:00.000Z"),
    ).toThrow(BookingError);
  });
  it("parseSessionRange allows exactly 31 days", () => {
    const range = parseSessionRange(
      "2026-08-01T00:00:00.000Z",
      "2026-09-01T00:00:00.000Z",
    );
    expect(range.from.toISOString()).toBe("2026-08-01T00:00:00.000Z");
  });
  it("startsAtFromWeekSlot uses Monday=1", () => {
    const monday = new Date("2026-08-17T00:00:00.000Z");
    const wed = startsAtFromWeekSlot(monday, 3, 10 * 60);
    expect(wed.toISOString()).toBe("2026-08-19T10:00:00.000Z");
  });
});

describe("bookingErrorHttpStatus", () => {
  it("maps locked and eligibility to 403", () => {
    expect(bookingErrorHttpStatus("FEATURE_LOCKED")).toBe(403);
    expect(bookingErrorHttpStatus("MEMBER_NOT_ELIGIBLE")).toBe(403);
  });
  it("maps not found to 404 and validation to 422", () => {
    expect(bookingErrorHttpStatus("NOT_FOUND")).toBe(404);
    expect(bookingErrorHttpStatus("VALIDATION")).toBe(422);
  });
  it("maps full and already booked to 409", () => {
    expect(bookingErrorHttpStatus("SESSION_FULL")).toBe(409);
    expect(bookingErrorHttpStatus("ALREADY_BOOKED")).toBe(409);
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run tests/unit/class-booking.test.ts`

Expected: FAIL — module `@gym/shared/class-booking` not found.

- [ ] **Step 3: Implement `packages/shared/src/class-booking.ts`**

Eligibility order:

1. If `sessionStatus === "CANCELLED"` → `SESSION_CANCELLED`
2. If `now >= startsAt` → `SESSION_STARTED`
3. If `memberStatus !== "ACTIVE"` **or** `subscriptionEnd < now` → `MEMBER_NOT_ELIGIBLE`
4. Else `{ ok: true }`

`remainingSpots`: `Math.max(0, capacity - bookedCount)`.

`isSessionFull`: `remainingSpots(capacity, bookedCount) <= 0`.

`parseSessionRange`: parse both ISO dates; if invalid or `to <= from` throw `VALIDATION`; if `to.getTime() - from.getTime() > 31 * 24 * 60 * 60 * 1000` throw `VALIDATION`.

`startsAtFromWeekSlot` / `endsAtFromWeekSlot`: if weekday not in 1–7 or minutes not an integer in 0–1439, throw `VALIDATION`. Clone `weekStart` with `new Date(weekStart.getTime())`, `setUTCDate(getUTCDate() + weekday - 1)` **only if the fixture uses UTC** — do **not** mix UTC and local. Implement by adding `(weekday - 1) * 86400000 + minutes * 60000` to `weekStart.getTime()` so the unit test (`2026-08-17T00:00:00.000Z` + weekday 3 + 600 minutes → `2026-08-19T10:00:00.000Z`) passes without depending on the machine timezone.

`assertClassName`: trim; length 1–80.

`assertCoachName`: null/undefined/blank → `null`; else trim max 80.

`isBookingError`: `error instanceof BookingError`.

Also export db helpers from this file once Task 4 adds them:

```ts
export {
  bookSession,
  cancelBooking,
  listMemberSessions,
  listDeskSessions,
  listClasses,
  createClass,
  updateClass,
  deleteClass,
  createSession,
  updateSession,
  deleteSession,
  cancelClassSession,
  generateWeekSessions,
  listSessionRoster,
  assertClassBookingEnabled,
} from "./class-booking-db";
```

For this task only, if the db file does not exist yet, **do not** re-export it. Add the re-export in Task 4.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/class-booking.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/class-booking.ts packages/shared/package.json src/lib/class-booking.ts tests/unit/class-booking.test.ts
git commit -m "feat(shared): add class booking remaining and eligibility helpers"
```

---

### Task 4: Prisma `bookSession` / `cancelBooking` (TDD)

**Files:**
- Create: `packages/shared/src/class-booking-db.ts`
- Modify: `packages/shared/src/class-booking.ts` (re-export db functions)
- Test: `tests/integration/class-booking.test.ts`

**Interfaces:**
- Consumes: `BookingError`, `decideMemberBookEligibility`, `isSessionFull`, `remainingSpots` from Task 3
- Produces:

```ts
import type { PrismaClient } from "@prisma/client";

export async function assertClassBookingEnabled(
  db: PrismaClient,
  gymId: string,
): Promise<void>;
// load gym.plan, assertPlanFeature(plan, "class_booking"); throws Error("FEATURE_LOCKED") like gym-features

export async function bookSession(
  db: PrismaClient,
  input: { gymId: string; memberId: string; sessionId: string; now: Date },
): Promise<{ bookingId: string; remaining: number }>;

export async function cancelBooking(
  db: PrismaClient,
  input: {
    gymId: string;
    sessionId: string;
    memberId: string;
    now: Date;
    actor: "member" | "desk";
  },
): Promise<{ remaining: number }>;
```

`bookSession` algorithm (mandatory, inside `db.$transaction`):

1. `SELECT id FROM "ClassSession" WHERE id = ${sessionId} AND "gymId" = ${gymId} FOR UPDATE` via `tx.$queryRaw`
2. If no row → `BookingError("NOT_FOUND")`
3. Load session with `tx.classSession.findFirst({ where: { id: sessionId, gymId } })` and member with `tx.member.findFirst({ where: { id: memberId, gymId } })`. Either missing → `NOT_FOUND`
4. `decideMemberBookEligibility` using `member.status`, `member.subscriptionEnd`, `session.status`, `session.startsAt`, `input.now`. Fail → that code
5. Existing `tx.booking.findFirst({ where: { sessionId, memberId, gymId } })`
6. If existing status `BOOKED` → `ALREADY_BOOKED`
7. `bookedCount = tx.booking.count({ where: { sessionId, gymId, status: "BOOKED" } })`
8. If `isSessionFull(session.capacity, bookedCount)` → `SESSION_FULL`
9. If existing `CANCELLED` → update to `BOOKED`, `cancelledAt: null`
10. Else `tx.booking.create({ data: { gymId, sessionId, memberId, status: "BOOKED" } })`
11. Return `{ bookingId, remaining: remainingSpots(session.capacity, bookedCount + 1) }`

Catch unique-constraint (`Prisma.PrismaClientKnownRequestError` code `P2002`) and throw `BookingError("ALREADY_BOOKED")`.

`cancelBooking`:

1. Same `FOR UPDATE` on the session (gymId scoped)
2. Load booking `{ sessionId, memberId, gymId }`. Missing or not `BOOKED` → `NOT_FOUND`
3. If `actor === "member"` and `now >= session.startsAt` → `SESSION_STARTED`
4. Desk may cancel a `BOOKED` row anytime (including after start). Session already `CANCELLED` still allows desk cancel of leftover BOOKED rows.
5. Set `CANCELLED`, `cancelledAt = now`
6. Return `{ remaining: remainingSpots(capacity, bookedCountAfter) }` where bookedCountAfter is count of BOOKED after the update

- [ ] **Step 1: Write failing integration tests** in `tests/integration/class-booking.test.ts`

Use `resetTestDatabase` + `PrismaClient` like `tests/integration/perform-checkin.test.ts`. Resolve Ahmed (`Ahmed Ben Ali`, ACTIVE), Sara (`Sara Trabelsi`, EXPIRED), Ines (`Ines Jlassi`, FROZEN). Load the seeded Yoga sessions (`startsAt > now`).

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Plan, PrismaClient } from "@prisma/client";
import { resetTestDatabase } from "../helpers/db";
import {
  BookingError,
  assertClassBookingEnabled,
  bookSession,
  cancelBooking,
} from "@gym/shared/class-booking";

const prisma = new PrismaClient();

function isCode(error: unknown, code: string) {
  return error instanceof BookingError && error.code === code;
}

describe("class booking integration", () => {
  let gymId: string;
  let otherGymId: string;
  let ahmedId: string;
  let raniaId: string;
  let saraId: string;
  let inesId: string;
  let sessionId: string;

  beforeAll(async () => {
    resetTestDatabase();
    const gym = await prisma.gym.findFirst({ select: { id: true } });
    if (!gym) throw new Error("seed gym missing");
    gymId = gym.id;
    const ahmed = await prisma.member.findFirst({ where: { gymId, fullName: "Ahmed Ben Ali" } });
    const rania = await prisma.member.findFirst({ where: { gymId, fullName: "Rania Saidi" } });
    const sara = await prisma.member.findFirst({ where: { gymId, fullName: "Sara Trabelsi" } });
    const ines = await prisma.member.findFirst({ where: { gymId, fullName: "Ines Jlassi" } });
    const session = await prisma.classSession.findFirst({
      where: { gymId, startsAt: { gt: new Date() } },
      orderBy: { startsAt: "asc" },
    });
    if (!ahmed || !rania || !sara || !ines || !session) throw new Error("seed fixtures missing");
    ahmedId = ahmed.id;
    raniaId = rania.id;
    saraId = sara.id;
    inesId = ines.id;
    sessionId = session.id;
    const other = await prisma.gym.create({
      data: { name: "Other Gym", plan: Plan.GROWTH },
    });
    otherGymId = other.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("rejects starter gym via assertClassBookingEnabled", async () => {
    await prisma.gym.update({ where: { id: gymId }, data: { plan: Plan.STARTER } });
    await expect(assertClassBookingEnabled(prisma, gymId)).rejects.toThrow("FEATURE_LOCKED");
    await prisma.gym.update({ where: { id: gymId }, data: { plan: Plan.PRO } });
  });

  it("books until capacity 1 then rejects the other member with SESSION_FULL under concurrency", async () => {
    const klass = await prisma.class.findFirst({ where: { gymId, name: "Yoga" } });
    if (!klass) throw new Error("Yoga missing");
    const cap1 = await prisma.classSession.create({
      data: {
        gymId,
        classId: klass.id,
        startsAt: new Date(Date.now() + 3 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
        capacity: 1,
        status: "SCHEDULED",
      },
    });
    const now = new Date();
    const results = await Promise.allSettled([
      bookSession(prisma, { gymId, memberId: ahmedId, sessionId: cap1.id, now }),
      bookSession(prisma, { gymId, memberId: raniaId, sessionId: cap1.id, now }),
    ]);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    const reason = (rejected[0] as PromiseRejectedResult).reason;
    expect(isCode(reason, "SESSION_FULL")).toBe(true);
    const booked = await prisma.booking.count({
      where: { sessionId: cap1.id, gymId, status: "BOOKED" },
    });
    expect(booked).toBe(1);
  });

  it("rejects a second BOOKED row for the same member+session", async () => {
    const now = new Date();
    await bookSession(prisma, { gymId, memberId: ahmedId, sessionId, now });
    await expect(
      bookSession(prisma, { gymId, memberId: ahmedId, sessionId, now }),
    ).rejects.toSatisfy((e) => isCode(e, "ALREADY_BOOKED"));
  });

  it("cancel then re-book while a spot remains", async () => {
    const now = new Date();
    await cancelBooking(prisma, {
      gymId,
      sessionId,
      memberId: ahmedId,
      now,
      actor: "member",
    });
    const again = await bookSession(prisma, { gymId, memberId: ahmedId, sessionId, now });
    expect(again.bookingId).toBeTruthy();
    const rows = await prisma.booking.findMany({ where: { sessionId, memberId: ahmedId } });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe("BOOKED");
  });

  it("member cancel after start is SESSION_STARTED; desk cancel is allowed", async () => {
    const klass = await prisma.class.findFirst({ where: { gymId, name: "Yoga" } });
    if (!klass) throw new Error("Yoga missing");
    const started = await prisma.classSession.create({
      data: {
        gymId,
        classId: klass.id,
        startsAt: new Date(Date.now() - 60 * 1000),
        endsAt: new Date(Date.now() + 60 * 60 * 1000),
        capacity: 8,
        status: "SCHEDULED",
      },
    });
    await prisma.booking.create({
      data: { gymId, sessionId: started.id, memberId: raniaId, status: "BOOKED" },
    });
    await expect(
      cancelBooking(prisma, {
        gymId,
        sessionId: started.id,
        memberId: raniaId,
        now: new Date(),
        actor: "member",
      }),
    ).rejects.toSatisfy((e) => isCode(e, "SESSION_STARTED"));
    const desk = await cancelBooking(prisma, {
      gymId,
      sessionId: started.id,
      memberId: raniaId,
      now: new Date(),
      actor: "desk",
    });
    expect(desk.remaining).toBe(8);
  });

  it("expired and frozen members cannot book; other gym cannot book this session", async () => {
    const now = new Date();
    await expect(
      bookSession(prisma, { gymId, memberId: saraId, sessionId, now }),
    ).rejects.toSatisfy((e) => isCode(e, "MEMBER_NOT_ELIGIBLE"));
    await expect(
      bookSession(prisma, { gymId, memberId: inesId, sessionId, now }),
    ).rejects.toSatisfy((e) => isCode(e, "MEMBER_NOT_ELIGIBLE"));
    await expect(
      bookSession(prisma, {
        gymId: otherGymId,
        memberId: ahmedId,
        sessionId,
        now,
      }),
    ).rejects.toSatisfy((e) => isCode(e, "NOT_FOUND"));
  });
});
```

`toSatisfy` is Vitest. If the local Vitest version lacks it, use a try/catch and `expect(error).toBeInstanceOf(BookingError)`.

The second test uses a **new** session with a unique `startsAt` so it does not collide with the unique `(gymId, classId, startsAt)` of seeded rows. If create fails, add 1ms to `startsAt`.

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run tests/integration/class-booking.test.ts`

Expected: FAIL — `bookSession` is not exported / not implemented.

- [ ] **Step 3: Implement `packages/shared/src/class-booking-db.ts`**

Use `import { Prisma, type PrismaClient } from "@prisma/client"`.
Use `import { assertPlanFeature } from "./gym-features"`.
Interactive transaction:

```ts
await db.$transaction(async (tx) => {
  const locked = await tx.$queryRaw<Array<{ id: string }>>(
    Prisma.sql`SELECT id FROM "ClassSession" WHERE id = ${sessionId} AND "gymId" = ${gymId} FOR UPDATE`,
  );
  // ...
});
```

Never increment a stored remaining counter.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/integration/class-booking.test.ts tests/unit/class-booking.test.ts`

Expected: PASS. Concurrent cap-1 test is the success criterion for races.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/class-booking-db.ts packages/shared/src/class-booking.ts tests/integration/class-booking.test.ts packages/shared/package.json
git commit -m "feat(shared): book and cancel class sessions under row lock"
```

---

### Task 5: Shared list / CRUD / week generator

**Files:**
- Modify: `packages/shared/src/class-booking-db.ts`
- Modify: `tests/integration/class-booking.test.ts` (add cases)
- Modify: `tests/unit/class-booking.test.ts` if adding pure week-slot coverage not already in Task 3

**Interfaces:**
- Consumes: `assertCapacity`, `assertClassName`, `assertCoachName`, `parseSessionRange`, `startsAtFromWeekSlot`, `endsAtFromWeekSlot`, `remainingSpots`
- Produces:

```ts
export type MemberSessionRow = {
  id: string;
  className: string;
  startsAt: Date;
  endsAt: Date;
  capacity: number;
  remaining: number;
  coachName: string | null;
  myBooking: "BOOKED" | "CANCELLED" | null;
};

export type DeskSessionRow = MemberSessionRow & {
  classId: string;
  status: "SCHEDULED" | "CANCELLED";
  bookedCount: number;
};

export type ClassRow = {
  id: string;
  name: string;
  defaultCapacity: number;
  active: boolean;
};

export type RosterRow = {
  memberId: string;
  fullName: string;
  status: "BOOKED" | "CANCELLED";
  createdAt: Date;
  cancelledAt: Date | null;
};

export async function listClasses(db: PrismaClient, gymId: string): Promise<ClassRow[]>;
export async function createClass(
  db: PrismaClient,
  input: { gymId: string; name: string; defaultCapacity: number },
): Promise<{ id: string }>;
export async function updateClass(
  db: PrismaClient,
  input: { gymId: string; classId: string; name?: string; defaultCapacity?: number; active?: boolean },
): Promise<void>;
export async function deleteClass(
  db: PrismaClient,
  input: { gymId: string; classId: string },
): Promise<void>; // sessions exist → CLASS_HAS_SESSIONS; missing → NOT_FOUND

export async function listDeskSessions(
  db: PrismaClient,
  input: { gymId: string; from: Date; to: Date },
): Promise<DeskSessionRow[]>;
export async function listMemberSessions(
  db: PrismaClient,
  input: { gymId: string; memberId: string; from: Date; to: Date },
): Promise<MemberSessionRow[]>; // SCHEDULED only; remaining via remainingSpots; omit other members' names

export async function createSession(
  db: PrismaClient,
  input: {
    gymId: string;
    classId: string;
    startsAt: Date;
    endsAt: Date;
    capacity?: number;
    coachName?: string | null;
  },
): Promise<{ id: string }>;
// endsAt > startsAt else VALIDATION; default capacity from Class.defaultCapacity; P2002 → VALIDATION

export async function updateSession(
  db: PrismaClient,
  input: {
    gymId: string;
    sessionId: string;
    startsAt?: Date;
    endsAt?: Date;
    capacity?: number;
    coachName?: string | null;
    status?: "SCHEDULED" | "CANCELLED";
  },
): Promise<void>;
// if capacity provided: count BOOKED; if capacity < bookedCount → CAPACITY_BELOW_BOOKINGS
// if status set to CANCELLED: call the same path as cancelClassSession (do not duplicate)

export async function deleteSession(
  db: PrismaClient,
  input: { gymId: string; sessionId: string },
): Promise<void>; // any booking row → SESSION_HAS_BOOKINGS

export async function cancelClassSession(
  db: PrismaClient,
  input: { gymId: string; sessionId: string; now: Date },
): Promise<void>;
// set session CANCELLED; set every BOOKED booking to CANCELLED with cancelledAt = now

export async function generateWeekSessions(
  db: PrismaClient,
  input: {
    gymId: string;
    classId: string;
    weekStart: Date;
    slots: Array<{ weekday: number; startMinutes: number; endMinutes: number }>;
    capacity?: number;
    coachName?: string | null;
  },
): Promise<{ created: number; skipped: number }>;
// skip when @@unique([gymId, classId, startsAt]) already exists

export async function listSessionRoster(
  db: PrismaClient,
  input: { gymId: string; sessionId: string },
): Promise<RosterRow[]>;
```

All list/update functions `findFirst`/`findMany` with `gymId`. `listMemberSessions` filters `status: "SCHEDULED"` and `startsAt >= from AND startsAt < to`. Compute booked counts with one `groupBy` on `Booking` (`sessionId`, `status: BOOKED`), then `remainingSpots`. Attach `myBooking` from that member's rows (status or `null`).

- [ ] **Step 1: Add failing integration cases**

- `generateWeekSessions` twice for the same Monday + one Monday 10:00–11:00 slot → first `{ created: 1, skipped: 0 }`, second `{ created: 0, skipped: 1 }`.
- `updateSession` capacity below current BOOKED count → `CAPACITY_BELOW_BOOKINGS`.
- `deleteClass` after a session exists → `CLASS_HAS_SESSIONS`.
- `deleteSession` after a booking exists → `SESSION_HAS_BOOKINGS`.
- `cancelClassSession` flips session + BOOKED rows to CANCELLED.
- `listMemberSessions` does not include a `CANCELLED` session and does not include another member's name.
- `createSession` with `endsAt <= startsAt` → `VALIDATION`.

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run tests/integration/class-booking.test.ts`

Expected: FAIL — functions not exported.

- [ ] **Step 3: Implement the helpers** in `class-booking-db.ts`. Re-export from `class-booking.ts`.

Week generator: load class with `{ id: classId, gymId }`; missing → `NOT_FOUND`; `endMinutes <= startMinutes` → `VALIDATION`; capacity default `class.defaultCapacity` unless override; `coachName` via `assertCoachName`.

- [ ] **Step 4: Run tests — PASS**

Run: `npx vitest run tests/integration/class-booking.test.ts tests/unit/class-booking.test.ts`

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/class-booking-db.ts packages/shared/src/class-booking.ts tests/integration/class-booking.test.ts
git commit -m "feat(shared): add class session list, CRUD, and week generator"
```

---

### Task 6: Hono `/v1` desk + member routes + wallet features

**Files:**
- Create: `apps/api/src/routes/classes.ts`
- Modify: `apps/api/src/index.ts`
- Modify: `apps/api/src/lib/features.ts`
- Modify: `apps/api/src/routes/app.ts` (`memberAppRoutes` wallet + new member session routes)

**Interfaces:**
- Consumes: every helper from Tasks 3–5; `requireDeskAccess`, `requireMember`, `requireGymFeature`, `assertGymFeature`, `featureLockedResponse`, `isFeatureLockedError`
- Produces: HTTP table below. JSON errors `{ error: { code, message } }` where `message` may be a translation key like `classes.error.SESSION_FULL`. Success bodies `{ data: … }`.

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/v1/classes` | desk | `listClasses` |
| POST | `/v1/classes` | desk | `{ name, defaultCapacity }` → `createClass` 201 |
| PATCH | `/v1/classes/:id` | desk | `{ name?, defaultCapacity?, active? }` |
| DELETE | `/v1/classes/:id` | desk | |
| GET | `/v1/sessions` | desk | query `from`, `to` ISO → `parseSessionRange` then `listDeskSessions` |
| POST | `/v1/sessions` | desk | `{ classId, startsAt, endsAt, capacity?, coachName? }` |
| POST | `/v1/sessions/generate-week` | desk | `{ classId, weekStart, slots, capacity?, coachName? }` |
| PATCH | `/v1/sessions/:id` | desk | `{ startsAt?, endsAt?, capacity?, coachName?, status? }` |
| DELETE | `/v1/sessions/:id` | desk | |
| GET | `/v1/sessions/:id/bookings` | desk | roster |
| POST | `/v1/sessions/:id/bookings/:memberId/cancel` | desk | `cancelBooking` actor `"desk"` |
| GET | `/v1/member/sessions` | member | `from`,`to`; `assertGymFeature(member.gymId, "class_booking")` |
| POST | `/v1/member/sessions/:id/book` | member | `bookSession` |
| POST | `/v1/member/sessions/:id/cancel` | member | `cancelBooking` actor `"member"` |
| GET | `/v1/member/wallet` | member | add `features: getPlanLimits(gym.plan).features` (no class_booking gate on wallet) |

Desk routers: `requireDeskAccess` then `requireGymFeature("class_booking")`.

Member class routes: `requireMember` then try/catch `assertGymFeature(session.gymId, "class_booking")` → `featureLockedResponse`. Add `requireMemberGymFeature` in `apps/api/src/lib/features.ts`:

```ts
export function requireMemberGymFeature(feature: PlanFeature) {
  return async (c: Context, next: Next) => {
    const member = c.get("member");
    try {
      await assertGymFeature(member.gymId, feature);
    } catch (error) {
      if (isFeatureLockedError(error)) return featureLockedResponse(c);
      throw error;
    }
    await next();
  };
}
```

Helper-to-HTTP wrapper used by every handler:

```ts
function bookingErrorResponse(c: Context, error: unknown) {
  if (isFeatureLockedError(error)) return featureLockedResponse(c);
  if (isBookingError(error)) {
    return c.json(
      { error: { code: error.code, message: `classes.error.${error.code}` } },
      bookingErrorHttpStatus(error.code),
    );
  }
  throw error;
}
```

Mount in `apps/api/src/index.ts`:

```ts
import { classRoutes, sessionRoutes } from "./routes/classes";
app.route("/v1/classes", classRoutes);
app.route("/v1/sessions", sessionRoutes);
```

`GET /v1/sessions/generate-week` must not steal `/:id`. Register `POST /generate-week` on `sessionRoutes` **before** `/:id` routes.

Wallet change: include `gym.plan` in the existing member query (`include: { gym: { select: { name, cardTheme, plan } } }`) and add `features: getPlanLimits(member.gym.plan).features`. Import `getPlanLimits` from `@gym/shared/plans` (already used in settings).

Dates in JSON: `startsAt.toISOString()`, `endsAt.toISOString()`.

- [ ] **Step 1: Implement `requireMemberGymFeature` + wallet `features` + route files** calling **only** shared helpers (no local count+insert).

- [ ] **Step 2: Typecheck API**

Run: `npm run typecheck --workspace=@gym/api`

Expected: PASS (exit 0).

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/routes/classes.ts apps/api/src/index.ts apps/api/src/lib/features.ts apps/api/src/routes/app.ts
git commit -m "feat(api): add class booking /v1 desk and member routes"
```

---

### Task 7: FR + AR copy

**Files:**
- Modify: `packages/shared/src/i18n.ts` (add the same keys to `fr` and `ar`)
- Modify: `src/lib/i18n.ts` (identical keys; web still duplicates)

**Interfaces:**
- Consumes: existing `TranslationKey` inferred from `fr`
- Produces: every key below exists in **both** files, both locales

Insert `nav.classes` immediately after `nav.drinks`. Insert the `classes.*` block after the drinks keys (FR around the drinks section, AR around the AR drinks section).

FR:

```ts
"nav.classes": "Cours",
"classes.title": "Cours",
"classes.subtitle": "Planning de la semaine",
"classes.lockedSubtitle": "Disponible avec les formules Growth et Pro",
"classes.upgradeBody": "Passez à Growth ou Pro pour publier des cours avec un plafond de places.",
"classes.upgradeCta": "Passer à Growth ou Pro",
"classes.empty": "Créez votre premier cours, puis générez une semaine.",
"classes.createClass": "Nouveau cours",
"classes.name": "Nom",
"classes.defaultCapacity": "Places par défaut",
"classes.capacity": "Places",
"classes.active": "Actif",
"classes.inactive": "Inactif",
"classes.deactivate": "Désactiver",
"classes.activate": "Activer",
"classes.generateWeek": "Générer la semaine",
"classes.week": "Semaine",
"classes.coach": "Coach",
"classes.spotsLeft": "{count} places restantes",
"classes.full": "Complet",
"classes.book": "Réserver",
"classes.cancel": "Annuler la réservation",
"classes.roster": "Inscrits",
"classes.sessionCancel": "Annuler la séance",
"classes.sessionDelete": "Supprimer la séance",
"classes.noSessions": "Aucune séance cette semaine",
"classes.memberTitle": "Cours",
"classes.memberEmpty": "Aucun cours à venir",
"classes.memberLocked": "Les réservations de cours ne sont pas incluses dans le plan de votre salle.",
"classes.memberEntry": "Voir les cours",
"classes.weekday.1": "Lun",
"classes.weekday.2": "Mar",
"classes.weekday.3": "Mer",
"classes.weekday.4": "Jeu",
"classes.weekday.5": "Ven",
"classes.weekday.6": "Sam",
"classes.weekday.7": "Dim",
"classes.error.FEATURE_LOCKED": "Fonctionnalité non incluse dans votre plan",
"classes.error.NOT_FOUND": "Introuvable",
"classes.error.SESSION_FULL": "Plus de places",
"classes.error.ALREADY_BOOKED": "Déjà réservé",
"classes.error.SESSION_STARTED": "La séance a déjà commencé",
"classes.error.SESSION_CANCELLED": "Séance annulée",
"classes.error.MEMBER_NOT_ELIGIBLE": "Abonnement inactif",
"classes.error.CAPACITY_BELOW_BOOKINGS": "Capacité inférieure aux réservations",
"classes.error.CLASS_HAS_SESSIONS": "Ce cours a encore des séances",
"classes.error.SESSION_HAS_BOOKINGS": "Cette séance a encore des réservations",
"classes.error.VALIDATION": "Données invalides",
```

AR (same keys):

```ts
"nav.classes": "الحصص",
"classes.title": "الحصص",
"classes.subtitle": "جدول الأسبوع",
"classes.lockedSubtitle": "متاح مع خطتي Growth و Pro",
"classes.upgradeBody": "قم بالترقية إلى Growth أو Pro لنشر حصص بسعة محدودة.",
"classes.upgradeCta": "الترقية إلى Growth أو Pro",
"classes.empty": "أنشئ أول حصة ثم ولّد أسبوعاً.",
"classes.createClass": "حصة جديدة",
"classes.name": "الاسم",
"classes.defaultCapacity": "الأماكن الافتراضية",
"classes.capacity": "الأماكن",
"classes.active": "نشط",
"classes.inactive": "غير نشط",
"classes.deactivate": "تعطيل",
"classes.activate": "تفعيل",
"classes.generateWeek": "توليد الأسبوع",
"classes.week": "الأسبوع",
"classes.coach": "المدرب",
"classes.spotsLeft": "{count} أماكن متبقية",
"classes.full": "مكتمل",
"classes.book": "حجز",
"classes.cancel": "إلغاء الحجز",
"classes.roster": "المسجلون",
"classes.sessionCancel": "إلغاء الحصة",
"classes.sessionDelete": "حذف الحصة",
"classes.noSessions": "لا توجد حصص هذا الأسبوع",
"classes.memberTitle": "الحصص",
"classes.memberEmpty": "لا توجد حصص قادمة",
"classes.memberLocked": "حجز الحصص غير مدرج في خطة ناديك.",
"classes.memberEntry": "عرض الحصص",
"classes.weekday.1": "الإثنين",
"classes.weekday.2": "الثلاثاء",
"classes.weekday.3": "الأربعاء",
"classes.weekday.4": "الخميس",
"classes.weekday.5": "الجمعة",
"classes.weekday.6": "السبت",
"classes.weekday.7": "الأحد",
"classes.error.FEATURE_LOCKED": "الميزة غير مدرجة في خطتك",
"classes.error.NOT_FOUND": "غير موجود",
"classes.error.SESSION_FULL": "لا توجد أماكن",
"classes.error.ALREADY_BOOKED": "محجوز مسبقاً",
"classes.error.SESSION_STARTED": "بدأت الحصة",
"classes.error.SESSION_CANCELLED": "الحصة ملغاة",
"classes.error.MEMBER_NOT_ELIGIBLE": "الاشتراك غير نشط",
"classes.error.CAPACITY_BELOW_BOOKINGS": "السعة أقل من الحجوزات",
"classes.error.CLASS_HAS_SESSIONS": "هذه الحصة ما زالت تحتوي على مواعيد",
"classes.error.SESSION_HAS_BOOKINGS": "هذا الموعد ما زال يحتوي على حجوزات",
"classes.error.VALIDATION": "بيانات غير صالحة",
```

Keep `fr` and `ar` objects structurally identical (TypeScript `dictionaries: Record<Locale, typeof fr>`).

- [ ] **Step 1: Add keys to both files**
- [ ] **Step 2: Commit**

```bash
git add packages/shared/src/i18n.ts src/lib/i18n.ts
git commit -m "feat(i18n): add FR and AR copy for class booking"
```

---

### Task 8: Web admin `/classes`

**Files:**
- Create: `src/app/actions/classes.ts`
- Create: `src/app/(app)/classes/page.tsx`
- Create: `src/components/classes/classes-panel.tsx`
- Create: `src/components/classes/class-catalog.tsx`
- Create: `src/components/classes/week-grid.tsx`
- Create: `src/components/classes/session-roster.tsx`
- Modify: `src/components/layout/app-shell.tsx`
- Modify: `src/app/(app)/layout.tsx`

**Interfaces:**
- Consumes: shared helpers + `assertFeature` / `planHasFeature("class_booking")` + `requireSession`
- Produces: Growth+ week grid; Starter locked page (admin upgrade CTA to `/settings`, staff locked without CTA); nav item hidden when feature off; **admin and staff** both use `/classes` (unlike drinks)

Actions in `src/app/actions/classes.ts` (`"use server"`):

Gate:

```ts
async function requireClassesDesk() {
  const session = await requireSession();
  if (session.role !== Role.ADMIN && session.role !== Role.STAFF) {
    return { error: "FEATURE_LOCKED" as const, session: null };
  }
  try {
    await assertFeature(session.gymId, "class_booking");
  } catch (error) {
    if (error instanceof Error && error.message === "FEATURE_LOCKED") {
      return { error: "FEATURE_LOCKED" as const, session: null };
    }
    throw error;
  }
  return { error: null, session };
}
```

Export actions that parse `FormData` / args, call **only** shared helpers, map `BookingError.code` to `{ error: code }`, `revalidatePath("/classes")`:

- `createClassAction(formData)` → name, defaultCapacity
- `updateClassAction(formData)`
- `deleteClassAction(classId: string)`
- `generateWeekAction(formData)` → `weekStart` (ISO from the week picker), `classId`, slots JSON or repeated weekday/start/end fields
- `createSessionAction(formData)`
- `updateSessionAction(formData)`
- `deleteSessionAction(sessionId: string)`
- `cancelSessionAction(sessionId: string)` → `cancelClassSession`
- `deskCancelBookingAction(sessionId: string, memberId: string)` → `cancelBooking` actor `"desk"`

Do **not** count BOOKED inside this file.

Page `src/app/(app)/classes/page.tsx`:

- `getSession()`; if missing or role not ADMIN/STAFF → `redirect("/scan")`
- `getGymBilling` + `planHasFeature(plan, "class_booking")`
- If locked: copy the kiosk locked layout (`PageHeader` + `classes.lockedSubtitle` + body + admin-only `Link` `/settings` with `classes.upgradeCta`)
- If unlocked: `searchParams.week` optional ISO Monday; default `startOfWeek(new Date(), { weekStartsOn: 1 })` from `date-fns`
- `from = weekStart`, `to = addDays(weekStart, 7)`
- Load `listClasses(prisma, gymId)` and `listDeskSessions(prisma, { gymId, from, to })`
- Empty catalog → `classes.empty` + create-class form
- Render `ClassesPanel`

Nav: add `classesNavItem = { href: "/classes", labelKey: "nav.classes", icon: CalendarDays }` from `lucide-react`. `buildNav(..., showClassesNav)` inserts it for **both** roles when `showClassesNav` (after `/attendance` for admin; after `/members` for staff). `AppShell` takes `showClassesNav`. Layout: `showClassesNav={planHasFeature(plan, "class_booking")}`.

Week grid: 7 columns keyed `classes.weekday.1`–`7`; each session card shows class name, time, `{remaining}` via `t("classes.spotsLeft", { count: remaining })` or `t("classes.full")`, coach, buttons roster / cancel session. Do not use the untracked date-picker files; native `type="date"` / `type="time"` / `type="datetime-local"` is enough.

Roster: `listSessionRoster` in the page when `searchParams.session` is set, or a small client panel that posts `deskCancelBookingAction`.

- [ ] **Step 1: Implement actions + page + components + nav**
- [ ] **Step 2: `npx tsc --noEmit` or existing web typecheck if present; fix errors**
- [ ] **Step 3: Commit**

```bash
git add src/app/actions/classes.ts src/app/\(app\)/classes src/components/classes src/components/layout/app-shell.tsx src/app/\(app\)/layout.tsx
git commit -m "feat(web): add admin class week grid"
```

---

### Task 9: Web member `/member/classes`

**Files:**
- Create: `src/app/actions/member-classes.ts`
- Create: `src/app/member/classes/page.tsx`
- Create: `src/components/member/member-classes-list.tsx`
- Modify: `src/app/member/page.tsx` (entry link when gym plan has the feature)
- Modify: `src/components/member/member-shell.tsx` only if a second nav control is needed; otherwise a link on the wallet page is enough

**Interfaces:**
- Consumes: `bookSession`, `cancelBooking`, `listMemberSessions`, `parseSessionRange`/`date-fns`, `assertFeature`, `getMemberSession` via `ensureMemberSession`, `planHasFeature`
- Produces: default range today 00:00 through +14 days exclusive end (`addDays(startOfDay(now), 14)`); Book / Cancel; full → disabled Book + `classes.full`; Starter gym → locked copy, **no session list**

Actions:

```ts
"use server";
// requireMemberSession(); assertFeature(session.gymId, "class_booking");
export async function memberBookAction(sessionId: string): Promise<{ ok: true } | { error: BookingErrorCode }>;
export async function memberCancelAction(sessionId: string): Promise<{ ok: true } | { error: BookingErrorCode }>;
```

Call `bookSession` / `cancelBooking` with `actor: "member"`, `now: new Date()`, `gymId` + `memberId` from the member session. `revalidatePath("/member/classes")`.

Page: `ensureMemberSession()`; load gym plan; if `!planHasFeature(plan, "class_booking")` show `MemberShell` title `classes.memberTitle` and `classes.memberLocked` only. Else list rows with remaining, Book when `remaining > 0 && myBooking !== "BOOKED"`, Cancel when `myBooking === "BOOKED"`.

Wallet page: if `planHasFeature(member.gym.plan, "class_booking")`, show a `Link` to `/member/classes` labeled `classes.memberEntry`. Include `plan: true` on the gym select.

- [ ] **Step 1: Implement actions + page + wallet entry**
- [ ] **Step 2: Commit**

```bash
git add src/app/actions/member-classes.ts src/app/member/classes src/components/member/member-classes-list.tsx src/app/member/page.tsx
git commit -m "feat(web): add member class calendar"
```

---

### Task 10: Expo member calendar

**Files:**
- Create: `apps/mobile/app/(member)/classes.tsx`
- Create: `apps/mobile/screens/member-classes-screen.tsx`
- Modify: `apps/mobile/app/(member)/_layout.tsx` (add `Stack.Screen name="classes"`)
- Modify: `apps/mobile/app/(member)/index.tsx`

**Interfaces:**
- Consumes: `GET /member/wallet` now includes `features: PlanFeature[]`; `GET /member/sessions?from&to`; `POST /member/sessions/:id/book`; `POST /member/sessions/:id/cancel`; `apiFetch` + `ApiClientError`
- Produces: home entry only when `data.features.includes("class_booking")`; if the route is opened without the feature, locked copy and no list (handle 403 `FEATURE_LOCKED`)

Extend wallet type:

```ts
import type { PlanFeature } from "@gym/shared/plans";

type Wallet = {
  fullName: string;
  gymName: string;
  cardTheme: string;
  subscriptionEnd: string;
  status: string;
  isActive: boolean;
  features: PlanFeature[];
};
```

On `index.tsx`, under the card, if `data.features?.includes("class_booking")`:

```tsx
<Link href="/(member)/classes" asChild>
  <Pressable>
    <Text>{t("classes.memberEntry")}</Text>
  </Pressable>
</Link>
```

Screen: `useQuery` key `["member-sessions"]` → `apiFetch<MemberSessionDto[]>("/member/sessions?from=" + fromIso + "&to=" + toIso)` with the same +14 day window. Book/cancel via `apiFetch` POST empty body. Disable Book when `remaining === 0` or `myBooking === "BOOKED"`. Show `t("classes.full")` / `t("classes.spotsLeft", { count: remaining })`. On `ApiClientError` with `code === "FEATURE_LOCKED"`, render `t("classes.memberLocked")` and return (no list). Starter gyms never see the home entry.

Do **not** add staff/admin Expo CRUD or a desk nav item for classes.

- [ ] **Step 1: Implement route, screen, wallet entry**
- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/(member)/classes.tsx apps/mobile/screens/member-classes-screen.tsx apps/mobile/app/(member)/_layout.tsx apps/mobile/app/(member)/index.tsx
git commit -m "feat(mobile): add member class calendar"
```

---

### Task 11: Architecture note + verification

**Files:**
- Modify: `docs/ARCHITECTURE_EVOLUTION.md`

**Interfaces:**
- Consumes: completed Tasks 1–10
- Produces: docs note; green test run; **no leftover files in the commit**

- [ ] **Step 1: Document the slice**

In §1 “What already works well”, add a bullet:

```markdown
- **Class booking v1 (2026-08-17)** — Growth+ `class_booking`: `Class` / `ClassSession` / `Booking` gym-scoped; one `@gym/shared/class-booking` helper (row lock + count) used by web Server Actions and Hono `/v1`; admin web `/classes`; member calendar on web + Expo; Starter locked. Not FitBox Ladies custom code.
```

In §6 backlog “Now”, add item 6:

```markdown
6. **Done (class booking v1):** shared book/cancel under `FOR UPDATE`; web admin grid; web+Expo member calendar; Starter `FEATURE_LOCKED`.
```

Do not reopen kiosk/parity wording except to leave those items marked done.

- [ ] **Step 2: Run verification**

Run:

```bash
npx vitest run tests/unit/plans.test.ts tests/unit/class-booking.test.ts tests/integration/class-booking.test.ts
```

Expected: all PASS. If integration needs DB, use the existing `.env.test` / `resetTestDatabase` path; do not claim pass without the command output.

Also run API typecheck: `npm run typecheck --workspace=@gym/api`

- [ ] **Step 3: Confirm git hygiene**

Run: `git status`

Untracked leftovers listed in Global Constraints must **not** be staged. If they appear, leave them untracked.

- [ ] **Step 4: Commit docs only**

```bash
git add docs/ARCHITECTURE_EVOLUTION.md
git commit -m "docs: note class booking v1 in architecture evolution"
```

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| Two tenants = two Gym rows; gymId on every query | 2, 4, 5 |
| Feature `class_booking` Growth+Pro; Starter locked UI + `FEATURE_LOCKED` | 1, 4, 6, 8, 9, 10 |
| Tables Class, ClassSession, Booking | 2 |
| Remaining = capacity − BOOKED count; never stored | 3, 4 |
| `FOR UPDATE` + count + insert/update; unique member+session; re-book | 4 |
| One shared helper; Hono + Server Actions | 4, 6, 8, 9 |
| Week generator independent rows; skip existing unique | 5 |
| Coach optional string max 80 | 3, 5 |
| Admin web `/classes`; staff desk manage; no Expo admin CRUD | 8, 10 |
| Member web + Expo calendar | 9, 10 |
| Wallet `features`; Expo entry gated | 6, 10 |
| FR+AR both i18n files | 7 |
| Eligibility ACTIVE + subscriptionEnd >= now; frozen/expired no | 3, 4 |
| CAPACITY_BELOW_BOOKINGS, CLASS_HAS_SESSIONS, SESSION_HAS_BOOKINGS | 5 |
| Cancel session cancels BOOKED rows | 5 |
| Seed Yoga capacity 12 + two upcoming sessions; no second gym | 2 |
| Concurrent cap 1 → one success one SESSION_FULL | 4 |
| Do not commit leftovers | 11 + every commit |
| No Organization/Location; no FitBox Ladies code | all tasks |

No waitlist, no pay-per-class, no RRULE engine, no kiosk-as-capacity, no `packages/application`.
