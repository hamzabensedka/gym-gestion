# Class Booking v1 — Design

**Date:** 2026-08-17  
**Status:** Ready for implementation planning  
**Audience:** product owner + implementers  
**Product:** Gym Gestion (Tunisia SaaS)  
**Branch:** `feat/class-booking-v1` (from `origin/main` after Phase D merge `b99d48e` / PR #6)  
**Architecture:** `docs/ARCHITECTURE_EVOLUTION.md`  
**Closed (do not reopen):** mobile/web parity A–D, kiosk specs/plans

## Problem

A gym owner runs **FitBox** (main floor) and opened **FitBox Ladies** at another location (yoga, dance). Sessions overfill because there is no cap before people arrive. Kiosk headcount does not prevent that.

FitBox and FitBox Ladies are **two tenants** (two `Gym` rows, two member lists). A woman who trains at both sites has two member records / two logins. v1 does **not** add Organization / Location / shared members.

Class booking is a **product feature**, not a FitBox Ladies custom module. No gym-name checks, no ladies-only schema, no special routes. Any tenant on a plan that includes the feature can publish sessions. FitBox Ladies is a customer of the feature; FitBox (main) can ignore it.

## Goals

1. Growth+ gyms can publish **classes** and **sessions** with a capacity.
2. Members of **that gym** see a calendar, remaining spots, and can book / cancel.
3. A full session **rejects** new bookings (no silent overfill, including concurrent requests).
4. Starter cannot use it (locked UI + `FEATURE_LOCKED` on mutations and member calendar APIs).
5. Web admin manages the grid. Member calendar ships on **web and Expo**. Capacity logic lives in **one** helper both Hono and Server Actions call.

## Non-goals (v1)

- Waitlist
- Pay-per-class / extra billing
- Coach payroll or `User` as coach entity (coach is an optional name string)
- Organization / multi-site shared members
- “Subscribe forever to Yoga” without a per-session cap
- Using kiosk/desk check-in as the capacity system
- Recurring RRULE engine (week generator creates independent `ClassSession` rows)
- Mobile admin CRUD for classes/sessions (web admin only)
- Gym timezone field (store `DateTime` like the rest of the app)
- Reopening kiosk / parity work

## Decisions (locked)

| Topic | Choice |
|-------|--------|
| Tenancy | Separate `Gym` per location. Sessions and bookings scoped by `gymId` only. |
| Product vs project | Plan feature `class_booking`. Same screens for every gym. |
| Plan gate | Growth + Pro. Starter locked. Not an add-on in v1. |
| Feature id | `class_booking` in `@gym/shared/plans` (`PlanFeature`). Same `assertPlanFeature` / `assertFeature` / `requireGymFeature` pattern as kiosk and drinks. |
| Who manages | Web **admin + staff** (desk roles): class catalog, sessions, roster, cancel any booking. |
| Who books | Member of **that** gym, existing member login (web session + Hono member JWT). Desk cannot book on behalf of a member in v1 (roster + cancel only). |
| Eligibility | `MemberStatus.ACTIVE` and `subscriptionEnd >= now`, and session not started / not cancelled. Frozen and expired cannot book. |
| Remaining | `capacity − count(BOOKED)` on that session. |
| Overbook guard | Interactive transaction: `SELECT … FOR UPDATE` on the session row, then count, then insert/update. Unique `(sessionId, memberId)` so one member cannot hold two rows. |
| Re-book after cancel | **One** `Booking` row per member+session. Cancel sets `CANCELLED`; re-book sets `BOOKED` if spots remain. |
| Recurrence | Week generator emits independent `ClassSession` rows. Re-run skips an existing row with the same `classId` + `startsAt` + `gymId`. |
| Coach | Optional `String` on `ClassSession`, max 80 chars. Not a FK. |
| Admin surface | Web `/classes` (week grid + catalog). No Expo admin CRUD in v1. |
| Member surface | Web `/member/classes` + Expo `(member)` calendar. |
| API | Hono `/v1` for mobile. Web Server Actions call the **same** booking helpers. |
| i18n | FR + AR. Add keys to `@gym/shared/i18n` **and** keep `src/lib/i18n.ts` in sync (web still duplicates). |
| Leftovers | Do not commit `.superpowers/`, `scripts/prod-migrate.mjs`, date/month-picker UI files. |

## SaaS gating

| Capability | Starter | Growth | Pro |
|------------|---------|--------|-----|
| Class booking (admin grid + member calendar + APIs) | — | ✓ | ✓ |

- **Starter web `/classes`:** locked page + admin upgrade CTA to `/settings` (copy pattern: drinks/kiosk). Staff: locked, no CTA. Nav item hidden.
- **Starter member calendar:** locked copy, no session list.
- **APIs:** `assertPlanFeature(plan, "class_booking")` on **all** class/session/booking reads and writes, including member routes. 403 `{ error: { code: "FEATURE_LOCKED" } }`.
- `GET /v1/settings` already returns `features[]`; `class_booking` appears there automatically. v1 does not add mobile admin nav or CRUD for classes.
- Member app: add `features: PlanFeature[]` on `GET /v1/member/wallet`. Expo shows the calendar entry only when that list includes `class_booking`. Web member layout reads `gym.plan`.

## Data

Every business row has `gymId`. Cascade from `Gym`. Queries always include `gymId` (never trust id-only).

```
enum ClassSessionStatus {
  SCHEDULED
  CANCELLED
}

enum BookingStatus {
  BOOKED
  CANCELLED
}

Class
  id, gymId
  name              String          // unique per gym, trimmed
  defaultCapacity   Int             // 1–200
  active            Boolean         @default(true)
  createdAt, updatedAt
  @@unique([gymId, name])
  @@index([gymId, active])

ClassSession                        // Prisma model name: ClassSession (table Session is too vague)
  id, gymId, classId
  startsAt, endsAt  DateTime
  capacity          Int             // 1–200, copied from Class.defaultCapacity unless overridden
  coachName         String?         // max 80
  status            ClassSessionStatus @default(SCHEDULED)
  createdAt, updatedAt
  @@index([gymId, startsAt])
  @@index([gymId, classId, startsAt])
  @@unique([gymId, classId, startsAt])   // week generator idempotency

Booking
  id, gymId, sessionId, memberId
  status            BookingStatus   @default(BOOKED)
  createdAt, updatedAt
  cancelledAt       DateTime?
  @@unique([sessionId, memberId])
  @@index([gymId, memberId, status])
  @@index([sessionId, status])
```

**Remaining places** (never stored): `session.capacity − count(Booking where status = BOOKED)`.

**Invariants**

- `endsAt > startsAt`
- Lowering `capacity` below current `BOOKED` count is rejected (`CAPACITY_BELOW_BOOKINGS`)
- Deactivate a class (`active = false`) to hide it from the week generator; existing sessions stay
- Delete a class only if it has **zero** sessions
- Delete a session only if it has **zero** bookings (any status). Otherwise **cancel** the session: set `CANCELLED` and set every `BOOKED` row to `CANCELLED` with `cancelledAt = now`
- Two different classes may start at the same time (no room entity). Two rows of the **same** class at the same `startsAt` are duplicates and are rejected by `@@unique([gymId, classId, startsAt])`.

**Week generator input:** `gymId`, `classId`, ISO week start (Monday 00:00 in the datetime the admin picked), slots `[{ weekday: 1–7 (Mon–Sun), startMinutes, endMinutes }]`, optional `capacity` and `coachName`. Creates one `ClassSession` per slot for that week. Skip slot if unique `(gymId, classId, startsAt)` already exists.

## Architecture

```text
[Web admin /classes]     → Server Actions → book/cancel/list helpers
[Web member /member/classes] → Server Actions → same helpers
[Expo member calendar]   → Hono /v1/member/sessions|bookings → same helpers
                                         │
                                         ▼
                            @gym/shared/class-booking
                            (pure remaining/eligibility + Prisma tx helpers)
                                         │
                                         ▼
                            Class / ClassSession / Booking (gymId)
```

Do **not** add `packages/application`. Do **not** copy the count+insert into both `src/app/actions` and `apps/api`.

`@gym/shared/class-booking` exports:

1. **Pure** (unit-tested, no DB): remaining math, eligibility, error codes.
2. **Prisma helpers** that take the root `PrismaClient` (already a workspace dependency). Web and API pass their `prisma` instance.

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

export function remainingSpots(capacity: number, bookedCount: number): number;
export function isSessionFull(capacity: number, bookedCount: number): boolean;

export function decideMemberBookEligibility(input: {
  now: Date;
  memberStatus: "ACTIVE" | "EXPIRED" | "FROZEN";
  subscriptionEnd: Date;
  sessionStatus: "SCHEDULED" | "CANCELLED";
  startsAt: Date;
}): { ok: true } | { ok: false; code: BookingErrorCode };

export function bookSession(
  db: PrismaClient,
  input: { gymId: string; memberId: string; sessionId: string; now: Date },
): Promise<{ bookingId: string; remaining: number }>;

export function cancelBooking(
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

`cancelBooking`: member actor allowed only while `now < startsAt` and the row is `BOOKED`. Desk actor (admin/staff) may cancel a `BOOKED` row anytime.

### `bookSession` algorithm (mandatory)

Inside `db.$transaction`:

1. `SELECT id FROM "ClassSession" WHERE id = $sessionId AND "gymId" = $gymId FOR UPDATE`
2. Load session + member (both `gymId`-scoped). Missing → `NOT_FOUND`
3. `decideMemberBookEligibility`; fail → that code
4. Load existing `Booking` for `(sessionId, memberId)`
5. If existing status is `BOOKED` → `ALREADY_BOOKED`
6. `count` `BOOKED` on that session (row lock makes this safe)
7. If `isSessionFull` → `SESSION_FULL`
8. If existing `CANCELLED` → set `BOOKED`, `cancelledAt = null`
9. Else `create` `BOOKED`
10. Return `{ bookingId, remaining: remainingSpots(capacity, bookedCount + 1) }`

Map unique-constraint races to `ALREADY_BOOKED`. Never increment a stored remaining counter.

## HTTP (Hono)

All paths gym-scoped via JWT. Member routes use `requireMember`. Desk routes use `requireDeskAccess` (admin + staff) + `requireGymFeature("class_booking")`. Member routes also `assertGymFeature` for `class_booking`.

| Method | Path | Auth | Body / query |
|--------|------|------|----------------|
| GET | `/v1/classes` | desk | — |
| POST | `/v1/classes` | desk | `{ name, defaultCapacity }` |
| PATCH | `/v1/classes/:id` | desk | `{ name?, defaultCapacity?, active? }` |
| DELETE | `/v1/classes/:id` | desk | — |
| GET | `/v1/sessions` | desk | `from`, `to` (ISO, inclusive start, exclusive end, max 31 days) |
| POST | `/v1/sessions` | desk | `{ classId, startsAt, endsAt, capacity?, coachName? }` |
| POST | `/v1/sessions/generate-week` | desk | week generator payload |
| PATCH | `/v1/sessions/:id` | desk | `{ startsAt?, endsAt?, capacity?, coachName?, status? }` |
| DELETE | `/v1/sessions/:id` | desk | — |
| GET | `/v1/sessions/:id/bookings` | desk | roster |
| POST | `/v1/sessions/:id/bookings/:memberId/cancel` | desk | desk cancel |
| GET | `/v1/member/sessions` | member | `from`, `to` (same range rules) |
| POST | `/v1/member/sessions/:id/book` | member | — |
| POST | `/v1/member/sessions/:id/cancel` | member | — |
| GET | `/v1/member/wallet` | member | add `features: PlanFeature[]` |

Member `GET /v1/member/sessions` returns only `SCHEDULED` sessions in range: class name, startsAt, endsAt, capacity, remaining, coachName, `myBooking: BOOKED | CANCELLED | null`. Omit other members' names. Cancelled sessions are not listed.

Web: Server Actions under `src/app/actions/classes.ts` (desk) and member actions that call the same helpers. No second capacity implementation. No extra Next REST routes for booking.

## Surfaces

### Web admin `/classes`

- Growth+: week grid (Monday start). Create class, generate week, edit capacity/coach, open roster, cancel session or booking.
- Starter: locked + upgrade (admin) / locked (staff). Hide nav via `planHasFeature(plan, "class_booking")`.
- Empty state: prompt to create the first class, then generate a week.

### Web member `/member/classes`

- List upcoming sessions for the member’s gym (default: today through +14 days).
- Show remaining; Book / Cancel. Full → Book disabled + `SESSION_FULL` copy.
- Starter gym: locked, no list.

### Expo member

- New screen in `(member)` stack, entry from member home when `features` includes `class_booking`.
- Same fields and actions as web member. Starter: no calendar entry; if the route is opened, show locked copy (no session list).

### Copy (FR + AR)

Keys include: `nav.classes`, `classes.title`, `classes.lockedSubtitle`, `classes.upgradeCta`, `classes.empty`, `classes.spotsLeft`, `classes.full`, `classes.book`, `classes.cancel`, `classes.roster`, plus validation/error keys mapped from `BookingErrorCode`.

## Error handling

| Code | HTTP | When |
|------|------|------|
| `FEATURE_LOCKED` | 403 | Plan lacks `class_booking` |
| `NOT_FOUND` | 404 | Session/class/booking not in this gym |
| `VALIDATION` | 422 | Bad name, capacity, dates, range > 31 days |
| `SESSION_FULL` | 409 | No remaining spots |
| `ALREADY_BOOKED` | 409 | Member already `BOOKED` |
| `SESSION_STARTED` | 409 | Member cancel/book after `startsAt` |
| `SESSION_CANCELLED` | 409 | Session status `CANCELLED` |
| `MEMBER_NOT_ELIGIBLE` | 403 | Frozen / expired / not ACTIVE |
| `CAPACITY_BELOW_BOOKINGS` | 409 | Admin lowered cap too far |
| `CLASS_HAS_SESSIONS` | 409 | Delete class blocked |
| `SESSION_HAS_BOOKINGS` | 409 | Delete session blocked |

FR/AR only in UI. API `message` may be a translation key.

## Testing (TDD)

- **Unit:** `remainingSpots`, `isSessionFull`, `decideMemberBookEligibility` (active vs frozen vs expired; cancelled session; `now >= startsAt`; remaining 0 vs 1).
- **Unit:** `planHasFeature(STARTER, "class_booking") === false`; Growth and Pro true.
- **Integration:** two concurrent `bookSession` on capacity 1 → one success, one `SESSION_FULL`. Unique member+session. Cancel then re-book while a spot remains. Desk cancel after start; member cancel after start rejected. All queries include `gymId` (second gym’s member cannot book first gym’s session).
- **Gate:** Starter 403 on list/book.
- **Seed:** on the existing demo gym only, one active class "Yoga" (capacity 12) and two upcoming `ClassSession` rows so local/e2e can book. Do not seed a second gym or any FitBox / FitBox Ladies names.
- Do not commit leftover untracked files listed in Decisions.

## Success

- A Growth+ admin can publish sessions with a cap (web).
- Members of that gym see remaining spots and book on web and Expo.
- A full session rejects new bookings under concurrency.
- Starter cannot use the feature.
- FitBox and FitBox Ladies stay independent tenants; nothing in code is named after them.
