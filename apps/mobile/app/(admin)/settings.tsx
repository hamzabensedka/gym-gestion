import { useEffect, useState } from "react";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n-context";
import { apiFetch } from "@/lib/api";
import { Button, Input, Subtitle, Title } from "@/components/ui";
import { ConfirmDialog, NoticeDialog } from "@/components/confirm-dialog";
import { colors, spacing } from "@/lib/theme";
import type { Locale } from "@gym/shared/i18n";

type Gym = {
  name: string;
  location: string | null;
  cardTheme: string | null;
};

export default function SettingsScreen() {
  const { t, locale, setLocale } = useI18n();
  const { logout } = useAuth();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [notice, setNotice] = useState<{
    title: string;
    description?: string;
    tone: "success" | "critical";
  } | null>(null);

  const gymQuery = useQuery({
    queryKey: ["gym-settings"],
    queryFn: () => apiFetch<Gym>("/settings/gym"),
  });

  useEffect(() => {
    if (gymQuery.data) {
      setName(gymQuery.data.name);
      setLocation(gymQuery.data.location ?? "");
    }
  }, [gymQuery.data]);

  const saveGym = useMutation({
    mutationFn: () =>
      apiFetch("/settings/gym", {
        method: "PATCH",
        body: JSON.stringify({ name, location: location || undefined }),
      }),
    onSuccess: () => setNotice({ title: t("settings.saved"), tone: "success" }),
  });

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
        <Title>{t("settings.title")}</Title>
        <Subtitle>{t("settings.subtitle")}</Subtitle>

        <Text style={styles.section}>{t("settings.language")}</Text>
        <View style={styles.langRow}>
          {(["fr", "ar"] as Locale[]).map((l) => (
            <Button
              key={l}
              label={l === "fr" ? "Français" : "العربية"}
              variant={locale === l ? "primary" : "secondary"}
              onPress={() => setLocale(l)}
            />
          ))}
        </View>

        <Text style={styles.section}>{t("settings.gymInfo")}</Text>
        <Input label={t("settings.gymName")} value={name} onChangeText={setName} />
        <Input label={t("settings.gymLocation")} value={location} onChangeText={setLocation} />
        <Button label={t("settings.saveGym")} onPress={() => saveGym.mutate()} loading={saveGym.isPending} />

        <Text style={styles.section}>{t("settings.account")}</Text>
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
          variant="secondary"
          onPress={() => savePassword.mutate()}
          loading={savePassword.isPending}
        />

        <Text style={styles.section}>{t("settings.legal")}</Text>
        <Button
          label={t("legal.privacy")}
          variant="secondary"
          onPress={() => Linking.openURL("https://gymgestion.app/privacy")}
        />

        <View style={{ marginTop: spacing.lg }}>
          <Button label={t("nav.logout")} variant="danger" onPress={() => setLogoutOpen(true)} />
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        tone="neutral"
        icon="log-out"
        title={t("nav.logout")}
        description={t("nav.logoutConfirm")}
        confirmLabel={t("nav.logout")}
        cancelLabel={t("common.cancel")}
        onConfirm={logout}
      />

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
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  section: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textMuted,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  langRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
});
