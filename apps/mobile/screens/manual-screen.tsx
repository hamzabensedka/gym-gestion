import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useI18n } from "@/lib/i18n-context";
import { apiFetch } from "@/lib/api";
import { Badge, Input, Screen, Subtitle, Title } from "@/components/ui";
import { colors, spacing } from "@/lib/theme";
import { daysUntil } from "@gym/shared/subscription";

type MemberResult = {
  id: string;
  fullName: string;
  phone: string;
  status: string;
  subscriptionEnd: string;
};

function checkinMessage(
  t: ReturnType<typeof useI18n>["t"],
  result: { success: boolean; memberName?: string; outcome: string },
) {
  if (result.success) {
    return `${t("scan.granted")}: ${result.memberName}`;
  }
  if (result.outcome === "FROZEN") {
    return t("scan.frozenMsg");
  }
  if (result.outcome === "EXPIRED") {
    return t("scan.expiredMsg");
  }
  return t("scan.denied");
}

export function ManualCheckinScreen() {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");

  const searchQuery = useQuery({
    queryKey: ["members-search", query],
    queryFn: () => apiFetch<MemberResult[]>(`/members/search?q=${encodeURIComponent(query)}`),
    enabled: query.length >= 2,
  });

  const checkin = useMutation({
    mutationFn: (memberId: string) =>
      apiFetch<{ success: boolean; memberName?: string; outcome: string }>("/checkin", {
        method: "POST",
        body: JSON.stringify({ memberId }),
      }),
    onSuccess: (result) => {
      setMessage(checkinMessage(t, result));
      Haptics.notificationAsync(
        result.success ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error,
      );
    },
  });

  return (
    <Screen>
      <Title>{t("manual.title")}</Title>
      <Subtitle>{t("manual.subtitle")}</Subtitle>

      <Input
        placeholder={t("manual.searchMember")}
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
      />

      {message ? <Text style={styles.message}>{message}</Text> : null}

      {query.length < 2 ? (
        <Text style={styles.hint}>{t("manual.startTyping")}</Text>
      ) : searchQuery.isLoading ? (
        <Text style={styles.hint}>{t("common.loading")}</Text>
      ) : (searchQuery.data?.length ?? 0) === 0 ? (
        <Text style={styles.hint}>{t("manual.noResults")}</Text>
      ) : (
        <FlatList
          data={searchQuery.data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const frozen = item.status === "FROZEN";
            const expired = item.status === "EXPIRED";
            const blocked = frozen || expired;
            const days = daysUntil(item.subscriptionEnd);
            const expiringSoon = item.status === "ACTIVE" && days <= 7;

            const badgeLabel = frozen
              ? t("common.frozen")
              : expired
                ? t("common.expired")
                : expiringSoon
                  ? `${days} ${days === 1 ? t("common.day") : t("common.days")}`
                  : t("common.active");

            const badgeTone = frozen
              ? "danger"
              : expired
                ? "danger"
                : expiringSoon
                  ? "warning"
                  : "success";

            return (
            <Pressable
              style={[styles.row, blocked && styles.rowBlocked]}
              onPress={() => !blocked && checkin.mutate(item.id)}
              disabled={blocked || checkin.isPending}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.fullName}</Text>
                <Text style={styles.phone}>{item.phone}</Text>
              </View>
              <Badge label={badgeLabel} tone={badgeTone} />
              {!blocked ? (
                <Text style={styles.checkin}>{t("manual.checkin")}</Text>
              ) : null}
            </Pressable>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { color: colors.textMuted, textAlign: "center", marginTop: spacing.lg },
  message: { color: colors.brandDark, fontWeight: "600", marginBottom: spacing.md },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowBlocked: { opacity: 0.6 },
  name: { fontSize: 16, fontWeight: "600", color: colors.text },
  phone: { fontSize: 14, color: colors.textMuted },
  checkin: { fontSize: 13, fontWeight: "600", color: colors.brand },
});
