import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n-context";
import { apiFetch } from "@/lib/api";
import { Badge, Button, Input, Title } from "@/components/ui";
import { colors, spacing } from "@/lib/theme";
import { formatDate } from "@gym/shared/format";
import { daysUntil } from "@gym/shared/subscription";
import { BulkWhatsappBar } from "@/components/bulk-whatsapp";

type Member = {
  id: string;
  fullName: string;
  phone: string;
  status: string;
  subscriptionEnd: string;
};

const filters = ["all", "active", "expired", "expiring", "frozen"] as const;

type MembersListScreenProps = {
  isAdmin: boolean;
  memberBasePath: "/(admin)/members" | "/(staff)/members";
};

export function MembersListScreen({ isAdmin, memberBasePath }: MembersListScreenProps) {
  const { t, locale } = useI18n();
  const [filter, setFilter] = useState<(typeof filters)[number]>("all");
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["members", filter, q],
    queryFn: () =>
      apiFetch<Member[]>(`/members?f=${filter}${q ? `&q=${encodeURIComponent(q)}` : ""}`),
  });

  const { data: gymName = "Gym" } = useQuery({
    queryKey: ["gym-name-members"],
    queryFn: async () => {
      if (!isAdmin) return "Gym";
      try {
        const dash = await apiFetch<{ gymName: string }>("/dashboard");
        return dash.gymName;
      } catch {
        return "Gym";
      }
    },
    enabled: isAdmin,
  });

  const filterLabels: Record<(typeof filters)[number], string> = {
    all: t("members.filterAll"),
    active: t("members.filterActive"),
    expired: t("members.filterExpired"),
    expiring: t("members.filterExpiring"),
    frozen: t("members.filterFrozen"),
  };

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <View style={styles.header}>
        <Title>{t("members.title")}</Title>
        {isAdmin ? (
          <Link href="/(admin)/members/new" asChild>
            <Button label={t("members.addMember")} onPress={() => {}} />
          </Link>
        ) : null}
      </View>

      <Input placeholder={t("members.searchPlaceholder")} value={q} onChangeText={setQ} />

      <View style={styles.filters}>
        {filters.map((f) => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            style={[styles.chip, filter === f && styles.chipActive]}
          >
            <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>
              {filterLabels[f]}
            </Text>
          </Pressable>
        ))}
      </View>

      {(filter === "expired" || filter === "expiring") && data && data.length > 0 ? (
        <BulkWhatsappBar
          members={(data ?? []).map((member) => ({
            id: member.id,
            fullName: member.fullName,
            phone: member.phone,
          }))}
          getMessage={(recipient) => {
            const member = data!.find((item) => item.id === recipient.id)!;
            return filter === "expired"
              ? t("detail.waExpired", {
                  name: recipient.fullName,
                  gym: gymName,
                  date: formatDate(member.subscriptionEnd, locale),
                })
              : t("detail.waActive", {
                  name: recipient.fullName,
                  gym: gymName,
                  date: formatDate(member.subscriptionEnd, locale),
                });
          }}
          labels={{
            remind: (total) => t("wa.bulkRemind", { total }),
            next: t("wa.bulkNext"),
            progress: (current, total) => t("wa.bulkProgress", { current, total }),
            done: t("wa.bulkDone"),
          }}
        />
      ) : null}

      {isLoading ? (
        <Text style={styles.muted}>{t("common.loading")}</Text>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: spacing.xl }}
          ListEmptyComponent={<Text style={styles.muted}>{t("members.noMembers")}</Text>}
          renderItem={({ item }) => {
            const frozen = item.status === "FROZEN";
            const expired = item.status === "EXPIRED";
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
              <Link href={`${memberBasePath}/${item.id}`} asChild>
                <Pressable style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{item.fullName}</Text>
                    <Text style={styles.phone}>{item.phone}</Text>
                    <Text style={styles.date}>{formatDate(item.subscriptionEnd, locale)}</Text>
                  </View>
                  <Badge label={badgeLabel} tone={badgeTone} />
                </Pressable>
              </Link>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: spacing.md },
  header: { gap: spacing.sm, marginBottom: spacing.sm },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { fontSize: 13, color: colors.textMuted },
  chipTextActive: { color: colors.primaryForeground, fontWeight: "600" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  name: { fontSize: 16, fontWeight: "600", color: colors.text },
  phone: { fontSize: 14, color: colors.textMuted },
  date: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  muted: { color: colors.textMuted, textAlign: "center", marginTop: spacing.lg },
});
