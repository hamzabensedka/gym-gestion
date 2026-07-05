import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n-context";
import { apiFetch } from "@/lib/api";
import { Card, Title } from "@/components/ui";
import { colors, spacing } from "@/lib/theme";
import { formatDate, formatTime } from "@gym/shared/format";
import { buildWhatsappUrl, daysUntil } from "@gym/shared/subscription";
import type { DeskTodaySummary } from "@gym/shared/desk";

export default function TodayScreen() {
  const { t, locale } = useI18n();
  const { state } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["desk-today"],
    queryFn: () => apiFetch<DeskTodaySummary>("/desk/today"),
  });
  const gymName = state.status === "staff" ? state.user.gymName : "Gym";

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Title>{t("today.title")}</Title>

        {isLoading || !data ? (
          <Text style={styles.muted}>{t("common.loading")}</Text>
        ) : (
          <>
            <View style={styles.stats}>
              <StatBox label={t("today.checkins")} value={data.todayCheckins} />
              <StatBox label={t("today.expiring")} value={data.expiringSoon} />
              <StatBox label={t("today.expired")} value={data.expired} />
            </View>

            <Card>
              <Text style={styles.section}>{t("today.checkins")}</Text>
              {data.checkins.length === 0 ? (
                <Text style={styles.muted}>{t("today.noCheckins")}</Text>
              ) : (
                data.checkins.map((checkin) => (
                  <View key={checkin.id} style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{checkin.member.fullName}</Text>
                      <Text style={styles.phone}>{checkin.member.phone}</Text>
                    </View>
                    <Text style={styles.time}>
                      {formatTime(new Date(checkin.timestamp), locale)}
                    </Text>
                  </View>
                ))
              )}
            </Card>

            {data.expiringMembers.length > 0 ? (
              <Card>
                <Text style={styles.section}>{t("today.expiringList")}</Text>
                {data.expiringMembers.map((member) => {
                  const days = daysUntil(member.subscriptionEnd);
                  const waMessage = t("detail.waActive", {
                    name: member.fullName,
                    gym: gymName,
                    date: formatDate(member.subscriptionEnd, locale),
                  });
                  return (
                    <View key={member.id} style={styles.row}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.name}>{member.fullName}</Text>
                        <Text style={styles.phone}>
                          {days} {days === 1 ? t("common.day") : t("common.days")} ·{" "}
                          {formatDate(member.subscriptionEnd, locale)}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => Linking.openURL(buildWhatsappUrl(member.phone, waMessage))}
                        style={styles.waBtn}
                      >
                        <Ionicons name="logo-whatsapp" size={22} color="#fff" />
                      </Pressable>
                    </View>
                  );
                })}
              </Card>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
  stats: { flexDirection: "row", gap: spacing.sm },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  statValue: { fontSize: 22, fontWeight: "700", color: colors.text },
  statLabel: { fontSize: 11, color: colors.textMuted, textAlign: "center", marginTop: 4 },
  section: { fontSize: 16, fontWeight: "600", marginBottom: spacing.sm, color: colors.text },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  name: { fontSize: 15, fontWeight: "600", color: colors.text },
  phone: { fontSize: 13, color: colors.textMuted },
  time: { fontSize: 13, color: colors.textMuted },
  waBtn: {
    backgroundColor: "#25D366",
    borderRadius: 10,
    padding: 10,
  },
  muted: { color: colors.textMuted, textAlign: "center", marginTop: spacing.lg },
});
