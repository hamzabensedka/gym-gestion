# Plan cards, leads, and locked gym subscription — Design

**Date:** 2026-08-18  
**Product:** Gym Gestion (web + Expo)  
**Status:** Draft for implementation

## Problem

Gym admins can switch Starter / Growth / Pro in Settings (web select + mobile chips). That writes `Gym.plan` immediately. There is no payment, interview, or operator approval.

Commercial reality for v1:

- Gyms pay **offline** (poste, TapTap Send, EasyTransfer).
- The first ~10 gyms get **3–4 months free** to test.
- New gyms must **not** self-provision a paid tier.
- The operator (Hamza) interviews them, creates the account, and sets the plan by hand.

## Goals

1. Public **plan cards** (web + mobile) **before login**. Choosing a plan sends a lead, not an account.
2. Logged-in admins: **Plus → Gérer l’abonnement** with the same cards. Current plan is marked. Requesting another plan emails the operator; the gym is **not** upgraded in-app.
3. Gym admins **cannot** change `Gym.plan` from Settings, onboarding, or the API.
4. Persist every request in the database **and** email the operator (spam/fail-safe).
5. Motion: cards feel like a real pricing page (stagger, press scale, selected ring) — not a settings dropdown.
6. FR + AR, web and Expo in the same release.

## Non-goals

- Stripe / D17 in-app checkout
- Self-serve signup or auto-created gyms
- Operator admin UI to approve requests (Prisma / DB is enough for the first 10)
- A fourth plan SKU (catalog is a list so a 4th card can be added later)
- Staff or members managing the gym SaaS plan
- Changing access mode rules (still editable **within** the current plan)

## Surfaces

### Public — before login

| Client | Route | Entry |
|--------|--------|--------|
| Web | `/offres` | Login header/footer link “Voir les offres”. `/` still redirects to `/login` if logged out. |
| Expo | `(auth)/offres` | Login link “Voir les offres”. Auth stack: `login`, `invite/[token]`, `offres`. |

Same content: three cards + lead form + optional WhatsApp.

Submitting **does not** create a `Gym` or `User`.

### Logged in — admin only

| Client | Route | Entry |
|--------|--------|--------|
| Web | `/abonnement` | Bottom **Plus** sheet item “Gérer l’abonnement” (admin). Hidden for staff. |
| Expo | `(admin)/abonnement` | **Plus** sheet item, same label. Hidden for staff. |

Cards show **Plan actuel** on the gym’s `plan`. Other cards: **Demander ce plan**. That creates a `PlanRequest` with `gymId` and emails the operator.

Members never see this.

## Plan catalog (cards)

Single source in `@gym/shared` (used by web + mobile). Three cards for now:

| Plan | Pitch | Included (shown on card) | Not on this card |
|------|--------|---------------------------|------------------|
| **Starter** | Accueil / bureau | Membres, paiements, freeze, check-in desk, charges. 2 sièges staff. | Kiosque, cours, boissons, export CSV, badges |
| **Growth** | Salle qui veut le kiosque + cours | Tout Starter + kiosque, cours, boissons, export CSV. 5 sièges. | Badges / export logiciel d’accès |
| **Pro** | Badges + logiciel PC existant | Tout Growth + n° badge, export liste autorisée. 10 sièges. | — |

No fake checkout price. Muted line: **Paiement manuel** (poste, TapTap Send, EasyTransfer). Exact TND stays commercial / interview.

A 4th card later = one more entry in the catalog array, not a new screen.

**Logged-in extra:** if `Gym.planTrialEndsAt` is set, a line under the current card: “Essai jusqu’au {date}”. Operator sets this when provisioning the first gyms.

## Lead form (public)

Required: gym name, city, phone, email, chosen plan (the selected card fills `plan`).

Optional WhatsApp: if `NEXT_PUBLIC_LEADS_WHATSAPP` is set (E.164, e.g. `216XXXXXXXX`), show a secondary button **Écrire sur WhatsApp** that opens `https://wa.me/{number}` with a prefilled message (gym name + plan). Hide the button if the env is empty.

Rate-limit public POST (IP + email, e.g. 5 / hour).

## Motion (web + native)

Cards are the hero, not the form.

- Enter: stagger cards ~80–100ms (`stagger-group` on web; Reanimated or sequential opacity/translateY on native). `initial={false}` is N/A for a dedicated page — first visit may animate once.
- Press: `scale(0.96)` only. No bounce. Interruptible.
- Selected card: brand ring + slight lift. Switching selection is `transition` on transform/opacity/border-color only — never `transition: all`.
- Success: replace the form with a short confirmation (email sent / we will call). No full-page navigation away without feedback.
- Native: stacked cards (readable feature lists). Web: 1 column on phone, 3 columns from `lg`.

Hit areas ≥ 40px. Tabular nums on staff counts. Headings `text-wrap: balance`.

## Data

### `Gym`

Add nullable `planTrialEndsAt DateTime?`.

`planStatus` stays as-is (`TRIAL` / `ACTIVE` / …). Operator may set `TRIAL` + `planTrialEndsAt` when giving free months. App does **not** auto-downgrade when the date passes (out of scope). Show the date only.

### `PlanRequest`

```
id, source (PUBLIC | GYM), plan (Plan),
gymName, city, phone, email,
gymId? (set when source = GYM),
createdAt, status (NEW default)
```

No update UI. Status exists so a later operator screen can mark CONTACTED.

## Email

- To: `LEADS_INBOX_EMAIL` (required in production; if missing, still persist the row and log).
- From: existing `EMAIL_FROM` / Resend, same pattern as member invites (`src/lib/email.ts` + API equivalent).
- Subject public: `Nouveau lead {plan} — {gymName}`
- Subject gym: `Demande {plan} — {gymName} ({gymId})`
- Body: all form fields + source + timestamp.

Dev without Resend: persist + `console.info`, same as invites.

## Lock plan changes

Gym admins must not write `Gym.plan`:

| Today | After |
|--------|--------|
| Web Settings plan `<Select>` + `updatePlanAndAccessAction` | Read-only current plan + link to `/abonnement`. Access mode still saved. |
| Mobile Settings plan chips + `PATCH /settings/plan-access` | Read-only plan. PATCH accepts **accessMode only**. If the body includes `plan`, respond **400**. |
| Web `updatePlanAction` | Remove or admin-only no-op for plan. |
| Onboarding `completeOnboardingAction` sets plan from “how they enter” | Set **accessMode only**. Leave `plan` as provisioned (default Starter until operator changes it). Do not take `plan` from the client. |

Operator changes plan in Neon / Prisma Studio until an operator UI exists.

## API / actions

- `POST /plan-requests` public: body `{ gymName, city, phone, email, plan }`. Creates `PlanRequest` `PUBLIC`, sends email.
- `POST /plan-requests` authenticated admin: body `{ plan }`. Fills gym name/city/phone/email from gym + session. `source = GYM`. Reject if `plan === gym.plan` with a clear message.
- Web: matching server actions calling the same shared helper as the API (or API from mobile only + actions on web) — **one** persist+email function in shared or duplicated thin wrappers, not two business logics.

## i18n

All new strings in `packages/shared/src/i18n.ts` (FR + AR), then web `src/lib/i18n.ts` as today.

## Testing

- Unit: catalog features per plan; public payload validation; PATCH plan-access rejects plan.
- Integration: creating `PlanRequest` does not change `Gym.plan`; onboarding does not change `plan`.
- E2e (web): `/offres` visible logged out; submit shows confirmation; admin Settings has no plan `<select>`; Plus contains Gérer l’abonnement.
- Mobile: covered by shared validation + settings PATCH test; screen-level if existing mobile test harness allows, otherwise manual.

## Success

- A logged-out person on web or the app can request Growth and you receive an email **and** a DB row.
- An admin cannot become Pro from Settings or onboarding.
- Plus → Gérer l’abonnement works on web and Expo with the current plan marked.
- WhatsApp button appears only when the env is set.
- Motion matches the rules above (stagger + 0.96 press, no `transition: all`).
