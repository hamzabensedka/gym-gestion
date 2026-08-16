# Mobile Parity Phase C — Core Leftovers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin can edit members and disable app access on Expo; admin and staff can open a full-screen desk QR; members CSV share respects search `q` and access CSV is named `access-allowed.csv`.

**Architecture:** Mobile-first on existing Hono routes. Add `inviteAccessLabel` in `@gym/shared` and `memberExportSearchWhere` in the API. Convert member `[id].tsx` files into folders so edit (admin) and qr (admin+staff) screens can nest. No new domain tables. Web Server Actions stay unchanged.

**Tech Stack:** Hono, Prisma, Expo Router, React Query, `react-native-qrcode-svg`, `@gym/shared`, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-16-mobile-parity-phase-c-core-leftovers-design.md`

## Global Constraints

- Talk to Hono `/v1` only from mobile — never Next Server Actions.
- Admin-only: edit, PATCH, disable access, CSV/access export. Staff: desk QR + resend. Same RBAC as web.
- Reuse existing i18n keys only: `detail.editTitle`, `detail.qrTitle`, `detail.cardValid`, `common.save`, `members.appAccess`, `members.appAccessHint`, `members.disableAccess`, `members.disableConfirm`, `members.inviteStatus.*`, `form.plan` / `form.plan1` / `form.plan3` / `form.plan6` / `form.plan12`, `members.sendInvite`.
- Disable button only when `canAdmin && inviteStatus === "ACTIVE"`; confirm with existing `ConfirmDialog` tone `critical`.
- Desk QR uses `GET /v1/members/:id/qr`, not `/member/qr`. Show QR even if expired. No print/share.
- Members CSV columns stay as Hono ships them; only add `q` filter. Access share filename is `access-allowed.csv`.
- Date fields on edit are `yyyy-MM-dd` slices (`subscriptionStart.slice(0, 10)`).
- Send-invite checkbox on edit when `inviteStatus !== "ACTIVE"`, default unchecked. Create still auto-sends when email is non-empty.
- Plan chips `PLAN_MONTHS` `[1, 3, 6, 12]` on create and edit; chips set end from start via `addMonths`.
- Badge field only when settings `features` includes `badge_numbers`.
- Do not implement Phase D (kiosk / onboarding).
- Do not commit untracked leftovers: `.superpowers/`, `scripts/prod-migrate.mjs`, date/month-picker UI files.
- Prefer small commits; do not amend unless the user asks. Work on `feat/mobile-parity-phase-c`.
- TDD for new helpers. Run `npx vitest run <file>` (or `npm test -- <file>`). Full `npm test` before each commit.
- Author commits as the repo already does; one-line messages matching `feat(api):` / `feat(mobile):` / `docs:`.

## File map

| File | Responsibility |
|------|----------------|
| `packages/shared/src/invite-access.ts` | `inviteAccessLabel` |
| `packages/shared/package.json` | Export `./invite-access` |
| `packages/shared/src/index.ts` | Re-export |
| `tests/unit/invite-access.test.ts` | Label cases |
| `apps/api/src/lib/member-export-search.ts` | `memberExportSearchWhere` |
| `apps/api/src/routes/app.ts` | Spread `q` into members export |
| `tests/unit/member-export-search.test.ts` | Empty vs non-empty `q` |
| `apps/mobile/lib/share-csv.ts` | Unchanged helper |
| `apps/mobile/screens/members-list-screen.tsx` | Pass `q`; `access-allowed.csv` |
| `apps/mobile/components/member-qr-view.tsx` | Shared SVG QR wrap |
| `apps/mobile/app/(member)/card.tsx` | Use `MemberQrView` |
| `apps/mobile/app/(admin)/members/[id]/index.tsx` | From `[id].tsx` |
| `apps/mobile/app/(admin)/members/[id]/qr.tsx` | Desk QR |
| `apps/mobile/app/(admin)/members/[id]/edit.tsx` | Edit form |
| `apps/mobile/app/(admin)/members/_layout.tsx` | Register `edit` modal + `qr` |
| `apps/mobile/app/(staff)/members/_layout.tsx` | Stack like admin |
| `apps/mobile/app/(staff)/members/[id]/index.tsx` | From `[id].tsx` |
| `apps/mobile/app/(staff)/members/[id]/qr.tsx` | Desk QR |
| `apps/mobile/screens/member-detail-screen.tsx` | Edit + QR buttons, app-access card, disable |
| `apps/mobile/screens/member-qr-screen.tsx` | Shared desk QR screen |
| `apps/mobile/components/plan-month-chips.tsx` | 1/3/6/12 chips |
| `apps/mobile/app/(admin)/members/new.tsx` | Plan chips |
| `docs/ARCHITECTURE_EVOLUTION.md` | Note Phase C |
| `docs/superpowers/specs/2026-08-01-mobile-web-parity-design.md` | Mark Phase C done when shipped |

---

### Task 1: Shared `inviteAccessLabel`

**Files:**
- Create: `packages/shared/src/invite-access.ts`
- Modify: `packages/shared/package.json` (add `"./invite-access": "./src/invite-access.ts"`)
- Modify: `packages/shared/src/index.ts` (add `export * from "./invite-access";`)
- Test: `tests/unit/invite-access.test.ts`

**Interfaces:**
- Consumes: `MemberInviteStatus` from `packages/shared/src/member-auth.ts`; `TranslationKey` from `packages/shared/src/i18n.ts`
- Produces: `inviteAccessLabel({ inviteStatus, inviteExpiresAt, now }): TranslationKey`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { inviteAccessLabel } from "@gym/shared/invite-access";

describe("inviteAccessLabel", () => {
  const now = new Date("2026-08-16T12:00:00.000Z");

  it("returns active for ACTIVE", () => {
    expect(
      inviteAccessLabel({ inviteStatus: "ACTIVE", inviteExpiresAt: null, now }),
    ).toBe("members.inviteStatus.active");
  });

  it("returns disabled for DISABLED", () => {
    expect(
      inviteAccessLabel({ inviteStatus: "DISABLED", inviteExpiresAt: null, now }),
    ).toBe("members.inviteStatus.disabled");
  });

  it("returns expired for PENDING past inviteExpiresAt", () => {
    expect(
      inviteAccessLabel({
        inviteStatus: "PENDING",
        inviteExpiresAt: "2026-08-01T00:00:00.000Z",
        now,
      }),
    ).toBe("members.inviteStatus.expired");
  });

  it("returns pending for PENDING still valid", () => {
    expect(
      inviteAccessLabel({
        inviteStatus: "PENDING",
        inviteExpiresAt: "2026-08-20T00:00:00.000Z",
        now,
      }),
    ).toBe("members.inviteStatus.pending");
  });

  it("returns none when inviteStatus is null", () => {
    expect(
      inviteAccessLabel({ inviteStatus: null, inviteExpiresAt: null, now }),
    ).toBe("members.inviteStatus.none");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/invite-access.test.ts`
Expected: FAIL (module not found / `inviteAccessLabel` not exported)

- [ ] **Step 3: Write minimal implementation**

```ts
import { MemberInviteStatus } from "./member-auth";
import type { TranslationKey } from "./i18n";

export function inviteAccessLabel(input: {
  inviteStatus: string | null;
  inviteExpiresAt: Date | string | null;
  now?: Date;
}): TranslationKey {
  const now = input.now ?? new Date();
  const expiresAt = input.inviteExpiresAt
    ? input.inviteExpiresAt instanceof Date
      ? input.inviteExpiresAt
      : new Date(input.inviteExpiresAt)
    : null;
  const expired =
    input.inviteStatus === MemberInviteStatus.PENDING &&
    expiresAt !== null &&
    expiresAt < now;
  if (input.inviteStatus === MemberInviteStatus.ACTIVE) {
    return "members.inviteStatus.active";
  }
  if (input.inviteStatus === MemberInviteStatus.DISABLED) {
    return "members.inviteStatus.disabled";
  }
  if (expired) return "members.inviteStatus.expired";
  if (input.inviteStatus === MemberInviteStatus.PENDING) {
    return "members.inviteStatus.pending";
  }
  return "members.inviteStatus.none";
}
```

Add export in `package.json` and `index.ts` as listed above.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/invite-access.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/invite-access.ts packages/shared/package.json packages/shared/src/index.ts tests/unit/invite-access.test.ts
git commit -m "feat(shared): add inviteAccessLabel helper"
```

---

### Task 2: Members export `q` filter

**Files:**
- Create: `apps/api/src/lib/member-export-search.ts`
- Modify: `apps/api/src/routes/app.ts` (`membersRoutes.get("/export")` — the `findMany` `where`)
- Test: `tests/unit/member-export-search.test.ts`

**Interfaces:**
- Consumes: none
- Produces: `memberExportSearchWhere(q: string)` returning `{}` or `{ OR: [{ fullName: { contains: string; mode: "insensitive" } }, { phone: { contains: string } }] }`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { memberExportSearchWhere } from "../../apps/api/src/lib/member-export-search";

describe("memberExportSearchWhere", () => {
  it("returns empty object for blank q", () => {
    expect(memberExportSearchWhere("")).toEqual({});
    expect(memberExportSearchWhere("   ")).toEqual({});
  });

  it("filters name or phone when q is set", () => {
    expect(memberExportSearchWhere("  ali  ")).toEqual({
      OR: [
        { fullName: { contains: "ali", mode: "insensitive" } },
        { phone: { contains: "ali" } },
      ],
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/member-export-search.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Write helper and wire the route**

```ts
export function memberExportSearchWhere(q: string): {
  OR?: Array<
    | { fullName: { contains: string; mode: "insensitive" } }
    | { phone: { contains: string } }
  >;
} {
  const trimmed = q.trim();
  if (!trimmed) return {};
  return {
    OR: [
      { fullName: { contains: trimmed, mode: "insensitive" } },
      { phone: { contains: trimmed } },
    ],
  };
}
```

In `apps/api/src/routes/app.ts`, import `memberExportSearchWhere` and change the export handler `findMany` where from:

```ts
where: withOnboardedMemberFilter({ gymId: staff.gymId }),
```

to:

```ts
const q = c.req.query("q") ?? "";
where: withOnboardedMemberFilter({
  gymId: staff.gymId,
  ...memberExportSearchWhere(q),
}),
```

Keep CSV columns and `filename="members.csv"` unchanged.

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/unit/member-export-search.test.ts`
Expected: PASS. Then `npm test` — existing unit tests still pass.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/lib/member-export-search.ts apps/api/src/routes/app.ts tests/unit/member-export-search.test.ts
git commit -m "feat(api): filter members CSV export by search q"
```

---

### Task 3: Mobile export polish

**Files:**
- Modify: `apps/mobile/screens/members-list-screen.tsx` (`exportMembers` and `exportAccess`)

**Interfaces:**
- Consumes: Task 2 `GET /v1/members/export?q=`
- Produces: ShareSheet `members.csv` with current search; `access-allowed.csv`

- [ ] **Step 1: Change exportMembers to pass q**

Replace the members export call:

```ts
const csv = await apiText("/members/export");
```

with:

```ts
const path = q.trim()
  ? `/members/export?q=${encodeURIComponent(q.trim())}`
  : "/members/export";
const csv = await apiText(path);
```

Replace access filename:

```ts
await shareCsv("access-allowed.csv", csv);
```

Leave dashboard payments export unchanged.

There is no Expo unit harness for this screen; verify by reading the two call sites after the edit. Run `npm test` to confirm no regression.

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/screens/members-list-screen.tsx
git commit -m "feat(mobile): pass search q and name access CSV"
```

---

### Task 4: Desk QR screens

**Files:**
- Create: `apps/mobile/components/member-qr-view.tsx`
- Create: `apps/mobile/screens/member-qr-screen.tsx`
- Modify: `apps/mobile/app/(member)/card.tsx` (use `MemberQrView`)
- Modify: `apps/mobile/app/(admin)/members/_layout.tsx` (add `[id]/qr`)
- Create: `apps/mobile/app/(admin)/members/[id]/index.tsx` (move from `[id].tsx`)
- Create: `apps/mobile/app/(admin)/members/[id]/qr.tsx`
- Delete: `apps/mobile/app/(admin)/members/[id].tsx`
- Create: `apps/mobile/app/(staff)/members/_layout.tsx`
- Create: `apps/mobile/app/(staff)/members/[id]/index.tsx` (move from `[id].tsx`)
- Create: `apps/mobile/app/(staff)/members/[id]/qr.tsx`
- Delete: `apps/mobile/app/(staff)/members/[id].tsx`
- Modify: `apps/mobile/screens/member-detail-screen.tsx` (QR button for admin and staff)

**Interfaces:**
- Consumes: `GET /v1/members/:id/qr` → `{ qrData: string; memberName: string }`; `useQuery(["member", id])` for dates
- Produces: `MemberQrView({ value, size?, expiredBanner? })`; `MemberQrScreen` used by both role routes; detail navigates to `/${role}/members/${id}/qr`

- [ ] **Step 1: Add MemberQrView**

```tsx
import { StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { colors, spacing } from "@/lib/theme";

export function MemberQrView({
  value,
  size = 240,
  expiredBanner,
}: {
  value: string;
  size?: number;
  expiredBanner?: string | null;
}) {
  return (
    <>
      {expiredBanner ? <Text style={styles.expired}>{expiredBanner}</Text> : null}
      <View style={styles.qrWrap}>
        <QRCode value={value} size={size} backgroundColor="#ffffff" color="#000000" />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  expired: { color: colors.error, marginBottom: spacing.md, fontWeight: "500", textAlign: "center" },
  qrWrap: {
    padding: spacing.lg,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
```

In `(member)/card.tsx`, replace the expired `<Text>` + `<View style={styles.qrWrap}><QRCode .../></View>` with:

```tsx
<MemberQrView
  value={data.qrData}
  expiredBanner={!data.isActive ? t("member.qr.expiredBanner") : null}
/>
```

Remove unused `QRCode` import from card if fully replaced. Keep back button and title.

- [ ] **Step 2: Shared desk QR screen**

`apps/mobile/screens/member-qr-screen.tsx`:

```tsx
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { FeatherIcon } from "@/components/icons";
import { MemberQrView } from "@/components/member-qr-view";
import { useI18n } from "@/lib/i18n-context";
import { apiFetch } from "@/lib/api";
import { colors, spacing } from "@/lib/theme";
import { formatDate } from "@gym/shared/format";

type QrPayload = { qrData: string; memberName: string };
type MemberRow = { fullName: string; subscriptionEnd: string };

export function MemberQrScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, locale } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const qrQuery = useQuery({
    queryKey: ["member-qr", id],
    queryFn: () => apiFetch<QrPayload>(`/members/${id}/qr`),
    enabled: Boolean(id),
  });
  const memberQuery = useQuery({
    queryKey: ["member", id],
    queryFn: () => apiFetch<MemberRow>(`/members/${id}`),
    enabled: Boolean(id),
  });

  if (qrQuery.isLoading || !qrQuery.data) {
    return (
      <View style={[styles.safe, { paddingTop: insets.top }]}>
        <Text style={styles.loading}>{t("common.loading")}</Text>
      </View>
    );
  }

  if (qrQuery.isError) {
    return (
      <View style={[styles.safe, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <FeatherIcon name="arrow-left" color={colors.foreground} size={16} />
          <Text style={styles.backText}>{t("common.back")}</Text>
        </Pressable>
        <Text style={styles.error}>{qrQuery.error.message}</Text>
      </View>
    );
  }

  const name = memberQuery.data?.fullName ?? qrQuery.data.memberName;
  const validUntil = memberQuery.data?.subscriptionEnd
    ? formatDate(memberQuery.data.subscriptionEnd, locale)
    : null;

  return (
    <View style={styles.safe}>
      <View style={[styles.backWrap, { paddingTop: insets.top + 16 }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.85 }]}
        >
          <FeatherIcon name="arrow-left" color={colors.foreground} size={16} />
          <Text style={styles.backText}>{t("common.back")}</Text>
        </Pressable>
      </View>
      <View style={styles.container}>
        <Text style={styles.title}>{t("detail.qrTitle")}</Text>
        <MemberQrView value={qrQuery.data.qrData} />
        <Text style={styles.name}>{name}</Text>
        {validUntil ? (
          <Text style={styles.hint}>
            {t("detail.cardValid")} {validUntil}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  backWrap: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, paddingHorizontal: 20 },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  backText: { fontSize: 14, fontWeight: "500", color: colors.foreground },
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  title: { fontSize: 22, fontWeight: "700", color: colors.foreground, marginBottom: spacing.lg },
  name: { fontSize: 18, fontWeight: "700", color: colors.foreground, marginTop: spacing.md },
  hint: { fontSize: 14, color: colors.mutedForeground, marginTop: spacing.sm, textAlign: "center" },
  loading: { padding: spacing.lg, color: colors.mutedForeground },
  error: { padding: spacing.lg, color: colors.error },
});
```

Admin route `apps/mobile/app/(admin)/members/[id]/qr.tsx`:

```tsx
import { MemberQrScreen } from "@/screens/member-qr-screen";
export default function AdminMemberQrRoute() {
  return <MemberQrScreen />;
}
```

Staff route `apps/mobile/app/(staff)/members/[id]/qr.tsx` — same with `StaffMemberQrRoute`.

Move existing `[id].tsx` contents to `[id]/index.tsx` for both admin and staff (keep default export wrappers). Delete the old `[id].tsx` files so Expo does not conflict.

Admin `_layout.tsx` — add:

```tsx
<Stack.Screen name="[id]/qr" />
```

Staff `_layout.tsx` (new), copy admin members layout:

```tsx
import { Stack } from "expo-router";
import { colors } from "@/lib/theme";

export default function StaffMembersLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]/index" />
      <Stack.Screen name="[id]/qr" />
    </Stack>
  );
}
```

- [ ] **Step 3: QR button on detail**

In `MemberDetailScreen`, import `router` is already from expo-router. Add a full-width button (admin and staff) above the action row:

```tsx
<Button
  label={t("detail.qrTitle")}
  variant="secondary"
  onPress={() =>
    router.push(
      membersListRoute === "/(staff)/members"
        ? `/(staff)/members/${id}/qr`
        : `/(admin)/members/${id}/qr`,
    )
  }
/>
```

Use `id` from `useLocalSearchParams`. Hit area stays the existing Button (≥40px).

- [ ] **Step 4: Verify**

Run `npm test`. Confirm old `[id].tsx` files are gone and `[id]/index.tsx` + `[id]/qr.tsx` exist for both roles.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/components/member-qr-view.tsx apps/mobile/screens/member-qr-screen.tsx apps/mobile/screens/member-detail-screen.tsx apps/mobile/app/(member)/card.tsx apps/mobile/app/(admin)/members apps/mobile/app/(staff)/members
git commit -m "feat(mobile): desk member QR full-screen for admin and staff"
```

---

### Task 5: App-access card + invite disable

**Files:**
- Modify: `apps/mobile/screens/member-detail-screen.tsx`

**Interfaces:**
- Consumes: Task 1 `inviteAccessLabel`; `POST /v1/members/:id/invite/disable`; existing `ConfirmDialog`
- Produces: app-access card when email present; disable only for admin + ACTIVE

- [ ] **Step 1: Extend MemberDetail type**

```ts
type MemberDetail = {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  status: string;
  frozenAt: string | null;
  frozenUntil: string | null;
  subscriptionStart: string;
  subscriptionEnd: string;
  monthlyFee: string;
  notes: string | null;
  inviteStatus: string | null;
  inviteExpiresAt: string | null;
  badgeNumber: string | null;
  checkins: Array<{ id: string; timestamp: string }>;
};
```

- [ ] **Step 2: Disable mutation + confirm**

```ts
import { inviteAccessLabel } from "@gym/shared/invite-access";

const [disableOpen, setDisableOpen] = useState(false);

const disableAccess = useMutation({
  mutationFn: () =>
    apiFetch(`/members/${id}/invite/disable`, { method: "POST", body: "{}" }),
  onSuccess: () => {
    setDisableOpen(false);
    qc.invalidateQueries({ queryKey: ["member", id] });
    setNotice({ title: t("members.disableAccess"), tone: "success" });
  },
  onError: (e: Error) =>
    setNotice({ title: e.message || t("common.error"), tone: "critical" }),
});
```

After the profile `Card` (phone/email/fee), when `member.email` is set:

```tsx
<Card>
  <Text style={styles.section}>{t("members.appAccess")}</Text>
  <Text style={styles.muted}>{member.email}</Text>
  <View style={styles.badgeWrap}>
    <Badge
      label={t(
        inviteAccessLabel({
          inviteStatus: member.inviteStatus,
          inviteExpiresAt: member.inviteExpiresAt,
        }),
      )}
      tone={
        member.inviteStatus === "ACTIVE"
          ? "success"
          : member.inviteStatus === "DISABLED"
            ? "danger"
            : "warning"
      }
    />
  </View>
  <Text style={styles.muted}>{t("members.appAccessHint")}</Text>
  {canAdmin && member.inviteStatus === "ACTIVE" ? (
    <Button
      label={t("members.disableAccess")}
      variant="secondary"
      onPress={() => setDisableOpen(true)}
    />
  ) : null}
</Card>
```

Add confirm dialog next to the delete dialog:

```tsx
{canAdmin ? (
  <ConfirmDialog
    visible={disableOpen}
    onClose={() => setDisableOpen(false)}
    tone="critical"
    title={t("members.disableAccess")}
    description={t("members.disableConfirm")}
    confirmLabel={t("members.disableAccess")}
    cancelLabel={t("common.cancel")}
    loading={disableAccess.isPending}
    onConfirm={() => disableAccess.mutate()}
  />
) : null}
```

Do not show disable for staff. Keep resend in the existing icon row.

- [ ] **Step 3: Run `npm test`** then commit

```bash
git add apps/mobile/screens/member-detail-screen.tsx
git commit -m "feat(mobile): disable member app access from detail"
```

---

### Task 6: Admin edit screen + plan chips on create

**Files:**
- Create: `apps/mobile/components/plan-month-chips.tsx`
- Create: `apps/mobile/app/(admin)/members/[id]/edit.tsx`
- Modify: `apps/mobile/app/(admin)/members/_layout.tsx` (modal for `[id]/edit`)
- Modify: `apps/mobile/screens/member-detail-screen.tsx` (Edit button, admin only)
- Modify: `apps/mobile/app/(admin)/members/new.tsx` (plan chips)

**Interfaces:**
- Consumes: `PATCH /v1/members/:id`; `PLAN_MONTHS` from `@gym/shared/subscription`; `GET /settings` features
- Produces: `PlanMonthChips({ start, onPick, activePlan })`; edit route `/(admin)/members/[id]/edit`

- [ ] **Step 1: PlanMonthChips**

```tsx
import { Pressable, StyleSheet, Text, View } from "react-native";
import { addMonths, format } from "date-fns";
import { PLAN_MONTHS } from "@gym/shared/subscription";
import { useI18n } from "@/lib/i18n-context";
import { colors, radius, spacing } from "@/lib/theme";
import type { TranslationKey } from "@gym/shared/i18n";

const planLabelKey: Record<(typeof PLAN_MONTHS)[number], TranslationKey> = {
  1: "form.plan1",
  3: "form.plan3",
  6: "form.plan6",
  12: "form.plan12",
};

export function PlanMonthChips({
  start,
  activePlan,
  onChangeEnd,
  onChangePlan,
}: {
  start: string;
  activePlan: number | null;
  onChangeEnd: (end: string) => void;
  onChangePlan: (months: number) => void;
}) {
  const { t } = useI18n();

  function applyPlan(months: (typeof PLAN_MONTHS)[number]) {
    const base = start ? new Date(`${start}T12:00:00`) : new Date();
    onChangeEnd(format(addMonths(base, months), "yyyy-MM-dd"));
    onChangePlan(months);
  }

  return (
    <View>
      <Text style={styles.label}>{t("form.plan")}</Text>
      <View style={styles.row}>
        {PLAN_MONTHS.map((months) => (
          <Pressable
            key={months}
            onPress={() => applyPlan(months)}
            style={[styles.chip, activePlan === months && styles.chipActive]}
          >
            <Text style={[styles.chipText, activePlan === months && styles.chipTextActive]}>
              {t(planLabelKey[months])}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, color: colors.textMuted, marginTop: spacing.sm, marginBottom: spacing.sm },
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md },
  chip: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    justifyContent: "center",
  },
  chipActive: { borderColor: colors.brand, backgroundColor: colors.brandMuted },
  chipText: { color: colors.textMuted, fontWeight: "600" },
  chipTextActive: { color: colors.brand },
});
```

- [ ] **Step 2: Edit screen**

`apps/mobile/app/(admin)/members/[id]/edit.tsx`:

```tsx
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n-context";
import { apiFetch } from "@/lib/api";
import { Button, Input, Screen, Title } from "@/components/ui";
import { PlanMonthChips } from "@/components/plan-month-chips";
import { NoticeDialog } from "@/components/confirm-dialog";
import { colors, spacing } from "@/lib/theme";

type SettingsSnapshot = { features: string[] };
type MemberRow = {
  fullName: string;
  phone: string;
  email: string | null;
  subscriptionStart: string;
  subscriptionEnd: string;
  monthlyFee: string;
  notes: string | null;
  inviteStatus: string | null;
  badgeNumber: string | null;
};

function ymd(value: string) {
  return value.slice(0, 10);
}

export default function EditMemberScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useI18n();
  const qc = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [badgeNumber, setBadgeNumber] = useState("");
  const [subscriptionStart, setSubscriptionStart] = useState("");
  const [subscriptionEnd, setSubscriptionEnd] = useState("");
  const [monthlyFee, setMonthlyFee] = useState("");
  const [notes, setNotes] = useState("");
  const [sendInvite, setSendInvite] = useState(false);
  const [activePlan, setActivePlan] = useState<number | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const { data: member, isLoading } = useQuery({
    queryKey: ["member", id],
    queryFn: () => apiFetch<MemberRow>(`/members/${id}`),
  });
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: () => apiFetch<SettingsSnapshot>("/settings"),
  });
  const showBadge = (settings?.features ?? []).includes("badge_numbers");

  useEffect(() => {
    if (!member) return;
    setFullName(member.fullName);
    setPhone(member.phone);
    setEmail(member.email ?? "");
    setBadgeNumber(member.badgeNumber ?? "");
    setSubscriptionStart(ymd(member.subscriptionStart));
    setSubscriptionEnd(ymd(member.subscriptionEnd));
    setMonthlyFee(String(Number(member.monthlyFee)));
    setNotes(member.notes ?? "");
  }, [member]);

  const save = useMutation({
    mutationFn: () =>
      apiFetch(`/members/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          fullName,
          phone,
          email: email || undefined,
          ...(showBadge ? { badgeNumber: badgeNumber.trim() } : {}),
          subscriptionStart,
          subscriptionEnd,
          monthlyFee: Number(monthlyFee),
          notes: notes || undefined,
          sendInvite,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["member", id] });
      qc.invalidateQueries({ queryKey: ["members"] });
      router.back();
    },
    onError: (e: Error) => setErrorNotice(e.message),
  });

  if (isLoading || !member) {
    return (
      <Screen>
        <Text style={styles.muted}>{t("common.loading")}</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Title>{t("detail.editTitle")}</Title>
        <Input label={t("common.name")} value={fullName} onChangeText={setFullName} />
        <Input label={t("common.phone")} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Input label={t("members.email")} value={email} onChangeText={setEmail} autoCapitalize="none" />
        {showBadge ? (
          <Input
            label={t("form.badgeNumber")}
            value={badgeNumber}
            onChangeText={setBadgeNumber}
            keyboardType="number-pad"
          />
        ) : null}
        {member.inviteStatus !== "ACTIVE" ? (
          <Pressable
            onPress={() => setSendInvite((v) => !v)}
            style={styles.checkRow}
          >
            <View style={[styles.box, sendInvite && styles.boxOn]} />
            <Text style={styles.checkLabel}>{t("members.sendInvite")}</Text>
          </Pressable>
        ) : null}
        <PlanMonthChips
          start={subscriptionStart}
          activePlan={activePlan}
          onChangeEnd={setSubscriptionEnd}
          onChangePlan={setActivePlan}
        />
        <Input
          label={t("common.startDate")}
          value={subscriptionStart}
          onChangeText={(v) => {
            setSubscriptionStart(v);
            setActivePlan(null);
          }}
        />
        <Input
          label={t("common.endDate")}
          value={subscriptionEnd}
          onChangeText={(v) => {
            setSubscriptionEnd(v);
            setActivePlan(null);
          }}
        />
        <Input
          label={t("common.monthlyFee")}
          value={monthlyFee}
          onChangeText={setMonthlyFee}
          keyboardType="numeric"
        />
        <Input label={t("common.notes")} value={notes} onChangeText={setNotes} />
        <Button
          label={t("common.save")}
          onPress={() => save.mutate()}
          loading={save.isPending}
        />
      </ScrollView>
      <NoticeDialog
        visible={errorNotice !== null}
        onClose={() => setErrorNotice(null)}
        title={t("common.error")}
        description={errorNotice ?? undefined}
        tone="critical"
        confirmLabel={t("common.ok")}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.xl },
  muted: { padding: spacing.lg, color: colors.textMuted },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 44,
    marginVertical: spacing.sm,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  boxOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  checkLabel: { color: colors.text, flex: 1 },
});
```

Admin layout: `<Stack.Screen name="[id]/edit" options={{ presentation: "modal" }} />`

On admin detail only (`canAdmin`), add Edit button next to QR:

```tsx
{canAdmin ? (
  <Button
    label={t("detail.editTitle")}
    variant="secondary"
    onPress={() => router.push(`/(admin)/members/${id}/edit`)}
  />
) : null}
```

Staff must not get this button. Do not add an edit file under `(staff)/members`.

- [ ] **Step 3: Plan chips on create**

In `new.tsx`, add `activePlan` state and render `PlanMonthChips` above the date inputs. Keep `sendInvite: email.trim().length > 0`.

- [ ] **Step 4: Run `npm test` then commit**

```bash
git add apps/mobile/components/plan-month-chips.tsx apps/mobile/app/(admin)/members/[id]/edit.tsx apps/mobile/app/(admin)/members/_layout.tsx apps/mobile/app/(admin)/members/new.tsx apps/mobile/screens/member-detail-screen.tsx
git commit -m "feat(mobile): admin member edit screen and plan chips"
```

---

### Task 7: Docs

**Files:**
- Modify: `docs/ARCHITECTURE_EVOLUTION.md` (date, branch, Phase C bullet, backlog item 4)
- Modify: `docs/superpowers/specs/2026-08-01-mobile-web-parity-design.md` (Phase C status **Done**)

**Interfaces:**
- Consumes: shipped Tasks 1–6
- Produces: docs only

- [ ] **Step 1: Architecture note**

Set header date to `2026-08-16` and branch to `feat/mobile-parity-phase-c`. Add under “What already works well”:

```
- **Phase C mobile core leftovers (2026-08-16)** — admin member edit + invite disable; desk QR for admin/staff; members export `q`; access CSV `access-allowed.csv`.
```

Change backlog item 4 to **Done (Phase C)** with the same summary. Next leftover is Phase D kiosk.

- [ ] **Step 2: Parent spec**

Phase C status: `Done (2026-08-16, feat/mobile-parity-phase-c)`. Gaps table Core row: **Phase C done**.

- [ ] **Step 3: Commit**

```bash
git add docs/ARCHITECTURE_EVOLUTION.md docs/superpowers/specs/2026-08-01-mobile-web-parity-design.md
git commit -m "docs: note Phase C mobile core leftovers parity"
```

---

## Self-review (plan vs spec)

| Spec item | Task |
|-----------|------|
| Dedicated admin edit → PATCH | 6 |
| Date yyyy-MM-dd slice | 6 |
| Send-invite unchecked on edit | 6 |
| Plan chips create + edit | 6 |
| Badge if Pro | 6 |
| Disable ACTIVE + confirm, admin | 5 |
| App-access card when email | 5 |
| Full-screen desk QR admin+staff | 4 |
| `GET /members/:id/qr` not `/member/qr` | 4 |
| Show QR if expired | 4 |
| `q` on export helper + route | 2 |
| Mobile pass `q` | 3 |
| `access-allowed.csv` | 3 |
| `inviteAccessLabel` unit tests | 1 |
| No Phase D / no leftovers commit | Global |
| Staff cannot edit/disable | 5, 6 |
