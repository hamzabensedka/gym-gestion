# Architecture Evolution — Gym Gestion

**Date:** 2026-08-16  
**Branch context:** `feat/mobile-parity-phase-d`  
**Audience:** product owner / developer deciding how to grow the monorepo

---

## 1. Where you are today

### Surfaces

| Surface | Path | Role |
|---------|------|------|
| Next.js web | `src/` | Admin/staff UI, Server Actions, some REST routes, member portal |
| Hono API | `apps/api/` | Mobile `/v1/*` REST (JWT + refresh) |
| Expo mobile | `apps/mobile/` | Staff + member apps calling the API |
| Shared package | `packages/shared/` | Pure helpers: validations, subscription math, i18n bits, QR, freeze, `canAddStaff` |
| Data | `prisma/` | Single Postgres schema; every business row is scoped by `gymId` |

### How requests flow today

```text
[Browser] → Next.js (Server Actions / Route Handlers) → Prisma → Postgres
[Mobile]  → Hono API (routes → services)             → Prisma → Postgres
```

Both stacks talk to the **same database**. Domain rules are **partly** shared (`packages/shared`) and **partly duplicated** (`src/lib/*` vs `apps/api/src/services/*`).

### What already works well

- **Multi-tenant data model** — `gymId` on Member, User, Checkin, Payment, etc.
- **Plans / access modes** — feature matrix in `src/lib/plans.ts` (Phase 1).
- **Pure domain slices already extracted** — subscription extend, freeze rules, access-export CSV, peak hours, desk helpers live in shared or lib without React.
- **API vs web separation started** — mobile does not call Next Server Actions; it uses Hono.
- **Phase B mobile settings/export parity (2026-08-02)** — enriched `GET /v1/settings` + `PATCH /v1/settings/plan-access`; plan-gated members/payments CSV + `GET /v1/access/export`; Pro `badgeNumber` on member create/update (API + Expo); mobile settings for plan/access/theme and ShareSheet CSV.
- **Phase C mobile core leftovers (2026-08-16)** — admin member edit + invite disable; desk QR for admin/staff; members export `q`; access CSV `access-allowed.csv`.
- **Phase D kiosk (2026-08-16)** — Growth+ self-check-in on web `/kiosk` and Expo; same `performCheckin` rules as desk (shared parse/decide in `@gym/shared/checkin`); idle timeout; Starter locked. Mobile onboarding wizard still web-only.

This is a solid **modular monolith** for Tunisia gym SaaS — not a greenfield mess.

---

## 2. Pain points to fix (what to change)

### P1 — Dual business logic (highest cost)

| Concern | Web | API |
|---------|-----|-----|
| Check-in | `src/lib/checkin.ts` (shared decide/parse) | `apps/api/src/services/checkin.ts` (same helpers) |
| Members CRUD / renew / freeze | `src/app/actions/members.ts` | `apps/api/src/routes/app.ts` + services |
| Dashboard | `src/lib/dashboard.ts` | `apps/api/src/services/dashboard.ts` |
| Staff limits | `src/app/actions/staff.ts` | `apps/api` staff route (partially shared via `canAddStaff`) |
| Badge / plans | Web has Phase 1 | API + mobile wired (Phase B): Pro `badgeNumber` on create/update |
| Plan feature gates (`assertFeature`) | Enforced on web CSV/access exports | Hono gates CSV/access exports + related settings (Phase B); other mutations still need shared use-cases |
| Validations / auth helpers | Often `src/lib/*` local copies | Prefers `@gym/shared/*` |

**Change:** One application core that both adapters call. Stop “fix in web + forget API”. Move `plans.ts` + `assertFeature` into a package both surfaces import. Delete identical duplicates (e.g. web `validations.ts` vs `@gym/shared/validations`).

### P2 — Prisma in the UI layer

Server Actions import `prisma` directly (`src/app/actions/*.ts`). That couples HTTP/UI to the database and makes testing = “hit Postgres”.

**Change:** Actions become thin adapters: parse input → call use-case → map result.

### P3 — Framework mixed into domain

Next cookies/session (`src/lib/session.ts`), Hono middleware, and domain rules sit side by side. Harder to reuse open-door / vendor connectors later.

**Change:** Auth ports (who is the actor?) injected into use-cases; frameworks stay at the edges.

### P4 — Ops for scale

- Incomplete Prisma migration baseline historically (prefer `migrate deploy` in prod).
- No API deploy config in-repo; mobile needs a stable HTTPS API.
- Plan billing (`planStatus`) not wired to a payment provider yet.
- Access modes M3/M4 (vendor connector / lock kit) need a plug-in boundary.

### P5 — Product scale (SaaS)

- One gym per subscription is fine; multi-location later = multiple `Gym` rows + org/account parent.
- Feature flags exist per plan — keep gating in one module (`plans` / `assertFeature`) for web **and** API.

---

## 3. Is hexagonal architecture possible?

**Yes.** You do not need a rewrite. You can migrate **incrementally** toward hexagonal (ports & adapters).

### Target shape

```text
                    ┌─────────────────────────┐
  Next Actions  ───▶│                         │
  Hono routes   ───▶│   Application (use cases)│──▶ Domain (pure rules)
  Future jobs   ───▶│                         │
  Vendor webhook───▶│                         │
                    └───────────┬─────────────┘
                                │ ports
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                 ▼
        Prisma adapter    Email adapter     Access/Door port
        (Postgres)        (Resend)          (CSV / ZKTeco / relay…)
```

| Hexagonal piece | Your mapping |
|-----------------|--------------|
| **Domain** | Pure functions: subscription dates, freeze, `isMemberAllowedForDoor`, plan feature matrix, check-in allow/deny rules |
| **Application (use cases)** | `CreateMember`, `RenewSubscription`, `RecordCheckin`, `ExportAccessList`, `CompleteOnboarding` |
| **Inbound adapters** | Next Server Actions, Hono routes, (later) cron, webhooks |
| **Outbound adapters** | Prisma repositories, Resend email, WhatsApp link builder, door vendor connectors |
| **Ports** | Interfaces: `MemberRepository`, `CheckinRepository`, `Mailer`, `AccessControlGateway` |

### What you already have that fits

- `packages/shared` ≈ early **domain** package.
- `src/lib/access-export.ts`, `src/lib/plans.ts` ≈ domain services.
- `apps/api/src/services/*` ≈ half use-cases, half Prisma queries (split later).

### What hexagonal is *not* for you yet

- Microservices per gym feature.
- Event sourcing.
- Full DDD with dozens of aggregates on day one.

**Rule:** Hexagonal where duplication and adapters hurt (members, check-in, access, billing). Keep simple CRUD screens thin until they grow.

---

## 4. Recommended target folder layout (incremental)

Do **not** move everything at once. Introduce packages and migrate use-case by use-case.

```text
packages/
  domain/                 # pure: Plan, AccessMode rules, subscription, freeze, door allow
  application/            # use cases + port interfaces (no Prisma, no Hono, no Next)
  infra-prisma/           # repository implementations
  shared/                 # keep validations/i18n/format during transition (or merge into domain)

apps/
  api/                    # Hono inbound adapters only
  mobile/                 # UI only
  web/   (or keep src/)   # Next inbound adapters only
```

**Short-term (pragmatic, 2–4 weeks of focused work):**

1. Move duplicated pure logic into `packages/shared` (or new `packages/domain`) until web and API import the **same** functions.
2. Add `packages/application` with use cases that accept repository ports (interfaces).
3. Implement Prisma repos once; wire Next + Hono to the same use cases.
4. Delete the losing duplicate (`src/lib/checkin.ts` vs API service) after parity tests.

**Medium-term:**

5. Introduce `AccessControlPort` with adapters: `CsvExportAdapter` (Pro today), later `ZktecoAdapter`, `RelayAdapter`.
6. Web UI calls API for mutating operations **or** keeps Server Actions as adapters to the same use cases (both OK if domain is shared).
7. Real billing port (`BillingGateway`) when you charge gyms online.

---

## 5. How to scale the app

Scale along **three axes**. Pick the order based on sales, not fashion.

### A. Product scale (more gyms, more modes)

| Step | Action |
|------|--------|
| 1 | Keep **one Postgres**, `gymId` everywhere (you already do). |
| 2 | Enforce plans on **API and web** with the same `assertFeature`. |
| 3 | Access modes as plugins behind `AccessControlPort` — never hardcode ZKTeco in members CRUD. |
| 4 | When a gym has 2 locations → `Organization` → many `Gym` (add when a customer pays for it). |
| 5 | Billing: Stripe/D17 → update `plan` / `planStatus`; feature gates already ready. |

### B. Traffic / ops scale

| Load | Approach |
|------|----------|
| Tens of gyms | Current monolith + Neon/Postgres is enough. Connection pooling (`DATABASE_URL` pooled). |
| Hundreds of gyms / busy check-in | Separate **API** deploy (Hono on Render/Railway/Fly); web on Vercel; shared DB. Index hot paths (`gymId + timestamp`, `gymId + status`). |
| Peak check-in storms | Rate-limit check-in (you have API rate-limit middleware); optional Redis for refresh tokens / rate limits. |
| Reporting heavy | Read replica or materialized daily stats — only if dashboard queries slow. |

**Do not** split “members service” and “check-in service” until one team cannot ship because of deploy coupling.

### C. Team / codebase scale

| Symptom | Move |
|---------|------|
| Bug fixed on web, broken on mobile | Shared use cases (hexagonal application layer) |
| Hard to test check-in without Next | Domain + use case unit tests with fake repos |
| Vendor door work pollutes members | `AccessControlPort` + feature folder |
| CI too slow | Split CI: unit (domain) vs e2e web vs mobile |

---

## 6. Concrete change backlog (ordered)

### Now (after Phase B merge)

1. Merge mobile parity Phase B; smoke plan/access settings + gated CSV/access export on Starter/Growth/Pro.
2. **Done (Phase B):** Hono plan gates on members/payments/access CSV; Pro badge + access export; enriched settings + plan-access PATCH; Expo settings/ShareSheet.
3. Point web imports at `@gym/shared` where files are already identical (start with `validations`).
4. **Done (Phase C):** admin member edit + invite disable; desk QR for admin/staff; members export `q`; access CSV `access-allowed.csv`.
5. **Done (Phase D):** Growth+ kiosk self check-in on web and Expo; shared check-in parse/decide; Starter locked. Onboarding wizard still web-only.

### Next (hexagonal foundation — ~1 vertical slice)

Pick **check-in** or **access export** as the pilot slice:

1. Define ports + use case in `packages/application`.
2. Prisma adapter implements port.
3. Wire Hono route + Next action to the **same** use case.
4. Delete duplicate logic; keep tests in `tests/unit` against domain/use case.

### Then (SaaS growth)

1. Optional mobile onboarding wizard if `onboardingCompletedAt` is null.
2. Billing gateway + `planStatus` automation.
3. First vendor connector behind `AccessControlPort` (only after you know the brand).

### Later (if metrics demand it)

1. Redis / queue for WhatsApp or email bursts.
2. Read replica for analytics.
3. Organization multi-gym.
4. Optional: web becomes BFF-only (all mutations through API) — simplifies to one inbound HTTP surface.

---

## 7. Hexagonal — yes/no decision

| Question | Answer |
|----------|--------|
| Can we implement hexagonal? | **Yes**, incrementally. |
| Should we rewrite the whole app now? | **No.** |
| Minimum valuable hexagonal move? | Shared use cases for **members + check-in + access export** used by web and API. |
| When is full hexagonal “done enough”? | When adding a door vendor or kiosk does **not** require editing Prisma calls inside React components/actions. |

---

## 8. Suggested north-star principles

1. **One gym row = one tenant** until an org layer is sold.
2. **Domain rules once** — shared package / application layer.
3. **Adapters are replaceable** — Postgres, Resend, door brand, payment provider.
4. **Plans gate features**, not forks of the codebase.
5. **Scale the database and API process first**; split services last.

---

## Related docs

- Product design: `docs/superpowers/specs/2026-08-01-saas-plans-access-modes-design.md`
- Phase 1 plan: `docs/superpowers/plans/2026-08-01-saas-plans-access-modes.md`
- Mobile migration notes: `docs/MOBILE_MIGRATION_PLAN.md`
