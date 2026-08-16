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

  if (qrQuery.isLoading || !qrQuery.data) {
    return (
      <View style={[styles.safe, { paddingTop: insets.top }]}>
        <Text style={styles.loading}>{t("common.loading")}</Text>
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
