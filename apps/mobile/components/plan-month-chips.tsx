import { Pressable, StyleSheet, Text, View } from "react-native";
import { addMonths, format } from "date-fns";
import { PLAN_MONTHS } from "@gym/shared/subscription";
import { useI18n } from "@/lib/i18n-context";
import { colors, radius, spacing } from "@/lib/theme";
import type { TranslationKey } from "@gym/shared/i18n";

const planLabelKey: Record<(typeof PLAN_MONTHS)[number], TranslationKey> = {
  1: "form.plan1",
  3: "form.plan3",
  6: "form.plan6",
  12: "form.plan12",
};

export function PlanMonthChips({
  start,
  activePlan,
  onChangeEnd,
  onChangePlan,
}: {
  start: string;
  activePlan: number | null;
  onChangeEnd: (end: string) => void;
  onChangePlan: (months: number) => void;
}) {
  const { t } = useI18n();

  function applyPlan(months: (typeof PLAN_MONTHS)[number]) {
    const base = start ? new Date(`${start}T12:00:00`) : new Date();
    onChangeEnd(format(addMonths(base, months), "yyyy-MM-dd"));
    onChangePlan(months);
  }

  return (
    <View>
      <Text style={styles.label}>{t("form.plan")}</Text>
      <View style={styles.row}>
        {PLAN_MONTHS.map((months) => (
          <Pressable
            key={months}
            onPress={() => applyPlan(months)}
            style={[styles.chip, activePlan === months && styles.chipActive]}
          >
            <Text style={[styles.chipText, activePlan === months && styles.chipTextActive]}>
              {t(planLabelKey[months])}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, color: colors.textMuted, marginTop: spacing.sm, marginBottom: spacing.sm },
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md },
  chip: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    justifyContent: "center",
  },
  chipActive: { borderColor: colors.brand, backgroundColor: colors.brandMuted },
  chipText: { color: colors.textMuted, fontWeight: "600" },
  chipTextActive: { color: colors.brand },
});
