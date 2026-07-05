# Gym Gestion — Native Mobile Migration Plan

**Goal:** Ship **Gym Gestion** as a real **iOS + Android** app (React Native / Expo), with a **new standalone REST API** backend. No WebView wrappers (Capacitor, TWA, etc.).

**Status:** Planning document  
**Last updated:** 2026-06-29  
**Current stack:** Next.js 16 + Prisma + PostgreSQL + cookie-based JWT sessions  
**Target stack:** Expo (React Native) + Node REST API + PostgreSQL (unchanged schema)

---

## Table of contents

1. [Executive summary](#1-executive-summary)
2. [Target architecture](#2-target-architecture)
3. [Technology choices](#3-technology-choices)
4. [Monorepo layout](#4-monorepo-layout)
5. [REST API specification](#5-rest-api-specification)
6. [Mobile app structure](#6-mobile-app-structure)
7. [Authentication design](#7-authentication-design)
8. [Feature parity matrix](#8-feature-parity-matrix)
9. [Apple App Store compliance](#9-apple-app-store-compliance)
10. [Google Play compliance](#10-google-play-compliance)
11. [Phased delivery plan](#11-phased-delivery-plan)
12. [Testing strategy](#12-testing-strategy)
13. [Deployment & operations](#13-deployment--operations)
14. [Risks & mitigations](#14-risks--mitigations)
15. [Definition of done](#15-definition-of-done)
16. [Appendix: reusable code from current repo](#16-appendix-reusable-code-from-current-repo)

---

## 1. Executive summary

### What changes

| Layer | Today | After migration |
|-------|--------|-----------------|
| **Mobile UI** | Next.js web pages | **Expo React Native** (new) |
| **Backend contract** | Server Actions + partial `/api` routes + cookies | **REST API** + **Bearer tokens** |
| **Database** | Prisma + PostgreSQL | **Same schema** (minor migrations only) |
| **Web app** | Primary product | **Optional** — keep for admin desktop or deprecate later |

### What stays

- Prisma schema and business logic (`lib/checkin.ts`, `lib/subscription.ts`, `lib/validations.ts`, etc.)
- PostgreSQL data model (Gym, User, Member, Checkin)
- i18n strings (FR + AR)
- Existing Vitest / Playwright tests as **behavior reference** (adapt for API + Maestro)

### Timeline (solo developer, focused)

| Phase | Duration | Outcome |
|-------|----------|---------|
| 0 — Foundation | 1 week | Monorepo, API skeleton, Expo shell, CI |
| 1 — Staff MVP | 2 weeks | Login, QR scan, manual check-in |
| 2 — Admin core | 2 weeks | Members CRUD, dashboard, attendance |
| 3 — Admin + member | 2 weeks | Staff, settings, member wallet, invites |
| 4 — Store readiness | 1–2 weeks | Apple/Google compliance, assets, submission |
| **Total** | **~8–9 weeks** | Both stores |

---

## 2. Target architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Expo React Native App                     │
│  (iOS + Android — single codebase)                          │
│  • Expo Router navigation                                   │
│  • Native QR (expo-camera / vision-camera)                  │
│  • SecureStore for tokens                                   │
│  • FR / AR i18n                                             │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS + JSON
                           │ Authorization: Bearer <access_token>
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              REST API (Node — standalone service)            │
│  • Hono or Fastify                                          │
│  • Prisma ORM                                               │
│  • Zod request/response validation                          │
│  • Rate limiting, CORS, structured errors                   │
│  • Resend for invite emails                                  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   PostgreSQL (managed)                       │
└─────────────────────────────────────────────────────────────┘
```

### Principles

1. **API-first** — mobile never talks to the database directly.
2. **Stateless auth** — short-lived access token + refresh token (no httpOnly cookies on mobile).
3. **Shared types** — Zod schemas and TypeScript types in `packages/shared`.
4. **Native UX** — real navigation, haptics, camera APIs; not a website in a shell.
5. **Apple Guideline 4.2** — app must provide substantial native value (check-in, QR, offline-tolerant UI, role-based flows).

---

## 3. Technology choices

### Mobile — **Expo (SDK 52+)**

| Need | Package |
|------|---------|
| Navigation | `expo-router` |
| Camera / QR scan | `expo-camera` + barcode scanning, or `react-native-vision-camera` |
| QR display (member card) | `react-native-qrcode-svg` |
| Secure token storage | `expo-secure-store` |
| HTTP client | `fetch` + TanStack Query |
| Forms | `react-hook-form` + Zod |
| i18n | `i18next` or port existing `lib/i18n.ts` |
| UI | Custom components (match brand) — **no** Radix/Tailwind on RN |
| Deep links (invites) | `expo-linking` — `gymgestion://invite/{token}` + universal links later |

**Why Expo:** EAS Build for App Store / Play binaries, OTA updates for JS-only fixes, strong camera support, one codebase for iOS + Android.

### API — **Hono + Prisma** (recommended)

| Need | Choice |
|------|--------|
| HTTP framework | [Hono](https://hono.dev) — lightweight, TypeScript-first, fast |
| Validation | Zod (reuse from `lib/validations.ts`) |
| Auth | `jose` (JWT) — already used in project |
| Email | Resend (reuse `lib/email.ts`) |
| Hosting | Railway, Render, Fly.io, or VPS |
| API docs | OpenAPI 3.1 via `@hono/zod-openapi` |

**Alternative:** Fastify — equally valid if team prefers it.

### What we are **not** using

- Capacitor / Cordova / WebView wrappers
- Next.js Server Actions from mobile
- Cookie-based sessions on mobile clients

---

## 4. Monorepo layout

Convert the repository to a **pnpm or npm workspaces** monorepo:

```
GYM_GESTION/
├── apps/
│   ├── api/                    # NEW — REST API service
│   │   ├── src/
│   │   │   ├── routes/         # auth, members, checkin, ...
│   │   │   ├── middleware/     # auth, rate-limit, rbac
│   │   │   ├── services/       # port from src/lib/*
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── mobile/                 # NEW — Expo app
│       ├── app/                # Expo Router screens
│       ├── components/
│       ├── lib/api.ts          # API client
│       ├── app.json
│       └── package.json
│
├── packages/
│   └── shared/                 # NEW — shared between api + mobile
│       ├── src/
│       │   ├── validations.ts  # moved from src/lib/validations.ts
│       │   ├── types.ts
│       │   └── i18n/           # moved from src/lib/i18n.ts
│       └── package.json
│
├── prisma/                     # KEEP — shared schema + migrations
├── docs/
│   └── MOBILE_MIGRATION_PLAN.md
├── src/                        # LEGACY web — freeze after Phase 1 API, deprecate later
└── package.json                # workspace root
```

**Migration rule:** Port logic from `src/lib/*` → `apps/api/src/services/*` and `packages/shared/*`. Do not duplicate business rules in the mobile app.

---

## 5. REST API specification

Base URL: `https://api.yourhost.com/v1`  
All responses: `{ "data": ... }` or `{ "error": { "code": "...", "message": "..." } }`  
Auth header: `Authorization: Bearer <access_token>`

### 5.1 Auth — Staff

| Method | Endpoint | Role | Maps from |
|--------|----------|------|-----------|
| `POST` | `/auth/staff/login` | public | `loginAction` / `/api/auth/login` |
| `POST` | `/auth/staff/refresh` | public | **new** |
| `POST` | `/auth/staff/logout` | staff | `/api/auth/logout` |
| `GET` | `/auth/staff/me` | staff | session payload |

**Request `POST /auth/staff/login`:**
```json
{ "email": "admin@gym.local", "password": "..." }
```
**Response:**
```json
{
  "data": {
    "accessToken": "...",
    "refreshToken": "...",
    "expiresIn": 3600,
    "user": { "id", "name", "email", "role", "gymId", "gymName" }
  }
}
```

### 5.2 Auth — Member

| Method | Endpoint | Role | Maps from |
|--------|----------|------|-----------|
| `POST` | `/auth/member/login` | public | `memberLoginAction` |
| `POST` | `/auth/member/refresh` | public | **new** |
| `POST` | `/auth/member/logout` | member | `/api/member/auth/logout` |
| `GET` | `/auth/member/me` | member | `/api/member/me` |
| `POST` | `/auth/member/set-password` | public | `setPasswordFromInviteAction` |
| `GET` | `/auth/member/invite/:token` | public | invite page validation |

### 5.3 Check-in

| Method | Endpoint | Role | Maps from |
|--------|----------|------|-----------|
| `POST` | `/checkin` | staff, admin | `/api/checkin` |
| `GET` | `/members/search?q=` | staff, admin | `/api/members/search` |

**Request `POST /checkin`:**
```json
{ "memberId": "cuid" }
// OR
{ "qrData": "{\"memberId\":\"...\"}" }
```

### 5.4 Members (admin only)

| Method | Endpoint | Maps from |
|--------|----------|-----------|
| `GET` | `/members?f=all\|active\|expired\|expiring&q=` | members list page |
| `GET` | `/members/:id` | member detail page |
| `POST` | `/members` | `createMemberAction` |
| `PATCH` | `/members/:id` | `updateMemberAction` |
| `DELETE` | `/members/:id` | `deleteMemberAction` |
| `POST` | `/members/:id/renew` | `renewMemberAction` — body: `{ "months": 1\|3\|6\|12 }` |
| `GET` | `/members/export` | `/api/members/export` — returns CSV |
| `POST` | `/members/:id/invite/resend` | `resendMemberInviteAction` |
| `POST` | `/members/:id/invite/disable` | `disableMemberAccessAction` |
| `GET` | `/members/:id/qr` | admin QR display |

### 5.5 Dashboard & attendance (admin only)

| Method | Endpoint | Maps from |
|--------|----------|-----------|
| `GET` | `/dashboard` | `getDashboardData()` |
| `GET` | `/attendance` | `getAttendanceData()` |

### 5.6 Staff (admin only)

| Method | Endpoint | Maps from |
|--------|----------|-----------|
| `GET` | `/staff` | staff page |
| `POST` | `/staff` | `createStaffAction` |
| `DELETE` | `/staff/:id` | `deleteStaffAction` |

### 5.7 Settings (admin only)

| Method | Endpoint | Maps from |
|--------|----------|-----------|
| `GET` | `/settings/gym` | settings page |
| `PATCH` | `/settings/gym` | `updateGymAction` |
| `PATCH` | `/settings/password` | `changePasswordAction` |

### 5.8 Member app

| Method | Endpoint | Maps from |
|--------|----------|-----------|
| `GET` | `/member/wallet` | `/member` page |
| `GET` | `/member/qr` | `/api/member/qr` |

### 5.9 Meta

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/health` | Load balancer / monitoring |
| `GET` | `/legal/privacy` | Optional — or keep static URLs in app |
| `PATCH` | `/preferences/locale` | `setLocaleAction` — body: `{ "locale": "fr"\|"ar" }` |

### 5.10 API middleware (every protected route)

1. Verify JWT signature and expiry.
2. Load `gymId` from token — **never** trust client-sent `gymId`.
3. Enforce RBAC:
   - `ADMIN` — dashboard, members, staff, settings, attendance, check-in
   - `STAFF` — scan, manual check-in, member search only
   - `MEMBER` — wallet, own QR only
4. Rate limit: `POST /auth/*/login` — 10 req/min/IP.
5. Return consistent HTTP status codes: `401`, `403`, `404`, `422`, `429`.

### 5.11 Security fixes to include in API (from current web audit)

- [ ] Enforce `role === ADMIN` on all member/staff/settings mutations (not only UI).
- [ ] Scope staff login by `gymId` if multi-tenant DB (or document single-gym-per-DB).
- [ ] Add `issueMemberInvite` only when `RESEND_API_KEY` or dev capture is configured.
- [ ] Never return `passwordHash` in any response.

---

## 6. Mobile app structure

### 6.1 Navigation (Expo Router)

```
app/
├── (auth)/
│   ├── login.tsx
│   └── invite/[token].tsx          # Set password from invite deep link
│
├── (staff)/                        # STAFF + ADMIN (check-in)
│   ├── _layout.tsx                 # Tab: Scan | Manual
│   ├── scan.tsx                    # Native QR scanner
│   └── manual.tsx                  # Search + check-in
│
├── (admin)/                        # ADMIN only
│   ├── _layout.tsx                 # Tabs or drawer
│   ├── dashboard.tsx
│   ├── members/
│   │   ├── index.tsx
│   │   ├── new.tsx
│   │   └── [id].tsx
│   ├── attendance.tsx
│   ├── staff.tsx
│   └── settings.tsx
│
├── (member)/                       # MEMBER only
│   ├── _layout.tsx
│   ├── index.tsx                   # Wallet card
│   └── card.tsx                    # Full-screen QR
│
└── _layout.tsx                     # Root — auth gate by role
```

### 6.2 Role routing (replaces `proxy.ts`)

After login, read `user.role` or `member` flag from `/auth/*/me`:

| Role | Initial route |
|------|----------------|
| `ADMIN` | `/(admin)/dashboard` |
| `STAFF` | `/(staff)/scan` |
| Member | `/(member)` |

Block navigation at layout level (same rules as current `ADMIN_PREFIXES` / `CHECKIN_PREFIXES`).

### 6.3 Native QR scanner (scan screen)

- Use `expo-camera` with `barcodeScannerSettings={{ barcodeTypes: ['qr'] } }`.
- On scan: parse JSON `{ "memberId": "..." }` (same as `generateMemberQrPayload`).
- Call `POST /checkin` with `qrData`.
- Show full-screen success/denied UI (port UX from `CheckinFeedback`).
- Request camera permission **in context** (when user opens Scan tab), not on app launch.
- Haptic feedback on success/failure (`expo-haptics`).

### 6.4 Member wallet card

- Port visual design from `wallet-card-variants.tsx` using RN `View`, `Text`, `LinearGradient`.
- Support `cardTheme` from gym settings (`default` | `fitbox-mahdia`).
- Tap card → navigate to `/(member)/card` with animated QR.

### 6.5 Deep links (invites)

**App scheme:** `gymgestion://invite/{token}`  
**Universal link (later):** `https://app.yourdomain.com/invite/{token}`

Configure in `app.json`:
```json
{
  "expo": {
    "scheme": "gymgestion",
    "ios": { "bundleIdentifier": "com.yourcompany.gymgestion" },
    "android": { "package": "com.yourcompany.gymgestion" }
  }
}
```

Invite email from API uses link that opens the native app (or App Store if not installed — deferred deep link optional).

### 6.6 UI rebuild guidelines

- Design for **thumb reach** and **one-handed** staff use at reception.
- Minimum tap target: 44×44 pt (Apple HIG).
- Support **FR + AR** with RTL layout for Arabic (`I18nManager.forceRTL` when locale is `ar`).
- Dark wallet card theme — keep existing brand (`#57cc99` / brand green).
- No web-only patterns: hover states, `window.print`, CSV download → use **share sheet** (`expo-sharing`) on mobile.

---

## 7. Authentication design

### 7.1 Why not cookies

React Native does not handle httpOnly cookies reliably across iOS/Android. Use **Bearer tokens**.

### 7.2 Token strategy

| Token | Lifetime | Storage |
|-------|----------|---------|
| Access token | 15–60 min | Memory + SecureStore (optional cache) |
| Refresh token | 30 days | SecureStore only |

**Staff JWT payload:**
```ts
{ sub: userId, gymId, role, type: "staff", name, email }
```

**Member JWT payload:**
```ts
{ sub: memberId, gymId, type: "member", name, email }
```

Use **separate secrets** (current `SESSION_SECRET` / `MEMBER_SESSION_SECRET`).

### 7.3 Mobile auth flow

```
Login screen → POST /auth/staff/login
            → store refreshToken in SecureStore
            → keep accessToken in memory
            → TanStack Query with auth interceptor
            → on 401: POST /auth/staff/refresh → retry once
            → on refresh fail: logout → login screen
```

### 7.4 Logout

- `POST /auth/staff/logout` — invalidate refresh token server-side (add `RefreshToken` table or token blocklist).
- Clear SecureStore locally.

---

## 8. Feature parity matrix

| Feature | Web today | API | Mobile screen | Priority |
|---------|-----------|-----|---------------|----------|
| Staff login | ✅ | Phase 0 | `(auth)/login` | P0 |
| QR check-in | ✅ | Phase 1 | `(staff)/scan` | P0 |
| Manual check-in | ✅ | Phase 1 | `(staff)/manual` | P0 |
| RBAC staff vs admin | ✅ | Phase 0 | layouts | P0 |
| Members list + filters | ✅ | Phase 2 | `(admin)/members` | P0 |
| Create / edit member | ✅ | Phase 2 | members/new, [id] | P0 |
| Renew / delete member | ✅ | Phase 2 | member detail | P1 |
| Dashboard stats | ✅ | Phase 2 | `(admin)/dashboard` | P1 |
| Attendance | ✅ | Phase 2 | `(admin)/attendance` | P1 |
| Staff management | ✅ | Phase 3 | `(admin)/staff` | P1 |
| Settings | ✅ | Phase 3 | `(admin)/settings` | P1 |
| Member wallet + QR | ✅ | Phase 3 | `(member)/*` | P1 |
| Invite + set password | ✅ | Phase 3 | deep link + form | P1 |
| Resend / disable invite | ✅ | Phase 3 | member detail | P2 |
| Export CSV | ✅ | Phase 3 | share sheet | P2 |
| WhatsApp deep link | ✅ | Phase 2 | `Linking.openURL` | P2 |
| Language switch FR/AR | ✅ | Phase 1 | settings / header | P1 |
| Legal privacy/terms | ✅ | Phase 4 | WebView or in-app | P0 (stores) |

---

## 9. Apple App Store compliance

This app **must not** be rejected as a thin web wrapper (Guideline **4.2 Minimum Functionality**). A full React Native rebuild with native camera, navigation, and SecureStore satisfies this **if** the app feels complete and native.

### 9.1 Guideline 4.2 — Minimum functionality

| Requirement | How we comply |
|-------------|----------------|
| More than a repackaged website | Native RN screens, native camera QR, haptics, offline-aware loading states |
| Useful on its own | Full check-in + member management without visiting a browser |
| Not just marketing | Operational tool for gym staff daily use |

**Do not:** ship a WebView pointing at your Next.js URL.

### 9.2 Guideline 5.1.1 — Privacy / data collection

| Requirement | Action |
|-------------|--------|
| Privacy Policy URL | Required in App Store Connect — host at stable HTTPS URL (`/privacy` on API or static site) |
| Data collected | Name, email, phone, gym attendance, credentials — declare in **App Privacy** questionnaire |
| Purpose strings | See §9.4 — every sensitive API needs `Info.plist` usage description |
| Account deletion | Members have accounts → provide **in-app account deletion** or clear instructions + API endpoint `DELETE /auth/member/me` or contact gym admin flow (document in review notes) |

### 9.3 Sign in with Apple

**Required only if** you offer third-party social login (Google, Facebook, etc.).

Email + password only → **Sign in with Apple not required**.

If you add Google Sign-In later → you **must** add Sign in with Apple too.

### 9.4 Required `Info.plist` usage descriptions

Add to `apps/mobile/app.json` → `ios.infoPlist`:

| Key | French example (App Review reads English too — provide both or English) |
|-----|------------------------------------------------------------------------|
| `NSCameraUsageDescription` | `Gym Gestion utilise la caméra pour scanner les codes QR des membres lors du check-in.` |
| `NSPhotoLibraryAddUsageDescription` | Only if saving QR to photos — `Enregistrer la carte membre dans vos photos.` |

**Do not** request camera permission on app launch — only when opening Scan.

### 9.5 Privacy Manifest (`PrivacyInfo.xcprivacy`)

Apple requires privacy manifests for apps using certain APIs. With Expo SDK 52+, configure via `expo-privacy-manifest` or EAS defaults. Declare:

- UserDefaults / SecureStore access reasons
- No tracking (`NSPrivacyTracking`: false) unless you add analytics

### 9.6 App Tracking Transparency (ATT)

If you **do not** use IDFA or cross-app tracking → no ATT prompt needed. Declare “No” for tracking in App Store Connect.

### 9.7 Metadata & review assets

| Asset | Spec |
|-------|------|
| App icon | 1024×1024 PNG, no alpha |
| Screenshots | 6.7" and 6.1" iPhone — show scan, members, wallet |
| Description | Clearly state: gym management, check-in, subscriptions |
| Review notes | Provide demo admin + staff + member test accounts |
| Age rating | 4+ (business app, no objectionable content) |

### 9.8 Demo accounts for App Review

Create non-expiring seed accounts on staging API:

```
Admin:  reviewer-admin@gym.local  / ReviewPass123!
Staff:  reviewer-staff@gym.local  / ReviewPass123!
Member: reviewer-member@gym.local / ReviewPass123!
```

Include in **App Review Information** with API base URL.

### 9.9 Human Interface Guidelines (HIG)

- Support **Dynamic Type** (accessible font scaling) on core screens.
- Support **Safe Area** / notch (`SafeAreaView`, `react-native-safe-area-context`).
- **Dark Mode** — wallet card is dark; admin screens should respect system theme or force light (document choice).
- **RTL** — required for Arabic locale.

### 9.10 In-App Purchase

Gym subscriptions are managed **outside** the app (cash, bank, in person). Do **not** sell digital subscriptions through the app without Apple IAP (Guideline 3.1.1). Your app only **tracks** memberships — OK.

---

## 10. Google Play compliance

| Requirement | Action |
|-------------|--------|
| Privacy policy URL | Same as iOS |
| Data safety form | Declare name, email, phone, fitness/activity (check-ins) |
| Target API level | Meet current Play target SDK (Expo handles via EAS) |
| Camera permission | `AndroidManifest` — `CAMERA` with rationale in UI |
| App signing | Play App Signing via EAS Submit |
| Content rating | IARC questionnaire — business/productivity |

**Deep links:** intent filter for `gymgestion://` and optional App Links.

---

## 11. Phased delivery plan

### Phase 0 — Foundation (Week 1)

**API**
- [ ] Create `apps/api` with Hono + Prisma
- [ ] Move `packages/shared` (Zod validations, types)
- [ ] Implement `GET /health`, `POST /auth/staff/login`, `POST /auth/staff/refresh`, `GET /auth/staff/me`
- [ ] JWT middleware + RBAC helper
- [ ] Rate limiting on login
- [ ] OpenAPI spec checked into `docs/openapi.yaml`

**Mobile**
- [ ] `npx create-expo-app apps/mobile` with Expo Router
- [ ] Login screen + token storage
- [ ] API client with TanStack Query
- [ ] Role-based redirect after login

**Infra**
- [ ] Monorepo workspace config
- [ ] CI: lint + test API + typecheck mobile
- [ ] Staging API on Railway/Render

**Exit criteria:** Staff can log in from iOS Simulator and Android Emulator.

---

### Phase 1 — Staff MVP (Weeks 2–3)

**API**
- [ ] `POST /checkin`, `GET /members/search`
- [ ] `POST /auth/member/login`, `GET /auth/member/me`

**Mobile**
- [ ] `(staff)/scan` — native QR + feedback overlay
- [ ] `(staff)/manual` — search debounce + check-in button
- [ ] Camera permission flow (contextual)
- [ ] FR i18n wired (AR in Phase 3)

**Tests**
- [ ] API integration tests (port from `tests/integration/`)
- [ ] Maestro flow: staff login → manual check-in

**Exit criteria:** Reception staff can check in members via QR and search on a real device.

---

### Phase 2 — Admin core (Weeks 4–5)

**API**
- [ ] Full `/members` CRUD + renew + filters
- [ ] `GET /dashboard`, `GET /attendance`
- [ ] Admin RBAC on all routes

**Mobile**
- [ ] Dashboard with stats cards + weekly chart (`react-native-chart-kit` or SVG)
- [ ] Members list, detail, create, edit
- [ ] Attendance screen
- [ ] WhatsApp via `Linking.openURL`

**Exit criteria:** Admin manages members and views dashboard entirely from the app.

---

### Phase 3 — Admin + member (Weeks 6–7)

**API**
- [ ] `/staff`, `/settings/*`
- [ ] Member wallet + QR endpoints
- [ ] Invite: `GET /auth/member/invite/:token`, `POST /auth/member/set-password`
- [ ] `POST /members/:id/invite/resend|disable`
- [ ] `GET /members/export`

**Mobile**
- [ ] Staff management screen
- [ ] Settings (gym info, password, language, card theme)
- [ ] Member wallet + QR screens
- [ ] Deep link handler for invites
- [ ] AR locale + RTL layout

**Exit criteria:** Full parity with current web app for one gym.

---

### Phase 4 — Store readiness (Weeks 8–9)

- [ ] App icons, splash screen, store screenshots
- [ ] Privacy policy + terms linked and loading in production
- [ ] Account deletion path for members (API + UI or documented process)
- [ ] `PrivacyInfo.xcprivacy` / Expo privacy config
- [ ] EAS Build → TestFlight internal testing
- [ ] EAS Build → Play Internal testing
- [ ] Fix TestFlight feedback
- [ ] Submit App Store + Play Store
- [ ] Deprecation plan for Next.js web (optional — keep for desktop admin)

**Exit criteria:** App approved on both stores.

---

## 12. Testing strategy

| Layer | Tool | Scope |
|-------|------|-------|
| API unit | Vitest | services, validations, auth |
| API integration | Vitest + test Postgres | all routes, RBAC |
| Mobile unit | Jest | utils, parsers, hooks |
| Mobile E2E | **Maestro** | login, scan (mock QR), members CRUD |
| Contract | OpenAPI + optional Zod client gen | API ↔ mobile type safety |
| Regression | Port existing Playwright scenarios to Maestro scripts | behavior parity |

Keep `tests/` in repo root; add `apps/api/tests/` and `apps/mobile/.maestro/`.

---

## 13. Deployment & operations

### API

| Env | Host | DB |
|-----|------|-----|
| Staging | Railway / Render | `gym_staging` |
| Production | Railway / Render / Fly | `gym_production` |

**Deploy steps:**
```bash
npx prisma migrate deploy
npm run start --workspace=api
```

### Mobile

| Step | Tool |
|------|------|
| iOS build | EAS Build (`eas build -p ios`) |
| Android build | EAS Build (`eas build -p android`) |
| TestFlight | EAS Submit |
| Play Console | EAS Submit |
| OTA JS fixes | EAS Update (no native changes) |

### Environment variables (API)

```env
DATABASE_URL=
STAFF_JWT_SECRET=
MEMBER_JWT_SECRET=
REFRESH_TOKEN_SECRET=
RESEND_API_KEY=
EMAIL_FROM=
APP_URL=                    # for invite links in email
API_PUBLIC_URL=
CORS_ORIGINS=               # not needed for pure mobile; set if web admin remains
```

### Mobile env

```env
EXPO_PUBLIC_API_URL=https://api.yourhost.com/v1
```

### Costs (estimate)

| Item | Cost |
|------|------|
| Apple Developer | $99/year |
| Google Play | $25 one-time |
| API + DB hosting | $10–30/month |
| EAS (Expo) | Free tier often sufficient initially |
| Custom domain | Optional ~$12/year |

---

## 14. Risks & mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Apple rejects for incomplete app | Delay launch | Phase 1 MVP on TestFlight early; iterate |
| Camera QR unreliable on old Android | Bad UX | Test device matrix; fallback manual search |
| 8–9 week estimate slips | Timeline | Ship staff-only v1 to stores first, admin in v1.1 |
| Duplicate logic API vs old web | Bugs | `packages/shared` + delete web actions after API cutover |
| Member account deletion unclear | Rejection | Add `DELETE /auth/member/account` in Phase 4 |
| Arabic RTL layout bugs | UX | Test AR from Phase 3, not last week |
| Refresh token theft | Security | SecureStore, short access TTL, HTTPS only |

---

## 15. Definition of done

The migration is **complete** when:

- [ ] iOS app live on App Store (approved)
- [ ] Android app live on Google Play (approved)
- [ ] REST API serves all endpoints in §5 with integration tests green
- [ ] No WebView wrapper used for core flows
- [ ] Apple privacy strings, privacy policy, demo accounts provided
- [ ] Staff can QR check-in using native camera
- [ ] Admin can manage members without the web app
- [ ] Member can view wallet QR and complete invite flow
- [ ] FR + AR supported
- [ ] Staging + production environments documented
- [ ] Old Next.js web marked deprecated or limited to desktop-only (team decision)

---

## 16. Appendix: reusable code from current repo

### Move to `packages/shared`

| File | Notes |
|------|-------|
| `src/lib/validations.ts` | Zod schemas — unchanged |
| `src/lib/i18n.ts` | Translation strings |
| `src/lib/member-qr.ts` | QR payload format |
| `src/lib/subscription.ts` | `daysUntil`, `extendSubscription`, etc. |
| `src/lib/auth.ts` | `getMemberStatus`, role helpers |

### Port to `apps/api/src/services`

| File | Notes |
|------|-------|
| `src/lib/checkin.ts` | `performCheckin`, `syncMemberStatuses` |
| `src/lib/dashboard.ts` | `getDashboardData` |
| `src/lib/attendance.ts` | `getAttendanceData` |
| `src/lib/member-invite.ts` | `issueMemberInvite` |
| `src/lib/email.ts` | Resend integration |
| `src/lib/format.ts` | `formatCurrency`, `normalizePhone` |
| `src/lib/member-auth.ts` | `canMemberLogin`, filters |

### Retire after cutover

| Path | Reason |
|------|--------|
| `src/app/actions/*` | Replaced by REST |
| `src/app/(app)/**/page.tsx` | Replaced by mobile screens |
| `src/proxy.ts` | RBAC in API + mobile layouts |
| `src/lib/session.ts` (cookie helpers) | Replaced by token service |
| `src/components/**` (web) | Rebuilt in RN |

### Keep temporarily

| Path | Reason |
|------|--------|
| `prisma/` | Source of truth for DB |
| `tests/` | Adapt and extend |
| `e2e/` | Reference until Maestro parity |
| `src/app/api/*` | Reference while building new API routes |

---

## Next step

Start **Phase 0**: scaffold `apps/api`, `apps/mobile`, and `packages/shared`, then implement staff auth end-to-end.

```bash
# Suggested first commands (when implementation begins)
mkdir -p apps/api apps/mobile packages/shared
# Initialize workspaces in root package.json
# npx create-expo-app apps/mobile --template tabs
```

---

*Document owner: Gym Gestion team*  
*Review this plan after Phase 1 TestFlight feedback and adjust timelines.*
