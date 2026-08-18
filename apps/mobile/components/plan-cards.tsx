import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { Plan } from "@prisma/client";
import { PLAN_CATALOG } from "@gym/shared/plan-catalog";
import { formatDate } from "@gym/shared/format";
import type { TranslationKey } from "@gym/shared/i18n";
import { Badge } from "@/components/ui";
import { useI18n } from "@/lib/i18n-context";
import { colors, radius, spacing } from "@/lib/theme";

const PLAN_LABEL: Record<Plan, TranslationKey> = {
  STARTER: "onboarding.plan.STARTER",
  GROWTH: "onboarding.plan.GROWTH",
  PRO: "onboarding.plan.PRO",
};

export type PlanCardsProps = {
  selected: Plan;
  onSelect: (plan: Plan) => void;
  currentPlan?: Plan;
  trialEndsAt?: string | null;
  mode: "public" | "gym";
};

function PlanCard({
  def,
  index,
  selected,
  onSelect,
  currentPlan,
  trialEndsAt,
  mode,
}: {
  def: (typeof PLAN_CATALOG)[number];
  index: number;
  selected: Plan;
  onSelect: (plan: Plan) => void;
  currentPlan?: Plan;
  trialEndsAt?: string | null;
  mode: "public" | "gym";
}) {
  const { t, locale, rtl } = useI18n();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  const isSelected = selected === def.plan;
  const isCurrent = mode === "gym" && currentPlan === def.plan;
  const align = rtl ? "right" : "left";

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 280,
        delay: index * 90,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 280,
        delay: index * 90,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, opacity, translateY]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ selected: isSelected, checked: isSelected }}
        accessibilityLabel={t(PLAN_LABEL[def.plan])}
        onPress={() => onSelect(def.plan)}
        style={({ pressed }) => [
          styles.card,
          isSelected ? styles.cardSelected : styles.cardIdle,
          pressed && { transform: [{ scale: 0.96 }] },
        ]}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.planName, { textAlign: align, writingDirection: rtl ? "rtl" : "ltr" }]}>
            {t(PLAN_LABEL[def.plan])}
          </Text>
          {isCurrent ? <Badge label={t("plans.current")} tone="success" /> : null}
        </View>
        <Text style={[styles.pitch, { textAlign: align }]}>{t(def.pitchKey)}</Text>
        {isCurrent && trialEndsAt ? (
          <Text style={[styles.trial, { textAlign: align }]}>
            {t("plans.trialUntil", { date: formatDate(trialEndsAt, locale) })}
          </Text>
        ) : null}
        <View style={styles.features}>
          {def.includeKeys.map((key) => (
            <Text key={key} style={[styles.feature, { textAlign: align }]}>
              {t(key)}
            </Text>
          ))}
        </View>
        <Text style={[styles.seats, { textAlign: align }]}>
          {t("plans.staffSeats", { n: def.staffSeats })}
        </Text>
        {mode === "gym" && !isCurrent ? (
          <Text style={[styles.request, { textAlign: align }]}>{t("plans.requestThis")}</Text>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

export function PlanCards({
  selected,
  onSelect,
  currentPlan,
  trialEndsAt,
  mode,
}: PlanCardsProps) {
  const { t, rtl } = useI18n();

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={t("plans.title")}>
      <Text style={[styles.manualPay, { textAlign: rtl ? "right" : "left" }]}>
        {t("plans.manualPay")}
      </Text>
      <View style={styles.stack}>
        {PLAN_CATALOG.map((def, index) => (
          <PlanCard
            key={def.plan}
            def={def}
            index={index}
            selected={selected}
            onSelect={onSelect}
            currentPlan={currentPlan}
            trialEndsAt={trialEndsAt}
            mode={mode}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  manualPay: {
    fontSize: 14,
    color: colors.mutedForeground,
    marginBottom: 12,
  },
  stack: { gap: 12 },
  card: {
    minHeight: 44,
    borderRadius: radius.xl,
    borderWidth: 2,
    backgroundColor: colors.card,
    padding: spacing.md,
    alignItems: "stretch",
  },
  cardIdle: {
    borderColor: colors.border,
  },
  cardSelected: {
    borderColor: colors.brand,
    shadowColor: colors.brand,
    shadowOpacity: 0.28,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  planName: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    color: colors.foreground,
  },
  pitch: {
    marginTop: 4,
    fontSize: 14,
    color: colors.mutedForeground,
  },
  trial: {
    marginTop: 4,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  features: { marginTop: 12, gap: 6 },
  feature: { fontSize: 14, color: colors.foreground },
  seats: {
    marginTop: 12,
    fontSize: 14,
    color: colors.mutedForeground,
    fontVariant: ["tabular-nums"],
  },
  request: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: "600",
    color: colors.brand,
  },
});
