import { useEffect, useState } from "react";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n-context";
import { apiFetch } from "@/lib/api";
import { Button, Input, Subtitle, Title } from "@/components/ui";
import { ConfirmDialog, NoticeDialog } from "@/components/confirm-dialog";
import { colors, spacing } from "@/lib/theme";
import type { Locale, TranslationKey } from "@gym/shared/i18n";
import { getPlanLimits, modesAllowedForPlan } from "@gym/shared/plans";

type Plan = "STARTER" | "GROWTH" | "PRO";
type AccessMode = ReturnType<typeof modesAllowedForPlan>[number];

type Gym = {
  name: string;
  location: string | null;
  cardTheme: string | null;
};

type SettingsSnapshot = {
  plan: Plan;
  accessMode: AccessMode;
  features: string[];
  cardTheme: string;
  maxStaff: number;
};

const PLANS: Plan[] = ["STARTER", "GROWTH", "PRO"];

const PLAN_LABEL: Record<Plan, TranslationKey> = {
  STARTER: "onboarding.plan.STARTER",
  GROWTH: "onboarding.plan.GROWTH",
  PRO: "onboarding.plan.PRO",
};

const MODE_LABEL: Record<AccessMode, TranslationKey> = {
  DESK_ONLY: "settings.mode.DESK_ONLY",
  KIOSK: "settings.mode.KIOSK",
  BADGE_PC_EXTENSION: "settings.mode.BADGE_PC_EXTENSION",
  VENDOR_CONNECTOR: "settings.mode.VENDOR_CONNECTOR",
  NEW_ACCESS_KIT: "settings.mode.NEW_ACCESS_KIT",
};

const CARD_THEMES = [
  { value: "default", labelKey: "settings.cardThemeDefault" as const },
  { value: "fitbox-mahdia", labelKey: "settings.cardThemeFitbox" as const },
];

function clampMode(plan: Plan, mode: AccessMode): AccessMode {
  return modesAllowedForPlan(plan).includes(mode) ? mode : "DESK_ONLY";
}

export default function SettingsScreen() {
  const { t, locale, setLocale } = useI18n();
  const { logout } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [cardTheme, setCardTheme] = useState("default");
  const [plan, setPlan] = useState<Plan>("STARTER");
  const [accessMode, setAccessMode] = useState<AccessMode>("DESK_ONLY");
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

  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: () => apiFetch<SettingsSnapshot>("/settings"),
  });

  useEffect(() => {
    if (gymQuery.data) {
      setName(gymQuery.data.name);
      setLocation(gymQuery.data.location ?? "");
      setCardTheme(gymQuery.data.cardTheme ?? "default");
    }
  }, [gymQuery.data]);

  useEffect(() => {
    if (settingsQuery.data) {
      setPlan(settingsQuery.data.plan);
      setAccessMode(clampMode(settingsQuery.data.plan, settingsQuery.data.accessMode));
    }
  }, [settingsQuery.data]);

  const allowedModes = modesAllowedForPlan(plan);
  const previewMaxStaff = getPlanLimits(plan).maxStaff;

  function onPlanChange(next: Plan) {
    setPlan(next);
    setAccessMode((current) => clampMode(next, current));
  }

  const saveGym = useMutation({
    mutationFn: () =>
      apiFetch("/settings/gym", {
        method: "PATCH",
        body: JSON.stringify({
          name,
          location: location || undefined,
          cardTheme,
        }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["gym-settings"] });
      void queryClient.invalidateQueries({ queryKey: ["settings"] });
      setNotice({ title: t("settings.saved"), tone: "success" });
    },
    onError: (e: Error) =>
      setNotice({ title: t("common.error"), description: e.message, tone: "critical" }),
  });

  const savePlanAccess = useMutation({
    mutationFn: () =>
      apiFetch("/settings/plan-access", {
        method: "PATCH",
        body: JSON.stringify({ plan, accessMode }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["settings"] });
      void queryClient.invalidateQueries({ queryKey: ["gym-settings-summary"] });
      setNotice({ title: t("settings.saved"), tone: "success" });
    },
    onError: (e: Error) =>
      setNotice({ title: t("common.error"), description: e.message, tone: "critical" }),
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
        <View style={styles.row}>
          {(["fr", "ar"] as Locale[]).map((l) => (
            <Button
              key={l}
              label={l === "fr" ? "Français" : "العربية"}
              variant={locale === l ? "primary" : "secondary"}
              onPress={() => setLocale(l)}
            />
          ))}
        </View>

        <Text style={styles.section}>{t("settings.subscription")}</Text>
        <Text style={styles.fieldLabel}>{t("settings.plan")}</Text>
        <View style={styles.row}>
          {PLANS.map((value) => (
            <Button
              key={value}
              label={t(PLAN_LABEL[value])}
              variant={plan === value ? "primary" : "secondary"}
              onPress={() => onPlanChange(value)}
            />
          ))}
        </View>
        <Text style={styles.hint}>{t("settings.maxStaffHint", { n: previewMaxStaff })}</Text>

        <Text style={styles.fieldLabel}>{t("settings.accessMode")}</Text>
        <View style={styles.rowWrap}>
          {allowedModes.map((value) => (
            <Button
              key={value}
              label={t(MODE_LABEL[value])}
              variant={accessMode === value ? "primary" : "secondary"}
              onPress={() => setAccessMode(value)}
              style={styles.modeButton}
            />
          ))}
        </View>
        <Button
          label={t("settings.savePlanAccess")}
          onPress={() => savePlanAccess.mutate()}
          loading={savePlanAccess.isPending}
        />

        <Text style={styles.section}>{t("settings.gymInfo")}</Text>
        <Input label={t("settings.gymName")} value={name} onChangeText={setName} />
        <Input label={t("settings.gymLocation")} value={location} onChangeText={setLocation} />

        <Text style={styles.fieldLabel}>{t("settings.cardTheme")}</Text>
        <View style={styles.row}>
          {CARD_THEMES.map((theme) => (
            <Button
              key={theme.value}
              label={t(theme.labelKey)}
              variant={cardTheme === theme.value ? "primary" : "secondary"}
              onPress={() => setCardTheme(theme.value)}
            />
          ))}
        </View>
        <Text style={styles.hint}>{t("settings.cardThemeHint")}</Text>
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
  fieldLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  hint: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  row: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md, flexWrap: "wrap" },
  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  modeButton: { maxWidth: "100%" },
});
