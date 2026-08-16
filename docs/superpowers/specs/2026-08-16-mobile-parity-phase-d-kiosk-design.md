# Mobile Parity Phase D — Kiosk (Design)

**Date:** 2026-08-16  
**Status:** Ready for implementation planning  
**Audience:** product owner + implementers  
**Parent:** `docs/superpowers/specs/2026-08-01-mobile-web-parity-design.md`  
**Branch:** `feat/mobile-parity-phase-d` (from `origin/main` after Phase C merge `660d3e9` / PR #5)

## Goals

1. Growth+ gyms get a **real self-check-in kiosk** on **web** (`/kiosk`) and **Expo** (tablet-friendly).
2. Kiosk uses the **same grant/deny rules** as desk scan (`GRANTED` / `EXPIRED` / `FROZEN` / `NOT_FOUND` / `INVALID`).
3. Starter sees a **locked / upgrade** page, not a working kiosk.
4. Desk scan on Starter **keeps working** (do not put the `kiosk` feature gate on `POST /checkin`).

## Non-goals

- Mobile onboarding wizard (`onboardingCompletedAt`) — follow-up PR
- `packages/application` / full hexagonal `RecordCheckin` rewrite
- Kiosk PIN, dedicated kiosk user, or OS-level device lock
- Member-app self check-in (still staff JWT: admin + staff)
- Gating on `accessMode === KIOSK` (plan feature `kiosk` only)
- Vendor doors / NEW_ACCESS_KIT
- Member directory / name search on the kiosk (PII leak on a public tablet)

## Current baseline

| Surface | Today |
|---------|--------|
| Web `/kiosk` | Growth+ placeholder (“Phase 2”); Starter locked + upgrade CTA; nav gated by `planHasFeature(..., "kiosk")` |
| Desk scan web | `QrScanner` / manual search → `POST /api/checkin` → `src/lib/checkin.performCheckin` |
| Desk scan mobile | Camera / manual → `POST /v1/checkin` → `apps/api/src/services/checkin.performCheckin` |
| Check-in rules | Duplicated almost 1:1 in web lib vs API service |
| Member QR | `{"memberId":"..."}` via `generateMemberQrPayload` |
| Settings GET | `GET /v1/settings` is **admin-only**; staff cannot read `features[]` |

## Decisions (locked)

| Topic | Choice |
|-------|--------|
| Onboarding | **Out** of this PR |
| Architecture | UI adapters on **existing** check-in endpoints. Extract **pure** parse/decide/token helpers to `@gym/shared/checkin`. No `packages/application`. |
| Feature gate | Kiosk **screens + nav** use `planHasFeature(plan, "kiosk")`. **Not** `POST /checkin`. **Not** `accessMode === KIOSK`. |
| Roles | Admin + staff. Members cannot open kiosk. |
| Typed code | No member list. Resolve **one** gym-scoped row: id, else exact `normalizePhone`, else exact `normalizeBadgeNumber`. Else `NOT_FOUND`. |
| Idle | Result overlay **4000 ms**, then clear PII and resume. Code entry with no input for **45000 ms** returns to camera and clears the field. |
| Chrome | Fullscreen kiosk (hide app shell / tab bar). Exit via corner control + confirm dialog. No new PIN. |
| Duplicate visits | Same as desk: second GRANTED is allowed. |
| Settings read | `GET /v1/settings` becomes **desk** (admin + staff) so staff nav can see `features`. PATCH stays admin-only. |

## Architecture

```text
[Web /kiosk]  → POST /api/checkin  { qrData | memberId | code } → src/lib/checkin
[Expo kiosk]  → POST /v1/checkin   { qrData | memberId | code } → apps/api/src/services/checkin
                                                                      │
                                                                      ▼
                                                         @gym/shared/checkin
                                                         (parse, token, decide)
                                                                      │
                                                                      ▼
                                                               Prisma Checkin
```

Desk scan keeps the same routes and the same `performCheckin` outcomes. Kiosk is an inbound UI + optional `code` field.

## Shared module (`@gym/shared/checkin`)

```ts
export type CheckinOutcome =
  | "GRANTED"
  | "EXPIRED"
  | "FROZEN"
  | "NOT_FOUND"
  | "INVALID";

export type CheckinInput = {
  memberId?: string;
  qrData?: string;
  code?: string;
};

export const KIOSK_RESULT_MS = 4000;
export const KIOSK_IDLE_MS = 45000;

export function parseMemberIdFromQr(raw: string): string | null;
export function resolveCheckinToken(input: CheckinInput): string | null;
export function decideCheckinOutcome(
  member: { status: string; subscriptionEnd: Date } | null,
): Exclude<CheckinOutcome, "INVALID">;
```

**Token resolution:** trimmed `memberId`, else `parseMemberIdFromQr(qrData)`, else `parseMemberIdFromQr(code)`. Empty → `null` (route returns `INVALID` 400).

**Decide:** `null` → `NOT_FOUND`; frozen status → `FROZEN`; inactive subscription → `EXPIRED`; else `GRANTED`. Frozen wins over expired dates (same as desk today).

Web `src/lib/checkin.ts` and API `apps/api/src/services/checkin.ts` both:

1. Resolve token; empty → `{ success: false, outcome: "INVALID" }`
2. Find member in gym: `id` match, else `phone === normalizePhone(token)`, else `badgeNumber === normalizeBadgeNumber(token)`
3. `decideCheckinOutcome`
4. Sync status from dates when not frozen (existing behavior)
5. Insert `Checkin` only on `GRANTED`

Keep `performCheckin(gymId, memberId)` as a wrapper so existing tests stay valid. Add `performCheckinFromInput(gymId, input)` used by both HTTP routes.

`src/lib/checkin.ts` re-exports parse/token/decide from shared.

## HTTP

| Method | Path | Auth | Gate | Body |
|--------|------|------|------|------|
| POST | `/api/checkin` | session desk | none (all plans) | `{ memberId?, qrData?, code? }` |
| POST | `/v1/checkin` | staff JWT desk | none (all plans) | `{ memberId?, qrData?, code? }` |

Unchanged responses: 401 unauthenticated; 400 only when token is empty (`INVALID`); check-in outcomes otherwise 200 with `{ success, outcome, memberName?, ... }` (web) or `{ data: result }` (Hono).

Do **not** return `FEATURE_LOCKED` from check-in. Starter desk must still scan.

## Surfaces

### Web `/kiosk`

- **Starter:** keep locked copy + admin upgrade CTA to `/settings`. Staff on Starter: locked copy, no CTA. App shell **stays**.
- **Growth+:** replace Phase 2 placeholder with `KioskPanel`. App shell **hidden** (`pathname === "/kiosk"` and plan has `kiosk`).
- Loop: camera (existing html5-qrcode pattern, reader id `kiosk-qr-reader`) **or** large code field. Toggle between them.
- Result: reuse `CheckinFeedback` with `autoCloseMs={KIOSK_RESULT_MS}`.
- Exit: corner control → `ConfirmDialog` → `/scan`.
- Do not call `/api/members/search`.

### Expo

- Root screen `apps/mobile/app/kiosk.tsx` (fullscreen, outside admin/staff tabs) shared by admin + staff.
- Nav: insert **Kiosque** after Scan when `features` includes `kiosk`. Admin + staff. Starter: no nav item; opening `/kiosk` shows locked + admin upgrade (settings) / staff locked copy.
- Hide header + tabs (root stack, not a tab). Android back → same exit confirm.
- Camera: `expo-camera` like desk scan. Code field posts `{ code }`.
- Result overlay ~same as scan but larger type; auto-clear after `KIOSK_RESULT_MS`.
- `GET /v1/settings` allowed for staff so the tab bar can read `features`.

### Copy (FR + AR)

Add keys to **both** `src/lib/i18n.ts` (web) and `packages/shared/src/i18n.ts` (mobile): `nav.kiosk` (shared), `kiosk.subtitle`, `kiosk.hint`, `kiosk.enterCode`, `kiosk.useCamera`, `kiosk.codePlaceholder`, `kiosk.submitCode`, `kiosk.exit`, `kiosk.exitConfirm`, `kiosk.exitConfirmBody`. Keep existing locked/upgrade keys.

## Error handling

- 401 / 403 as today for auth/role.
- Empty code/QR → `INVALID`.
- Unknown code → `NOT_FOUND` (no member list).
- Network: existing scan network error string.
- FR/AR only.

## Testing (TDD for new helpers)

- Unit: `parseMemberIdFromQr`, `resolveCheckinToken`, `decideCheckinOutcome` (granted / expired / frozen / not found; frozen beats expired).
- Unit: `KIOSK_RESULT_MS === 4000`, `KIOSK_IDLE_MS === 45000`.
- Integration: `performCheckinFromInput` with seed phone `+21620123456` and badge `1001` grants Ahmed; unknown code → `NOT_FOUND`; existing `performCheckin(gymId, id)` tests still pass.
- Do not commit datepicker / month-picker / `scripts/prod-migrate.mjs` / `.superpowers/` leftovers.

## Success

- Growth+ admin/staff: self-check-in loop on web and mobile, same rules as desk, idle timeout, fullscreen, exit confirm.
- Starter: locked kiosk; desk scan still works.
- Mobile and web match for shipped phases A–D **kiosk**. Onboarding wizard remains web-only until a follow-up.
