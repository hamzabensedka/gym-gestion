import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n-context";
import { apiFetch } from "@/lib/api";
import { Button, Input, Subtitle, Title } from "@/components/ui";
import { NoticeDialog } from "@/components/confirm-dialog";
import { colors, spacing } from "@/lib/theme";
import type { Locale } from "@gym/shared/i18n";

export default function StaffAccountScreen() {
  const { t, locale, setLocale } = useI18n();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [notice, setNotice] = useState<{
    title: string;
    description?: string;
    tone: "success" | "critical";
  } | null>(null);

  const savePassword = useMutation({
    mutationFn: () =>
      apiFetch("/settings/password", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword, newPassword }),
      }),
    onSuccess: () => {
      setNotice({ title: t("settings.saved"), tone: "success" });
      setCurrentPassword("");
      setNewPassword("");
    },
    onError: (e: Error) =>
      setNotice({ title: t("common.error"), description: e.message, tone: "critical" }),
  });

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Title>{t("account.title")}</Title>
        <Subtitle>{t("account.subtitle")}</Subtitle>

        <Text style={styles.section}>{t("settings.language")}</Text>
        <View style={styles.langRow}>
          {(["fr", "ar"] as Locale[]).map((l) => (
            <Button
              key={l}
              label={l === "fr" ? "Français" : "العربية"}
              variant={locale === l ? "primary" : "secondary"}
              size="sm"
              onPress={() => setLocale(l)}
            />
          ))}
        </View>

        <Text style={styles.section}>{t("account.changePassword")}</Text>
        <Input
          label={t("settings.currentPassword")}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
        />
        <Input
          label={t("settings.newPassword")}
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
        />
        <Button
          label={t("settings.updatePassword")}
          onPress={() => savePassword.mutate()}
          loading={savePassword.isPending}
        />
      </ScrollView>

      <NoticeDialog
        visible={notice !== null}
        onClose={() => setNotice(null)}
        title={notice?.title ?? ""}
        description={notice?.description}
        tone={notice?.tone ?? "success"}
        confirmLabel={t("common.ok")}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm },
  section: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textMuted,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  langRow: { flexDirection: "row", gap: spacing.sm },
});
