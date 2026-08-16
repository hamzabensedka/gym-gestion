import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { FeatherIcon } from "@/components/icons";
import { MemberQrView } from "@/components/member-qr-view";
import { useI18n } from "@/lib/i18n-context";
import { apiFetch } from "@/lib/api";
import { colors, spacing } from "@/lib/theme";

export default function MemberQrScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data, isLoading } = useQuery({
    queryKey: ["member-qr"],
    queryFn: () => apiFetch<{ qrData: string; isActive: boolean }>("/member/qr"),
  });

  if (isLoading || !data) {
    return (
      <View style={[styles.safe, { paddingTop: insets.top }]}>
        <Text style={styles.loading}>{t("common.loading")}</Text>
      </View>
    );
  }

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
        <Text style={styles.title}>{t("member.qr.title")}</Text>
        <Text style={styles.hint}>{t("member.qr.brightnessHint")}</Text>

        <MemberQrView
          value={data.qrData}
          expiredBanner={!data.isActive ? t("member.qr.expiredBanner") : null}
        />
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
  title: { fontSize: 22, fontWeight: "700", color: colors.foreground, marginBottom: spacing.sm },
  hint: { fontSize: 14, color: colors.mutedForeground, marginBottom: spacing.lg, textAlign: "center" },
  loading: { padding: spacing.lg, color: colors.mutedForeground },
});
