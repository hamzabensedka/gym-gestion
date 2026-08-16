# Mobile Parity Phase C — Core Leftovers (Design)

**Date:** 2026-08-16  
**Status:** Ready for implementation planning  
**Audience:** product owner + implementers  
**Parent:** `docs/superpowers/specs/2026-08-01-mobile-web-parity-design.md`  
**Branch:** `feat/mobile-parity-phase-c` (from `origin/main` after Phase B merge `f2ac5bd` / PR #4)

## Goals

1. Admin on **Expo** can **edit** a member the same way as on web (same fields, same `PATCH` rules).
2. Admin can **disable member app access** from mobile (same confirm + ACTIVE-only rule as web).
3. **Admin and staff** can open a **full-screen member QR** at the desk (web already shows QR on detail).
4. Members CSV ShareSheet respects the current **search query**; access CSV filename matches web (`access-allowed.csv`).

## Non-goals

- Phase D (real kiosk, optional onboarding)
- New domain tables or new invite/QR payloads
- Print QR / save-image Share from the desk QR screen
- Changing members CSV **column shape** (Phase B already shipped Hono’s current columns)
- Dedicated edit page on **web** (web keeps the form at the bottom of detail)
- Staff editing, disabling access, deleting, or exporting CSV

## Current baseline

**API already exists (no new routes except optional `q` on export):**

| Method | Path | Auth | Used by Phase C |
|--------|------|------|-----------------|
| `PATCH` | `/v1/members/:id` | ADMIN | Member edit save |
| `GET` | `/v1/members/:id` | desk | Hydrate edit + detail + QR labels |
| `GET` | `/v1/members/:id/qr` | desk | Desk QR payload `{ qrData, memberName }` |
| `POST` | `/v1/members/:id/invite/disable` | ADMIN | Disable app access |
| `POST` | `/v1/members/:id/invite/resend` | desk | Already on mobile detail |
| `GET` | `/v1/members/export` | ADMIN + `csv_export` | Add `q` filter |

**Mobile today:** create member, detail (renew / freeze / payments / resend / delete), members + access + dashboard payments ShareSheet. No edit screen, no disable, no desk QR.

**Web today:** edit form on detail (admin); app-access card + disable when `inviteStatus === ACTIVE`; QR card on detail for desk with download + print.

## Decisions (locked)

| Topic | Choice |
|-------|--------|
| Edit placement | Dedicated admin screen, not a form on detail |
| Desk QR | Button on detail → full-screen QR (same pattern as member card). No print/share in this phase |
| Disable | Admin only, confirm dialog, button only when `inviteStatus === ACTIVE` |
| App-access card | Show on detail when member has an email (admin + staff, like web) |
| Plan chips | `PLAN_MONTHS` `[1, 3, 6, 12]` on **create and edit** |
| Send invite on edit | Checkbox when `inviteStatus !== "ACTIVE"`; default **unchecked** on edit (web: checked only on create) |
| Badge | Show field when settings `features` includes `badge_numbers` |
| Staff | QR yes. Edit / disable / delete / CSV no |
| Members CSV columns | Keep Hono columns. Do not match web’s visits/notes header in this phase |
| Access filename | `access-allowed.csv` (web Content-Disposition) |
| Search export | Pass current list `q` to `GET /v1/members/export?q=` |

## Architecture

```text
[Expo admin/staff] → Hono /v1/members* → Prisma → Postgres
[Web]              → existing Server Actions / routes (unchanged)
```

Approach: **mobile-first on existing Hono routes**. Extract a small `MemberQrView` so the member wallet QR and desk QR share the same SVG rendering. Extract a tiny export-search where helper so `q` can be unit-tested without standing up Hono.

Do not call Next Server Actions from mobile.

## Surfaces

### 1. Member edit (admin)

**Routes**

- Convert `apps/mobile/app/(admin)/members/[id].tsx` → `apps/mobile/app/(admin)/members/[id]/index.tsx` so nested screens can exist.
- Add `apps/mobile/app/(admin)/members/[id]/edit.tsx`.
- Stack: present **edit as modal** (same as `new`).
- Staff must **not** have an edit route. Deep link to admin edit as staff is blocked by the existing admin layout redirect (`role !== ADMIN` → `/(staff)/scan`).

**Entry:** button on admin detail labeled `detail.editTitle`. Hidden when `canAdmin` is false.

**Load:** `GET /v1/members/:id` (already returns member minus `passwordHash`, including `inviteStatus`, `badgeNumber`, dates, notes, fee). Date fields on the form are `yyyy-MM-dd` slices of the ISO strings (`subscriptionStart.slice(0, 10)`), same as web `format(..., "yyyy-MM-dd")`.

**Save:** `PATCH /v1/members/:id` with the same JSON body as create:

```ts
{
  fullName: string;
  phone: string;
  email?: string;
  badgeNumber?: string;       // omit unless badge_numbers
  subscriptionStart: string;  // yyyy-MM-dd
  subscriptionEnd: string;    // yyyy-MM-dd
  monthlyFee: number;
  notes?: string;
  sendInvite?: boolean;       // extra flag already read by the route; not in memberSchema
}
```

Validation stays `memberSchema` on the server. Mobile shows the API error message in a notice dialog (same as create).

**Fields (match web `MemberForm` edit mode):**

- Name, phone, email
- Badge if Pro
- Send-invite checkbox if `inviteStatus !== "ACTIVE"`
- Plan chips → set `subscriptionEnd` from `subscriptionStart` via `addMonths` + `PLAN_MONTHS`
- Start / end dates (`yyyy-MM-dd` text inputs, same as create today)
- Monthly fee, notes
- Submit: `common.save`

**Create screen:** add the same plan chips (parity with web create). Do not change create’s send-invite behavior (still auto-send when email is non-empty).

On success: `router.back()` and invalidate `["member", id]` + `["members"]`.

### 2. App access + invite disable

On **admin and staff** detail, when `email` is present, show a card:

- Title `members.appAccess`, subtitle email
- Badge from `inviteStatus` + expiry (`PENDING` and `inviteExpiresAt < now` → `members.inviteStatus.expired`)
- Hint `members.appAccessHint`
- **Disable** button only if `canAdmin && inviteStatus === "ACTIVE"`
- Confirm dialog: `members.disableAccess` / `members.disableConfirm` / existing `ConfirmDialog` tone `critical`
- `POST /v1/members/:id/invite/disable` → `{ data: { ok: true } }`
- On success: invalidate member query; toast/notice success
- Resend stays in the existing icon row (desk). Disable is not staff-visible.

Extend the mobile `MemberDetail` type with `inviteExpiresAt` and `badgeNumber` (GET already returns them).

### 3. Desk member QR (admin + staff)

**Routes**

- Admin: `/(admin)/members/[id]/qr`
- Staff: convert `apps/mobile/app/(staff)/members/[id].tsx` → `[id]/index.tsx`; add `[id]/qr.tsx`. Add `apps/mobile/app/(staff)/members/_layout.tsx` as a Stack mirroring admin (`headerShown: false`).

**Entry:** button on detail (admin + staff) labeled `detail.qrTitle`.

**Screen:** reuse member-card QR presentation:

- `GET /v1/members/:id/qr` via `useQuery(["member-qr", id])` → `qrData` into existing `react-native-qrcode-svg`
- Name + `detail.cardValid` + subscription end from `useQuery(["member", id])` (same cache as detail)
- Show QR even if the member is expired (web `QrDisplay` does not hide it)
- Back control like `apps/mobile/app/(member)/card.tsx`
- No download, print, or Share in this phase

Extract `MemberQrView` (value, size, optional expired banner) used by `(member)/card` and desk QR. Desk QR does **not** use `/member/qr` (that route is the logged-in member).

### 4. Exports polish

**API:** `GET /v1/members/export?q=`

- Keep current CSV columns and filename `members.csv`
- If `q` is non-empty, filter with the same semantics as web: case-insensitive `fullName` contains **or** `phone` contains, still scoped by `gymId` + onboarded-member filter
- Empty / omitted `q` = all members (today’s behavior)

Extract `memberExportSearchWhere(q: string)` in `apps/api/src/lib/member-export-search.ts` so unit tests cover empty vs non-empty `q` without HTTP. Return `{}` when `q` is empty; otherwise `{ OR: [{ fullName: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] }`. The route spreads that into `withOnboardedMemberFilter({ gymId, ...search })`.

**Mobile:** `exportMembers()` already in `members-list-screen.tsx` must call `/members/export` with the current search `q` when non-empty. Access export: `shareCsv("access-allowed.csv", …)` instead of `access.csv`. Dashboard payments export unchanged.

## Error handling

| Case | Behavior |
|------|----------|
| 401 | Existing session handling |
| 403 staff hitting PATCH/disable | Should not appear in UI; if it does, notice with API message |
| 404 member | Notice + back to list |
| 409 unique phone/email/badge | Notice with conflict message |
| 422 validation / invite failed | Notice with server message |
| QR load failure | Notice on QR screen, keep back button |

FR/AR: reuse existing `@gym/shared/i18n` keys only — `detail.editTitle`, `detail.qrTitle`, `detail.cardValid`, `common.save`, `members.appAccess`, `members.appAccessHint`, `members.disableAccess`, `members.disableConfirm`, `members.inviteStatus.*`, `form.plan1`/`plan3`/`plan6`/`plan12`, `members.sendInvite`. Do not add new keys unless a string is missing from the shared dictionary.

## RBAC

| Action | Admin | Staff |
|--------|-------|-------|
| Open edit | yes | no |
| PATCH member | yes (API) | 403 (API) |
| Disable access | yes | no (hide + API ADMIN) |
| Resend invite | yes | yes |
| Open desk QR | yes | yes |
| GET `:id/qr` | yes | yes |
| CSV / access export | yes + plan gate | no |

## Testing

- Unit: `memberExportSearchWhere` — empty `q` adds no OR; non-empty adds name/phone contains
- Unit: extract `inviteAccessLabel({ inviteStatus, inviteExpiresAt, now })` in `@gym/shared` and cover ACTIVE / DISABLED / PENDING / expired PENDING / none
- Existing API PATCH / disable / QR routes stay as-is; no new integration harness required unless one already covers members
- Manual smoke: admin edit save; disable ACTIVE member; staff opens QR and cannot see Edit/Disable; Starter gym still has no CSV buttons; Growth search `q` filters the shared members CSV

## Rollout

1. This spec approved → implementation plan (Phase C only)
2. API `q` helper + route, then mobile screens
3. Do not mix Phase D
4. Do not commit untracked leftovers (datepicker / `prod-migrate.mjs` / `.superpowers/`)

## Success criteria

- Admin can change name, phone, email, dates, fee, notes, badge (Pro), and send-invite from mobile
- Admin can disable ACTIVE app access from mobile with confirm
- Staff can display that member’s QR full-screen
- Members CSV share uses the list search box; access file is `access-allowed.csv`
- Web behavior unchanged
- Phase A/B bills, drinks, settings, and exports keep working
