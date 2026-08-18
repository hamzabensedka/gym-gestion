import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plan } from "@prisma/client";
import type { TranslationKey } from "@gym/shared/i18n";
import { ApiClientError, apiFetch } from "@/lib/api";
import { useI18n } from "@/lib/i18n-context";
import { PlanCards } from "@/components/plan-cards";
import { Button, ErrorBanner, PageHeader } from "@/components/ui";
import { colors, spacing } from "@/lib/theme";

const PLAN_ERROR_KEYS = new Set<string>([
  "plans.invalidLead",
  "plans.alreadyCurrent",
  "plans.rateLimited",
]);

function planErrorKey(error: unknown): TranslationKey {
  if (error instanceof ApiClientError) {
    if (error.status === 429 || error.code === "RATE_LIMITED") return "plans.rateLimited";
    if (PLAN_ERROR_KEYS.has(error.message)) return error.message as TranslationKey;
  }
  return "plans.invalidLead";
}

type SettingsSnapshot = {
  plan: Plan;
  planTrialEndsAt: string | null;
};

export default function AbonnementScreen() {
  const { t, rtl } = useI18n();
  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: () => apiFetch<SettingsSnapshot>("/settings"),
  });

  if (settingsQuery.isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color={colors.brand} />
      </SafeAreaView>
    );
  }

  if (settingsQuery.isError || !settingsQuery.data) {
    return (
      <SafeAreaView style={styles.safe}>
        <PageHeader title={t("nav.subscription")} subtitle={t("plans.subtitle")} />
        <ErrorBanner
          message={
            settingsQuery.error instanceof Error
              ? settingsQuery.error.message
              : t("common.error")
          }
        />
      </SafeAreaView>
    );
  }

  return (
    <GymPlansBody
      currentPlan={settingsQuery.data.plan}
      trialEndsAt={settingsQuery.data.planTrialEndsAt}
      t={t}
      rtl={rtl}
    />
  );
}

function GymPlansBody({
  currentPlan,
  trialEndsAt,
  t,
  rtl,
}: {
  currentPlan: Plan;
  trialEndsAt: string | null;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
  rtl: boolean;
}) {
  const [plan, setPlan] = useState<Plan>(currentPlan);
  const submit = useMutation({
    mutationFn: () =>
      apiFetch("/settings/plan-requests", {
        method: "POST",
        body: JSON.stringify({ plan }),
      }),
  });
  const isCurrent = plan === currentPlan;
  const align = rtl ? "right" : "left";

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <PageHeader title={t("nav.subscription")} subtitle={t("plans.subtitle")} />

        {submit.isSuccess ? (
          <Text
            accessibilityLiveRegion="polite"
            style={[styles.success, { textAlign: align }]}
          >
            {t("plans.success")}
          </Text>
        ) : (
          <View>
            <PlanCards
              selected={plan}
              onSelect={setPlan}
              currentPlan={currentPlan}
              trialEndsAt={trialEndsAt}
              mode="gym"
            />

            {submit.isError ? <ErrorBanner message={t(planErrorKey(submit.error))} /> : null}

            <Button
              label={t("plans.submit")}
              onPress={() => submit.mutate()}
              loading={submit.isPending}
              disabled={submit.isPending || isCurrent}
              size="lg"
              style={styles.submit}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { paddingHorizontal: 20, paddingBottom: spacing.xl },
  success: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.foreground,
  },
  submit: { marginTop: spacing.lg },
});
