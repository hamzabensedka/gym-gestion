import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, startOfDay } from "date-fns";
import type { TranslationKey } from "@gym/shared/i18n";
import { formatDate, formatTime } from "@gym/shared/format";
import { FeatherIcon } from "@/components/icons";
import { Button } from "@/components/ui";
import { MemberShell } from "@/components/member-shell";
import { ApiClientError, apiFetch } from "@/lib/api";
import { useI18n } from "@/lib/i18n-context";
import { colors, radius, spacing } from "@/lib/theme";

export type MemberSessionDto = {
  id: string;
  className: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  remaining: number;
  coachName: string | null;
  myBooking: "BOOKED" | "CANCELLED" | null;
};

const CLASS_ERROR_KEYS = {
  FEATURE_LOCKED: "classes.error.FEATURE_LOCKED",
  NOT_FOUND: "classes.error.NOT_FOUND",
  SESSION_FULL: "classes.error.SESSION_FULL",
  ALREADY_BOOKED: "classes.error.ALREADY_BOOKED",
  SESSION_STARTED: "classes.error.SESSION_STARTED",
  SESSION_CANCELLED: "classes.error.SESSION_CANCELLED",
  MEMBER_NOT_ELIGIBLE: "classes.error.MEMBER_NOT_ELIGIBLE",
  CAPACITY_BELOW_BOOKINGS: "classes.error.CAPACITY_BELOW_BOOKINGS",
  CLASS_HAS_SESSIONS: "classes.error.CLASS_HAS_SESSIONS",
  SESSION_HAS_BOOKINGS: "classes.error.SESSION_HAS_BOOKINGS",
  VALIDATION: "classes.error.VALIDATION",
} as const satisfies Record<string, TranslationKey>;

function isFeatureLockedError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError && error.code === "FEATURE_LOCKED";
}

function translateClassError(
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string,
  code: string,
): string {
  const key = CLASS_ERROR_KEYS[code as keyof typeof CLASS_ERROR_KEYS];
  return t(key ?? CLASS_ERROR_KEYS.VALIDATION);
}

function memberSessionPath(fromIso: string, toIso: string): string {
  return `/member/sessions?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`;
}

export function MemberClassesScreen() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const sessionsQuery = useQuery({
    queryKey: ["member-sessions"],
    queryFn: () => {
      const from = startOfDay(new Date());
      const to = addDays(from, 14);
      return apiFetch<MemberSessionDto[]>(
        memberSessionPath(from.toISOString(), to.toISOString()),
      );
    },
    retry: (count, err) => !isFeatureLockedError(err) && count < 2,
  });

  const book = useMutation({
    mutationFn: (sessionId: string) =>
      apiFetch(`/member/sessions/${sessionId}/book`, { method: "POST" }),
    onSuccess: () => {
      setError(null);
      void qc.invalidateQueries({ queryKey: ["member-sessions"] });
    },
    onError: (err: unknown) => {
      setError(
        err instanceof ApiClientError
          ? translateClassError(t, err.code)
          : t("common.error"),
      );
    },
  });

  const cancel = useMutation({
    mutationFn: (sessionId: string) =>
      apiFetch(`/member/sessions/${sessionId}/cancel`, { method: "POST" }),
    onSuccess: () => {
      setError(null);
      void qc.invalidateQueries({ queryKey: ["member-sessions"] });
    },
    onError: (err: unknown) => {
      setError(
        err instanceof ApiClientError
          ? translateClassError(t, err.code)
          : t("common.error"),
      );
    },
  });

  const pending = book.isPending || cancel.isPending;

  const back = (
    <Pressable
      onPress={() => router.back()}
      accessibilityLabel={t("common.back")}
      accessibilityRole="button"
      style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] }]}
    >
      <FeatherIcon name="arrow-left" color={colors.foreground} size={16} />
      <Text style={styles.backText}>{t("common.back")}</Text>
    </Pressable>
  );

  if (sessionsQuery.isLoading) {
    return (
      <MemberShell title={t("classes.memberTitle")} showClassesNav>
        {back}
        <Text style={styles.muted}>{t("common.loading")}</Text>
      </MemberShell>
    );
  }

  if (sessionsQuery.isError && isFeatureLockedError(sessionsQuery.error)) {
    return (
      <MemberShell title={t("classes.memberTitle")} showClassesNav>
        {back}
        <Text style={styles.locked}>{t("classes.memberLocked")}</Text>
      </MemberShell>
    );
  }

  if (sessionsQuery.isError) {
    const message =
      sessionsQuery.error instanceof Error
        ? sessionsQuery.error.message
        : t("common.error");
    return (
      <MemberShell title={t("classes.memberTitle")} showClassesNav>
        {back}
        <Text style={styles.locked}>{message}</Text>
      </MemberShell>
    );
  }

  const sessions = sessionsQuery.data ?? [];

  return (
    <MemberShell title={t("classes.memberTitle")} showClassesNav>
      <ScrollView style={styles.flex} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {back}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {sessions.length === 0 ? (
          <Text style={styles.muted}>{t("classes.memberEmpty")}</Text>
        ) : (
          sessions.map((session) => {
            const booked = session.myBooking === "BOOKED";
            const full = session.remaining === 0;
            const canBook = !booked && !full;

            return (
              <View key={session.id} style={styles.card}>
                <View style={styles.cardCopy}>
                  <Text style={styles.className}>{session.className}</Text>
                  <Text style={styles.meta}>
                    {formatDate(session.startsAt, locale)}
                    {" · "}
                    {formatTime(session.startsAt, locale)}
                    {" – "}
                    {formatTime(session.endsAt, locale)}
                  </Text>
                  {session.coachName ? (
                    <Text style={styles.coach}>
                      {t("classes.coach")}: {session.coachName}
                    </Text>
                  ) : null}
                  <Text style={[styles.spots, full ? styles.spotsFull : styles.spotsOpen]}>
                    {full
                      ? t("classes.full")
                      : t("classes.spotsLeft", { count: session.remaining })}
                  </Text>
                </View>
                {booked ? (
                  <Button
                    label={t("classes.cancel")}
                    variant="outline"
                    disabled={pending}
                    loading={cancel.isPending && cancel.variables === session.id}
                    onPress={() => {
                      setError(null);
                      cancel.mutate(session.id);
                    }}
                    style={styles.action}
                  />
                ) : (
                  <Button
                    label={t("classes.book")}
                    disabled={pending || !canBook}
                    loading={book.isPending && book.variables === session.id}
                    onPress={() => {
                      setError(null);
                      book.mutate(session.id);
                    }}
                    style={styles.action}
                  />
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </MemberShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingTop: 8, paddingBottom: spacing.lg, gap: 12 },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  backText: { fontSize: 14, fontWeight: "500", color: colors.foreground },
  muted: { paddingTop: spacing.sm, color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  locked: { paddingTop: spacing.sm, color: colors.mutedForeground, fontSize: 14, lineHeight: 20 },
  error: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: "500",
    color: colors.foreground,
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 16,
    gap: 12,
  },
  cardCopy: { gap: 4 },
  className: { fontSize: 16, fontWeight: "600", color: colors.foreground },
  meta: {
    fontSize: 12,
    color: colors.mutedForeground,
    fontVariant: ["tabular-nums"],
  },
  coach: { fontSize: 12, color: colors.mutedForeground },
  spots: { fontSize: 12, fontWeight: "500", fontVariant: ["tabular-nums"] },
  spotsOpen: { color: colors.brand },
  spotsFull: { color: colors.mutedForeground },
  action: { width: "100%" },
});
