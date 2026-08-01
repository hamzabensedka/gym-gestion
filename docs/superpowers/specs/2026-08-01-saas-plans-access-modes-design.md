# SaaS Plans & Access Modes — Design

**Date:** 2026-08-01  
**Product:** Gym Gestion (Tunisia)  
**Status:** Approved for Phase 1 planning

## Problem

Gyms in Tunisia do not share one access setup:

- Some have no system (desk / open room)
- Some want check-in without a lock
- Some already have badges + PC door software
- Some will later want smart locks / vendor devices

The product must adapt per gym without asking owners to “replace your system” up front.

## Goals

1. One SaaS core (members, subscriptions, payments, staff, dashboard, WhatsApp, FR/AR).
2. Per-gym **subscription plan** (flat monthly price per location).
3. Per-gym **access mode** that unlocks the right entry workflow.
4. Position Pro as an **extension** to existing badge/PC systems (export allowed list), not a replacement pitch.
5. Leave room for vendor connectors and new access kits later without rewriting the core.

## Non-goals (Phase 1)

- Live “open door” from the app
- Vendor brand connectors (ZKTeco, Hikvision, …)
- Hardware lock / relay kit install product
- Online payment collection for gym members (still manual TND payments)
- Charging gyms via D17/Stripe in-app (plan fields only; billing integration later)
- Full self-check-in kiosk UI (Phase 2)

## Pricing (agreed)

**Model:** flat monthly (or yearly) **per gym / location**. No per-member fee. No per-staff fee in v1 (staff capped by plan).

| Plan | Target | Monthly (example TND) | Yearly (example) |
|------|--------|------------------------|------------------|
| Starter | Desk-only gyms | 49–79 | ~10× monthly |
| Growth | Soft access / kiosk | 99–129 | ~10× monthly |
| Pro | Badges + PC software extension | 149–199 | ~10× monthly |

Exact TND numbers are commercial; code uses plan enums + limits, not hard-coded prices.

## Plans → features

| Capability | Starter | Growth | Pro |
|------------|---------|--------|-----|
| Members, renew, freeze, payments | ✓ | ✓ | ✓ |
| Reception QR + manual check-in | ✓ | ✓ | ✓ |
| Staff seats (`maxStaff`) | 2 | 5 | 10 |
| Self check-in kiosk | — | ✓ | ✓ |
| Members/payments CSV export | — | ✓ | ✓ |
| Badge number on member | — | — | ✓ |
| Door software “allowed list” export | — | — | ✓ |

**Later add-on (not Phase 1):** vendor connector / new access kit (setup fee + higher tier).

## Access modes

Stored on `Gym.accessMode`. Wizard recommends plan + mode; user can change later within what the plan allows.

| Mode | Meaning |
|------|---------|
| `DESK_ONLY` | Staff check-in only (M0) |
| `KIOSK` | Self check-in tablet (M1) — Phase 2 UI |
| `BADGE_PC_EXTENSION` | Keep their PC/badge software; we export allowed members (M2) |
| `VENDOR_CONNECTOR` | Reserved for later (M3) |
| `NEW_ACCESS_KIT` | Reserved for later (M4) |

**Rule:** changing mode never deletes members or payments. UI shows/hides features by `plan` + `accessMode`.

## Onboarding wizard

After first admin login (if `onboardingCompletedAt` is null):

1. Question: “How do members enter today?”
2. Map answer → suggested `plan` + `accessMode`
3. Confirm gym name / location
4. Mark onboarding complete (or skip)
5. Dashboard checklist (add members, invite staff, download door export if Pro)

Wizard recommends; never hard-blocks choosing a lower/higher plan manually in settings (admin).

## Data model

### `Gym` additions

- `plan`: `STARTER` | `GROWTH` | `PRO` (default `STARTER`)
- `accessMode`: enum above (default `DESK_ONLY`)
- `planStatus`: `TRIAL` | `ACTIVE` | `PAST_DUE` | `CANCELLED` (default `TRIAL` or `ACTIVE` for seeded demos)
- `maxStaff`: Int (denormalized from plan for easy enforcement; updated when plan changes)
- `onboardingCompletedAt`: `DateTime?`
- `lastAccessExportAt`: `DateTime?`

### `Member` additions

- `badgeNumber`: `String?` — unique per gym when set (`@@unique([gymId, badgeNumber])`)

### Allowed for door export

Member is exportable as **allowed** when:

- `status === ACTIVE`
- not frozen (`frozenAt` / status not `FROZEN`)
- `subscriptionEnd >= now`
- `badgeNumber` is non-empty

Export also includes a **blocked** section or `allowed=0` rows for members with badges who are expired/frozen (so PC software can remove them) — implement as CSV columns: `badgeNumber,fullName,phone,allowed,subscriptionEnd`.

## Sales positioning

- Never lead with “replace your system.”
- Lead with: manage members/payments on mobile; keep the door software; sync who is allowed.
- Empty gyms: Starter → Growth when they want kiosk → Access add-on when they want locks.

## Phased delivery

| Phase | Deliverable |
|-------|-------------|
| **1** | Schema, plan limits, feature gates, wizard, badge field, Pro CSV export, settings |
| **2** | Kiosk self check-in (Growth/Pro) |
| **3** | Real billing (subscribe / renew plan) |
| **4** | First vendor connector or access kit |

## Success criteria (Phase 1)

- Seeded gym can be Starter, Growth, or Pro with correct gates.
- Admin completes or skips onboarding; `accessMode` + `plan` persist.
- Pro admin assigns badge numbers and downloads allowed-list CSV.
- Starter cannot access badge export or kiosk routes (clear upgrade message).
