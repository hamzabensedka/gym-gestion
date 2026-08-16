# Mobile ↔ Web Feature Parity — Design

**Date:** 2026-08-01  
**Status:** Ready for implementation planning  
**Audience:** product owner + implementers  
**Related:** `docs/ARCHITECTURE_EVOLUTION.md`, `docs/MOBILE_MIGRATION_PLAN.md`, drinks/bills + SaaS plans specs

## Goals

1. Bring the **Expo mobile app** to the **same capability level** as the Next.js web admin/staff/member surfaces.
2. Keep a **single Postgres** source of truth; mobile continues to talk to **Hono `/v1`**, never Next Server Actions.
3. Enforce **the same plan feature gates** on API as on web (no mobile bypass).
4. Ship in ordered phases: **A (money) → B (SaaS/settings) → C (core leftovers) → D (kiosk)**.

## Non-goals

- Gym SaaS billing provider (Stripe/etc.) — `planStatus` stays manual/admin for now  
- Vendor door hardware / NEW_ACCESS_KIT physical integration  
- Full hexagonal rewrite of all web Server Actions in one PR  
- Staff selling drinks (admin-only, same as web v1)  
- OCR bills, drink recipes, member credit tabs  

## Current baseline

**Mobile already has:** auth (staff + member), QR/manual check-in, members list/create, renew, freeze, per-member payments, dashboard, attendance, desk today, staff CRUD, member wallet/QR, WhatsApp helpers, basic settings (gym name/location, password, locale).

**Gaps vs web:**

| Area | Gap |
|------|-----|
| Money | **Phase A done** — bills + drinks API + mobile |
| SaaS | **Phase B done** — plan/access/theme settings, badge numbers, gated CSV + access export, ShareSheet |
| Core | **Phase C specified** — see `docs/superpowers/specs/2026-08-16-mobile-parity-phase-c-core-leftovers-design.md` |
| Growth | Real kiosk (web is placeholder); mobile onboarding optional |

## Architecture (Approach 1 — API-first)

```text
[Expo] → Hono /v1/* → Prisma → Postgres
[Web]  → Server Actions / Route Handlers → (shared helpers) → Prisma → Postgres
```

### Shared package (`@gym/shared`)

Move or re-export as needed so **web + API import one source**:

| Module | Content |
|--------|---------|
| `plans` | `PlanFeature`, `planHasFeature`, `getPlanLimits`, `modesAllowedForPlan`, `suggestFromEntryAnswer`, `assertFeature` (async DB-backed or sync plan check) |
| `bills` | Period helpers, sum-by-month (pure) |
| `drinks` | Stock/revenue pure helpers |
| Existing | validations, freeze, subscription, etc. |

Web `src/lib/plans.ts` becomes a thin re-export from `@gym/shared` (or deleted after migration). API middleware/services call `planHasFeature` / `assertFeature` before gated routes.

### API conventions

- JWT auth as today (`apps/api`)
- Admin-only for bills, drinks, plan/access PATCH, access export
- Feature gates return **403** with stable error code (e.g. `FEATURE_LOCKED`)
- Multi-tenant: always scope by `session.gymId`
- JSON for CRUD; CSV endpoints return `text/csv` (mobile uses Share / file write)

### Mobile conventions

- Expo Router groups `(admin)` / `(staff)` / `(member)` unchanged
- New admin screens under More sheet / tabs as on web
- Hide nav items when `planHasFeature` is false (still defend on API)
- FR/AR via existing mobile i18n patterns
- Prefer existing UI primitives in `apps/mobile/components`

---

## Phase A — Money ops (Charges + Boissons)

**Order:** first implementation plan after this spec is approved.

### API

| Method | Path | Gate | Role |
|--------|------|------|------|
| GET | `/v1/bills?month=yyyy-MM` | `utility_bills` | ADMIN |
| POST | `/v1/bills` | `utility_bills` | ADMIN |
| PATCH | `/v1/bills/:id` (mark paid / note) | `utility_bills` | ADMIN |
| DELETE | `/v1/bills/:id` | `utility_bills` | ADMIN |
| GET | `/v1/drinks/products` | `drinks` | ADMIN |
| POST | `/v1/drinks/products` | `drinks` | ADMIN |
| PATCH | `/v1/drinks/products/:id` | `drinks` | ADMIN |
| POST | `/v1/drinks/products/:id/restock` | `drinks` | ADMIN |
| GET | `/v1/drinks/sales?month=yyyy-MM` | `drinks` | ADMIN |
| POST | `/v1/drinks/sales` | `drinks` | ADMIN |
| GET | `/v1/dashboard` | — | extend payload with bills total / drinks revenue when features unlocked |

Payloads mirror web actions (`createBillAction`, `sellDrinkAction`, etc.): amounts in TND, `periodMonth` / `soldAt` as ISO dates, enums matching Prisma.

### Mobile UI

- **Charges** screen: month picker, list, add bill, mark paid, delete, month total + by-type
- **Boissons** screen: tabs products / sell / history (same as web)
- Admin nav: insert before Staff (or in More), gated like web
- Dashboard cards when features present

### Testing

- Unit: shared bills/drinks helpers (reuse/extend existing)
- API: auth + feature gate + happy-path create/list (integration if DB harness exists for API; otherwise route-level tests)
- Manual smoke on Expo

---

## Phase B — SaaS / settings parity

**Status:** Done (2026-08-02, `feat/mobile-parity-phase-b`)

### API

| Change | Detail |
|--------|--------|
| GET `/v1/settings` | Include `plan`, `accessMode`, `planStatus`, `maxStaff`, `features[]`, `cardTheme`, `onboardingCompletedAt` |
| PATCH `/v1/settings/plan-access` | Body: `plan`, `accessMode`; validate `modesAllowedForPlan`; ADMIN |
| PATCH `/v1/settings` | Already patches gym; ensure `cardTheme` works |
| Members create/update | Accept `badgeNumber` when `badge_numbers`; reject otherwise |
| GET `/v1/members/export` | Require `csv_export` |
| GET `/v1/payments/export` | Require `csv_export` |
| GET `/v1/access/export` | **New** — Pro `access_export`; same CSV shape as web |

### Mobile UI

- Settings: plan select, access mode select (full edit — product decision **A**), card theme
- Member create/edit: badge field when Pro
- ShareSheet / system share for CSV downloads (members, payments, access)
- Nav + settings use `features[]` from settings GET

### Testing

- Unit: plan mode validation
- API: gate 403 on Starter for CSV / drinks; Pro access export shape

---

## Phase C — Core leftovers

**Status:** Specified (2026-08-16) — `docs/superpowers/specs/2026-08-16-mobile-parity-phase-c-core-leftovers-design.md`

| Item | Work |
|------|------|
| Member edit | Dedicated admin screen → existing `PATCH /v1/members/:id` |
| Invite disable | Confirm + `POST /v1/members/:id/invite/disable` (ACTIVE only, admin) |
| Member QR (desk) | Full-screen from detail → `GET /v1/members/:id/qr` (admin + staff) |
| Exports polish | `q` on members export; access filename `access-allowed.csv` |

No new domain tables. Small PRs preferred. Phase D stays out.

---

## Phase D — Kiosk (+ optional onboarding)

| Item | Work |
|------|------|
| Shared check-in use-case | Extract if needed so kiosk + desk share rules |
| Kiosk UX | Growth+ gated; self-service check-in loop (camera or member code); idle timeout |
| Surfaces | Finish web `/kiosk` placeholder **and** add mobile kiosk entry (tablet-friendly) |
| Onboarding | Optional mobile wizard mirroring web if `onboardingCompletedAt` is null |

Kiosk is not a toy screen: must call the same check-in service as desk scan.

---

## Product rules (parity)

| Rule | Value |
|------|--------|
| Bills | All plans, ADMIN |
| Drinks | Growth + Pro, ADMIN |
| Plan / access edit | ADMIN on web **and** mobile |
| CSV members/payments | Growth+ |
| Badge + access CSV | Pro |
| Staff role | Same RBAC as web |

## Error handling

- `401` unauthenticated  
- `403` wrong role or feature locked (`code: FEATURE_LOCKED` or `FORBIDDEN`)  
- `404` wrong gym / missing row  
- `400` validation (Zod), include field errors when useful  
- Mobile: toast / inline alert with FR/AR strings  

## Rollout

1. Spec approval → implementation plan for **Phase A** only  
2. After A ships: plan + implement B, then C, then D  
3. Each phase: API first (or shared + API), then mobile UI, then gate verification on Starter vs Growth  
4. Deploy API before relying on mobile builds against production  

## Success criteria

- Admin on mobile can do everything admin can on web for shipped phases  
- Starter gym **cannot** use drinks/CSV/access export via API (403)  
- No duplicate divergent plan matrices  
- Existing mobile desk flows keep working (regression smoke)

## Open items (resolved in this design)

| Question | Decision |
|----------|----------|
| Implementation style | API-first + `@gym/shared` |
| Plan/access on mobile | Full edit (same as web) |
| Phase order | A → B → C → D |
| Staff drinks | Out of scope (admin-only) |
