import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Link } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { MemberShell } from "@/components/member-shell";
import { useI18n } from "@/lib/i18n-context";
import { apiFetch } from "@/lib/api";
import { colors, spacing } from "@/lib/theme";
import { formatDate } from "@gym/shared/format";
import type { PlanFeature } from "@gym/shared/plans";

type Wallet = {
  fullName: string;
  gymName: string;
  cardTheme: string;
  subscriptionEnd: string;
  status: string;
  isActive: boolean;
  features: PlanFeature[];
};

export default function MemberWalletScreen() {
  const { t, locale } = useI18n();

  const { data, isLoading } = useQuery({
    queryKey: ["member-wallet"],
    queryFn: () => apiFetch<Wallet>("/member/wallet"),
  });

  if (isLoading || !data) {
    return (
      <MemberShell>
        <Text style={styles.loading}>{t("common.loading")}</Text>
      </MemberShell>
    );
  }

  const gradient =
    data.cardTheme === "fitbox-mahdia"
      ? (["#0f0f23", "#1a1a3e", "#57cc99"] as const)
      : (["#1a1a2e", "#16213e", "#57cc99"] as const);

  return (
    <MemberShell>
      <View style={styles.container}>
        <Link href="/(member)/card" asChild>
          <Pressable style={styles.cardPress}>
            <LinearGradient colors={[...gradient]} style={styles.card} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={styles.gym}>{data.gymName}</Text>
              <Text style={styles.name}>{data.fullName}</Text>
              <View style={styles.footer}>
                <Text style={styles.label}>{t("member.wallet.validUntil")}</Text>
                <Text style={styles.date}>{formatDate(data.subscriptionEnd, locale)}</Text>
              </View>
              <Text style={styles.tap}>{t("member.wallet.tapToShowQr")}</Text>
            </LinearGradient>
          </Pressable>
        </Link>

        {data.features?.includes("class_booking") ? (
          <Link href="/(member)/classes" asChild>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.entry, pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] }]}
            >
              <Text style={styles.entryText}>{t("classes.memberEntry")}</Text>
            </Pressable>
          </Link>
        ) : null}

        {!data.isActive ? (
          <Text style={styles.expired}>{t("member.qr.expiredBanner")}</Text>
        ) : null}
      </View>
    </MemberShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", paddingTop: 8 },
  loading: { padding: spacing.lg, color: colors.textMuted, textAlign: "center" },
  cardPress: { marginBottom: spacing.lg },
  card: {
    borderRadius: 20,
    padding: spacing.lg,
    minHeight: 200,
    justifyContent: "space-between",
  },
  gym: { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.7)" },
  name: { fontSize: 24, fontWeight: "700", color: "#fff", marginTop: spacing.md },
  footer: { marginTop: spacing.lg },
  label: { fontSize: 11, color: "rgba(255,255,255,0.6)" },
  date: { fontSize: 16, fontWeight: "600", color: "#fff", marginTop: 2 },
  tap: { fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: spacing.md, textAlign: "center" },
  entry: {
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  entryText: { fontSize: 14, fontWeight: "600", color: colors.foreground },
  expired: { color: colors.error, textAlign: "center", fontWeight: "500" },
});
