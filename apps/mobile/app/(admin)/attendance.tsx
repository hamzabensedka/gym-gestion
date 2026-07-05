import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { formatPeakHourRange } from "@gym/shared/peak-hours";
import { buildWhatsappUrl } from "@gym/shared/subscription";
import { useI18n } from "@/lib/i18n-context";
import { apiFetch } from "@/lib/api";
import { Card, PageHeader, StatCard } from "@/components/ui";
import { BulkWhatsappBar, WhatsappIconButton } from "@/components/bulk-whatsapp";
import { colors, spacing } from "@/lib/theme";

type AttendanceData = {
  weeklyCount: number;
  peakHours: Array<{ hour: number; count: number }>;
  busiestHour: number | null;
  dailyCheckins: Array<{
    id: string;
    timestamp: string;
    member: { fullName: string; phone: string };
  }>;
  mostActive: Array<{ memberId: string; fullName: string; count: number }>;
  inactiveMembers: Array<{ id: string; fullName: string; phone: string }>;
};

export default function AttendanceScreen() {
  const { t, locale } = useI18n();
  const { data, isLoading } = useQuery({
    queryKey: ["attendance"],
    queryFn: () => apiFetch<AttendanceData>("/attendance"),
  });

  const { data: dashboard } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiFetch<{ gymName: string }>("/dashboard"),
  });

  if (isLoading || !data) {
    return (
      <View style={styles.safe}>
        <Text style={styles.muted}>{t("common.loading")}</Text>
      </View>
    );
  }

  const gymName = dashboard?.gymName ?? "Gym";
  const topCount = data.mostActive[0]?.count ?? 1;
  const peakWithCounts = data.peakHours.filter((bucket) => bucket.count > 0);
  const topPeakCount = peakWithCounts.reduce((max, bucket) => Math.max(max, bucket.count), 1);

  return (
    <View style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <PageHeader title={t("att.title")} subtitle={t("att.subtitle")} />

        <View style={styles.statsRow}>
          <StatCard label={t("att.todayCheckins")} value={data.dailyCheckins.length} tone="brand" />
          <StatCard label={t("att.weekCheckins")} value={data.weeklyCount} />
        </View>

        <Card>
          <Text style={styles.section}>{t("att.peakHoursTitle")}</Text>
          <Text style={styles.sectionSub}>{t("att.peakHoursSubtitle")}</Text>
          {peakWithCounts.length === 0 ? (
            <Text style={styles.empty}>{t("att.noData")}</Text>
          ) : (
            peakWithCounts.map((bucket) => (
              <View key={bucket.hour} style={styles.peakRow}>
                <View style={styles.peakLabel}>
                  <Text style={styles.peakHour}>{formatPeakHourRange(bucket.hour, locale)}</Text>
                  {bucket.hour === data.busiestHour ? (
                    <Text style={styles.peakBadge}>{t("att.busiestHour")}</Text>
                  ) : null}
                </View>
                <View style={styles.activeContent}>
                  <View style={styles.activeHeader}>
                    <Text style={styles.visits}>{bucket.count}</Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${(bucket.count / topPeakCount) * 100}%` },
                      ]}
                    />
                  </View>
                </View>
              </View>
            ))
          )}
        </Card>

        <Card>
          <Text style={styles.section}>{t("att.todayTitle")}</Text>
          {data.dailyCheckins.length === 0 ? (
            <Text style={styles.empty}>{t("att.noToday")}</Text>
          ) : (
            data.dailyCheckins.map((item) => (
              <View key={item.id} style={styles.row}>
                <View style={styles.rowMeta}>
                  <Text style={styles.name}>{item.member.fullName}</Text>
                  <Text style={styles.phone}>{item.member.phone}</Text>
                </View>
                <Text style={styles.time}>
                  {new Date(item.timestamp).toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            ))
          )}
        </Card>

        <Card>
          <Text style={styles.section}>{t("att.mostActive")}</Text>
          {data.mostActive.length === 0 ? (
            <Text style={styles.empty}>{t("att.noData")}</Text>
          ) : (
            data.mostActive.map((m, index) => (
              <View key={m.memberId} style={styles.activeRow}>
                <Text style={styles.rank}>{index + 1}</Text>
                <View style={styles.activeContent}>
                  <View style={styles.activeHeader}>
                    <Text style={styles.name}>{m.fullName}</Text>
                    <Text style={styles.visits}>
                      {m.count} {t("common.visits")}
                    </Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View
                      style={[styles.progressFill, { width: `${(m.count / topCount) * 100}%` }]}
                    />
                  </View>
                </View>
              </View>
            ))
          )}
        </Card>

        <Card>
          <Text style={styles.section}>{t("att.inactiveTitle")}</Text>
          <Text style={styles.sectionSub}>{t("att.inactiveSubtitle")}</Text>
          {data.inactiveMembers.length > 0 ? (
            <BulkWhatsappBar
              members={data.inactiveMembers}
              getMessage={(member) =>
                t("att.waInactive", { name: member.fullName, gym: gymName })
              }
              labels={{
                remind: (total) => t("wa.bulkRemind", { total }),
                next: t("wa.bulkNext"),
                progress: (current, total) => t("wa.bulkProgress", { current, total }),
                done: t("wa.bulkDone"),
              }}
            />
          ) : null}
          {data.inactiveMembers.length === 0 ? (
            <Text style={styles.empty}>{t("att.allActive")}</Text>
          ) : (
            data.inactiveMembers.map((m) => {
              const waUrl = buildWhatsappUrl(
                m.phone,
                t("att.waInactive", { name: m.fullName, gym: gymName }),
              );
              return (
                <View key={m.id} style={styles.inactiveRow}>
                  <View style={styles.rowMeta}>
                    <Text style={styles.name}>{m.fullName}</Text>
                    <Text style={styles.phone}>{m.phone}</Text>
                  </View>
                  <WhatsappIconButton url={waUrl} title={t("att.reminder")} />
                </View>
              );
            })
          )}
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  statsRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  section: { fontSize: 14, fontWeight: "600", marginBottom: spacing.sm, color: colors.text },
  sectionSub: { fontSize: 12, color: colors.textMuted, marginBottom: spacing.sm, marginTop: -4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowMeta: { flex: 1, minWidth: 0 },
  name: { fontSize: 15, fontWeight: "600", color: colors.text },
  phone: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  time: { fontSize: 13, color: colors.textMuted, fontVariant: ["tabular-nums"] },
  activeRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: spacing.sm },
  rank: {
    width: 20,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "700",
    color: colors.textMuted,
    fontVariant: ["tabular-nums"],
  },
  activeContent: { flex: 1, minWidth: 0 },
  activeHeader: { flexDirection: "row", justifyContent: "space-between", gap: 8, marginBottom: 6 },
  visits: { fontSize: 12, fontWeight: "700", color: colors.textMuted, fontVariant: ["tabular-nums"] },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.muted,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 999, backgroundColor: colors.brand },
  peakRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: spacing.sm },
  peakLabel: { width: 108, gap: 2 },
  peakHour: { fontSize: 12, fontWeight: "600", color: colors.text, fontVariant: ["tabular-nums"] },
  peakBadge: { fontSize: 10, color: colors.brand, fontWeight: "600" },
  inactiveRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.muted,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  empty: { textAlign: "center", paddingVertical: spacing.lg, fontSize: 14, color: colors.textMuted },
  muted: { padding: spacing.lg, color: colors.textMuted },
});
