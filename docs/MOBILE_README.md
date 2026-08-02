# Gym Gestion — Mobile Migration

Native iOS + Android app via **Expo React Native** and standalone **Hono REST API**.

## Structure

```
apps/api/      REST API (Hono + Prisma + JWT)
apps/mobile/   Expo React Native app
packages/shared/  Zod validations, i18n, business helpers
prisma/        Shared database schema
src/           Legacy Next.js web (unchanged)
```

## Quick start

### 1. Database

```bash
npm install
npx prisma migrate deploy
npm run db:seed
```

### 2. API (port 4000)

```bash
npm run dev:api
# Health: http://localhost:4000/v1/health
```

### 3. Mobile

```bash
npm run dev:mobile
# Press i for iOS simulator, a for Android emulator
```

For physical devices, set `EXPO_PUBLIC_API_URL` in `apps/mobile/.env` to your machine's LAN IP, e.g. `http://192.168.1.10:4000/v1`.

## Demo accounts (after seed)

| Role   | Email            | Password  |
|--------|------------------|-----------|
| Admin  | admin@gym.local  | admin123  |
| Staff  | staff@gym.local  | staff123  |
| Member | (see seed)       | member123 |

## Scripts

| Command           | Description              |
|-------------------|--------------------------|
| `npm run dev:api` | Start REST API           |
| `npm run dev:mobile` | Start Expo dev server |
| `npm run api`     | Alias for dev:api        |
| `npm run mobile`  | Alias for dev:mobile     |

## Store builds (Phase 4)

```bash
cd apps/mobile
npx eas build -p ios
npx eas build -p android
```

See `docs/MOBILE_MIGRATION_PLAN.md` for full roadmap.

## Phase A parity (2026-08-01)

Mobile admin now matches web for **Charges** (utility bills) and **Boissons** (drinks): CRUD, sales, plan-gated 403, and dashboard month totals when the gym plan includes the feature.
