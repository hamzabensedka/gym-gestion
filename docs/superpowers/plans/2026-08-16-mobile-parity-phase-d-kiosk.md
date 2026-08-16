# Phase D Kiosk Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Growth+ self-check-in kiosk on web and Expo, same rules as desk scan, with idle timeout; Starter stays locked.

**Architecture:** Extract pure check-in helpers to `@gym/shared/checkin`. Web `POST /api/checkin` and Hono `POST /v1/checkin` call the same decide/parse/token helpers plus Prisma lookup (id → phone → badge). Kiosk UIs are adapters only. Do not gate check-in POST on the `kiosk` feature.

**Tech Stack:** Next.js App Router, Hono `/v1`, Expo Router, Prisma, Vitest, `@gym/shared`.

**Spec:** `docs/superpowers/specs/2026-08-16-mobile-parity-phase-d-kiosk-design.md`

## Global Constraints

- Onboarding wizard is **out of this PR**.
- Do not commit datepicker/month-picker, `scripts/prod-migrate.mjs`, or `.superpowers/` leftovers.
- TDD for new shared helpers: fail first, then implement.
- `POST /checkin` stays ungated so Starter desk scan works.
- Gate kiosk **UI + nav** with `planHasFeature(plan, "kiosk")` only (not `accessMode`).
- Admin + staff; members cannot open kiosk.
- No member search list on kiosk.
- Result overlay `KIOSK_RESULT_MS = 4000`; code idle `KIOSK_IDLE_MS = 45000`.
- FR + AR copy in both `src/lib/i18n.ts` and `packages/shared/src/i18n.ts`.
- `GET /v1/settings` becomes desk-readable; PATCH stays admin.

---

### Task 1: Shared check-in helpers

**Files:**
- Create: `packages/shared/src/checkin.ts`
- Modify: `packages/shared/package.json` (export `./checkin`), `packages/shared/src/index.ts`
- Test: `tests/unit/checkin-shared.test.ts` (already written)

**Interfaces:**
- Produces: `parseMemberIdFromQr`, `resolveCheckinToken`, `decideCheckinOutcome`, `KIOSK_RESULT_MS`, `KIOSK_IDLE_MS`, types `CheckinOutcome`, `CheckinInput`

- [ ] **Step 1:** Confirm `tests/unit/checkin-shared.test.ts` fails (module missing).
- [ ] **Step 2:** Implement `packages/shared/src/checkin.ts` and export it.
- [ ] **Step 3:** Run `npx vitest run tests/unit/checkin-shared.test.ts` — PASS.
- [ ] **Step 4:** Point `tests/unit/checkin-parse.test.ts` at `@gym/shared/checkin` (or keep re-export). Commit.

---

### Task 2: Wire performCheckinFromInput (web + API)

**Files:**
- Modify: `src/lib/checkin.ts`, `apps/api/src/services/checkin.ts`, `src/app/api/checkin/route.ts`, `apps/api/src/routes/checkin.ts`
- Test: `tests/integration/perform-checkin.test.ts` (extend)

**Interfaces:**
- `performCheckin(gymId, memberId)` remains.
- `performCheckinFromInput(gymId, input: CheckinInput)` resolves token, finds by id / phone / badge, decides, writes check-in on GRANTED.

- [ ] **Step 1:** Add failing integration cases: phone `+21620123456` and badge `1001` grant Ahmed; unknown code → NOT_FOUND.
- [ ] **Step 2:** Implement lookup + FromInput in both wrappers; routes accept `code`.
- [ ] **Step 3:** Run integration + unit check-in tests — PASS. Commit.

---

### Task 3: Web kiosk UI

**Files:**
- Create: `src/components/kiosk/kiosk-panel.tsx`
- Modify: `src/app/(app)/kiosk/page.tsx`, `src/components/layout/app-shell.tsx`, `src/lib/i18n.ts`

- [ ] Growth+ fullscreen panel: camera or code, `CheckinFeedback` at 4s, idle 45s on code, exit confirm to `/scan`.
- [ ] Starter locked page unchanged in behavior (upgrade CTA for admin).
- [ ] Hide AppShell when `pathname === "/kiosk"` and `showKioskNav`.
- [ ] Commit.

---

### Task 4: Mobile kiosk + staff settings read

**Files:**
- Create: `apps/mobile/app/kiosk.tsx`, `apps/mobile/screens/kiosk-screen.tsx`
- Modify: `apps/api/src/routes/app.ts` (GET `/` → `requireDeskAccess`), `apps/mobile/lib/navigation.ts`, `apps/mobile/components/app-tab-bar.tsx`, `apps/mobile/components/icons.tsx`, `apps/mobile/app/_layout.tsx`, `packages/shared/src/i18n.ts`

- [ ] Staff can GET settings features.
- [ ] Nav item after Scan when `kiosk` in features; `router.push("/kiosk")`.
- [ ] Fullscreen kiosk: camera or code, 4s result, 45s idle, exit confirm, Android back gated.
- [ ] Locked screen when feature missing.
- [ ] Commit.

---

### Task 5: Architecture note + verify

**Files:**
- Modify: `docs/ARCHITECTURE_EVOLUTION.md`

- [ ] Mark Phase D kiosk as the in-progress/done backlog item; note onboarding still optional/out.
- [ ] Run `npx vitest run tests/unit/checkin-shared.test.ts tests/unit/checkin-parse.test.ts tests/integration/perform-checkin.test.ts tests/integration/checkin-qr.test.ts tests/unit/plans.test.ts`
- [ ] Commit docs. Do not add leftover untracked files.
